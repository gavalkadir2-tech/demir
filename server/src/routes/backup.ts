import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";

const router = Router();

// Tüm verinin tek bir JSON dosyasına dökülmesi - Render/Postgres'in kendi otomatik yedeklerine
// ek olarak, kullanıcının elle indirip saklayabileceği basit bir "yedekleme" seçeneği.
router.get(
  "/export",
  asyncHandler(async (_req, res) => {
    const [customers, projects, materials, workers, productTemplates, settings] = await Promise.all([
      prisma.customer.findMany({ include: { notes: true } }),
      prisma.project.findMany({
        include: {
          items: true,
          parts: true,
          laborItems: true,
          expenses: true,
          payments: true,
          cuttingLists: true,
          quotes: { include: { items: true } },
          tasks: true,
          photos: true,
        },
      }),
      prisma.material.findMany(),
      prisma.worker.findMany(),
      prisma.productTemplate.findMany(),
      prisma.settings.findUnique({ where: { id: 1 } }),
    ]);

    const dosyaAdi = `demirci-atolye-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${dosyaAdi}"`);
    res.json({
      olusturulmaTarihi: new Date().toISOString(),
      customers,
      projects,
      materials,
      workers,
      productTemplates,
      settings,
    });
  })
);

export default router;
