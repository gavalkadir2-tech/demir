// Bağlantı kalemlerini (ankraj, menteşe, kilit, kol, ray dübeli vb.) bir Material'a bağlayan köprü.
// Sac kalemleri gibi bunlar da kalıcı bir DB satırı değildir - her ProjectItem'ın resultJson'ında
// (sonuc.baglantiKalemleri) tutulur. Bir kalem yalnızca kullanıcı formda açıkça bir "bağlantı
// malzemesi" seçtiyse (BaglantiKalemi.materialKey) burada işlenir; seçilmemişse (mevcut varsayılan
// davranış) teklif maliyetine veya stok düşümüne hiç dahil edilmez.

import { Material } from "@prisma/client";
import { prisma } from "./prisma";
import { UrunHesapSonucu } from "../calc/types";

export interface BaglantiMalzemeGrubu {
  materialId: number;
  material: Material;
  /** Farklı ürün kalemlerinden gelen toplam adet. */
  toplamAdet: number;
  /** Hangi ürün/kalemlerden geldiği - raporlama/açıklama amaçlı. */
  kaynaklar: string[];
}

/** Projedeki tüm ürünlerin, formda bağlantı malzemesi seçilmiş kalemlerini Material id'sine göre
 * gruplayıp toplam adedi hesaplar. */
export async function baglantiMalzemeGruplariHesapla(
  projectId: number
): Promise<{ gruplar: BaglantiMalzemeGrubu[]; uyarilar: string[] }> {
  const items = await prisma.projectItem.findMany({ where: { projectId } });

  const adetGruplari = new Map<number, number>();
  const kaynakGruplari = new Map<number, string[]>();
  for (const item of items) {
    const sonuc = item.resultJson as unknown as UrunHesapSonucu | null;
    if (!sonuc?.baglantiKalemleri?.length) continue;
    for (const kalem of sonuc.baglantiKalemleri) {
      if (!kalem.materialKey) continue;
      const materialId = Number(kalem.materialKey);
      if (Number.isNaN(materialId)) continue;
      adetGruplari.set(materialId, (adetGruplari.get(materialId) ?? 0) + kalem.adet);
      const kaynaklar = kaynakGruplari.get(materialId) ?? [];
      kaynaklar.push(`${item.name}: ${kalem.label} (${kalem.adet} ${kalem.birim})`);
      kaynakGruplari.set(materialId, kaynaklar);
    }
  }

  if (adetGruplari.size === 0) return { gruplar: [], uyarilar: [] };

  const materyaller = await prisma.material.findMany({ where: { id: { in: Array.from(adetGruplari.keys()) } } });
  const materyalById = new Map(materyaller.map((m) => [m.id, m]));

  const gruplar: BaglantiMalzemeGrubu[] = [];
  const uyarilar: string[] = [];

  for (const [materialId, toplamAdet] of adetGruplari.entries()) {
    const material = materyalById.get(materialId);
    if (!material) {
      uyarilar.push(`Bağlantı kalemi bağlı olduğu malzeme (id ${materialId}) bulunamadı, atlandı.`);
      continue;
    }
    gruplar.push({ materialId, material, toplamAdet, kaynaklar: kaynakGruplari.get(materialId) ?? [] });
  }

  return { gruplar, uyarilar };
}

/** Bir bağlantı malzeme grubunun toplam maliyetini (TL) hesaplar. */
export function baglantiGrubuMaliyetHesapla(grup: BaglantiMalzemeGrubu): number {
  return grup.toplamAdet * grup.material.unitPrice;
}
