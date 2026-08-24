// Çatı/kanopi kaplama türleri - ortak tanım. Hem hesaplama motorları (roofTruss, canopy)
// hem de AI malzeme danışmanının ağırlık tahmini bu tabloyu kullanır.

export type KaplamaTuru = "trapez_sac" | "sandvic_panel" | "etermit" | "plastik_etermit" | "polikarbon" | "yok";

export interface KaplamaBilgisi {
  label: string;
  /** Kullanıcı belirtmezse kullanılacak tipik kalınlık (mm). */
  varsayilanKalinlikMm: number;
  /** Ağırlık tahmini için efektif yoğunluk (kg/m3). Sandviç panel gibi kompozit ürünlerde
   * gerçek malzeme yoğunluğu değil, tipik alan ağırlığını (kg/m2) verecek şekilde ayarlanmış bir değerdir. */
  efektifYogunlukKgM3: number;
  /** Bir panelin/levhanın tipik faydalı (örtüşme sonrası kaplayan) genişliği (mm). Sipariş edilecek
   * panel sayısını hesaplamak için kullanılır. */
  faydaliGenislikMm: number;
  /** Yan/uç bindirmeler + kesim fireleri nedeniyle tipik fazladan malzeme oranı (%). Yaklaşık bir
   * saha değeridir; gerçek fire, montaj detayına ve kesim disiplinine göre değişir. */
  tipikFireYuzde: number;
}

export const KAPLAMA_BILGI: Record<Exclude<KaplamaTuru, "yok">, KaplamaBilgisi> = {
  trapez_sac: {
    label: "Çatı kaplaması (trapez sac)",
    varsayilanKalinlikMm: 0.5,
    efektifYogunlukKgM3: 7850,
    faydaliGenislikMm: 1000,
    tipikFireYuzde: 8,
  },
  sandvic_panel: {
    label: "Çatı kaplaması (sandviç panel)",
    varsayilanKalinlikMm: 40,
    efektifYogunlukKgM3: 250,
    faydaliGenislikMm: 1000,
    tipikFireYuzde: 5,
  },
  etermit: {
    label: "Çatı kaplaması (etermit)",
    varsayilanKalinlikMm: 6,
    efektifYogunlukKgM3: 1900,
    faydaliGenislikMm: 920,
    tipikFireYuzde: 12,
  },
  plastik_etermit: {
    label: "Çatı kaplaması (plastik etermit)",
    varsayilanKalinlikMm: 2,
    efektifYogunlukKgM3: 1400,
    faydaliGenislikMm: 900,
    tipikFireYuzde: 10,
  },
  polikarbon: {
    label: "Çatı kaplaması (polikarbon)",
    varsayilanKalinlikMm: 6,
    efektifYogunlukKgM3: 1200,
    faydaliGenislikMm: 2100,
    tipikFireYuzde: 5,
  },
};

/** Kaplama alanı/sipariş/fire hesaplaması. netAlanM2: çatının gerçek (kaplanan) alanı. Sipariş edilecek
 * alan iki fire kaynağını birden hesaba katar: (1) panel genişliğine göre yukarı yuvarlamadan doğan
 * fire, (2) uzunluk yönünde tipik bindirme/kesim fire oranı (tipikFireYuzde). */
export function kaplamaHesapla(
  kaplamaTuru: Exclude<KaplamaTuru, "yok">,
  boyMm: number,
  kaplanacakGenislikMm: number
): { panelSayisi: number; siparisAlaniM2: number; netAlaniM2: number; fireM2: number; fireYuzde: number } {
  const bilgi = KAPLAMA_BILGI[kaplamaTuru];
  const panelSayisi = Math.max(1, Math.ceil(kaplanacakGenislikMm / bilgi.faydaliGenislikMm));
  const netAlaniM2 = (boyMm / 1000) * (kaplanacakGenislikMm / 1000);
  const siparisAlaniM2 = ((panelSayisi * bilgi.faydaliGenislikMm * boyMm) / 1_000_000) * (1 + bilgi.tipikFireYuzde / 100);
  const fireM2 = Math.max(0, siparisAlaniM2 - netAlaniM2);
  const fireYuzde = netAlaniM2 > 0 ? Math.round((fireM2 / netAlaniM2) * 1000) / 10 : 0;
  return {
    panelSayisi,
    siparisAlaniM2: Math.round(siparisAlaniM2 * 100) / 100,
    netAlaniM2: Math.round(netAlaniM2 * 100) / 100,
    fireM2: Math.round(fireM2 * 100) / 100,
    fireYuzde,
  };
}

export const KAPLAMA_TURU_SECENEKLERI: { key: KaplamaTuru; label: string }[] = [
  { key: "trapez_sac", label: "Trapez Sac" },
  { key: "sandvic_panel", label: "Sandviç Panel" },
  { key: "etermit", label: "Etermit" },
  { key: "plastik_etermit", label: "Plastik Etermit" },
  { key: "polikarbon", label: "Polikarbon" },
  { key: "yok", label: "Kaplama Yok" },
];
