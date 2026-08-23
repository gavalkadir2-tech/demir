import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const ayBasi = new Date(now.getFullYear(), now.getMonth(), 1);
    const ayBitis = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [aktifIsler, bekleyenTeklifler, buAyTamamlanan, buAyKabulEdilenTeklifler, kritikStoklar, sonIsler] =
      await Promise.all([
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
      ]);

    const buAyToplamSatis = buAyKabulEdilenTeklifler.reduce((s, q) => s + q.total, 0);
    const tahminiKar = buAyKabulEdilenTeklifler.reduce((s, q) => s + q.profitAmount, 0);
    const kritikStoklarFiltreli = kritikStoklar.filter((m) => m.stockQty <= m.minStockQty);

    res.json({
      aktifIsler,
      bekleyenTeklifler,
      buAyYapilanIsler: buAyTamamlanan,
      buAyToplamSatis: Math.round(buAyToplamSatis * 100) / 100,
      tahminiKar: Math.round(tahminiKar * 100) / 100,
      kritikStoklar: kritikStoklarFiltreli,
      sonIsler,
    });
  })
);

export default router;
