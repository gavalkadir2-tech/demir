import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";
import { calculateLaborAmount } from "../calc/costing";

const router = Router({ mergeParams: true });

const LABOR_TYPES = ["WELDING", "CUTTING", "ASSEMBLY", "PAINTING", "OTHER"] as const;

const iscilikSchema = z.object({
  type: z.enum(LABOR_TYPES).default("OTHER"),
  description: z.string().optional().nullable(),
  hours: z.number().nonnegative().optional(),
  rate: z.number().nonnegative().optional(),
  fixedAmount: z.number().nonnegative().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const kalemler = await prisma.laborItem.findMany({
      where: { projectId: Number(req.params.projectId) },
      orderBy: { createdAt: "asc" },
    });
    res.json(kalemler);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = iscilikSchema.parse(req.body);
    const amount = calculateLaborAmount(data);
    const kalem = await prisma.laborItem.create({
      data: { ...data, amount, projectId: Number(req.params.projectId) },
    });
    res.status(201).json(kalem);
  })
);

router.put(
  "/:laborId",
  asyncHandler(async (req, res) => {
    const data = iscilikSchema.partial().parse(req.body);
    const mevcut = await prisma.laborItem.findUniqueOrThrow({ where: { id: Number(req.params.laborId) } });
    const birlesik = {
      hours: data.hours ?? mevcut.hours ?? undefined,
      rate: data.rate ?? mevcut.rate ?? undefined,
      fixedAmount: data.fixedAmount ?? mevcut.fixedAmount ?? undefined,
    };
    const amount = calculateLaborAmount(birlesik);
    const kalem = await prisma.laborItem.update({ where: { id: mevcut.id }, data: { ...data, amount } });
    res.json(kalem);
  })
);

router.delete(
  "/:laborId",
  asyncHandler(async (req, res) => {
    await prisma.laborItem.delete({ where: { id: Number(req.params.laborId) } });
    res.status(204).end();
  })
);

export default router;
