import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiHatasi } from "../lib/errors";
import { sacMalzemeGruplariHesapla, sacGrubuStokMiktari } from "../lib/sheetMaterialAggregation";
import { baglantiMalzemeGruplariHesapla } from "../lib/fastenerMaterialAggregation";

const router = Router({ mergeParams: true });

router.post(
  "/deduct",
  asyncHandler(async (req, res) => {
    const projectId = Number(req.params.projectId);
    const proje = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    if (proje.stockDeducted) throw new ApiHatasi(400, "Bu iş için stok zaten düşülmüş.");

    const kesimListeleri = await prisma.cuttingList.findMany({ where: { projectId }, include: { material: true } });
    const { gruplar: sacGruplari, uyarilar: sacKurulumUyarilari } = await sacMalzemeGruplariHesapla(projectId);
    const { gruplar: baglantiGruplari, uyarilar: baglantiKurulumUyarilari } = await baglantiMalzemeGruplariHesapla(projectId);
    if (kesimListeleri.length === 0 && sacGruplari.length === 0 && baglantiGruplari.length === 0) {
      throw new ApiHatasi(400, "Stok düşmeden önce kesim planı oluşturulmalı (Kesim Listeleri > Planı Oluştur).");
    }

    const uyarilar: string[] = [...sacKurulumUyarilari, ...baglantiKurulumUyarilari];
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

    for (const grup of sacGruplari) {
      const miktar = Math.round(sacGrubuStokMiktari(grup) * 100) / 100;
      const yeniStok = Math.round((grup.material.stockQty - miktar) * 100) / 100;
      if (yeniStok < 0) {
        uyarilar.push(
          `"${grup.material.name}" stoku yetersiz: mevcut ${grup.material.stockQty} ${grup.material.unit}, gereken ${miktar} ${grup.material.unit}.`
        );
      }
      await prisma.$transaction([
        prisma.material.update({ where: { id: grup.materialId }, data: { stockQty: yeniStok } }),
        prisma.stockMovement.create({
          data: {
            materialId: grup.materialId,
            projectId,
            qtyDelta: -miktar,
            reason: `İş onayı: sac yerleştirme planına göre stoktan düşüldü (${grup.material.name}, ${grup.nesting.toplamLevha} levha)`,
          },
        }),
      ]);
      sonuc.push({ materialId: grup.materialId, materialName: grup.material.name, dusulen: miktar, yeniStok });
    }

    for (const grup of baglantiGruplari) {
      const yeniStok = grup.material.stockQty - grup.toplamAdet;
      if (yeniStok < 0) {
        uyarilar.push(
          `"${grup.material.name}" stoku yetersiz: mevcut ${grup.material.stockQty} ${grup.material.unit}, gereken ${grup.toplamAdet} ${grup.material.unit}.`
        );
      }
      await prisma.$transaction([
        prisma.material.update({ where: { id: grup.materialId }, data: { stockQty: yeniStok } }),
        prisma.stockMovement.create({
          data: {
            materialId: grup.materialId,
            projectId,
            qtyDelta: -grup.toplamAdet,
            reason: `İş onayı: bağlantı elemanı ihtiyacına göre stoktan düşüldü (${grup.material.name})`,
          },
        }),
      ]);
      sonuc.push({ materialId: grup.materialId, materialName: grup.material.name, dusulen: grup.toplamAdet, yeniStok });
    }

    await prisma.project.update({ where: { id: projectId }, data: { stockDeducted: true } });

    res.json({ sonuc, uyarilar });
  })
);

export default router;
