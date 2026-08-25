// Sac (levha) kesim optimizasyonu - basit 2D yerleştirme (Next Fit Decreasing Height / "raf" algoritması).
//
// Yöntem: parçalar yükseklik (boyMm) büyükten küçüğe sıralanır, sac üzerinde soldan sağa "raflar"
// halinde yerleştirilir - bir raf, en yüksek (ilk yerleşen) parçanın yüksekliği kadar yer kaplar.
// Bu, tam optimal bir 2D nesting DEĞİLDİR (gerçek nesting NP-zor bir problemdir) ama basit, hızlı,
// deterministik ve tipik dikdörtgen parça karışımlarında makul bir yerleşim verir.
//
// Rotasyon: izinVerilirse (varsayılan açık) her parça, mevcut bir rafa/yeni rafa/yeni levhaya daha
// iyi sığıyorsa 90° döndürülerek yerleştirilebilir. Yönlü desen/doku taşıyan malzemelerde (örn. bazı
// kaplama panelleri) rotasyon istenmeyebilir - bu durumda izinVerilirRotasyon=false verilmelidir.

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
  /** Parça, orijinal en/boy yönüne göre 90° döndürülerek mi yerleştirildi. */
  donduruldu?: boolean;
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

interface Yerlesim {
  enMm: number;
  boyMm: number;
  donduruldu: boolean;
}

/** Rotasyon açıksa parçanın normal ve 90° döndürülmüş iki yönünü, kapalıysa sadece normal yönünü döner. */
function yonSecenekleri(p: { enMm: number; boyMm: number }, izinVerilirRotasyon: boolean): Yerlesim[] {
  const secenekler: Yerlesim[] = [{ enMm: p.enMm, boyMm: p.boyMm, donduruldu: false }];
  if (izinVerilirRotasyon && p.enMm !== p.boyMm) {
    secenekler.push({ enMm: p.boyMm, boyMm: p.enMm, donduruldu: true });
  }
  return secenekler;
}

/** Basit raf (shelf) tabanlı 2D sac yerleştirme. */
export function nestSheets(
  pieces: SacParcasi[],
  sheetWidthMm: number,
  sheetHeightMm: number,
  kerfMm: number,
  izinVerilirRotasyon = true
): SacNestingSonucu {
  if (sheetWidthMm <= 0 || sheetHeightMm <= 0) throw new HesaplamaHatasi("Levha en/boy 0'dan büyük olmalı.");
  if (kerfMm < 0) throw new HesaplamaHatasi("Kesim payı negatif olamaz.");

  const parcalar = expandParcalar(pieces).sort((a, b) => Math.max(b.enMm, b.boyMm) - Math.max(a.enMm, a.boyMm));

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
    const digerYonSigiyor = izinVerilirRotasyon && p.boyMm <= sheetWidthMm && p.enMm <= sheetHeightMm;
    const normalYonSigiyor = p.enMm <= sheetWidthMm && p.boyMm <= sheetHeightMm;
    if (!normalYonSigiyor && !digerYonSigiyor) {
      throw new HesaplamaHatasi(
        `${p.enMm}x${p.boyMm} mm parça, ${sheetWidthMm}x${sheetHeightMm} mm levhaya${
          izinVerilirRotasyon ? " (döndürülse de)" : ""
        } sığmıyor. Daha büyük levha seçin veya parçayı bölün.`
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
    const secenekler = yonSecenekleri(parca, izinVerilirRotasyon);
    const aktifLevha = levhalar[levhalar.length - 1];

    if (aktifLevha) {
      const sonRaf = aktifLevha.raflar[aktifLevha.raflar.length - 1];
      if (sonRaf) {
        // Mevcut rafa sığan bir yön varsa (öncelik: daha az fire bırakan/dar olan) kullan.
        const uygunSecenek = secenekler
          .filter((s) => {
            const gereken = sonRaf.parcalar.length === 0 ? s.enMm : s.enMm + kerfMm;
            return gereken <= sonRaf.kalanGenislikMm + 1e-9 && s.boyMm <= sonRaf.yukseklikMm + 1e-9;
          })
          .sort((a, b) => a.enMm - b.enMm)[0];
        if (uygunSecenek) {
          const gerekenGenislik = sonRaf.parcalar.length === 0 ? uygunSecenek.enMm : uygunSecenek.enMm + kerfMm;
          const x = sheetWidthMm - sonRaf.kalanGenislikMm + (sonRaf.parcalar.length === 0 ? 0 : kerfMm);
          const y = sheetHeightMm - aktifLevha.kalanYukseklikMm - sonRaf.yukseklikMm;
          sonRaf.parcalar.push({
            enMm: uygunSecenek.enMm,
            boyMm: uygunSecenek.boyMm,
            xMm: x,
            yMm: y,
            label: parca.label,
            donduruldu: uygunSecenek.donduruldu,
          });
          sonRaf.kalanGenislikMm -= gerekenGenislik;
          yerlesti = true;
        }
      }
      if (!yerlesti) {
        // Aynı levhada yeni bir raf açmayı dene - en az yükseklik kaplayan yönü tercih et.
        const uygunSecenek = secenekler
          .filter((s) => {
            const gerekenYukseklik = aktifLevha.raflar.length === 0 ? s.boyMm : s.boyMm + kerfMm;
            return gerekenYukseklik <= aktifLevha.kalanYukseklikMm + 1e-9 && s.enMm <= sheetWidthMm + 1e-9;
          })
          .sort((a, b) => a.boyMm - b.boyMm)[0];
        if (uygunSecenek) {
          const gerekenYukseklik = aktifLevha.raflar.length === 0 ? uygunSecenek.boyMm : uygunSecenek.boyMm + kerfMm;
          const y = sheetHeightMm - aktifLevha.kalanYukseklikMm + (aktifLevha.raflar.length === 0 ? 0 : kerfMm);
          const yeniRaf: Raf = { yukseklikMm: uygunSecenek.boyMm, kalanGenislikMm: sheetWidthMm - uygunSecenek.enMm, parcalar: [] };
          yeniRaf.parcalar.push({
            enMm: uygunSecenek.enMm,
            boyMm: uygunSecenek.boyMm,
            xMm: 0,
            yMm: y,
            label: parca.label,
            donduruldu: uygunSecenek.donduruldu,
          });
          aktifLevha.raflar.push(yeniRaf);
          aktifLevha.kalanYukseklikMm -= gerekenYukseklik;
          yerlesti = true;
        }
      }
    }

    if (!yerlesti) {
      // Yeni levhada, sığan yönlerden en az yükseklik kaplayanı seç (yoksa - teorik olarak
      // oluşmaz çünkü girdi doğrulaması geçti - normal yönü kullan).
      const uygunSecenek =
        secenekler
          .filter((s) => s.enMm <= sheetWidthMm && s.boyMm <= sheetHeightMm)
          .sort((a, b) => a.boyMm - b.boyMm)[0] ?? secenekler[0];
      const yeniLevha = yeniLevhaAc();
      const yeniRaf: Raf = { yukseklikMm: uygunSecenek.boyMm, kalanGenislikMm: sheetWidthMm - uygunSecenek.enMm, parcalar: [] };
      yeniRaf.parcalar.push({
        enMm: uygunSecenek.enMm,
        boyMm: uygunSecenek.boyMm,
        xMm: 0,
        yMm: 0,
        label: parca.label,
        donduruldu: uygunSecenek.donduruldu,
      });
      yeniLevha.raflar.push(yeniRaf);
      yeniLevha.kalanYukseklikMm -= uygunSecenek.boyMm;
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
