import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";

const router = Router({ mergeParams: true });

const tahsilatSchema = z.object({
  amount: z.number().positive(),
  date: z.string().datetime().optional(),
  note: z.string().max(200).optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const odemeler = await prisma.payment.findMany({
      where: { projectId: Number(req.params.projectId) },
      orderBy: { date: "desc" },
    });
    res.json(odemeler);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = tahsilatSchema.parse(req.body);
    const odeme = await prisma.payment.create({
      data: {
        projectId: Number(req.params.projectId),
        amount: data.amount,
        note: data.note,
        ...(data.date ? { date: new Date(data.date) } : {}),
      },
    });
    res.status(201).json(odeme);
  })
);

router.delete(
  "/:paymentId",
  asyncHandler(async (req, res) => {
    await prisma.payment.delete({ where: { id: Number(req.params.paymentId) } });
    res.status(204).end();
  })
);

export default router;
