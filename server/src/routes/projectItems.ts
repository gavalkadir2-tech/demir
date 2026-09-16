import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiHatasi } from "../lib/errors";
import { calculateByTemplateKey } from "../calc";
import { HesaplananParca } from "../calc/types";
import { idToKey, TEMPLATE_SCHEMAS, CUSTOM_SCHEMA, malzemeSozlugu } from "./calc";

const router = Router({ mergeParams: true });

const gövdeSchema = z.object({
  templateKey: z.string(),
  name: z.string().min(1),
  params: z.record(z.any()),
});

/** sonuc.parcalar'dan Part.createMany için satır listesi üretir - profilKey sayısal bir Material
 * id'sine çevrilemiyorsa (örn. custom şablonun bazı serbest metin girişleri) o parça atlanır.
 * Tek tek tx.part.create() döngüsü yerine tek bir createMany çağrısı kullanılır - havuzlanmış
 * (pooled/PgBouncer) veritabanı bağlantılarında uzun süren interaktif transaction'lar "Transaction
 * not found" (P2028) hatasıyla kopabiliyor; çok sayıda ardışık round-trip yerine tek round-trip bu
 * riski ortadan kaldırır. */
function partSatirlariOlustur(parcalar: HesaplananParca[], projectId: number, projectItemId: number) {
  return parcalar
    .map((parca) => ({ materialId: Number(parca.profilKey), parca }))
    .filter((p): p is { materialId: number; parca: HesaplananParca } => !Number.isNaN(p.materialId))
    .map(({ materialId, parca }) => ({
      projectId,
      projectItemId,
      materialId,
      label: parca.label,
      lengthMm: parca.uzunlukMm,
      qty: parca.adet,
      note: parca.not,
    }));
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await prisma.projectItem.findMany({
      where: { projectId: Number(req.params.projectId) },
      include: { template: true, parts: { include: { material: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(items);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const projectId = Number(req.params.projectId);
    const { templateKey, name, params } = gövdeSchema.parse(req.body);

    const template = await prisma.productTemplate.findUnique({ where: { key: templateKey } });
    if (!template || !template.active) throw new ApiHatasi(404, `Bilinmeyen ürün şablonu: ${templateKey}`);

    let girdi: unknown;
    if (templateKey === "custom") {
      const parsed = CUSTOM_SCHEMA.parse(params);
      girdi = { parcalar: parsed.parcalar.map((p: any) => ({ ...p, profilKey: String(p.materialId) })) };
    } else {
      const schema = TEMPLATE_SCHEMAS[templateKey];
      if (!schema) throw new ApiHatasi(400, `"${templateKey}" şablonu için doğrulama şeması tanımlı değil.`);
      const parsed = schema.parse(params);
      girdi = idToKey(parsed as Record<string, unknown>);
    }

    const sonuc = calculateByTemplateKey(templateKey, girdi);

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.projectItem.create({
        data: {
          projectId,
          templateId: template.id,
          name,
          paramsJson: params,
          resultJson: sonuc as any,
        },
      });

      const partSatirlari = partSatirlariOlustur(sonuc.parcalar, projectId, created.id);
      if (partSatirlari.length > 0) {
        await tx.part.createMany({ data: partSatirlari });
      }

      await tx.project.updateMany({
        where: { id: projectId, status: "DRAFT" },
        data: { status: "CALCULATED" },
      });

      return created;
    });

    const malzemeler = await malzemeSozlugu(sonuc);
    res.status(201).json({ item, sonuc, malzemeler });
  })
);

router.put(
  "/:itemId",
  asyncHandler(async (req, res) => {
    const projectId = Number(req.params.projectId);
    const itemId = Number(req.params.itemId);
    const { name, params } = gövdeSchema.omit({ templateKey: true }).parse(req.body);

    const mevcut = await prisma.projectItem.findUniqueOrThrow({ where: { id: itemId }, include: { template: true } });
    const templateKey = mevcut.template.key;

    let girdi: unknown;
    if (templateKey === "custom") {
      const parsed = CUSTOM_SCHEMA.parse(params);
      girdi = { parcalar: parsed.parcalar.map((p: any) => ({ ...p, profilKey: String(p.materialId) })) };
    } else {
      const schema = TEMPLATE_SCHEMAS[templateKey];
      if (!schema) throw new ApiHatasi(400, `"${templateKey}" şablonu için doğrulama şeması tanımlı değil.`);
      const parsed = schema.parse(params);
      girdi = idToKey(parsed as Record<string, unknown>);
    }

    const sonuc = calculateByTemplateKey(templateKey, girdi);

    const item = await prisma.$transaction(async (tx) => {
      await tx.part.deleteMany({ where: { projectItemId: itemId } });

      const updated = await tx.projectItem.update({
        where: { id: itemId },
        data: { name, paramsJson: params, resultJson: sonuc as any },
      });

      const partSatirlari = partSatirlariOlustur(sonuc.parcalar, projectId, itemId);
      if (partSatirlari.length > 0) {
        await tx.part.createMany({ data: partSatirlari });
      }

      return updated;
    });

    const malzemeler = await malzemeSozlugu(sonuc);
    res.json({ item, sonuc, malzemeler });
  })
);

router.delete(
  "/:itemId",
  asyncHandler(async (req, res) => {
    await prisma.projectItem.delete({ where: { id: Number(req.params.itemId) } });
    res.status(204).end();
  })
);

export default router;
