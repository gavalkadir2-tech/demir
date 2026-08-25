// Ağırlık hesaplama yardımcıları - hem AI malzeme danışmanı hem de proje toplam ağırlığı
// (GET /projects/:id) tarafından kullanılır. Profil parçaları kg/m üzerinden, sac/plaka
// kalemleri (kaplama, taban plakası vb.) alan x kalınlık x yoğunluk üzerinden hesaplanır.

import { SacKalemi } from "./types";

export const CELIK_YOGUNLUK_KG_M3 = 7850;

/** Tek bir profil parçasının (kesim) ağırlığı. unitWeightKgPerM yoksa 0 döner (bilinmiyor). */
export function parcaAgirlikKg(lengthMm: number, qty: number, unitWeightKgPerM?: number | null): number {
  if (!unitWeightKgPerM) return 0;
  return (lengthMm / 1000) * qty * unitWeightKgPerM;
}

/** Bir ürünün sac/plaka kalemlerinin (taban plakası, çatı/duvar kaplaması vb.) toplam ağırlığı.
 * Her kalem kendi yoğunluğunu (yogunlukKgM3) taşır - kaplama kalemleri için hesaplama motoru bunu
 * malzeme türüne göre ayarlar (bkz. kaplama.ts); belirtilmemişse çelik varsayılır. */
export function sacKalemleriAgirlikKg(sacKalemleri: SacKalemi[]): number {
  let toplam = 0;
  for (const sac of sacKalemleri) {
    const alanM2 = (sac.enMm / 1000) * (sac.boyMm / 1000) * sac.adet;
    const yogunluk = sac.yogunlukKgM3 ?? CELIK_YOGUNLUK_KG_M3;
    toplam += alanM2 * ((sac.kalinlikMm ?? 1) / 1000) * yogunluk;
  }
  return toplam;
}

export function yuvarla1(deger: number): number {
  return Math.round(deger * 10) / 10;
}
