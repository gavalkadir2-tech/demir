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
}

export const KAPLAMA_BILGI: Record<Exclude<KaplamaTuru, "yok">, KaplamaBilgisi> = {
  trapez_sac: { label: "Çatı kaplaması (trapez sac)", varsayilanKalinlikMm: 0.5, efektifYogunlukKgM3: 7850 },
  sandvic_panel: { label: "Çatı kaplaması (sandviç panel)", varsayilanKalinlikMm: 40, efektifYogunlukKgM3: 250 },
  etermit: { label: "Çatı kaplaması (etermit)", varsayilanKalinlikMm: 6, efektifYogunlukKgM3: 1900 },
  plastik_etermit: { label: "Çatı kaplaması (plastik etermit)", varsayilanKalinlikMm: 2, efektifYogunlukKgM3: 1400 },
  polikarbon: { label: "Çatı kaplaması (polikarbon)", varsayilanKalinlikMm: 6, efektifYogunlukKgM3: 1200 },
};

export const KAPLAMA_TURU_SECENEKLERI: { key: KaplamaTuru; label: string }[] = [
  { key: "trapez_sac", label: "Trapez Sac" },
  { key: "sandvic_panel", label: "Sandviç Panel" },
  { key: "etermit", label: "Etermit" },
  { key: "plastik_etermit", label: "Plastik Etermit" },
  { key: "polikarbon", label: "Polikarbon" },
  { key: "yok", label: "Kaplama Yok" },
];
