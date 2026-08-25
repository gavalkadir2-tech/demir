// Sac (levha) kesim optimizasyonu - basit 2D yerleştirme (Next Fit Decreasing Height / "raf" algoritması).
//
// Yöntem: parçalar yükseklik (boyMm) büyükten küçüğe sıralanır, sac üzerinde soldan sağa "raflar"
// halinde yerleştirilir - bir raf, en yüksek (ilk yerleşen) parçanın yüksekliği kadar yer kaplar.
// Bu, tam optimal bir 2D nesting DEĞİLDİR (gerçek nesting NP-zor bir problemdir) ama basit, hızlı,
// deterministik ve tipik dikdörtgen parça karışımlarında makul bir yerleşim verir.
//
// Basitleştirme notu: parçalar döndürülmez (90° rotasyon desteklenmez) - bir parça verilen
// yönde sac boyutlarına sığmıyorsa hata verir, döndürülerek sığıp sığmayacağı denenmez.

import { HesaplamaHatasi, round2 } from "./units";

export interface SacParcasi {
  enMm: number;
  boyMm: number;
  adet: number;
  label?: string;
}

export interface YerlesenParca {
  enMm: number;
  boyMm: number;
  xMm: number;
  yMm: number;
  label?: string;
}

export interface SacLevhasi {
  parcalar: YerlesenParca[];
  kullanilanAlanMm2: number;
}

export interface SacNestingSonucu {
  sheetWidthMm: number;
  sheetHeightMm: number;
  kerfMm: number;
  levhalar: SacLevhasi[];
  toplamLevha: number;
  toplamParca: number;
  toplamAlanMm2: number;
  kullanilanAlanMm2: number;
  fireAlanMm2: number;
  fireYuzde: number;
}

function expandParcalar(pieces: SacParcasi[]): { enMm: number; boyMm: number; label?: string }[] {
  const out: { enMm: number; boyMm: number; label?: string }[] = [];
  for (const p of pieces) {
    for (let i = 0; i < p.adet; i++) out.push({ enMm: Math.round(p.enMm), boyMm: Math.round(p.boyMm), label: p.label });
  }
  return out;
}

