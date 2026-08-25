// Sac kalemlerini (kaplama/taban plakası/basamak plakası/raf plakası vb.) bir Material'a bağlayan
// köprü. Profil parçalardan (Part) farklı olarak sac kalemleri kalıcı bir DB satırı değildir - her
// ProjectItem'ın resultJson'ında (sonuc.sacKalemleri) tutulur. Bir kalem yalnızca kullanıcı formda
// açıkça bir "sac malzemesi" seçtiyse (SacKalemi.materialKey) burada işlenir; seçilmemişse (mevcut
// varsayılan davranış) teklif maliyetine veya stok düşümüne hiç dahil edilmez.

import { Material } from "@prisma/client";
import { prisma } from "./prisma";
import { UrunHesapSonucu } from "../calc/types";
import { nestSheets, SacNestingSonucu } from "../calc/sheetNesting";
import { CELIK_YOGUNLUK_KG_M3 } from "../calc/weight";

const VARSAYILAN_LEVHA_GENISLIK_MM = 1250;
const VARSAYILAN_LEVHA_YUKSEKLIK_MM = 2500;

export interface SacMalzemeGrubu {
  materialId: number;
  material: Material;
  nesting: SacNestingSonucu;
  /** Gruptaki parçaların en kalın olanı (mm) - kgPerM2 belirtilmemişse ağırlık tahmininde
   * muhafazakâr/temsili kalınlık olarak kullanılır. */
  temsiliKalinlikMm: number;
}

/** Projedeki tüm ürünlerin, formda sac malzemesi seçilmiş kalemlerini Material id'sine göre gruplar
 * ve her grup için (o malzemenin kendi levha boyutu/kesim payına göre) 2D yerleştirme hesaplar. */
export async function sacMalzemeGruplariHesapla(projectId: number): Promise<{ gruplar: SacMalzemeGrubu[]; uyarilar: string[] }> {
  const items = await prisma.projectItem.findMany({ where: { projectId } });

  const parcaGruplari = new Map<number, { enMm: number; boyMm: number; adet: number; label: string }[]>();
  const kalinlikGruplari = new Map<number, number[]>();
  for (const item of items) {
    const sonuc = item.resultJson as unknown as UrunHesapSonucu | null;
    if (!sonuc?.sacKalemleri?.length) continue;
    for (const sac of sonuc.sacKalemleri) {
      if (!sac.materialKey) continue;
      const materialId = Number(sac.materialKey);
      if (Number.isNaN(materialId)) continue;
      const liste = parcaGruplari.get(materialId) ?? [];
      liste.push({ enMm: sac.enMm, boyMm: sac.boyMm, adet: sac.adet, label: `${item.name}: ${sac.label}` });
      parcaGruplari.set(materialId, liste);
      if (sac.kalinlikMm) {
        const kalinliklar = kalinlikGruplari.get(materialId) ?? [];
        kalinliklar.push(sac.kalinlikMm);
        kalinlikGruplari.set(materialId, kalinliklar);
      }
    }
  }

  if (parcaGruplari.size === 0) return { gruplar: [], uyarilar: [] };

  const materyaller = await prisma.material.findMany({ where: { id: { in: Array.from(parcaGruplari.keys()) } } });
  const materyalById = new Map(materyaller.map((m) => [m.id, m]));

  const gruplar: SacMalzemeGrubu[] = [];
  const uyarilar: string[] = [];

  for (const [materialId, parcalar] of parcaGruplari.entries()) {
    const material = materyalById.get(materialId);
    if (!material) {
      uyarilar.push(`Sac kalemi bağlı olduğu malzeme (id ${materialId}) bulunamadı, atlandı.`);
      continue;
    }
    const sheetWidthMm = material.sheetWidthMm ?? VARSAYILAN_LEVHA_GENISLIK_MM;
    const sheetHeightMm = material.sheetHeightMm ?? VARSAYILAN_LEVHA_YUKSEKLIK_MM;
    const kalinliklar = kalinlikGruplari.get(materialId) ?? [];
    const temsiliKalinlikMm = kalinliklar.length > 0 ? Math.max(...kalinliklar) : material.thicknessMm ?? 1;
    try {
      const nesting = nestSheets(parcalar, sheetWidthMm, sheetHeightMm, material.kerfMm);
      gruplar.push({ materialId, material, nesting, temsiliKalinlikMm });
    } catch (err: any) {
      uyarilar.push(`"${material.name}": ${err.message ?? "sac yerleştirmesi hesaplanamadı"}`);
    }
  }

  return { gruplar, uyarilar };
}

/** Bir levhanın (nesting sonucundaki toplamLevha kadar) ağırlığını (kg) hesaplar - kgPerM2
 * belirtilmişse onu, yoksa temsili kalınlığa göre çelik yoğunluğunu kullanır. */
function levhaAgirlikKg(grup: SacMalzemeGrubu): number {
  const alanM2 = (grup.nesting.sheetWidthMm / 1000) * (grup.nesting.sheetHeightMm / 1000);
  const kgM2 = grup.material.kgPerM2 ?? (grup.temsiliKalinlikMm / 1000) * CELIK_YOGUNLUK_KG_M3;
  return alanM2 * kgM2;
}

/** Bir sac malzeme grubunun toplam maliyetini (TL) hesaplar. Levha başına satın alma mantığıyla
 * (fire dahil, tam levha bedeli) - net kullanılan alan değil, gerekli levha sayısı üzerinden. */
export function sacGrubuMaliyetHesapla(grup: SacMalzemeGrubu): number {
  const { material, nesting } = grup;
  const alanM2 = (nesting.sheetWidthMm / 1000) * (nesting.sheetHeightMm / 1000);
  if (material.unit === "KG") return nesting.toplamLevha * levhaAgirlikKg(grup) * material.unitPrice;
  if (material.unit === "M2") return nesting.toplamLevha * alanM2 * material.unitPrice;
  // ADET veya diğer birimler: birim fiyat levha başına kabul edilir.
  return nesting.toplamLevha * material.unitPrice;
}

/** Bir sac malzeme grubu için stoktan düşülecek miktarı, malzemenin kendi birimine göre döner. */
export function sacGrubuStokMiktari(grup: SacMalzemeGrubu): number {
  const { material, nesting } = grup;
  const alanM2 = (nesting.sheetWidthMm / 1000) * (nesting.sheetHeightMm / 1000);
  if (material.unit === "KG") return nesting.toplamLevha * levhaAgirlikKg(grup);
  if (material.unit === "M2") return nesting.toplamLevha * alanM2;
  return nesting.toplamLevha;
}
