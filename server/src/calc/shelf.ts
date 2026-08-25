// Raf (depo/atölye rafı) hesaplama motoru. 4 köşe ayak + her raf seviyesinde dikdörtgen bir
// çerçeve (genişlik + derinlik yönü profilleri) - isteğe bağlı sac raf yüzeyi ve arka stabilite
// çaprazı ile.

import { HesaplamaHatasi } from "./units";
import { HesaplananParca, UrunHesapSonucu, bosSonuc, profilOzetOlustur } from "./types";

export interface RafGirdi {
  /** Raf genişliği (mm) */
  genislikMm: number;
  /** Raf derinliği (mm) */
  derinlikMm: number;
  /** Toplam yükseklik (mm) */
  yukseklikMm: number;
  /** Raf (yatay seviye) sayısı, en az 2 (alt + üst) */
  rafSayisi: number;
  /** Dikey ayak profil kesiti */
  ayakProfilKey: string;
  /** Her raf seviyesindeki dikdörtgen çerçeve profil kesiti */
  rafCercevesiProfilKey: string;
  /** Raf yüzeyi için sac plaka kullanılsın mı (varsayılan true) */
  rafSacKullan?: boolean;
  sacKalinlikMm?: number;
  /** Arka yüzde stabilite çaprazı (X) profil kesiti - opsiyonel */
  caprazProfilKey?: string;
  /** Bir raf seviyesi için tasarım yükü (kg/m²) - malzeme listesini etkilemez, sadece yapısal
   * kontrolde (bkz. structuralCheck.ts) kullanılır. Belirtilmezse tipik bir varsayım kullanılır. */
  tasarimYukuKgM2?: number;
}

const VARSAYILAN = {
  rafSacKullan: true,
  sacKalinlikMm: 1.5,
};

export function calculateShelf(girdi: RafGirdi): UrunHesapSonucu {
  const { genislikMm, derinlikMm, yukseklikMm, rafSayisi, ayakProfilKey, rafCercevesiProfilKey } = girdi;

  if (genislikMm <= 0) throw new HesaplamaHatasi("Genişlik 0'dan büyük olmalı.");
  if (derinlikMm <= 0) throw new HesaplamaHatasi("Derinlik 0'dan büyük olmalı.");
  if (yukseklikMm <= 0) throw new HesaplamaHatasi("Yükseklik 0'dan büyük olmalı.");
  if (rafSayisi < 2) throw new HesaplamaHatasi("Raf sayısı en az 2 olmalı (alt + üst).");
  if (!ayakProfilKey || !rafCercevesiProfilKey) throw new HesaplamaHatasi("Ayak ve raf çerçevesi profilleri seçilmelidir.");

  const rafSacKullan = girdi.rafSacKullan ?? VARSAYILAN.rafSacKullan;
  const sacKalinlikMm = girdi.sacKalinlikMm ?? VARSAYILAN.sacKalinlikMm;

  const sonuc = bosSonuc();

  if (derinlikMm > 700) {
    sonuc.uyarilar.push(`Derinlik ${derinlikMm} mm oldukça geniş; orta destek olmadan raf sehimi artabilir.`);
  }

  const rafAraligiMm = yukseklikMm / (rafSayisi - 1);

  const parcalar: HesaplananParca[] = [];

  parcalar.push({
    label: "Dikme (ayak)",
    profilKey: ayakProfilKey,
    uzunlukMm: yukseklikMm,
    adet: 4,
  });

  parcalar.push({
    label: "Raf çerçevesi (genişlik yönü)",
    profilKey: rafCercevesiProfilKey,
    uzunlukMm: Math.round(genislikMm),
    adet: 2 * rafSayisi,
    not: "Her raf seviyesinde ön + arka kenar.",
  });

  parcalar.push({
    label: "Raf çerçevesi (derinlik yönü)",
    profilKey: rafCercevesiProfilKey,
    uzunlukMm: Math.round(derinlikMm),
    adet: 2 * rafSayisi,
    not: "Her raf seviyesinde sol + sağ kenar.",
  });

  if (girdi.caprazProfilKey) {
    const caprazUzunlukMm = Math.sqrt(yukseklikMm ** 2 + genislikMm ** 2);
    parcalar.push({
      label: "Çapraz (arka stabilite)",
      profilKey: girdi.caprazProfilKey,
      uzunlukMm: Math.ceil(caprazUzunlukMm),
      adet: 2,
      not: "Arka yüzde X şeklinde rüzgar/deprem/devrilme stabilitesi.",
    });
  }

  sonuc.parcalar = parcalar;
  sonuc.profilOzet = profilOzetOlustur(parcalar);

  if (rafSacKullan) {
    sonuc.sacKalemleri.push({
      label: "Raf plakası",
      enMm: Math.round(genislikMm),
      boyMm: Math.round(derinlikMm),
      kalinlikMm: sacKalinlikMm,
      adet: rafSayisi,
    });
  }

  const tabanAlaniM2 = (genislikMm / 1000) * (derinlikMm / 1000);

  sonuc.ozetDegerler = {
    rafSayisi,
    rafAraligiMm: Math.round(rafAraligiMm * 100) / 100,
    tabanAlaniM2: Math.round(tabanAlaniM2 * 100) / 100,
    toplamRafAlaniM2: Math.round(tabanAlaniM2 * rafSayisi * 100) / 100,
  };

  return sonuc;
}
