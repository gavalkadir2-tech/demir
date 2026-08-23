import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiHatasi } from "../lib/errors";

const router = Router({ mergeParams: true });

router.post(
  "/deduct",
  asyncHandler(async (req, res) => {
    const projectId = Number(req.params.projectId);
    const proje = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    if (proje.stockDeducted) throw new ApiHatasi(400, "Bu iş için stok zaten düşülmüş.");

    const kesimListeleri = await prisma.cuttingList.findMany({ where: { projectId }, include: { material: true } });
    if (kesimListeleri.length === 0) {
      throw new ApiHatasi(400, "Stok düşmeden önce kesim planı oluşturulmalı (Kesim Listeleri > Planı Oluştur).");
    }

    const uyarilar: string[] = [];
    const sonuc = [];

    for (const kl of kesimListeleri) {
      const yeniStok = kl.material.stockQty - kl.totalBars;
      if (yeniStok < 0) {
        uyarilar.push(
          `"${kl.material.name}" stoku yetersiz: mevcut ${kl.material.stockQty} adet, gereken ${kl.totalBars} adet.`
        );
      }
      await prisma.$transaction([
        prisma.material.update({ where: { id: kl.materialId }, data: { stockQty: yeniStok } }),
        prisma.stockMovement.create({
          data: {
            materialId: kl.materialId,
            projectId,
            qtyDelta: -kl.totalBars,
            reason: `İş onayı: kesim planına göre stoktan düşüldü (${kl.material.name})`,
          },
        }),
      ]);
      sonuc.push({ materialId: kl.materialId, materialName: kl.material.name, dusulen: kl.totalBars, yeniStok });
    }

    await prisma.project.update({ where: { id: projectId }, data: { stockDeducted: true } });

    res.json({ sonuc, uyarilar });
  })
);

export default router;
