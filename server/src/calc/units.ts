// Merkezi birim dönüşümleri. Tüm hesaplama motoru dahili olarak MİLİMETRE (mm) kullanır;
// dışa dönük sonuçlarda m / m² / kg gibi birimlere burada çevrilir.

export const mmToM = (mm: number): number => mm / 1000;
export const mToMm = (m: number): number => m * 1000;
export const cmToMm = (cm: number): number => cm * 10;
export const mmToCm = (mm: number): number => mm / 10;

export const mm2ToM2 = (mm2: number): number => mm2 / 1_000_000;

/** İki ondalığa yuvarlar (para/rapor gösterimi için). Hesaplama ara adımlarında kullanılmaz. */
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Tam sayıya yuvarlar (adet gibi değerler için, yukarı). */
export const ceilInt = (n: number): number => Math.ceil(n - 1e-9);

export class HesaplamaHatasi extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HesaplamaHatasi";
  }
}