/** Basit raf (shelf) tabanlı 2D sac yerleştirme. Rotasyon desteklenmez. */
export function nestSheets(pieces: SacParcasi[], sheetWidthMm: number, sheetHeightMm: number, kerfMm: number): SacNestingSonucu {
  if (sheetWidthMm <= 0 || sheetHeightMm <= 0) throw new HesaplamaHatasi("Levha en/boy 0'dan büyük olmalı.");
  if (kerfMm < 0) throw new HesaplamaHatasi("Kesim payı negatif olamaz.");

  const parcalar = expandParcalar(pieces).sort((a, b) => b.boyMm - a.boyMm);

  if (parcalar.length === 0) {
    return {
      sheetWidthMm,
      sheetHeightMm,
      kerfMm,
      levhalar: [],
      toplamLevha: 0,
      toplamParca: 0,
      toplamAlanMm2: 0,
      kullanilanAlanMm2: 0,
      fireAlanMm2: 0,
      fireYuzde: 0,
    };
  }

  for (const p of parcalar) {
    if (p.enMm > sheetWidthMm || p.boyMm > sheetHeightMm) {
      throw new HesaplamaHatasi(
        `${p.enMm}x${p.boyMm} mm parça, ${sheetWidthMm}x${sheetHeightMm} mm levhaya sığmıyor (rotasyon desteklenmiyor). Daha büyük levha seçin veya parçayı bölün.`
      );
    }
  }

  interface Raf {
    yukseklikMm: number;
    kalanGenislikMm: number;
    parcalar: YerlesenParca[];
  }
  interface Levha {
    raflar: Raf[];
    kalanYukseklikMm: number;
  }

  const levhalar: Levha[] = [];

  const yeniLevhaAc = (): Levha => {
    const l: Levha = { raflar: [], kalanYukseklikMm: sheetHeightMm };
    levhalar.push(l);
    return l;
  };

  for (const parca of parcalar) {
    let yerlesti = false;
    const aktifLevha = levhalar[levhalar.length - 1];

    if (aktifLevha) {
      const sonRaf = aktifLevha.raflar[aktifLevha.raflar.length - 1];
      if (sonRaf) {
        const gerekenGenislik = sonRaf.parcalar.length === 0 ? parca.enMm : parca.enMm + kerfMm;
        // Parça, mevcut rafın yüksekliğini aşmamalı (raf yüksekliği ilk/en yüksek parçayla belirlenir).
        if (gerekenGenislik <= sonRaf.kalanGenislikMm + 1e-9 && parca.boyMm <= sonRaf.yukseklikMm + 1e-9) {
          const x = sheetWidthMm - sonRaf.kalanGenislikMm + (sonRaf.parcalar.length === 0 ? 0 : kerfMm);
          const y = sheetHeightMm - aktifLevha.kalanYukseklikMm - sonRaf.yukseklikMm;
          sonRaf.parcalar.push({ enMm: parca.enMm, boyMm: parca.boyMm, xMm: x, yMm: y, label: parca.label });
          sonRaf.kalanGenislikMm -= gerekenGenislik;
          yerlesti = true;
        }
      }
      if (!yerlesti) {
        // Aynı levhada yeni bir raf açmayı dene.
        const gerekenYukseklik = aktifLevha.raflar.length === 0 ? parca.boyMm : parca.boyMm + kerfMm;
        if (gerekenYukseklik <= aktifLevha.kalanYukseklikMm + 1e-9) {
          const y = sheetHeightMm - aktifLevha.kalanYukseklikMm + (aktifLevha.raflar.length === 0 ? 0 : kerfMm);
          const yeniRaf: Raf = { yukseklikMm: parca.boyMm, kalanGenislikMm: sheetWidthMm - parca.enMm, parcalar: [] };
          yeniRaf.parcalar.push({ enMm: parca.enMm, boyMm: parca.boyMm, xMm: 0, yMm: y, label: parca.label });
          aktifLevha.raflar.push(yeniRaf);
          aktifLevha.kalanYukseklikMm -= gerekenYukseklik;
          yerlesti = true;
        }
      }
    }

    if (!yerlesti) {
      const yeniLevha = yeniLevhaAc();
      const yeniRaf: Raf = { yukseklikMm: parca.boyMm, kalanGenislikMm: sheetWidthMm - parca.enMm, parcalar: [] };
      yeniRaf.parcalar.push({ enMm: parca.enMm, boyMm: parca.boyMm, xMm: 0, yMm: 0, label: parca.label });
      yeniLevha.raflar.push(yeniRaf);
      yeniLevha.kalanYukseklikMm -= parca.boyMm;
    }
  }

  const sonucLevhalar: SacLevhasi[] = levhalar.map((l) => {
    const tumParcalar = l.raflar.flatMap((r) => r.parcalar);
    const kullanilanAlanMm2 = tumParcalar.reduce((s, p) => s + p.enMm * p.boyMm, 0);
    return { parcalar: tumParcalar, kullanilanAlanMm2: round2(kullanilanAlanMm2) };
  });

  const toplamAlanMm2 = sonucLevhalar.length * sheetWidthMm * sheetHeightMm;
  const kullanilanAlanMm2 = round2(sonucLevhalar.reduce((s, l) => s + l.kullanilanAlanMm2, 0));
  const fireAlanMm2 = round2(toplamAlanMm2 - kullanilanAlanMm2);
  const fireYuzde = toplamAlanMm2 > 0 ? round2((fireAlanMm2 / toplamAlanMm2) * 100) : 0;

  return {
    sheetWidthMm,
    sheetHeightMm,
    kerfMm,
    levhalar: sonucLevhalar,
    toplamLevha: sonucLevhalar.length,
    toplamParca: parcalar.length,
    toplamAlanMm2,
    kullanilanAlanMm2,
    fireAlanMm2,
    fireYuzde,
  };
}
