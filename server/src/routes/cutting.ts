import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";
import { generateCuttingListsForProject } from "../lib/cuttingService";

const router = Router({ mergeParams: true });

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
    const sonuc = await generateCuttingListsForProject(Number(req.params.projectId));
    res.json(sonuc);
  })
);

export default router;
