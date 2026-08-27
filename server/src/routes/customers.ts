import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";
import customerNotesRouter from "./customerNotes";

const router = Router();

const musteriSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const musteriler = await prisma.customer.findMany({
      where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
      orderBy: { name: "asc" },
      include: { _count: { select: { projects: true } } },
    });
    res.json(musteriler);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const musteri = await prisma.customer.findUniqueOrThrow({
      where: { id: Number(req.params.id) },
      include: {
        projects: {
          orderBy: { createdAt: "desc" },
          include: {
            quotes: { where: { status: "ACCEPTED" }, orderBy: { createdAt: "desc" }, take: 1 },
            payments: { select: { amount: true } },
          },
        },
        notes: { orderBy: { createdAt: "desc" } },
      },
    });
    res.json(musteri);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = musteriSchema.parse(req.body);
    const musteri = await prisma.customer.create({ data: { ...data, email: data.email || null } });
    res.status(201).json(musteri);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = musteriSchema.partial().parse(req.body);
    const musteri = await prisma.customer.update({
      where: { id: Number(req.params.id) },
      data: { ...data, email: data.email || null },
    });
    res.json(musteri);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.customer.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  })
);

router.use("/:customerId/notes", customerNotesRouter);

export default router;
