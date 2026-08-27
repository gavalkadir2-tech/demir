import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [toplamIsSayisi, kabulEdilenTeklifler, malzemeler, kesimListeleri] = await Promise.all([
      prisma.project.count(),
      prisma.quote.findMany({
        where: { status: "ACCEPTED" },
        select: { total: true, totalCost: true, profitAmount: true, date: true, project: { select: { category: true } } },
      }),
      prisma.material.findMany({ orderBy: { name: "asc" } }),
      prisma.cuttingList.findMany({ select: { materialId: true, wastePercent: true } }),
    ]);

    const toplamSatis = kabulEdilenTeklifler.reduce((s, q) => s + q.total, 0);
    const toplamMaliyet = kabulEdilenTeklifler.reduce((s, q) => s + q.totalCost, 0);
    const toplamKar = kabulEdilenTeklifler.reduce((s, q) => s + q.profitAmount, 0);

    // En çok kullanılan profil: parça uzunluk*adet toplamına göre (metraj bazlı) hesaplamak için ayrıca parts çekiyoruz.
    const parcalar = await prisma.part.findMany({ select: { materialId: true, lengthMm: true, qty: true } });
    const metrajMap = new Map<number, number>();
    for (const p of parcalar) {
      metrajMap.set(p.materialId, (metrajMap.get(p.materialId) ?? 0) + (p.lengthMm * p.qty) / 1000);
    }
    const enCokKullanilanProfil = Array.from(metrajMap.entries())
      .map(([materialId, toplamMetre]) => ({
        materialId,
        materialName: malzemeler.find((m) => m.id === materialId)?.name ?? "Bilinmeyen",
        toplamMetre: Math.round(toplamMetre * 100) / 100,
      }))
      .sort((a, b) => b.toplamMetre - a.toplamMetre)
      .slice(0, 5);

    const fireMap = new Map<number, number[]>();
    for (const k of kesimListeleri) {
      const arr = fireMap.get(k.materialId) ?? [];
      arr.push(k.wastePercent);
      fireMap.set(k.materialId, arr);
    }
    const fireOranlari = Array.from(fireMap.entries()).map(([materialId, oranlar]) => ({
      materialId,
      materialName: malzemeler.find((m) => m.id === materialId)?.name ?? "Bilinmeyen",
      ortalamaFireYuzde: Math.round((oranlar.reduce((a, b) => a + b, 0) / oranlar.length) * 100) / 100,
    }));

    const aylikMap = new Map<string, { satis: number; kar: number }>();
    for (const q of kabulEdilenTeklifler) {
      const key = `${q.date.getFullYear()}-${String(q.date.getMonth() + 1).padStart(2, "0")}`;
      const mevcut = aylikMap.get(key) ?? { satis: 0, kar: 0 };
      mevcut.satis += q.total;
      mevcut.kar += q.profitAmount;
      aylikMap.set(key, mevcut);
    }
    const aylikOzet = Array.from(aylikMap.entries())
      .map(([ay, v]) => ({ ay, satis: Math.round(v.satis * 100) / 100, kar: Math.round(v.kar * 100) / 100 }))
      .sort((a, b) => a.ay.localeCompare(b.ay));

    const tamamlananIsler = await prisma.project.findMany({
      where: { completedAt: { not: null } },
      select: { category: true, createdAt: true, completedAt: true },
    });
    const sureMap = new Map<string, number[]>();
    for (const p of tamamlananIsler) {
      if (!p.completedAt) continue;
      const gun = (p.completedAt.getTime() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const arr = sureMap.get(p.category) ?? [];
      arr.push(gun);
      sureMap.set(p.category, arr);
    }
    const tahminiSureler = Array.from(sureMap.entries())
      .map(([kategori, gunler]) => ({
        kategori,
        ortalamaGun: Math.round((gunler.reduce((a, b) => a + b, 0) / gunler.length) * 10) / 10,
        ornekSayisi: gunler.length,
      }))
      .sort((a, b) => b.ornekSayisi - a.ornekSayisi);

    // Kategori bazlı kârlılık (marj%) - "en kârlı / en az kârlı iş türleri" sıralaması için.
    const karMap = new Map<string, { ciro: number; kar: number; isSayisi: number }>();
    for (const q of kabulEdilenTeklifler) {
      const kategori = q.project.category;
      const mevcut = karMap.get(kategori) ?? { ciro: 0, kar: 0, isSayisi: 0 };
      mevcut.ciro += q.total;
      mevcut.kar += q.profitAmount;
      mevcut.isSayisi += 1;
      karMap.set(kategori, mevcut);
    }
    const kategoriKarliligi = Array.from(karMap.entries())
      .map(([kategori, v]) => ({
        kategori,
        ciro: Math.round(v.ciro * 100) / 100,
        kar: Math.round(v.kar * 100) / 100,
        marjYuzde: v.ciro > 0 ? Math.round((v.kar / v.ciro) * 1000) / 10 : 0,
        isSayisi: v.isSayisi,
      }))
      .sort((a, b) => b.marjYuzde - a.marjYuzde);

    res.json({
      toplamIsSayisi,
      toplamSatis: Math.round(toplamSatis * 100) / 100,
      toplamMaliyet: Math.round(toplamMaliyet * 100) / 100,
      toplamKar: Math.round(toplamKar * 100) / 100,
      enCokKullanilanProfil,
      stokDurumu: malzemeler.map((m) => ({ id: m.id, name: m.name, stockQty: m.stockQty, minStockQty: m.minStockQty, unit: m.unit })),
      fireOranlari,
      aylikOzet,
      tahminiSureler,
      kategoriKarliligi,
    });
  })
);

// Yeni iş oluştururken kategoriye göre "tahmini teslim süresi" ipucu göstermek için hafif uç nokta
// (tüm /reports gövdesini çekmeye gerek kalmadan).
router.get(
  "/tahmini-sureler",
  asyncHandler(async (_req, res) => {
    const tamamlananIsler = await prisma.project.findMany({
      where: { completedAt: { not: null } },
      select: { category: true, createdAt: true, completedAt: true },
    });
    const sureMap = new Map<string, number[]>();
    for (const p of tamamlananIsler) {
      if (!p.completedAt) continue;
      const gun = (p.completedAt.getTime() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const arr = sureMap.get(p.category) ?? [];
      arr.push(gun);
      sureMap.set(p.category, arr);
    }
    const tahminiSureler = Array.from(sureMap.entries()).map(([kategori, gunler]) => ({
      kategori,
      ortalamaGun: Math.round((gunler.reduce((a, b) => a + b, 0) / gunler.length) * 10) / 10,
      ornekSayisi: gunler.length,
    }));
    res.json(tahminiSureler);
  })
);

export default router;
