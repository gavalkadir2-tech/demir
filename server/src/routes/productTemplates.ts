import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const sablonlar = await prisma.productTemplate.findMany({ where: { active: true }, orderBy: { id: "asc" } });
    res.json(sablonlar);
  })
);

export default router;
