// Çatı/kanopi/duvar kaplama türleri - ortak tanım. Hem hesaplama motorları (roofTruss, canopy, wall)
// hem de AI malzeme danışmanının ağırlık tahmini bu tabloyu kullanır.

export type KaplamaTuru =
  | "trapez_sac"
  | "sandvic_panel"
  | "etermit"
  | "plastik_etermit"
  | "polikarbon"
  | "alcipan"
  | "petopan"
  | "yok";

/** Kaplamanın hangi yüzeyde kullanılabileceği - seçim listelerini bağlama göre filtrelemek için. */
export type KaplamaKullanimAlani = "cati" | "duvar_dis" | "duvar_ic";

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
  /** Hangi yüzey(ler)de kullanıma uygun - seçim listeleri buna göre filtrelenir. */
  kullanimAlanlari: KaplamaKullanimAlani[];
}

export const KAPLAMA_BILGI: Record<Exclude<KaplamaTuru, "yok">, KaplamaBilgisi> = {
  trapez_sac: {
    label: "trapez sac",
    varsayilanKalinlikMm: 0.5,
    efektifYogunlukKgM3: 7850,
    faydaliGenislikMm: 1000,
    tipikFireYuzde: 8,
    kullanimAlanlari: ["cati", "duvar_dis"],
  },
  sandvic_panel: {
    label: "sandviç panel",
    varsayilanKalinlikMm: 40,
    efektifYogunlukKgM3: 250,
    faydaliGenislikMm: 1000,
    tipikFireYuzde: 5,
    kullanimAlanlari: ["cati", "duvar_dis"],
  },
  etermit: {
    label: "etermit",
    varsayilanKalinlikMm: 6,
    efektifYogunlukKgM3: 1900,
    faydaliGenislikMm: 920,
    tipikFireYuzde: 12,
    kullanimAlanlari: ["cati"],
  },
  plastik_etermit: {
    label: "plastik etermit",
    varsayilanKalinlikMm: 2,
    efektifYogunlukKgM3: 1400,
    faydaliGenislikMm: 900,
    tipikFireYuzde: 10,
    kullanimAlanlari: ["cati"],
  },
  polikarbon: {
    label: "polikarbon",
    varsayilanKalinlikMm: 6,
    efektifYogunlukKgM3: 1200,
    faydaliGenislikMm: 2100,
    tipikFireYuzde: 5,
    kullanimAlanlari: ["cati"],
  },
  alcipan: {
    label: "alçıpan",
    varsayilanKalinlikMm: 12.5,
    efektifYogunlukKgM3: 750,
    faydaliGenislikMm: 1200,
    tipikFireYuzde: 10,
    kullanimAlanlari: ["duvar_ic"],
  },
  petopan: {
    label: "petopan / dış cephe mantolama",
    varsayilanKalinlikMm: 50,
    efektifYogunlukKgM3: 160,
    faydaliGenislikMm: 500,
    tipikFireYuzde: 12,
    kullanimAlanlari: ["duvar_dis"],
  },
};

/** Kaplama alanı/sipariş/fire hesaplaması. netAlanM2: kaplanan yüzeyin gerçek alanı. Sipariş edilecek
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

/** Belirli bir yüzey (çatı / duvar dış / duvar iç) için uygun kaplama seçeneklerini, "Kaplama Yok" dahil döner. */
export function kaplamaSecenekleri(alan: KaplamaKullanimAlani): { key: KaplamaTuru; label: string }[] {
  const uygunlar = (Object.keys(KAPLAMA_BILGI) as Exclude<KaplamaTuru, "yok">[])
    .filter((key) => KAPLAMA_BILGI[key].kullanimAlanlari.includes(alan))
    .map((key) => ({ key: key as KaplamaTuru, label: KAPLAMA_BILGI[key].label }));
  return [...uygunlar, { key: "yok" as const, label: "Kaplama Yok" }];
}
