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
//
// Ek (kaynaklı birleştirme) desteği: istenen parça uzunluğu mevcut en uzun stoktan bile uzunsa
// (örn. 8m'lik bir parça, 6m'lik stokla), parça mevcut en uzun stok boyunu aşamayacak parçalara
// bölünür (8m -> 6m tam boy + 2m) ve bu parçaların sahada kaynakla birleştirilmesi gerektiği
// bilgisi (spliceGroupId ve ilgili alanlar) sonuca eklenir. Bölünen parçalar normal kesim
// parçalarıyla birlikte aynı havuzda nestelenir - fire minimize edilmeye devam eder.

import { HesaplamaHatasi, round2 } from "./units";

/** Kaynakla birleştirilecek bir ek parçası için pratik minimum uzunluk (mm). Bölme sonucunda
 * son parça bundan kısa kalırsa, son iki parça dengelenerek çok kısa bir ek parçası önlenir. */
const MIN_EK_PARCA_MM = 500;

export interface KesimParcasi {
  lengthMm: number;
  /** Bu parça, mevcut en uzun stoktan uzun bir parçanın bölünmesiyle oluştuysa, aynı orijinal
   * parçaya ait tüm ek parçaları aynı grup id'sini paylaşır. */
  spliceGroupId?: string;
  /** Ek grubu içindeki sıra (1-tabanlı). */
  spliceIndex?: number;
  /** Ek grubundaki toplam parça sayısı. */
  spliceCount?: number;
  /** Ek grubunun ait olduğu, bölünmeden önceki asıl parça uzunluğu (mm). */
  originalLengthMm?: number;
}

export interface KesimCubugu {
  cuts: KesimParcasi[]; // kesilecek/kesilmiş parçalar, kesim sırasıyla
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
  /** Bilgilendirme amaçlı uyarılar (örn. eklenerek birleştirilmesi gereken parçalar). Hata değildir. */
  warnings: string[];
}

/** {uzunlukMm, adet} listesini tek tek parça uzunluklarına açar. */
export function expandPieces(items: { uzunlukMm: number; adet: number }[]): number[] {
  const out: number[] = [];
  for (const it of items) {
    for (let i = 0; i < it.adet; i++) out.push(Math.round(it.uzunlukMm));
  }
  return out;
}

/** Mevcut en uzun stoktan (maxLenMm) uzun bir parçayı, her biri en fazla maxLenMm olan
 * parçalara böler; ilk parçalar tam stok boyunda olacak şekilde açgözlü (greedy) böler
 * (örn. 8000/6000 -> [6000, 2000]) ki en az sayıda ek ve en dolu ilk çubuk elde edilsin.
 * Son parça çok kısa kalırsa (MIN_EK_PARCA_MM altında), son iki parça dengelenir. */
export function splitOversizedPiece(lengthMm: number, maxLenMm: number): number[] {
  const n = Math.ceil(lengthMm / maxLenMm);
  if (n <= 1) return [lengthMm];
  const parcalar: number[] = new Array(n - 1).fill(maxLenMm);
  let sonParca = lengthMm - maxLenMm * (n - 1);
  if (sonParca < MIN_EK_PARCA_MM) {
    const toplamSonIki = maxLenMm + sonParca;
    const yeniBoy = Math.floor(toplamSonIki / 2);
    parcalar[parcalar.length - 1] = yeniBoy;
    sonParca = toplamSonIki - yeniBoy;
  }
  parcalar.push(sonParca);
  return parcalar;
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
      warnings: [],
    };
  }

  // Mevcut en uzun stoktan uzun parçaları, ek (kaynaklı birleştirme) gerektiren parçalara böl.
  const genisletilmis: KesimParcasi[] = [];
  const ekOzetleri = new Map<string, { originalLengthMm: number; parcalar: number[]; adet: number }>();
  let ekSayaci = 0;
  for (const p of pieces) {
    if (p <= enUzunBoyMm) {
      genisletilmis.push({ lengthMm: p });
      continue;
    }
    const parcalar = splitOversizedPiece(p, enUzunBoyMm);
    ekSayaci++;
    const grupId = `ek-${ekSayaci}`;
    parcalar.forEach((seg, i) => {
      genisletilmis.push({
        lengthMm: seg,
        spliceGroupId: grupId,
        spliceIndex: i + 1,
        spliceCount: parcalar.length,
        originalLengthMm: p,
      });
    });
    const anahtar = `${p}|${parcalar.join(",")}`;
    const mevcut = ekOzetleri.get(anahtar);
    if (mevcut) mevcut.adet++;
    else ekOzetleri.set(anahtar, { originalLengthMm: p, parcalar, adet: 1 });
  }

  const warnings = Array.from(ekOzetleri.values()).map(
    ({ originalLengthMm, parcalar, adet }) =>
      `${originalLengthMm} mm'lik parça${adet > 1 ? ` (${adet} adet)` : ""} mevcut en uzun stoktan (${enUzunBoyMm} mm) uzun olduğu için ${parcalar.length} parçaya bölünüp kaynakla birleştirilecek: ${parcalar.join(" mm + ")} mm.`
  );

  const sorted = [...genisletilmis].sort((a, b) => b.lengthMm - a.lengthMm);

  const bars: { cuts: KesimParcasi[]; remaining: number; stockLengthMm: number }[] = [];

  for (const p of sorted) {
    let placed = false;
    for (const bar of bars) {
      const gereken = bar.cuts.length === 0 ? p.lengthMm : p.lengthMm + kerfMm;
      if (gereken <= bar.remaining + 1e-9) {
        bar.cuts.push(p);
        bar.remaining -= gereken;
        placed = true;
        break;
      }
    }
    if (!placed) {
      // Parçayı taşıyabilecek en küçük (en az fireli) stok boyunu seç.
      const secilenBoy = availableLengthsMm.find((l) => l >= p.lengthMm) ?? enUzunBoyMm;
      bars.push({ cuts: [p], remaining: secilenBoy - p.lengthMm, stockLengthMm: secilenBoy });
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
    warnings,
  };
}
