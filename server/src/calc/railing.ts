// Korkuluk (bahçe/balkon/teras korkuluğu) hesaplama motoru.
// bkz. spesifikasyon madde 5 ve test senaryosu madde 30.

import { HesaplamaHatasi } from "./units";
import { HesaplananParca, UrunHesapSonucu, bosSonuc, profilOzetOlustur } from "./types";

export interface KorkulukGirdi {
  /** Korkuluğun toplam yatay uzunluğu (mm) */
  toplamUzunlukMm: number;
  /** Korkuluk yüksekliği (mm) */
  yukseklikMm: number;
  /** Hedeflenen dikme aralığı (mm) - gerçek aralık buna en yakın eşit bölünerek hesaplanır */
  dikmeAraligiHedefMm: number;
  /** Üst yatay profil kesiti, örn. "40x40x2" */
  ustProfilKey: string;
  /** Alt yatay profil kesiti */
  altProfilKey: string;
  /** Dikme (düşey taşıyıcı) profil kesiti */
  dikmeProfilKey: string;
  /** Ara yatay kayıt profil kesiti (opsiyonel) */
  araKayitProfilKey?: string;
  /** Kaç adet ara yatay kayıt olacak (varsayılan 0) */
  araKayitSayisi?: number;
  /** Taban plakası kullanılsın mı (varsayılan true) */
  tabanPlakaKullan?: boolean;
  plakaEnMm?: number;
  plakaBoyMm?: number;
  plakaKalinlikMm?: number;
  /** Taban plakasının alınacağı sac Material id'si (opsiyonel) - verilirse teklif maliyetine ve
   * iş onayında stok düşümüne dahil edilir. */
  plakaMalzemeKey?: string;
  /** Plaka başına ankraj sayısı */
  ankrajSayisiPerPlaka?: number;
}

const VARSAYILAN = {
  araKayitSayisi: 0,
  tabanPlakaKullan: true,
  plakaEnMm: 100,
  plakaBoyMm: 100,
  plakaKalinlikMm: 8,
  ankrajSayisiPerPlaka: 4,
};

export function calculateRailing(girdi: KorkulukGirdi): UrunHesapSonucu {
  const {
    toplamUzunlukMm,
    yukseklikMm,
    dikmeAraligiHedefMm,
    ustProfilKey,
    altProfilKey,
    dikmeProfilKey,
    araKayitProfilKey,
  } = girdi;

  const araKayitSayisi = girdi.araKayitSayisi ?? VARSAYILAN.araKayitSayisi;
  const tabanPlakaKullan = girdi.tabanPlakaKullan ?? VARSAYILAN.tabanPlakaKullan;
  const plakaEnMm = girdi.plakaEnMm ?? VARSAYILAN.plakaEnMm;
  const plakaBoyMm = girdi.plakaBoyMm ?? VARSAYILAN.plakaBoyMm;
  const plakaKalinlikMm = girdi.plakaKalinlikMm ?? VARSAYILAN.plakaKalinlikMm;
  const ankrajSayisiPerPlaka = girdi.ankrajSayisiPerPlaka ?? VARSAYILAN.ankrajSayisiPerPlaka;

  if (toplamUzunlukMm <= 0) throw new HesaplamaHatasi("Toplam uzunluk 0'dan büyük olmalı.");
  if (yukseklikMm <= 0) throw new HesaplamaHatasi("Yükseklik 0'dan büyük olmalı.");
  if (dikmeAraligiHedefMm <= 0) throw new HesaplamaHatasi("Dikme aralığı 0'dan büyük olmalı.");
  if (!ustProfilKey || !altProfilKey || !dikmeProfilKey)
    throw new HesaplamaHatasi("Üst profil, alt profil ve dikme profili seçilmelidir.");
  if (araKayitSayisi > 0 && !araKayitProfilKey)
    throw new HesaplamaHatasi("Ara kayıt sayısı girildi ama ara kayıt profili seçilmedi.");

  const sonuc = bosSonuc();

  // Dikmeleri toplam uzunluğa eşit aralıklarla, hedef aralığı aşmayacak şekilde dağıt.
  const araliklarSayisi = Math.max(1, Math.ceil(toplamUzunlukMm / dikmeAraligiHedefMm));
  const gercekAralikMm = toplamUzunlukMm / araliklarSayisi;
  const dikmeSayisi = araliklarSayisi + 1;

  if (gercekAralikMm > 2000) {
    sonuc.uyarilar.push(
      `Dikme aralığı ${gercekAralikMm.toFixed(0)} mm, önerilen taşıyıcılık sınırı olan 2000 mm'yi aşıyor. Dikme aralığını azaltmayı düşünün.`
    );
  }

  const parcalar: HesaplananParca[] = [];

  parcalar.push({
    label: "Dikme",
    profilKey: dikmeProfilKey,
    uzunlukMm: yukseklikMm,
    adet: dikmeSayisi,
  });

  parcalar.push({
    label: "Üst profil",
    profilKey: ustProfilKey,
    uzunlukMm: Math.round(gercekAralikMm),
    adet: araliklarSayisi,
  });

  parcalar.push({
    label: "Alt profil",
    profilKey: altProfilKey,
    uzunlukMm: Math.round(gercekAralikMm),
    adet: araliklarSayisi,
  });

  if (araKayitSayisi > 0 && araKayitProfilKey) {
    for (let i = 1; i <= araKayitSayisi; i++) {
      parcalar.push({
        label: `Ara kayıt ${i}`,
        profilKey: araKayitProfilKey,
        uzunlukMm: Math.round(gercekAralikMm),
        adet: araliklarSayisi,
      });
    }
  }

  sonuc.parcalar = parcalar;
  sonuc.profilOzet = profilOzetOlustur(parcalar);

  if (tabanPlakaKullan) {
    sonuc.sacKalemleri.push({
      label: "Taban plakası",
      enMm: plakaEnMm,
      boyMm: plakaBoyMm,
      kalinlikMm: plakaKalinlikMm,
      materialKey: girdi.plakaMalzemeKey,
      adet: dikmeSayisi,
    });
    sonuc.baglantiKalemleri.push({
      label: "Ankraj (kimyasal/mekanik dübel)",
      birim: "adet",
      adet: dikmeSayisi * ankrajSayisiPerPlaka,
    });
  }

  sonuc.ozetDegerler = {
    dikmeSayisi,
    araliklarSayisi,
    gercekAralikMm: Math.round(gercekAralikMm * 100) / 100,
    tabanPlakaSayisi: tabanPlakaKullan ? dikmeSayisi : 0,
    ankrajToplam: tabanPlakaKullan ? dikmeSayisi * ankrajSayisiPerPlaka : 0,
  };

  return sonuc;
}
