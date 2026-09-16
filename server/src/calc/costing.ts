// Maliyet motoru. bkz. spesifikasyon madde 15-16-17.
//
// Zincir: Malzeme (fire dahil) + Sarf + İşçilik + Boya + Nakliye + Montaj + Diğer = Toplam Maliyet
//         Toplam Maliyet + Genel Gider = Ara Toplam
//         Ara Toplam + Kâr (% veya sabit TL) = Teklif Fiyatı (KDV hariç)
//         Teklif Fiyatı + KDV = Genel Toplam
//
// Not: Fire (kesim artığı) maliyeti artık ayrı bir kalem değil, malzeme maliyetine dahil ediliyor
// (bkz. routes/quotes.ts - boughtCost, netCost+wasteCost olarak doğrudan materialCost'a ekleniyor).
// Kâr yüzdesi modunda taban, ara toplam değil doğrudan malzeme maliyeti (fire dahil) - "kârı
// malzeme fiyatının yarısı olarak baz al" kuralı, profitValue=50 ile karşılık bulur.

import { HesaplamaHatasi, round2 } from "./units";

export type KarModu = "PERCENT" | "FIXED";

export interface MaliyetGirdi {
  materialCost: number; // profil + sac malzeme maliyeti (fire dahil)
  consumableCost: number; // sarf malzeme + bağlantı elemanları
  laborCost: number; // işçilik toplamı
  paintCost: number;
  transportCost: number;
  installCost: number;
  otherCost: number;
  overheadPercent: number; // genel gider %
  profitMode: KarModu;
  profitValue: number; // PERCENT modunda malzeme maliyetine uygulanan yüzde, FIXED modunda sabit TL
  vatPercent: number;
}

export interface MaliyetSonucu {
  materialCost: number;
  consumableCost: number;
  laborCost: number;
  paintCost: number;
  transportCost: number;
  installCost: number;
  otherCost: number;
  totalCost: number; // 7 kalemin toplamı (genel gider hariç)
  overheadAmount: number;
  subtotalBeforeProfit: number; // totalCost + overheadAmount
  profitAmount: number;
  subtotal: number; // KDV hariç teklif fiyatı
  vatPercent: number;
  vatAmount: number;
  total: number; // genel toplam
}

export function calculateCost(girdi: MaliyetGirdi): MaliyetSonucu {
  const buckets = [
    girdi.materialCost,
    girdi.consumableCost,
    girdi.laborCost,
    girdi.paintCost,
    girdi.transportCost,
    girdi.installCost,
    girdi.otherCost,
  ];
  if (buckets.some((b) => b < 0)) throw new HesaplamaHatasi("Maliyet kalemleri negatif olamaz.");
  if (girdi.overheadPercent < 0) throw new HesaplamaHatasi("Genel gider yüzdesi negatif olamaz.");
  if (girdi.vatPercent < 0) throw new HesaplamaHatasi("KDV yüzdesi negatif olamaz.");
  if (girdi.profitMode === "PERCENT" && girdi.profitValue < 0)
    throw new HesaplamaHatasi("Kâr yüzdesi negatif olamaz.");

  const totalCost = buckets.reduce((a, b) => a + b, 0);
  const overheadAmount = totalCost * (girdi.overheadPercent / 100);
  const subtotalBeforeProfit = totalCost + overheadAmount;

  const profitAmount =
    girdi.profitMode === "PERCENT" ? girdi.materialCost * (girdi.profitValue / 100) : girdi.profitValue;

  const subtotal = subtotalBeforeProfit + profitAmount;
  const vatAmount = subtotal * (girdi.vatPercent / 100);
  const total = subtotal + vatAmount;

  return {
    materialCost: round2(girdi.materialCost),
    consumableCost: round2(girdi.consumableCost),
    laborCost: round2(girdi.laborCost),
    paintCost: round2(girdi.paintCost),
    transportCost: round2(girdi.transportCost),
    installCost: round2(girdi.installCost),
    otherCost: round2(girdi.otherCost),
    totalCost: round2(totalCost),
    overheadAmount: round2(overheadAmount),
    subtotalBeforeProfit: round2(subtotalBeforeProfit),
    profitAmount: round2(profitAmount),
    subtotal: round2(subtotal),
    vatPercent: girdi.vatPercent,
    vatAmount: round2(vatAmount),
    total: round2(total),
  };
}

export interface IscilikKalemGirdi {
  hours?: number;
  rate?: number;
  fixedAmount?: number;
}

/** Bir işçilik kaleminin tutarını hesaplar: saat×ücret ya da sabit tutar. */
export function calculateLaborAmount(girdi: IscilikKalemGirdi): number {
  if (girdi.fixedAmount != null) return round2(girdi.fixedAmount);
  if (girdi.hours != null && girdi.rate != null) return round2(girdi.hours * girdi.rate);
  throw new HesaplamaHatasi("İşçilik kalemi için (saat ve ücret) ya da (sabit tutar) girilmelidir.");
}
