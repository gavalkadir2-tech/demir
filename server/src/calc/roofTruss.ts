// Çatı Kafesi hesaplama motoru (kral kirişi / king-post tipi - basitleştirilmiş).
// Bir çatı, belirli aralıklarla dizilen kafeslerden (makas) oluşur. Bu motor tek bir
// kafesin parçalarını hesaplar ve çatı uzunluğu boyunca gereken kafes sayısıyla çarpar.

import { HesaplamaHatasi } from "./units";
import { HesaplananParca, UrunHesapSonucu, bosSonuc, profilOzetOlustur } from "./types";

export interface CatiKafesiGirdi {
  /** Açıklık (mm) - kafesin kapattığı toplam genişlik */
  acikligMm: number;
  /** Çatı eğimi (%) */
  egimYuzde: number;
  /** Çatı uzunluğu (mm) - kafeslerin dizildiği yön (bina uzunluğu) */
  catiUzunluguMm: number;
  /** Hedeflenen kafesler arası aralık (mm), örn. 900 */
  kafesAraligiHedefMm: number;
  /** Üst başlık (eğimli) profil kesiti */
  ustBaslikProfilKey: string;
  /** Alt başlık (yatay) profil kesiti */
  altBaslikProfilKey: string;
  /** Kral kirişi (dikey orta eleman) profil kesiti - opsiyonel */
  kralKirisiProfilKey?: string;
  /** Çapraz destek profil kesiti - opsiyonel */
  diyagonalProfilKey?: string;
  /** Kafes başına çapraz destek sayısı (0, 2 veya 4 gibi) */
  diyagonalSayisi?: number;
  /** Aşık (üst başlıklar üzerine, çatı uzunluğu boyunca döşenen) profil kesiti - opsiyonel */
  asikProfilKey?: string;
  /** Hedeflenen aşık aralığı (mm), eğim yönünde, örn. 1000 */
  asikAraligiHedefMm?: number;
  plakaEnMm?: number;
  plakaBoyMm?: number;
  plakaKalinlikMm?: number;
  ankrajSayisiPerPlaka?: number;
}

const VARSAYILAN = {
  diyagonalSayisi: 0,
  asikAraligiHedefMm: 1000,
  plakaEnMm: 120,
  plakaBoyMm: 120,
  plakaKalinlikMm: 10,
  ankrajSayisiPerPlaka: 4,
};

