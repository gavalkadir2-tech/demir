import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";
import { parcaAgirlikKg, sacKalemleriAgirlikKg, yuvarla1 } from "../calc/weight";
import { sarfTahminiHesapla } from "../calc/consumables";
import { UrunHesapSonucu } from "../calc/types";

import projectItemsRouter from "./projectItems";
import partsRouter from "./parts";
import laborRouter from "./labor";
import expensesRouter from "./expenses";
import paymentsRouter from "./payments";
import cuttingRouter from "./cutting";
import quotesRouter from "./quotes";
import stockRouter from "./stock";
import productionTasksRouter from "./productionTasks";
import projectPhotosRouter from "./projectPhotos";

const router = Router();

const PROJECT_CATEGORIES = [
  "RAILING",
  "STAIRS",
  "CANOPY",
  "ROOF",
  "DOOR",
  "FORGE",
  "STEEL_STRUCTURE",
  "CONTAINER",
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

const PROJECT_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

const projeSchema = z.object({
  customerId: z.number().int(),
  title: z.string().min(1),
  category: z.enum(PROJECT_CATEGORIES).default("OTHER"),
  note: z.string().optional().nullable(),
  date: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.enum(PROJECT_PRIORITIES).optional(),
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
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    // Varsayılan olarak çöp kutusundaki (deletedAt dolu) işler listede görünmez;
    // ?trash=true verilirse sadece çöp kutusundakiler döner (Çöp Kutusu sayfası için).
    const trash = req.query.trash === "true";
    const projeler = await prisma.project.findMany({
      where: {
        deletedAt: trash ? { not: null } : null,
        ...(status ? { status: status as any } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { customer: { name: { contains: q, mode: "insensitive" } } },
                { customer: { phone: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
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
        payments: { orderBy: { date: "desc" } },
        cuttingLists: { include: { material: true }, orderBy: { generatedAt: "desc" } },
        quotes: { orderBy: { createdAt: "desc" } },
        tasks: { include: { worker: true }, orderBy: { order: "asc" } },
        photos: { orderBy: { createdAt: "desc" } },
      },
    });

    let profilAgirlikKg = 0;
    let eksikAgirlikVerisi = false;
    for (const p of proje.parts) {
      if (p.material.unitWeightKgPerM) {
        profilAgirlikKg += parcaAgirlikKg(p.lengthMm, p.qty, p.material.unitWeightKgPerM);
      } else {
        eksikAgirlikVerisi = true;
      }
    }
    let sacAgirlikKg = 0;
    for (const item of proje.items) {
      const sonuc = item.resultJson as unknown as UrunHesapSonucu | null;
      if (!sonuc?.sacKalemleri?.length) continue;
      sacAgirlikKg += sacKalemleriAgirlikKg(sonuc.sacKalemleri);
    }

    const sarfTahmini = sarfTahminiHesapla(
      profilAgirlikKg,
      proje.parts.map((p) => ({ lengthMm: p.lengthMm, qty: p.qty, kesit: p.material }))
    );

    res.json({
      ...proje,
      agirlikOzeti: {
        profilAgirlikKg: yuvarla1(profilAgirlikKg),
        sacAgirlikKg: yuvarla1(sacAgirlikKg),
        toplamAgirlikKg: yuvarla1(profilAgirlikKg + sacAgirlikKg),
        eksikAgirlikVerisi,
      },
      sarfTahmini,
    });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = projeSchema.parse(req.body);
    const proje = await prisma.project.create({
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
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
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
        dueDate: data.dueDate === undefined ? undefined : data.dueDate ? new Date(data.dueDate) : null,
        // Kategori bazlı "tahmini teslim süresi" hesabı için gerçek tamamlanma anını kaydet.
        completedAt: data.status === undefined ? undefined : data.status === "COMPLETED" ? new Date() : null,
      },
    });
    res.json(proje);
  })
);

// Çöpe taşı (soft delete) - işi kalıcı olarak silmez, sadece deletedAt işaretler.
// İşler listesinden kaybolur, Çöp Kutusu'ndan geri yüklenebilir veya kalıcı silinebilir.
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.project.update({ where: { id: Number(req.params.id) }, data: { deletedAt: new Date() } });
    res.status(204).end();
  })
);

router.post(
  "/:id/restore",
  asyncHandler(async (req, res) => {
    const proje = await prisma.project.update({ where: { id: Number(req.params.id) }, data: { deletedAt: null } });
    res.json(proje);
  })
);

// Kalıcı silme - sadece çöp kutusundaki (deletedAt dolu) işler için. Bilerek deletedAt kontrolü
// yapılmıyor (çöp kutusu UI'ı sadece oradaki işler için bu aksiyonu gösterir); route yine de
// gerçek bir prisma.delete olduğundan geri alınamaz.
router.delete(
  "/:id/permanent",
  asyncHandler(async (req, res) => {
    await prisma.project.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  })
);

router.use("/:projectId/items", projectItemsRouter);
router.use("/:projectId/parts", partsRouter);
router.use("/:projectId/labor", laborRouter);
router.use("/:projectId/expenses", expensesRouter);
router.use("/:projectId/payments", paymentsRouter);
router.use("/:projectId/cutting", cuttingRouter);
router.use("/:projectId/quotes", quotesRouter);
router.use("/:projectId/stock", stockRouter);
router.use("/:projectId/tasks", productionTasksRouter);
router.use("/:projectId/photos", projectPhotosRouter);

export default router;
