import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiHatasi } from "../lib/errors";
import { generateCuttingListsForProject } from "../lib/cuttingService";
import { calculateCost } from "../calc/costing";
import { calculateMaterialLineCost, costPerMm } from "../lib/pricing";

const router = Router({ mergeParams: true });

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const teklifler = await prisma.quote.findMany({
      where: { projectId: Number(req.params.projectId) },
      orderBy: { createdAt: "desc" },
    });
    res.json(teklifler);
  })
);

async function siradakiTeklifNo(): Promise<string> {
  const yil = new Date().getFullYear();
  const sayac = await prisma.quote.count({ where: { quoteNumber: { startsWith: `T-${yil}-` } } });
  let n = sayac + 1;
  // Nadir çakışma ihtimaline karşı benzersizliği garanti et.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const aday = `T-${yil}-${String(n).padStart(5, "0")}`;
    const varMi = await prisma.quote.findUnique({ where: { quoteNumber: aday } });
    if (!varMi) return aday;
    n++;
  }
}

router.post(
  "/generate",
  asyncHandler(async (req, res) => {
    const projectId = Number(req.params.projectId);
    const proje = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });

    const { cuttingLists, uyarilar: kesimUyarilari } = await generateCuttingListsForProject(projectId);

    const parcalar = await prisma.part.findMany({ where: { projectId }, include: { material: true } });
    const [laborItems, expenses] = await Promise.all([
      prisma.laborItem.findMany({ where: { projectId } }),
      prisma.expense.findMany({ where: { projectId } }),
    ]);

    const netUzunlukByMaterial = new Map<number, number>();
    for (const p of parcalar) {
      netUzunlukByMaterial.set(p.materialId, (netUzunlukByMaterial.get(p.materialId) ?? 0) + p.lengthMm * p.qty);
    }

    const uyarilar: string[] = [...kesimUyarilari];
    let materialCost = 0;
    let wasteCost = 0;
    const materialItems: { description: string; qty: number; unit: string; unitPrice: number; lineTotal: number }[] = [];

    const cuttingByMaterial = new Map(cuttingLists.map((c) => [c.materialId, c]));

    for (const [materialId, netLengthMm] of netUzunlukByMaterial) {
      const parca = parcalar.find((p) => p.materialId === materialId)!;
      const malzeme = parca.material;
      const kesim = cuttingByMaterial.get(materialId);

      if (kesim) {
        const { netCost, wasteCost: parcaFire, boughtCost, uyari } = calculateMaterialLineCost(
          malzeme,
          netLengthMm,
          kesim.totalBars
        );
        if (uyari) uyarilar.push(uyari);
        materialCost += netCost;
        wasteCost += parcaFire;
        materialItems.push({
          description: `${malzeme.name}${malzeme.section ? " (" + malzeme.section + ")" : ""}`,
          qty: kesim.totalBars,
          unit: `adet x ${malzeme.standardLengthM}m çubuk`,
          unitPrice: kesim.totalBars > 0 ? Math.round((boughtCost / kesim.totalBars) * 100) / 100 : 0,
          lineTotal: Math.round(boughtCost * 100) / 100,
        });
      } else {
        // Kesim planı oluşturulamayan malzemeler (örn. standart boy tanımsız) için sadece net maliyet.
        const { value: mmFiyat, uyari } = costPerMm(malzeme);
        if (uyari) uyarilar.push(uyari);
        const netCost = Math.round(netLengthMm * mmFiyat * 100) / 100;
        materialCost += netCost;
        materialItems.push({
          description: `${malzeme.name}${malzeme.section ? " (" + malzeme.section + ")" : ""}`,
          qty: Math.round((netLengthMm / 1000) * 100) / 100,
          unit: "m",
          unitPrice: malzeme.unit === "KG" ? malzeme.unitPrice : malzeme.unitPrice,
          lineTotal: netCost,
        });
      }
    }

    const consumableCost = expenses.filter((e) => e.type === "CONSUMABLE").reduce((s, e) => s + e.amount, 0);
    const laborCost = laborItems.reduce((s, l) => s + l.amount, 0);
    const paintCost = expenses.filter((e) => e.type === "PAINT").reduce((s, e) => s + e.amount, 0);
    const transportCost = expenses.filter((e) => e.type === "TRANSPORT").reduce((s, e) => s + e.amount, 0);
    const installCost = expenses.filter((e) => e.type === "INSTALLATION").reduce((s, e) => s + e.amount, 0);
    const otherCost = expenses.filter((e) => e.type === "OTHER").reduce((s, e) => s + e.amount, 0);

    const maliyet = calculateCost({
      materialCost,
      wasteCost,
      consumableCost,
      laborCost,
      paintCost,
      transportCost,
      installCost,
      otherCost,
      overheadPercent: proje.overheadPercent,
      profitMode: proje.profitMode as "PERCENT" | "FIXED",
      profitValue: proje.profitValue,
      vatPercent: proje.vatPercent,
    });

    const quoteNumber = await siradakiTeklifNo();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + proje.validityDays);

    const items: { type: "MATERIAL" | "LABOR" | "EXPENSE"; description: string; qty: number; unit: string; unitPrice: number; lineTotal: number }[] = [
      ...materialItems.map((m) => ({ type: "MATERIAL" as const, ...m })),
      ...laborItems.map((l) => ({
        type: "LABOR" as const,
        description: `${LABOR_LABEL[l.type]}${l.description ? " - " + l.description : ""}`,
        qty: l.hours ?? 1,
        unit: l.hours != null ? "saat" : "sabit",
        unitPrice: l.rate ?? l.amount,
        lineTotal: l.amount,
      })),
      ...expenses.map((e) => ({
        type: "EXPENSE" as const,
        description: `${EXPENSE_LABEL[e.type]} - ${e.name}`,
        qty: 1,
        unit: "TL",
        unitPrice: e.amount,
        lineTotal: e.amount,
      })),
    ];

    const quote = await prisma.quote.create({
      data: {
        projectId,
        quoteNumber,
        validUntil,
        status: "DRAFT",
        ...maliyet,
        items: { create: items },
      },
      include: { items: true },
    });

    await prisma.project.updateMany({
      where: { id: projectId, status: { in: ["DRAFT", "CALCULATED"] } },
      data: { status: "QUOTE_READY" },
    });

    res.status(201).json({ quote, uyarilar });
  })
);

const LABOR_LABEL: Record<string, string> = {
  WELDING: "Kaynak",
  CUTTING: "Kesim",
  ASSEMBLY: "Montaj",
  PAINTING: "Boya",
  OTHER: "Diğer işçilik",
};

const EXPENSE_LABEL: Record<string, string> = {
  TRANSPORT: "Nakliye",
  INSTALLATION: "Montaj gideri",
  PAINT: "Boya malzemesi",
  CONSUMABLE: "Sarf malzeme",
  OTHER: "Diğer gider",
};

export default router;
