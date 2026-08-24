import { prisma } from "./prisma";
import { expandPieces, optimizeCutting } from "../calc/cutting";
import { HesaplamaHatasi } from "../calc/units";

export type KesimGruplamaModu = "malzeme" | "parca";

/**
 * Kesim listesi üretir. İki gruplama modu vardır:
 * - "malzeme" (varsayılan): aynı malzemedeki tüm parçalar (etiketten bağımsız) tek havuzda en verimli
 *   şekilde nestelenir - en az fire, ama farklı parça tiplerinin çubuklarda karışık kesilmesi gerekir.
 * - "parca": her benzersiz parça etiketi (örn. "Dikme", "Üst ray") kendi çubuklarında ayrı hesaplanır -
 *   biraz daha fazla fire olabilir, ama sahada "önce N adet Dikme kes, sonra M adet Üst ray kes" şeklinde
 *   takip etmek daha kolaydır.
 */
export async function generateCuttingListsForProject(projectId: number, mod: KesimGruplamaModu = "malzeme") {
  const parcalar = await prisma.part.findMany({ where: { projectId }, include: { material: true } });

  const gruplar = new Map<
    string,
    { materialId: number; material: (typeof parcalar)[number]["material"]; groupLabel: string | null; items: { uzunlukMm: number; adet: number }[] }
  >();
  for (const p of parcalar) {
    if (p.material.category !== "PROFILE" || !p.material.standardLengthM) continue;
    const groupLabel = mod === "parca" ? p.label ?? "(etiketsiz)" : null;
    const anahtar = mod === "parca" ? `${p.materialId}::${groupLabel}` : String(p.materialId);
    const g = gruplar.get(anahtar) ?? { materialId: p.materialId, material: p.material, groupLabel, items: [] };
    g.items.push({ uzunlukMm: p.lengthMm, adet: p.qty });
    gruplar.set(anahtar, g);
  }

  const uyarilar: string[] = [];
  const created = [];

  await prisma.cuttingList.deleteMany({ where: { projectId } });

  for (const g of gruplar.values()) {
    try {
      const pieces = expandPieces(g.items);
      const kesim = optimizeCutting(pieces, g.material.standardLengthM! * 1000, g.material.kerfMm);
      const row = await prisma.cuttingList.create({
        data: {
          projectId,
          materialId: g.materialId,
          groupLabel: g.groupLabel,
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
      uyarilar.push(`${g.material.name}${g.groupLabel ? ` (${g.groupLabel})` : ""}: ${mesaj}`);
    }
  }

  return { cuttingLists: created, uyarilar };
}
