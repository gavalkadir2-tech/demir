import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";

const router = Router({ mergeParams: true });

const TASK_TYPES = ["CUTTING", "WELDING", "PAINTING", "ASSEMBLY", "INSTALLATION", "OTHER"] as const;

const gorevSchema = z.object({
  type: z.enum(TASK_TYPES).default("OTHER"),
  label: z.string().min(1),
  order: z.number().int().optional(),
  workerId: z.number().int().nullable().optional(),
});

const VARSAYILAN_GOREVLER: { type: (typeof TASK_TYPES)[number]; label: string }[] = [
  { type: "CUTTING", label: "Kesim" },
  { type: "WELDING", label: "Kaynak" },
  { type: "PAINTING", label: "Boya" },
  { type: "ASSEMBLY", label: "Montaj" },
];

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const gorevler = await prisma.productionTask.findMany({
      where: { projectId: Number(req.params.projectId) },
      include: { worker: true },
      orderBy: { order: "asc" },
    });
    res.json(gorevler);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const projectId = Number(req.params.projectId);
    const data = gorevSchema.parse(req.body);
    const sonSira = await prisma.productionTask.count({ where: { projectId } });
    const gorev = await prisma.productionTask.create({
      data: { ...data, projectId, order: data.order ?? sonSira },
      include: { worker: true },
    });
    res.status(201).json(gorev);
  })
);

/** Varsayılan üretim checklist'ini (Kesim/Kaynak/Boya/Montaj) oluşturur - zaten görev varsa hiçbir şey yapmaz. */
router.post(
  "/varsayilan-olustur",
  asyncHandler(async (req, res) => {
    const projectId = Number(req.params.projectId);
    const mevcutSayi = await prisma.productionTask.count({ where: { projectId } });
    if (mevcutSayi > 0) {
      const gorevler = await prisma.productionTask.findMany({ where: { projectId }, include: { worker: true }, orderBy: { order: "asc" } });
      res.json(gorevler);
      return;
    }
    await prisma.productionTask.createMany({
      data: VARSAYILAN_GOREVLER.map((g, i) => ({ ...g, projectId, order: i })),
    });
    const gorevler = await prisma.productionTask.findMany({ where: { projectId }, include: { worker: true }, orderBy: { order: "asc" } });
    res.status(201).json(gorevler);
  })
);

router.put(
  "/:taskId",
  asyncHandler(async (req, res) => {
    const data = gorevSchema.partial().extend({ done: z.boolean().optional() }).parse(req.body);
    const { done, ...digerAlanlar } = data;
    const gorev = await prisma.productionTask.update({
      where: { id: Number(req.params.taskId) },
      data: {
        ...digerAlanlar,
        ...(done !== undefined ? { done, doneAt: done ? new Date() : null } : {}),
      },
      include: { worker: true },
    });
    res.json(gorev);
  })
);

router.delete(
  "/:taskId",
  asyncHandler(async (req, res) => {
    await prisma.productionTask.delete({ where: { id: Number(req.params.taskId) } });
    res.status(204).end();
  })
);

export default router;
