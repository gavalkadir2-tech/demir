// Profil kesim optimizasyonu (First Fit Decreasing bin-packing). bkz. spesifikasyon madde 13-14.
//
// Fiziksel model: bir çubuktan n parça kesildiğinde aralarında (n-1) adet kesim yapılır
// (kesilen son parça ile artan fire arasında ayrıca kesim gerekmez, artan zaten çubuğun ucudur).
// Bu nedenle bir çubuğa ilk eklenen parça kesim payı harcamaz; sonraki her parça
// (uzunluk + kesim payı) kadar yer kaplar.
//
// Karışık stok boyu desteği: bir malzeme birden fazla standart boyda (örn. 6m ve 12m, ya da elde
// kalan 3m'lik artıklar) stoklanıyor olabilir. Yeni bir çubuk açılması gerektiğinde, mevcut boylar
// arasından parçayı taşıyabilecek EN KÜÇÜK boy seçilir - böylece örn. son birkaç küçük parça için
// 6m'lik tam bir çubuk yerine 3m'lik bir artık/kısa stok kullanılabilir, fire azalır.

import { HesaplamaHatasi, round2 } from "./units";

export interface KesimCubugu {
  cuts: number[]; // mm, kesilecek/kesilmiş parça uzunlukları, kesim sırasıyla
  wasteMm: number;
  /** Bu çubuğun kesildiği stok boyu (mm). Tek boy verildiğinde tüm çubuklarda aynıdır. */
  stockLengthMm: number;
}

export interface KesimSonucu {
  /** Geriye dönük uyumluluk ve özet gösterim için "birincil" boy - verilen boylardan en uzunu. */
  standardLengthMm: number;
  /** Kullanıma açık tüm stok boyları (mm), küçükten büyüğe. */
  availableLengthsMm: number[];
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

export function optimizeCutting(pieces: number[], standardLengthMm: number | number[], kerfMm: number): KesimSonucu {
  const availableLengthsMm = Array.from(
    new Set((Array.isArray(standardLengthMm) ? standardLengthMm : [standardLengthMm]).filter((n) => n > 0))
  ).sort((a, b) => a - b);

  if (availableLengthsMm.length === 0) throw new HesaplamaHatasi("Standart profil boyu 0'dan büyük olmalı.");
  if (kerfMm < 0) throw new HesaplamaHatasi("Kesim payı negatif olamaz.");

  const enUzunBoyMm = availableLengthsMm[availableLengthsMm.length - 1];

  if (pieces.length === 0) {
    return {
      standardLengthMm: enUzunBoyMm,
      availableLengthsMm,
      kerfMm,
      bars: [],
      totalBars: 0,
      totalWasteMm: 0,
      wastePercent: 0,
      totalPieces: 0,
    };
  }

  const tooLong = pieces.filter((p) => p > enUzunBoyMm);
  if (tooLong.length > 0) {
    throw new HesaplamaHatasi(
      `Kesim listesinde mevcut en uzun stoktan (${enUzunBoyMm} mm) uzun parça var: ${Math.max(...tooLong)} mm. Daha uzun bir standart profil seçin veya parçayı bölün.`
    );
  }

  const sorted = [...pieces].sort((a, b) => b - a);

  const bars: { cuts: number[]; remaining: number; stockLengthMm: number }[] = [];

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
      // Parçayı taşıyabilecek en küçük (en az fireli) stok boyunu seç.
      const secilenBoy = availableLengthsMm.find((l) => l >= p) ?? enUzunBoyMm;
      bars.push({ cuts: [p], remaining: secilenBoy - p, stockLengthMm: secilenBoy });
    }
  }

  const resultBars: KesimCubugu[] = bars.map((b) => ({ cuts: b.cuts, wasteMm: round2(b.remaining), stockLengthMm: b.stockLengthMm }));
  const totalWasteMm = round2(resultBars.reduce((s, b) => s + b.wasteMm, 0));
  const totalBars = resultBars.length;
  const toplamStokMm = resultBars.reduce((s, b) => s + b.stockLengthMm, 0);
  const wastePercent = toplamStokMm > 0 ? round2((totalWasteMm / toplamStokMm) * 100) : 0;

  return {
    standardLengthMm: enUzunBoyMm,
    availableLengthsMm,
    kerfMm,
    bars: resultBars,
    totalBars,
    totalWasteMm,
    wastePercent,
    totalPieces: pieces.length,
  };
}
