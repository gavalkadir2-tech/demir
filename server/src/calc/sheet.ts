// Sac hesaplama motoru. bkz. spesifikasyon madde 12.
// Sac ağırlığı = alan (m²) × kalınlık (m) × yoğunluk (kg/m³)

import { HesaplamaHatasi, round2 } from "./units";

export const CELIK_YOGUNLUK_KG_M3 = 7850;

export interface SacKalemGirdi {
  kalinlikMm: number;
  enMm: number;
  boyMm: number;
  adet: number;
  /** m² başına TL fiyat (varsa doğrudan kullanılır) */
  birimFiyatM2?: number;
  /** kg başına TL fiyat (m² fiyatı yoksa ağırlık üzerinden hesaplanır) */
  birimFiyatKg?: number;
  yogunlukKgM3?: number;
}

export interface SacKalemSonuc {
  alanM2: number;
  agirlikKg: number;
  maliyet: number;
}

export function calculateSheetItem(girdi: SacKalemGirdi): SacKalemSonuc {
  if (girdi.enMm <= 0 || girdi.boyMm <= 0) throw new HesaplamaHatasi("Sac eni ve boyu 0'dan büyük olmalı.");
  if (girdi.kalinlikMm <= 0) throw new HesaplamaHatasi("Sac kalınlığı 0'dan büyük olmalı.");
  if (girdi.adet <= 0) throw new HesaplamaHatasi("Sac adedi 0'dan büyük olmalı.");

  const yogunluk = girdi.yogunlukKgM3 ?? CELIK_YOGUNLUK_KG_M3;
  const tekAlanM2 = (girdi.enMm / 1000) * (girdi.boyMm / 1000);
  const alanM2 = tekAlanM2 * girdi.adet;
  const agirlikKg = alanM2 * (girdi.kalinlikMm / 1000) * yogunluk;

  let maliyet = 0;
  if (girdi.birimFiyatM2) {
    maliyet = alanM2 * girdi.birimFiyatM2;
  } else if (girdi.birimFiyatKg) {
    maliyet = agirlikKg * girdi.birimFiyatKg;
  }

  return { alanM2: round2(alanM2), agirlikKg: round2(agirlikKg), maliyet: round2(maliyet) };
}

export function calculateSheetTotals(kalemler: SacKalemGirdi[]): { toplamAlanM2: number; toplamAgirlikKg: number; toplamMaliyet: number } {
  let toplamAlanM2 = 0;
  let toplamAgirlikKg = 0;
  let toplamMaliyet = 0;
  for (const k of kalemler) {
    const r = calculateSheetItem(k);
    toplamAlanM2 += r.alanM2;
    toplamAgirlikKg += r.agirlikKg;
    toplamMaliyet += r.maliyet;
  }
  return { toplamAlanM2: round2(toplamAlanM2), toplamAgirlikKg: round2(toplamAgirlikKg), toplamMaliyet: round2(toplamMaliyet) };
}
