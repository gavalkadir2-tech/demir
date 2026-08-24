// Sarf malzeme (kaynak teli, boya) tüketim tahmini - gerçek kesit çevresi ve toplam ağırlıktan
// hesaplanır. Bunlar sektörde yaygın kullanılan kaba oranlardır (kesin değil); atölyeden atölyeye,
// kaynak yöntemine ve boya sistemine göre değişir - bu yüzden her zaman "tahmini" olarak sunulmalıdır.

import { ProfilKesitVerisi } from "./engineering";

/** Bir profilin boyanacak dış yüzey çevresini (mm) hesaplar. Kesit bilgisi eksikse null döner. */
export function kesitCevresiHesapla(veri: ProfilKesitVerisi): number | null {
  const { profilSekli, widthMm, heightMm, thicknessMm } = veri;
  if (!profilSekli || !widthMm) return null;

  switch (profilSekli) {
    case "BOX":
      if (!heightMm) return null;
      return 2 * (widthMm + heightMm);
    case "FLAT":
      if (!thicknessMm) return null;
      return 2 * (widthMm + thicknessMm);
    case "ANGLE":
      if (!thicknessMm) return null;
      // İki kolu düz bir şerit gibi açılmış (yaklaşık), her iki yüzü boyanır.
      return 2 * (2 * widthMm - thicknessMm);
    case "CHANNEL":
      if (!heightMm) return null;
      return 2 * (widthMm + heightMm); // dış zarf yaklaşımı
    case "ROUND_SOLID":
      return Math.PI * widthMm;
    case "ROUND_PIPE":
      return Math.PI * widthMm; // sadece dış yüzey (iç yüzey genelde boyanmaz)
    default:
      return null;
  }
}

export interface ParcaBoyutu {
  lengthMm: number;
  qty: number;
  kesit: ProfilKesitVerisi;
}

/** Bir grup parçanın toplam boyanacak yüzey alanını (m²) hesaplar. Kesit bilgisi eksik olan
 * parçalar atlanır (eksikYuzeyVerisi=true ile işaretlenir, toplam eksik hesaplanmış olabilir). */
export function yuzeyAlaniM2Hesapla(parcalar: ParcaBoyutu[]): { yuzeyAlaniM2: number; eksikVeri: boolean } {
  let toplamMm2 = 0;
  let eksikVeri = false;
  for (const p of parcalar) {
    const cevreMm = kesitCevresiHesapla(p.kesit);
    if (cevreMm == null) {
      eksikVeri = true;
      continue;
    }
    toplamMm2 += cevreMm * p.lengthMm * p.qty;
  }
  return { yuzeyAlaniM2: toplamMm2 / 1_000_000, eksikVeri };
}

const KAYNAK_TELI_ORANI = 0.015; // toplam çelik ağırlığının tipik ~%1.5'i (hafif imalat, fileto kaynak) - kaba oran
const BOYA_KG_PER_M2 = 0.35; // astar + son kat toplam, tipik tüketim (kg/m²) - kaba oran

export interface SarfTahmini {
  yuzeyAlaniM2: number;
  yuzeyAlaniEksikVeri: boolean;
  kaynakTeliTahminiKg: number;
  boyaTahminiKg: number;
}

/** Toplam çelik ağırlığı ve boyanacak yüzey alanından kaynak teli + boya sarfiyat tahmini üretir. */
export function sarfTahminiHesapla(toplamCelikAgirlikKg: number, parcalar: ParcaBoyutu[]): SarfTahmini {
  const { yuzeyAlaniM2, eksikVeri } = yuzeyAlaniM2Hesapla(parcalar);
  return {
    yuzeyAlaniM2: Math.round(yuzeyAlaniM2 * 100) / 100,
    yuzeyAlaniEksikVeri: eksikVeri,
    kaynakTeliTahminiKg: Math.round(toplamCelikAgirlikKg * KAYNAK_TELI_ORANI * 100) / 100,
    boyaTahminiKg: Math.round(yuzeyAlaniM2 * BOYA_KG_PER_M2 * 100) / 100,
  };
}
