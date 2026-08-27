import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiHatasi } from "../lib/errors";

const router = Router({ mergeParams: true });

const IZIN_VERILEN_RESIM_TURLERI = new Set(["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"]);
const MAKS_BASE64_UZUNLUK = 12_000_000; // ~9 MB ham veri

const FAZLAR = ["KESIF", "URETIM", "BOYA", "MONTAJ", "SON_HALI", "DIGER"] as const;

const fotoSchema = z.object({
  imageBase64: z.string().min(1, "Fotoğraf verisi eksik."),
  mimeType: z.string(),
  caption: z.string().max(200).optional(),
  phase: z.enum(FAZLAR).optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const fotograflar = await prisma.projectPhoto.findMany({
      where: { projectId: Number(req.params.projectId) },
      orderBy: { createdAt: "desc" },
    });
    res.json(fotograflar);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { imageBase64, mimeType, caption, phase } = fotoSchema.parse(req.body);
    if (!IZIN_VERILEN_RESIM_TURLERI.has(mimeType)) {
      throw new ApiHatasi(400, "Desteklenmeyen dosya türü. Lütfen bir fotoğraf (JPEG/PNG/WEBP) yükleyin.");
    }
    const ham = imageBase64.includes(",") ? imageBase64.slice(imageBase64.indexOf(",") + 1) : imageBase64;
    if (ham.length > MAKS_BASE64_UZUNLUK) {
      throw new ApiHatasi(413, "Fotoğraf çok büyük. Lütfen daha küçük boyutlu bir fotoğraf yükleyin (maks. ~9 MB).");
    }
    const foto = await prisma.projectPhoto.create({
      data: { projectId: Number(req.params.projectId), dataBase64: ham, mimeType, caption, phase: phase ?? "DIGER" },
    });
    res.status(201).json(foto);
  })
);

router.delete(
  "/:photoId",
  asyncHandler(async (req, res) => {
    await prisma.projectPhoto.delete({ where: { id: Number(req.params.photoId) } });
    res.status(204).end();
  })
);

export default router;
