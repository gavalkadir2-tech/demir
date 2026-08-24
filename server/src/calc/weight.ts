// Ağırlık hesaplama yardımcıları - hem AI malzeme danışmanı hem de proje toplam ağırlığı
// (GET /projects/:id) tarafından kullanılır. Profil parçaları kg/m üzerinden, sac/plaka
// kalemleri (kaplama, taban plakası vb.) alan x kalınlık x yoğunluk üzerinden hesaplanır.

import { SacKalemi } from "./types";
import { KAPLAMA_BILGI, KaplamaTuru } from "./kaplama";

export const CELIK_YOGUNLUK_KG_M3 = 7850;
export const POLIKARBON_YOGUNLUK_KG_M3 = 1200;

/** Tek bir profil parçasının (kesim) ağırlığı. unitWeightKgPerM yoksa 0 döner (bilinmiyor). */
export function parcaAgirlikKg(lengthMm: number, qty: number, unitWeightKgPerM?: number | null): number {
  if (!unitWeightKgPerM) return 0;
  return (lengthMm / 1000) * qty * unitWeightKgPerM;
}

/** Bir ürünün sac/plaka kalemlerinin (taban plakası, çatı kaplaması vb.) toplam ağırlığı. */
export function sacKalemleriAgirlikKg(sacKalemleri: SacKalemi[], kaplamaTuru?: KaplamaTuru): number {
  let toplam = 0;
  for (const sac of sacKalemleri) {
    const alanM2 = (sac.enMm / 1000) * (sac.boyMm / 1000) * sac.adet;
    let yogunluk = CELIK_YOGUNLUK_KG_M3;
    if (sac.label.includes("kaplaması") && kaplamaTuru && kaplamaTuru !== "yok") {
      yogunluk = KAPLAMA_BILGI[kaplamaTuru]?.efektifYogunlukKgM3 ?? yogunluk;
    } else if (sac.label.toLowerCase().includes("polikarbon")) {
      yogunluk = POLIKARBON_YOGUNLUK_KG_M3;
    }
    toplam += alanM2 * ((sac.kalinlikMm ?? 1) / 1000) * yogunluk;
  }
  return toplam;
}

export function yuvarla1(deger: number): number {
  return Math.round(deger * 10) / 10;
}
