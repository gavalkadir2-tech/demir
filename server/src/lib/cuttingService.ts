import { prisma } from "./prisma";
import { expandPieces, optimizeCutting } from "../calc/cutting";
import { nestSheets, SacNestingSonucu } from "../calc/sheetNesting";
import { HesaplamaHatasi } from "../calc/units";
import { UrunHesapSonucu } from "../calc/types";

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
      const mevcutBoylarMm = [g.material.standardLengthM! * 1000, ...g.material.alternatifBoylarM.map((m) => m * 1000)];
      const kesim = optimizeCutting(pieces, mevcutBoylarMm, g.material.kerfMm);
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

export interface SacNestingGrubu extends SacNestingSonucu {
  kalinlikMm: number;
}

/**
 * Projedeki tüm ürünlerin sac kalemlerini (kaplama, taban plakası, basamak plakası vb.) kalınlığa
 * göre gruplar ve her grup için 2D yerleştirme (nesting) hesaplar. Sac kalemleri profil parçaların
 * aksine bir Material'a bağlı değildir (bkz. calc/types.ts SacKalemi) - bu yüzden burada kalıcı bir
 * kesim listesi kaydı OLUŞTURULMAZ, her istekte anlık hesaplanır. Gruplama sadece kalınlığa göredir;
 * gerçekte farklı malzeme/kaplama türleri aynı kalınlıkta karışabilir - bu bilinen bir basitleştirmedir.
 */
export async function generateSheetNestingForProject(
  projectId: number,
  sheetWidthMm: number,
  sheetHeightMm: number,
  kerfMm: number
): Promise<{ gruplar: SacNestingGrubu[]; uyarilar: string[] }> {
  const items = await prisma.projectItem.findMany({ where: { projectId } });

  const parcaGruplari = new Map<number, { enMm: number; boyMm: number; adet: number; label: string }[]>();
  for (const item of items) {
    const sonuc = item.resultJson as unknown as UrunHesapSonucu | null;
    if (!sonuc?.sacKalemleri?.length) continue;
    for (const sac of sonuc.sacKalemleri) {
      const kalinlik = Math.round((sac.kalinlikMm ?? 1) * 100) / 100;
      const liste = parcaGruplari.get(kalinlik) ?? [];
      liste.push({ enMm: sac.enMm, boyMm: sac.boyMm, adet: sac.adet, label: `${item.name}: ${sac.label}` });
      parcaGruplari.set(kalinlik, liste);
    }
  }

  const gruplar: SacNestingGrubu[] = [];
  const uyarilar: string[] = [];

  for (const [kalinlikMm, parcalar] of parcaGruplari.entries()) {
    try {
      const sonuc = nestSheets(parcalar, sheetWidthMm, sheetHeightMm, kerfMm);
      gruplar.push({ kalinlikMm, ...sonuc });
    } catch (err) {
      const mesaj = err instanceof HesaplamaHatasi ? err.message : "Sac yerleştirmesi hesaplanamadı.";
      uyarilar.push(`${kalinlikMm} mm kalınlık: ${mesaj}`);
    }
  }

  gruplar.sort((a, b) => b.kalinlikMm - a.kalinlikMm);

  return { gruplar, uyarilar };
}
