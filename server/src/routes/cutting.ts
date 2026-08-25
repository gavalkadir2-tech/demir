import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";
import { generateCuttingListsForProject, generateSheetNestingForProject } from "../lib/cuttingService";

const router = Router({ mergeParams: true });

const generateSchema = z.object({
  mod: z.enum(["malzeme", "parca"]).optional(),
});

const sacNestingSorguSchema = z.object({
  sheetWidthMm: z.coerce.number().positive().optional(),
  sheetHeightMm: z.coerce.number().positive().optional(),
  kerfMm: z.coerce.number().nonnegative().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const listeler = await prisma.cuttingList.findMany({
      where: { projectId: Number(req.params.projectId) },
      include: { material: true },
      orderBy: { generatedAt: "desc" },
    });
    res.json(listeler);
  })
);

router.post(
  "/generate",
  asyncHandler(async (req, res) => {
    const { mod } = generateSchema.parse(req.body ?? {});
    const sonuc = await generateCuttingListsForProject(Number(req.params.projectId), mod);
    res.json(sonuc);
  })
);

router.get(
  "/sac",
  asyncHandler(async (req, res) => {
    const { sheetWidthMm, sheetHeightMm, kerfMm } = sacNestingSorguSchema.parse(req.query);
    const sonuc = await generateSheetNestingForProject(
      Number(req.params.projectId),
      sheetWidthMm ?? 1250,
      sheetHeightMm ?? 2500,
      kerfMm ?? 3
    );
    res.json(sonuc);
  })
);

export default router;
