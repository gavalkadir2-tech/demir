import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";

const router = Router();

const AY_ADI = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const ayBasi = new Date(now.getFullYear(), now.getMonth(), 1);
    const ayBitis = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      aktifIsler,
      bekleyenTeklifler,
      buAyTamamlanan,
      buAyKabulEdilenTeklifler,
      kritikStoklar,
      sonIsler,
      gecikmisIsler,
      yaklasanIsler,
      alacakliProjeler,
    ] = await Promise.all([
        prisma.project.count({ where: { status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
        prisma.project.count({ where: { status: { in: ["QUOTE_READY", "QUOTE_SENT"] } } }),
        prisma.project.count({ where: { status: "COMPLETED", updatedAt: { gte: ayBasi, lt: ayBitis } } }),
        prisma.quote.findMany({
          where: { status: "ACCEPTED", date: { gte: ayBasi, lt: ayBitis } },
          select: { total: true, profitAmount: true },
        }),
        prisma.material.findMany({
          where: { minStockQty: { gt: 0 } },
          orderBy: { name: "asc" },
        }),
        prisma.project.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { customer: { select: { name: true } } },
        }),
        prisma.project.findMany({
          where: { dueDate: { lt: now }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
          orderBy: { dueDate: "asc" },
          include: { customer: { select: { name: true } } },
        }),
        prisma.project.findMany({
          where: {
            dueDate: { gte: now, lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) },
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
          orderBy: { dueDate: "asc" },
          include: { customer: { select: { name: true } } },
        }),
        prisma.project.findMany({
          where: { status: { not: "CANCELLED" }, quotes: { some: { status: "ACCEPTED" } } },
          include: {
            quotes: { where: { status: "ACCEPTED" }, orderBy: { createdAt: "desc" }, take: 1 },
            payments: { select: { amount: true } },
          },
        }),
      ]);

    const buAyToplamSatis = buAyKabulEdilenTeklifler.reduce((s, q) => s + q.total, 0);
    const tahminiKar = buAyKabulEdilenTeklifler.reduce((s, q) => s + q.profitAmount, 0);
    const kritikStoklarFiltreli = kritikStoklar.filter((m) => m.stockQty <= m.minStockQty);
    const toplamAlacak = alacakliProjeler.reduce((s, p) => {
      const satis = p.quotes[0]?.total ?? 0;
      const tahsilat = p.payments.reduce((a, pay) => a + pay.amount, 0);
      return s + Math.max(0, satis - tahsilat);
    }, 0);

    res.json({
      aktifIsler,
      bekleyenTeklifler,
      buAyYapilanIsler: buAyTamamlanan,
      buAyToplamSatis: Math.round(buAyToplamSatis * 100) / 100,
      tahminiKar: Math.round(tahminiKar * 100) / 100,
      toplamAlacak: Math.round(toplamAlacak * 100) / 100,
      kritikStoklar: kritikStoklarFiltreli,
      sonIsler,
      gecikmisIsler,
      yaklasanIsler,
    });
  })
);

/** Son 6 ay için kabul edilen tekliflerden ciro/kâr trendi. */
router.get(
  "/aylik-trend",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const baslangic = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const teklifler = await prisma.quote.findMany({
      where: { status: "ACCEPTED", date: { gte: baslangic } },
      select: { total: true, profitAmount: true, date: true },
    });

    const aylar: { ay: string; ciro: number; kar: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const ayBasi = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ayBitis = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const buAyTeklifleri = teklifler.filter((t) => t.date >= ayBasi && t.date < ayBitis);
      aylar.push({
        ay: `${AY_ADI[ayBasi.getMonth()]} ${ayBasi.getFullYear() !== now.getFullYear() ? "'" + String(ayBasi.getFullYear()).slice(2) : ""}`.trim(),
        ciro: Math.round(buAyTeklifleri.reduce((s, t) => s + t.total, 0) * 100) / 100,
        kar: Math.round(buAyTeklifleri.reduce((s, t) => s + t.profitAmount, 0) * 100) / 100,
      });
    }
    res.json(aylar);
  })
);

/** En çok kullanılan malzemeler (toplam metraj/adet bazında, tüm işler genelinde) - top 8. */
router.get(
  "/en-cok-kullanilan-malzemeler",
  asyncHandler(async (_req, res) => {
    const tumParcalar = await prisma.part.findMany({ select: { materialId: true, lengthMm: true, qty: true } });
    const toplamMap = new Map<number, number>();
    for (const p of tumParcalar) {
      toplamMap.set(p.materialId, (toplamMap.get(p.materialId) ?? 0) + (p.lengthMm * p.qty) / 1000);
    }
    const materialIds = Array.from(toplamMap.keys());
    const malzemeler = await prisma.material.findMany({ where: { id: { in: materialIds } } });
    const sonuc = malzemeler
      .map((m) => ({ id: m.id, name: m.name, toplamMetre: Math.round((toplamMap.get(m.id) ?? 0) * 100) / 100 }))
      .sort((a, b) => b.toplamMetre - a.toplamMetre)
      .slice(0, 8);
    res.json(sonuc);
  })
);

/** Ürün kategorisi bazında toplam kabul edilen teklif geliri - hangi ürün türü ne kadar kazandırıyor. */
router.get(
  "/kategori-karliligi",
  asyncHandler(async (_req, res) => {
    const teklifler = await prisma.quote.findMany({
      where: { status: "ACCEPTED" },
      select: { total: true, profitAmount: true, project: { select: { category: true } } },
    });
    const map = new Map<string, { ciro: number; kar: number }>();
    for (const t of teklifler) {
      const kategori = t.project.category;
      const mevcut = map.get(kategori) ?? { ciro: 0, kar: 0 };
      mevcut.ciro += t.total;
      mevcut.kar += t.profitAmount;
      map.set(kategori, mevcut);
    }
    const sonuc = Array.from(map.entries())
      .map(([kategori, v]) => ({ kategori, ciro: Math.round(v.ciro * 100) / 100, kar: Math.round(v.kar * 100) / 100 }))
      .sort((a, b) => b.ciro - a.ciro);
    res.json(sonuc);
  })
);

export default router;
