import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";

const router = Router();

const isciSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const sadeceAktif = req.query.active === "true";
    const isciler = await prisma.worker.findMany({
      where: sadeceAktif ? { active: true } : undefined,
      orderBy: { name: "asc" },
    });
    res.json(isciler);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = isciSchema.parse(req.body);
    const isci = await prisma.worker.create({ data });
    res.status(201).json(isci);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = isciSchema.partial().parse(req.body);
    const isci = await prisma.worker.update({ where: { id: Number(req.params.id) }, data });
    res.json(isci);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.worker.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  })
);

export default router;
