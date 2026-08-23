import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiHatasi } from "../lib/errors";

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

    const malzeme = await prisma.material.findUniqueOrThrow({ where: { id: data.materialId } });
    if (malzeme.standardLengthM && data.lengthMm > malzeme.standardLengthM * 1000) {
      throw new ApiHatasi(
        400,
        `Bu parça (${data.lengthMm} mm), "${malzeme.name}" malzemesinin standart boyundan (${
          malzeme.standardLengthM * 1000
        } mm) uzun; tek parça olarak kesilemez.`
      );
    }

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
