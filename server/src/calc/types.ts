// Ürün hesaplama motorlarının ortak girdi/çıktı tipleri.
// Bu dosya UI'dan ve veritabanından bağımsızdır; sadece saf veri şekilleri tanımlar.

/** Bir ürün hesaplayıcısının ürettiği tek bir kesim parçası. */
export interface HesaplananParca {
  /** Parçanın adı, örn. "Dikme", "Üst profil" */
  label: string;
  /** Kullanılacak profil/malzeme anahtarı (kesit), örn. "40x40x2". UI'da malzeme kataloğuyla eşleştirilir. */
  profilKey: string;
  /** Parça uzunluğu (mm) */
  uzunlukMm: number;
  /** Adet */
  adet: number;
  not?: string;
}

/** Sac/plaka ihtiyacı (taban plakası, kaplama sacı vb.) */
export interface SacKalemi {
  label: string;
  enMm: number;
  boyMm: number;
  kalinlikMm?: number;
  adet: number;
  /** Ağırlık tahmini için efektif yoğunluk (kg/m3). Verilmezse çelik yoğunluğu varsayılır. */
  yogunlukKgM3?: number;
  /** Bağlı olduğu Material id'si (string) - verilirse teklif maliyetine ve iş onayında stok
   * düşümüne dahil edilir (bkz. lib/sheetCostAndStock.ts). Verilmezse (varsayılan) profil
   * parçalardan farklı olarak bu kalem maliyet/stok hesabına hiç dahil edilmez. */
  materialKey?: string;
  not?: string;
}

/** Bağlantı elemanı / sarf malzeme ihtiyacı (ankraj, cıvata, menteşe, kilit vb.) */
export interface BaglantiKalemi {
  label: string;
  birim: string;
  adet: number;
  /** Bağlı olduğu Material id'si (string) - verilirse teklif maliyetine ve iş onayında stok
   * düşümüne dahil edilir (bkz. lib/fastenerMaterialAggregation.ts). Verilmezse (varsayılan) bu
   * kalem maliyet/stok hesabına hiç dahil edilmez. */
  materialKey?: string;
}

/** Bir ürün hesaplayıcısının ürettiği toplam sonuç. */
export interface UrunHesapSonucu {
  parcalar: HesaplananParca[];
  /** Profil bazında toplam metraj (m), rapor amaçlı özet */
  profilOzet: { profilKey: string; toplamMetre: number; toplamAdetParca: number }[];
  sacKalemleri: SacKalemi[];
  baglantiKalemleri: BaglantiKalemi[];
  /** Hesaplama sırasında kullanıcıya gösterilecek uyarılar (geometrik sorunlar vb.) */
  uyarilar: string[];
  /** Ara hesap değerleri (dikme sayısı, basamak sayısı vb.) - şablon bazlı, UI'da özet gösterim için */
  ozetDegerler: Record<string, number>;
}

export function bosSonuc(): UrunHesapSonucu {
  return { parcalar: [], profilOzet: [], sacKalemleri: [], baglantiKalemleri: [], uyarilar: [], ozetDegerler: {} };
}

export function profilOzetOlustur(parcalar: HesaplananParca[]): UrunHesapSonucu["profilOzet"] {
  const map = new Map<string, { toplamMetre: number; toplamAdetParca: number }>();
  for (const p of parcalar) {
    const mevcut = map.get(p.profilKey) ?? { toplamMetre: 0, toplamAdetParca: 0 };
    mevcut.toplamMetre += (p.uzunlukMm * p.adet) / 1000;
    mevcut.toplamAdetParca += p.adet;
    map.set(p.profilKey, mevcut);
  }
  return Array.from(map.entries()).map(([profilKey, v]) => ({
    profilKey,
    toplamMetre: Math.round(v.toplamMetre * 100) / 100,
    toplamAdetParca: v.toplamAdetParca,
  }));
}
