import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";

const router = Router({ mergeParams: true });

const notSchema = z.object({ note: z.string().min(1) });

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const notlar = await prisma.customerNote.findMany({
      where: { customerId: Number(req.params.customerId) },
      orderBy: { createdAt: "desc" },
    });
    res.json(notlar);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = notSchema.parse(req.body);
    const not = await prisma.customerNote.create({ data: { ...data, customerId: Number(req.params.customerId) } });
    res.status(201).json(not);
  })
);

router.delete(
  "/:noteId",
  asyncHandler(async (req, res) => {
    await prisma.customerNote.delete({ where: { id: Number(req.params.noteId) } });
    res.status(204).end();
  })
);

export default router;
