import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";

import projectItemsRouter from "./projectItems";
import partsRouter from "./parts";
import laborRouter from "./labor";
import expensesRouter from "./expenses";
import cuttingRouter from "./cutting";
import quotesRouter from "./quotes";
import stockRouter from "./stock";

const router = Router();

const PROJECT_CATEGORIES = [
  "RAILING",
  "STAIRS",
  "CANOPY",
  "ROOF",
  "DOOR",
  "FORGE",
  "STEEL_STRUCTURE",
  "CHASSIS",
  "SHELF",
  "TABLE",
  "WORKBENCH",
  "CUSTOM",
  "OTHER",
] as const;

const PROJECT_STATUSES = [
  "DRAFT",
  "CALCULATED",
  "QUOTE_READY",
  "QUOTE_SENT",
  "APPROVED",
  "IN_PRODUCTION",
  "INSTALLING",
  "COMPLETED",
  "CANCELLED",
] as const;

const projeSchema = z.object({
  customerId: z.number().int(),
  title: z.string().min(1),
  category: z.enum(PROJECT_CATEGORIES).default("OTHER"),
  note: z.string().optional().nullable(),
  date: z.string().datetime().optional(),
  laborMode: z.enum(["PER_METER", "PER_HOUR", "FIXED"]).optional(),
  laborRate: z.number().nonnegative().optional(),
  overheadPercent: z.number().nonnegative().optional(),
  profitMode: z.enum(["PERCENT", "FIXED"]).optional(),
  profitValue: z.number().optional(),
  vatPercent: z.number().nonnegative().optional(),
  validityDays: z.number().int().positive().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const projeler = await prisma.project.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true } },
        _count: { select: { parts: true } },
        quotes: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    res.json(projeler);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const proje = await prisma.project.findUniqueOrThrow({
      where: { id: Number(req.params.id) },
      include: {
        customer: true,
        items: { include: { template: true }, orderBy: { createdAt: "asc" } },
        parts: { include: { material: true }, orderBy: { createdAt: "asc" } },
        laborItems: { orderBy: { createdAt: "asc" } },
        expenses: { orderBy: { createdAt: "asc" } },
        cuttingLists: { include: { material: true }, orderBy: { generatedAt: "desc" } },
        quotes: { orderBy: { createdAt: "desc" } },
      },
    });
    res.json(proje);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = projeSchema.parse(req.body);
    const proje = await prisma.project.create({
      data: { ...data, date: data.date ? new Date(data.date) : undefined },
    });
    res.status(201).json(proje);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = projeSchema.partial().extend({ status: z.enum(PROJECT_STATUSES).optional() }).parse(req.body);
    const proje = await prisma.project.update({
      where: { id: Number(req.params.id) },
      data: { ...data, date: data.date ? new Date(data.date) : undefined },
    });
    res.json(proje);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.project.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  })
);

router.use("/:projectId/items", projectItemsRouter);
router.use("/:projectId/parts", partsRouter);
router.use("/:projectId/labor", laborRouter);
router.use("/:projectId/expenses", expensesRouter);
router.use("/:projectId/cutting", cuttingRouter);
router.use("/:projectId/quotes", quotesRouter);
router.use("/:projectId/stock", stockRouter);

export default router;
