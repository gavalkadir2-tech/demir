import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";

const router = Router();

const ayarSchema = z.object({
  companyName: z.string().min(1).optional(),
  logoUrl: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  taxNumber: z.string().optional().nullable(),
  defaultVatPercent: z.number().nonnegative().optional(),
  defaultProfitPercent: z.number().optional(),
  currency: z.string().optional(),
  quoteValidityDays: z.number().int().positive().optional(),
});

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const ayarlar = await prisma.settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
    res.json(ayarlar);
  })
);

router.put(
  "/",
  asyncHandler(async (req, res) => {
    const data = ayarSchema.parse(req.body);
    const ayarlar = await prisma.settings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
    res.json(ayarlar);
  })
);

export default router;