export function calculateRoofTruss(girdi: CatiKafesiGirdi): UrunHesapSonucu {
  const { acikligMm, egimYuzde, catiUzunluguMm, kafesAraligiHedefMm, ustBaslikProfilKey, altBaslikProfilKey } = girdi;

  if (acikligMm <= 0) throw new HesaplamaHatasi("Açıklık 0'dan büyük olmalı.");
  if (egimYuzde < 0) throw new HesaplamaHatasi("Eğim negatif olamaz.");
  if (catiUzunluguMm <= 0) throw new HesaplamaHatasi("Çatı uzunluğu 0'dan büyük olmalı.");
  if (kafesAraligiHedefMm <= 0) throw new HesaplamaHatasi("Kafesler arası aralık 0'dan büyük olmalı.");
  if (!ustBaslikProfilKey || !altBaslikProfilKey) throw new HesaplamaHatasi("Üst başlık ve alt başlık profilleri seçilmelidir.");

  const diyagonalSayisi = girdi.diyagonalSayisi ?? VARSAYILAN.diyagonalSayisi;
  if (diyagonalSayisi > 0 && !girdi.diyagonalProfilKey)
    throw new HesaplamaHatasi("Çapraz destek sayısı girildi ama çapraz destek profili seçilmedi.");

  const plakaEnMm = girdi.plakaEnMm ?? VARSAYILAN.plakaEnMm;
  const plakaBoyMm = girdi.plakaBoyMm ?? VARSAYILAN.plakaBoyMm;
  const plakaKalinlikMm = girdi.plakaKalinlikMm ?? VARSAYILAN.plakaKalinlikMm;
  const ankrajSayisiPerPlaka = girdi.ankrajSayisiPerPlaka ?? VARSAYILAN.ankrajSayisiPerPlaka;

  const sonuc = bosSonuc();

  if (egimYuzde < 15) {
    sonuc.uyarilar.push("Eğim %15'in altında; çatı kafesi için genellikle daha dik bir eğim tercih edilir.");
  }
  if (acikligMm > 8000 && diyagonalSayisi === 0) {
    sonuc.uyarilar.push("Açıklık 8 metreden geniş; ek çapraz destek (diyagonal) eklemeyi düşünün.");
  }

  const yariAciklikMm = acikligMm / 2;
  const mahyaYuksekligiMm = yariAciklikMm * (egimYuzde / 100);
  const ustBaslikUzunlukMm = Math.sqrt(yariAciklikMm ** 2 + mahyaYuksekligiMm ** 2);

  const araliklarSayisi = Math.max(1, Math.ceil(catiUzunluguMm / kafesAraligiHedefMm));
  const gercekAralikMm = catiUzunluguMm / araliklarSayisi;
  const kafesSayisi = araliklarSayisi + 1;

  const parcalar: HesaplananParca[] = [];

  parcalar.push({
    label: "Üst başlık",
    profilKey: ustBaslikProfilKey,
    uzunlukMm: Math.ceil(ustBaslikUzunlukMm),
    adet: 2 * kafesSayisi,
    not: "Çatı eğimine göre hesaplanan diyagonal uzunluk.",
  });

  parcalar.push({
    label: "Alt başlık",
    profilKey: altBaslikProfilKey,
    uzunlukMm: Math.round(acikligMm),
    adet: kafesSayisi,
  });

  if (girdi.kralKirisiProfilKey) {
    parcalar.push({
      label: "Kral kirişi",
      profilKey: girdi.kralKirisiProfilKey,
      uzunlukMm: Math.ceil(mahyaYuksekligiMm),
      adet: kafesSayisi,
    });
  }

  if (diyagonalSayisi > 0 && girdi.diyagonalProfilKey) {
    const diyagonalUzunlukMm = Math.sqrt((yariAciklikMm / 2) ** 2 + (mahyaYuksekligiMm / 2) ** 2);
    parcalar.push({
      label: "Çapraz destek",
      profilKey: girdi.diyagonalProfilKey,
      uzunlukMm: Math.ceil(diyagonalUzunlukMm),
      adet: diyagonalSayisi * kafesSayisi,
      not: "Yaklaşık diyagonal destek uzunluğu, sahada son ayar gerekebilir.",
    });
  }

  let asikSatirSayisi = 0;
  if (girdi.asikProfilKey) {
    const asikAraligiHedefMm = girdi.asikAraligiHedefMm ?? VARSAYILAN.asikAraligiHedefMm;
    const asikSatirSayisiPerSide = Math.max(2, Math.ceil(ustBaslikUzunlukMm / asikAraligiHedefMm) + 1);
    asikSatirSayisi = 2 * asikSatirSayisiPerSide;
    parcalar.push({
      label: "Aşık",
      profilKey: girdi.asikProfilKey,
      uzunlukMm: Math.round(catiUzunluguMm),
      adet: asikSatirSayisi,
      not: "Çatının iki eğimine (sol+sağ) eşit dağıtılmış aşık sıraları; kesim listesinde standart boya göre bölünecektir.",
    });
  }

  sonuc.parcalar = parcalar;
  sonuc.profilOzet = profilOzetOlustur(parcalar);

  // Her kafes iki mesnet noktasından (duvar/kolon üstü) oturur.
  sonuc.sacKalemleri.push({
    label: "Mesnet plakası",
    enMm: plakaEnMm,
    boyMm: plakaBoyMm,
    kalinlikMm: plakaKalinlikMm,
    adet: 2 * kafesSayisi,
  });
  sonuc.baglantiKalemleri.push({
    label: "Ankraj (kimyasal/mekanik dübel)",
    birim: "adet",
    adet: 2 * kafesSayisi * ankrajSayisiPerPlaka,
  });

  const egimDerece = (Math.atan(egimYuzde / 100) * 180) / Math.PI;
  const catiAlaniM2 = ((2 * ustBaslikUzunlukMm) / 1000) * (catiUzunluguMm / 1000);

  sonuc.ozetDegerler = {
    kafesSayisi,
    araliklarSayisi,
    gercekAralikMm: Math.round(gercekAralikMm * 100) / 100,
    mahyaYuksekligiMm: Math.round(mahyaYuksekligiMm),
    ustBaslikUzunlukMm: Math.round(ustBaslikUzunlukMm),
    egimDerece: Math.round(egimDerece * 100) / 100,
    catiAlaniM2: Math.round(catiAlaniM2 * 100) / 100,
    asikSatirSayisi,
  };

  return sonuc;
}
