import { prisma } from "./prisma";
import { expandPieces, optimizeCutting } from "../calc/cutting";
import { HesaplamaHatasi } from "../calc/units";

export async function generateCuttingListsForProject(projectId: number) {
  const parcalar = await prisma.part.findMany({ where: { projectId }, include: { material: true } });

  const gruplar = new Map<
    number,
    { material: (typeof parcalar)[number]["material"]; items: { uzunlukMm: number; adet: number }[] }
  >();
  for (const p of parcalar) {
    if (p.material.category !== "PROFILE" || !p.material.standardLengthM) continue;
    const g = gruplar.get(p.materialId) ?? { material: p.material, items: [] };
    g.items.push({ uzunlukMm: p.lengthMm, adet: p.qty });
    gruplar.set(p.materialId, g);
  }

  const uyarilar: string[] = [];
  const created = [];

  await prisma.cuttingList.deleteMany({ where: { projectId } });

  for (const [materialId, g] of gruplar) {
    try {
      const pieces = expandPieces(g.items);
      const kesim = optimizeCutting(pieces, g.material.standardLengthM! * 1000, g.material.kerfMm);
      const row = await prisma.cuttingList.create({
        data: {
          projectId,
          materialId,
          standardLengthMm: kesim.standardLengthMm,
          kerfMm: kesim.kerfMm,
          barsJson: kesim.bars as any,
          totalBars: kesim.totalBars,
          totalWasteMm: kesim.totalWasteMm,
          wastePercent: kesim.wastePercent,
        },
        include: { material: true },
      });
      created.push(row);
    } catch (err) {
      const mesaj = err instanceof HesaplamaHatasi ? err.message : "Kesim hesaplanamadı.";
      uyarilar.push(`${g.material.name}: ${mesaj}`);
    }
  }

  return { cuttingLists: created, uyarilar };
}
