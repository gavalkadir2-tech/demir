// Uygulama içi bildirimler - kalıcı bir DB kaydı tutulmaz, her istekte mevcut duruma göre canlı
// hesaplanır (düşük stok, süresi dolan/dolmak üzere teklifler, teslim tarihi geçen/yaklaşan işler).
// Bu sayede bildirim listesi her zaman güncel veriyle tutarlıdır ve ayrı bir "okundu" durumu
// yönetimi gerektirmez.

import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";

const router = Router();

const UC_GUN_MS = 3 * 24 * 60 * 60 * 1000;

export type BildirimTuru =
  | "DUSUK_STOK"
  | "TEKLIF_SURESI_DOLDU"
  | "TEKLIF_SURESI_YAKLASIYOR"
  | "IS_TESLIMI_GECIKTI"
  | "IS_TESLIMI_YAKLASIYOR";

export interface Bildirim {
  id: string;
  tur: BildirimTuru;
  onem: "kritik" | "uyari";
  baslik: string;
  mesaj: string;
  link: string;
}

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const ucGunSonra = new Date(now.getTime() + UC_GUN_MS);

    const [dusukStokAdaylari, suresiGecenTeklifler, suresiYaklasanTeklifler, gecikmisIsler, yaklasanIsler] = await Promise.all([
      prisma.material.findMany({ where: { minStockQty: { gt: 0 } } }),
      prisma.quote.findMany({
        where: { status: { in: ["DRAFT", "SENT"] }, validUntil: { lt: now } },
        include: { project: { select: { id: true, title: true } } },
        orderBy: { validUntil: "asc" },
      }),
      prisma.quote.findMany({
        where: { status: { in: ["DRAFT", "SENT"] }, validUntil: { gte: now, lte: ucGunSonra } },
        include: { project: { select: { id: true, title: true } } },
        orderBy: { validUntil: "asc" },
      }),
      prisma.project.findMany({
        where: { dueDate: { lt: now }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
        include: { customer: { select: { name: true } } },
        orderBy: { dueDate: "asc" },
      }),
      prisma.project.findMany({
        where: { dueDate: { gte: now, lte: ucGunSonra }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
        include: { customer: { select: { name: true } } },
        orderBy: { dueDate: "asc" },
      }),
    ]);

    const bildirimler: Bildirim[] = [];

    for (const m of dusukStokAdaylari.filter((m) => m.stockQty <= m.minStockQty)) {
      bildirimler.push({
        id: `stok-${m.id}`,
        tur: "DUSUK_STOK",
        onem: m.stockQty <= 0 ? "kritik" : "uyari",
        baslik: "Düşük stok",
        mesaj: `"${m.name}" stoku ${m.stockQty} ${m.unit} - minimum ${m.minStockQty} ${m.unit}.`,
        link: "/malzemeler",
      });
    }

    for (const q of suresiGecenTeklifler) {
      bildirimler.push({
        id: `teklif-gecti-${q.id}`,
        tur: "TEKLIF_SURESI_DOLDU",
        onem: "kritik",
        baslik: "Teklif süresi doldu",
        mesaj: `"${q.project.title}" işi için ${q.quoteNumber} numaralı teklifin geçerlilik süresi doldu.`,
        link: `/teklifler/${q.id}`,
      });
    }

    for (const q of suresiYaklasanTeklifler) {
      const kalanGun = Math.max(0, Math.ceil((q.validUntil.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
      bildirimler.push({
        id: `teklif-yaklasan-${q.id}`,
        tur: "TEKLIF_SURESI_YAKLASIYOR",
        onem: "uyari",
        baslik: "Teklif süresi yaklaşıyor",
        mesaj: `"${q.project.title}" işi için ${q.quoteNumber} numaralı teklifin süresi ${kalanGun} gün içinde doluyor.`,
        link: `/teklifler/${q.id}`,
      });
    }

    for (const p of gecikmisIsler) {
      bildirimler.push({
        id: `is-gecikti-${p.id}`,
        tur: "IS_TESLIMI_GECIKTI",
        onem: "kritik",
        baslik: "Teslim tarihi geçti",
        mesaj: `"${p.title}" (${p.customer.name}) işinin planlanan teslim tarihi geçti.`,
        link: `/isler/${p.id}`,
      });
    }

    for (const p of yaklasanIsler) {
      const kalanGun = p.dueDate ? Math.max(0, Math.ceil((p.dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))) : 0;
      bildirimler.push({
        id: `is-yaklasan-${p.id}`,
        tur: "IS_TESLIMI_YAKLASIYOR",
        onem: "uyari",
        baslik: "Teslim tarihi yaklaşıyor",
        mesaj: `"${p.title}" (${p.customer.name}) işinin teslim tarihine ${kalanGun} gün kaldı.`,
        link: `/isler/${p.id}`,
      });
    }

    bildirimler.sort((a, b) => (a.onem === b.onem ? 0 : a.onem === "kritik" ? -1 : 1));

    res.json(bildirimler);
  })
);

export default router;
