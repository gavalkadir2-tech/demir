import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";

const router = Router({ mergeParams: true });

const parcaSchema = z.object({
  materialId: z.number().int(),
  label: z.string().optional().nullable(),
  lengthMm: z.number().positive(),
  qty: z.number().int().positive(),
  note: z.string().optional().nullable(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const parcalar = await prisma.part.findMany({
      where: { projectId: Number(req.params.projectId) },
      include: { material: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(parcalar);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const projectId = Number(req.params.projectId);
    const data = parcaSchema.parse(req.body);

    // Not: parça uzunluğu malzemenin standart (veya alternatif) stok boyundan uzun olabilir -
    // kesim planı bu durumda parçayı otomatik olarak ek (kaynaklı birleştirme) parçalarına böler,
    // bkz. calc/cutting.ts optimizeCutting. Bu yüzden burada uzunluk üst sınırı uygulanmaz.
    const parca = await prisma.part.create({ data: { ...data, projectId }, include: { material: true } });
    await prisma.project.updateMany({ where: { id: projectId, status: "DRAFT" }, data: { status: "CALCULATED" } });
    res.status(201).json(parca);
  })
);

router.put(
  "/:partId",
  asyncHandler(async (req, res) => {
    const data = parcaSchema.partial().parse(req.body);
    const parca = await prisma.part.update({
      where: { id: Number(req.params.partId) },
      data,
      include: { material: true },
    });
    res.json(parca);
  })
);

router.delete(
  "/:partId",
  asyncHandler(async (req, res) => {
    await prisma.part.delete({ where: { id: Number(req.params.partId) } });
    res.status(204).end();
  })
);

export default router;
