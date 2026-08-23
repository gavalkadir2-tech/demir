// Profil kesim optimizasyonu (First Fit Decreasing bin-packing). bkz. spesifikasyon madde 13-14.
//
// Fiziksel model: bir çubuktan n parça kesildiğinde aralarında (n-1) adet kesim yapılır
// (kesilen son parça ile artan fire arasında ayrıca kesim gerekmez, artan zaten çubuğun ucudur).
// Bu nedenle bir çubuğa ilk eklenen parça kesim payı harcamaz; sonraki her parça
// (uzunluk + kesim payı) kadar yer kaplar.

import { HesaplamaHatasi, round2 } from "./units";

export interface KesimCubugu {
  cuts: number[]; // mm, kesilecek/kesilmiş parça uzunlukları, kesim sırasıyla
  wasteMm: number;
}

export interface KesimSonucu {
  standardLengthMm: number;
  kerfMm: number;
  bars: KesimCubugu[];
  totalBars: number;
  totalWasteMm: number;
  wastePercent: number;
  totalPieces: number;
}

/** {uzunlukMm, adet} listesini tek tek parça uzunluklarına açar. */
export function expandPieces(items: { uzunlukMm: number; adet: number }[]): number[] {
  const out: number[] = [];
  for (const it of items) {
    for (let i = 0; i < it.adet; i++) out.push(Math.round(it.uzunlukMm));
  }
  return out;
}

export function optimizeCutting(pieces: number[], standardLengthMm: number, kerfMm: number): KesimSonucu {
  if (standardLengthMm <= 0) throw new HesaplamaHatasi("Standart profil boyu 0'dan büyük olmalı.");
  if (kerfMm < 0) throw new HesaplamaHatasi("Kesim payı negatif olamaz.");
  if (pieces.length === 0) {
    return { standardLengthMm, kerfMm, bars: [], totalBars: 0, totalWasteMm: 0, wastePercent: 0, totalPieces: 0 };
  }

  const tooLong = pieces.filter((p) => p > standardLengthMm);
  if (tooLong.length > 0) {
    throw new HesaplamaHatasi(
      `Kesim listesinde standart boydan (${standardLengthMm} mm) uzun parça var: ${Math.max(...tooLong)} mm. Daha uzun bir standart profil seçin veya parçayı bölün.`
    );
  }

  const sorted = [...pieces].sort((a, b) => b - a);

  const bars: { cuts: number[]; remaining: number }[] = [];

  for (const p of sorted) {
    let placed = false;
    for (const bar of bars) {
      const gereken = bar.cuts.length === 0 ? p : p + kerfMm;
      if (gereken <= bar.remaining + 1e-9) {
        bar.cuts.push(p);
        bar.remaining -= gereken;
        placed = true;
        break;
      }
    }
    if (!placed) {
      bars.push({ cuts: [p], remaining: standardLengthMm - p });
    }
  }

  const resultBars: KesimCubugu[] = bars.map((b) => ({ cuts: b.cuts, wasteMm: round2(b.remaining) }));
  const totalWasteMm = round2(resultBars.reduce((s, b) => s + b.wasteMm, 0));
  const totalBars = resultBars.length;
  const wastePercent = totalBars > 0 ? round2((totalWasteMm / (totalBars * standardLengthMm)) * 100) : 0;

  return {
    standardLengthMm,
    kerfMm,
    bars: resultBars,
    totalBars,
    totalWasteMm,
    wastePercent,
    totalPieces: pieces.length,
  };
}
