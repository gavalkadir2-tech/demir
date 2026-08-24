// Çatı Kafesi hesaplama motoru (kral kirişi / king-post tipi - basitleştirilmiş).
// Bir çatı, belirli aralıklarla dizilen kafeslerden (makas) oluşur. Bu motor tek bir
// kafesin parçalarını hesaplar ve çatı uzunluğu boyunca gereken kafes sayısıyla çarpar.

import { HesaplamaHatasi } from "./units";
import { HesaplananParca, UrunHesapSonucu, bosSonuc, profilOzetOlustur } from "./types";
import { KAPLAMA_BILGI, KaplamaTuru } from "./kaplama";

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
  /** Çatı kaplama türü */
  kaplamaTuru?: KaplamaTuru;
  kaplamaKalinlikMm?: number;
  plakaEnMm?: number;
  plakaBoyMm?: number;
  plakaKalinlikMm?: number;
  ankrajSayisiPerPlaka?: number;
  /** İlk açıklıkta (ilk iki kafes arası) yatay+düşey stabilite (rüzgar/deprem) çaprazları eklensin mi. */
  stabiliteBaglantisiVar?: boolean;
  /** Stabilite çaprazı profil kesiti (genellikle L profil) - stabiliteBaglantisiVar true ise zorunlu. */
  stabiliteProfilKey?: string;
}

const VARSAYILAN = {
  diyagonalSayisi: 0,
  asikAraligiHedefMm: 1000,
  kaplamaTuru: "trapez_sac" as const,
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
  if (girdi.stabiliteBaglantisiVar && !girdi.stabiliteProfilKey)
    throw new HesaplamaHatasi("Stabilite bağlantısı seçildi ama stabilite profili seçilmedi.");

  const plakaEnMm = girdi.plakaEnMm ?? VARSAYILAN.plakaEnMm;
  const plakaBoyMm = girdi.plakaBoyMm ?? VARSAYILAN.plakaBoyMm;
  const plakaKalinlikMm = girdi.plakaKalinlikMm ?? VARSAYILAN.plakaKalinlikMm;
  const ankrajSayisiPerPlaka = girdi.ankrajSayisiPerPlaka ?? VARSAYILAN.ankrajSayisiPerPlaka;

  const sonuc = bosSonuc();

  if (egimYuzde < 15) {
    sonuc.uyarilar.push("Eğim %15'in altında; çatı kafesi için genellikle daha dik bir eğim tercih edilir.");
  }
  if (acikligMm > 8000 && !girdi.diyagonalProfilKey) {
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

  // Diyagonal ağ: yarım açıklığı panelSayisi eşit panele bölüp, alt başlık <-> üst başlık arasında
  // zikzak (Warren tipi) çapraz eleman dizisi oluşturur - tam bir kafes makası gibi, sadece ortada
  // birkaç eleman değil. diyagonalSayisi verilmişse panel sayısını ondan türetir (yaklaşık, /4),
  // verilmemişse açıklığa göre otomatik makul bir panel sayısı seçer.
  let diyagonalPanelSayisi = 0;
  if (girdi.diyagonalProfilKey) {
    diyagonalPanelSayisi = diyagonalSayisi > 0 ? Math.max(1, Math.round(diyagonalSayisi / 4)) : Math.max(2, Math.round(yariAciklikMm / 900));
    const panelGenislikMm = yariAciklikMm / diyagonalPanelSayisi;
    let toplamCaprazMmBirYamacBirKafes = 0;
    for (let k = 0; k < diyagonalPanelSayisi; k++) {
      const ustYukseklik = ((k + 1) / diyagonalPanelSayisi) * mahyaYuksekligiMm;
      const altYukseklik = (k / diyagonalPanelSayisi) * mahyaYuksekligiMm;
      toplamCaprazMmBirYamacBirKafes += Math.sqrt(panelGenislikMm ** 2 + ustYukseklik ** 2); // alt(k) -> üst(k+1)
      toplamCaprazMmBirYamacBirKafes += Math.sqrt(panelGenislikMm ** 2 + altYukseklik ** 2); // üst(k) -> alt(k+1)
    }
    const toplamDiyagonalAdet = 4 * diyagonalPanelSayisi * kafesSayisi; // 2 yamaç x (2 x panel) segment x kafes sayısı
    const toplamCaprazMmTumKafesler = toplamCaprazMmBirYamacBirKafes * 2 * kafesSayisi; // 2 yamaç
    const ortalamaUzunlukMm = toplamCaprazMmTumKafesler / toplamDiyagonalAdet;
    parcalar.push({
      label: "Çapraz destek (diyagonal ağ)",
      profilKey: girdi.diyagonalProfilKey,
      uzunlukMm: Math.ceil(ortalamaUzunlukMm),
      adet: toplamDiyagonalAdet,
      not: `Tam diyagonal ağ (yarım açıklıkta ${diyagonalPanelSayisi} panel, zikzak/Warren tipi); gösterilen ortalama uzunluktur, panel konumuna göre gerçek uzunluklar farklılık gösterir - sahada ölçüp kesilmesi önerilir.`,
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

  if (girdi.stabiliteBaglantisiVar && girdi.stabiliteProfilKey) {
    if (kafesSayisi < 2) {
      sonuc.uyarilar.push("Stabilite bağlantısı için en az 2 kafes gerekir; tek kafeste eklenmedi.");
    } else {
      const yatayCaprazUzunlukMm = Math.sqrt(gercekAralikMm ** 2 + ustBaslikUzunlukMm ** 2);
      const duseyCaprazUzunlukMm = Math.sqrt(gercekAralikMm ** 2 + mahyaYuksekligiMm ** 2);
      parcalar.push({
        label: "Stabilite bağlantısı (yatay)",
        profilKey: girdi.stabiliteProfilKey,
        uzunlukMm: Math.ceil(yatayCaprazUzunlukMm),
        adet: 4, // iki yamaçta X şeklinde (2+2), ilk açıklık
        not: "Üst başlık düzleminde, ilk açıklıkta rüzgar/deprem çaprazı (X). Uzun çatılarda ek açıklıklara da eklenmesi önerilir.",
      });
      parcalar.push({
        label: "Stabilite bağlantısı (düşey)",
        profilKey: girdi.stabiliteProfilKey,
        uzunlukMm: Math.ceil(duseyCaprazUzunlukMm),
        adet: 2, // kral kirişleri arasında X şeklinde, ilk açıklık
        not: "Kral kirişleri arasında, ilk açıklıkta düşey çapraz (X).",
      });
    }
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

  const kaplamaTuru = girdi.kaplamaTuru ?? VARSAYILAN.kaplamaTuru;
  if (kaplamaTuru !== "yok") {
    const kaplamaBilgisi = KAPLAMA_BILGI[kaplamaTuru];
    sonuc.sacKalemleri.push({
      label: kaplamaBilgisi.label,
      enMm: Math.round(catiUzunluguMm),
      boyMm: Math.ceil(ustBaslikUzunlukMm),
      kalinlikMm: girdi.kaplamaKalinlikMm ?? kaplamaBilgisi.varsayilanKalinlikMm,
      adet: 2, // iki yamaç
    });
  }

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
    diyagonalPanelSayisi,
  };

  return sonuc;
}
