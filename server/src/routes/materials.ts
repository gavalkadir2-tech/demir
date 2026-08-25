import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";

const router = Router();

const malzemeSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["PROFILE", "SHEET", "CONSUMABLE", "FASTENER", "OTHER"]).default("PROFILE"),
  section: z.string().optional().nullable(),
  thicknessMm: z.number().nonnegative().optional().nullable(),
  standardLengthM: z.number().positive().optional().nullable(),
  alternatifBoylarM: z.array(z.number().positive()).optional(),
  sheetWidthMm: z.number().positive().optional().nullable(),
  sheetHeightMm: z.number().positive().optional().nullable(),
  // Profil kesit tipi (kutu/köşebent/kanal/yuvarlak/boru/lama) - alt kategori filtresi ve yapısal
  // hesap (mukavemet kontrolü) için kullanılır. Sadece category=PROFILE için anlamlıdır.
  profilSekli: z.enum(["BOX", "ANGLE", "CHANNEL", "ROUND_SOLID", "ROUND_PIPE", "FLAT"]).optional().nullable(),
  widthMm: z.number().positive().optional().nullable(),
  heightMm: z.number().positive().optional().nullable(),
  unit: z.enum(["M", "KG", "ADET", "M2"]).default("M"),
  unitPrice: z.number().nonnegative(),
  unitWeightKgPerM: z.number().nonnegative().optional().nullable(),
  kgPerM2: z.number().nonnegative().optional().nullable(),
  kerfMm: z.number().nonnegative().default(3),
  stockQty: z.number().nonnegative().default(0),
  minStockQty: z.number().nonnegative().default(0),
  supplier: z.string().optional().nullable(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const profilSekli = typeof req.query.profilSekli === "string" ? req.query.profilSekli : undefined;
    const malzemeler = await prisma.material.findMany({
      where: {
        AND: [
          q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { section: { contains: q, mode: "insensitive" } }] } : {},
          category ? { category: category as any } : {},
          profilSekli ? { profilSekli: profilSekli as any } : {},
        ],
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    res.json(malzemeler);
  })
);

router.get(
  "/kritik-stok",
  asyncHandler(async (_req, res) => {
    const malzemeler = await prisma.$queryRaw`
      SELECT * FROM materials WHERE "stockQty" <= "minStockQty" AND "minStockQty" > 0 ORDER BY name ASC
    `;
    res.json(malzemeler);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const malzeme = await prisma.material.findUniqueOrThrow({
      where: { id: Number(req.params.id) },
      include: { priceHistory: { orderBy: { effectiveDate: "desc" }, take: 20 } },
    });
    res.json(malzeme);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = malzemeSchema.parse(req.body);
    const malzeme = await prisma.material.create({
      data: { ...data, priceHistory: { create: { price: data.unitPrice } } },
    });
    res.status(201).json(malzeme);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = malzemeSchema.partial().parse(req.body);
    const id = Number(req.params.id);
    const mevcut = await prisma.material.findUniqueOrThrow({ where: { id } });

    const malzeme = await prisma.material.update({
      where: { id },
      data: {
        ...data,
        ...(data.unitPrice != null && data.unitPrice !== mevcut.unitPrice
          ? { priceHistory: { create: { price: data.unitPrice } } }
          : {}),
      },
    });
    res.json(malzeme);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.material.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  })
);

router.get(
  "/:id/stock-movements",
  asyncHandler(async (req, res) => {
    const hareketler = await prisma.stockMovement.findMany({
      where: { materialId: Number(req.params.id) },
      orderBy: { createdAt: "desc" },
      include: { project: { select: { id: true, title: true } } },
    });
    res.json(hareketler);
  })
);

const stokAyarSchema = z.object({
  qtyDelta: z.number(),
  reason: z.string().min(1),
  supplier: z.string().optional(),
  unitCost: z.number().nonnegative().optional(),
});

router.post(
  "/:id/stock-adjust",
  asyncHandler(async (req, res) => {
    const { qtyDelta, reason, supplier, unitCost } = stokAyarSchema.parse(req.body);
    const id = Number(req.params.id);
    const [malzeme] = await prisma.$transaction([
      prisma.material.update({ where: { id }, data: { stockQty: { increment: qtyDelta } } }),
      prisma.stockMovement.create({ data: { materialId: id, qtyDelta, reason, supplier, unitCost } }),
    ]);
    res.json(malzeme);
  })
);

/** Bir tedarikçiden alınan fiyat teklifini kaydeder (unitPrice'ı değiştirmez, sadece karşılaştırma için loglar). */
const tedarikciFiyatSchema = z.object({ supplier: z.string().min(1), price: z.number().nonnegative() });

router.post(
  "/:id/tedarikci-fiyati",
  asyncHandler(async (req, res) => {
    const { supplier, price } = tedarikciFiyatSchema.parse(req.body);
    const fiyat = await prisma.materialPrice.create({
      data: { materialId: Number(req.params.id), supplier, price },
    });
    res.status(201).json(fiyat);
  })
);

/** Satın alma geçmişi: bu malzeme için tedarikçi bilgisiyle kaydedilmiş stok giriş hareketleri. */
router.get(
  "/:id/satin-alma-gecmisi",
  asyncHandler(async (req, res) => {
    const hareketler = await prisma.stockMovement.findMany({
      where: { materialId: Number(req.params.id), qtyDelta: { gt: 0 }, supplier: { not: null } },
      orderBy: { createdAt: "desc" },
    });
    res.json(hareketler);
  })
);

export default router;
