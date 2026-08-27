// Kapı hesaplama motoru. bkz. spesifikasyon madde 8.

import { HesaplamaHatasi } from "./units";
import { HesaplananParca, UrunHesapSonucu, bosSonuc, profilOzetOlustur } from "./types";

export interface KapiGirdi {
  /** Kapı boşluğu genişliği (mm) */
  genislikMm: number;
  /** Kapı boşluğu yüksekliği (mm) */
  yukseklikMm: number;
  /** Kasa profil kesiti */
  kasaProfilKey: string;
  /** Kanat (kapı kanadı çerçevesi) profil kesiti */
  kanatProfilKey: string;
  /** Kanat ile kasa arasındaki toplam boşluk (mm), varsayılan 50 (her kenardan ~25) */
  kanatBosluguMm?: number;
  /** Ara kayıt profil kesiti (opsiyonel) */
  araKayitProfilKey?: string;
  araKayitSayisi?: number;
  /** Kanat kaplama sacı kalınlığı (mm); verilmezse sac kaplama hesaplanmaz */
  sacKalinlikMm?: number;
  sacIkiYuzlu?: boolean;
  /** Kaplama sacının alınacağı sac Material id'si (opsiyonel) - verilirse teklif maliyetine ve
   * iş onayında stok düşümüne dahil edilir. */
  sacMalzemeKey?: string;
  menteseAdet?: number;
  kilitAdet?: number;
  kolAdet?: number;
  /** Menteşe/kilit/kolun alınacağı Material id'leri (opsiyonel, FASTENER kategorisi). */
  menteseMalzemeKey?: string;
  kilitMalzemeKey?: string;
  kolMalzemeKey?: string;
}

const VARSAYILAN = {
  kanatBosluguMm: 50,
  araKayitSayisi: 0,
  sacIkiYuzlu: false,
  menteseAdet: 3,
  kilitAdet: 1,
  kolAdet: 1,
};

export function calculateDoor(girdi: KapiGirdi): UrunHesapSonucu {
  const { genislikMm, yukseklikMm, kasaProfilKey, kanatProfilKey } = girdi;
  const kanatBosluguMm = girdi.kanatBosluguMm ?? VARSAYILAN.kanatBosluguMm;
  const araKayitSayisi = girdi.araKayitSayisi ?? VARSAYILAN.araKayitSayisi;
  const sacIkiYuzlu = girdi.sacIkiYuzlu ?? VARSAYILAN.sacIkiYuzlu;
  const menteseAdet = girdi.menteseAdet ?? VARSAYILAN.menteseAdet;
  const kilitAdet = girdi.kilitAdet ?? VARSAYILAN.kilitAdet;
  const kolAdet = girdi.kolAdet ?? VARSAYILAN.kolAdet;

  if (genislikMm <= 0) throw new HesaplamaHatasi("Genişlik 0'dan büyük olmalı.");
  if (yukseklikMm <= 0) throw new HesaplamaHatasi("Yükseklik 0'dan büyük olmalı.");
  if (!kasaProfilKey || !kanatProfilKey) throw new HesaplamaHatasi("Kasa ve kanat profilleri seçilmelidir.");
  if (araKayitSayisi > 0 && !girdi.araKayitProfilKey)
    throw new HesaplamaHatasi("Ara kayıt sayısı girildi ama ara kayıt profili seçilmedi.");

  const kanatGenislikMm = genislikMm - kanatBosluguMm;
  const kanatYukseklikMm = yukseklikMm - kanatBosluguMm;

  if (kanatGenislikMm <= 0 || kanatYukseklikMm <= 0) {
    throw new HesaplamaHatasi("Kanat boşluğu, kapı ölçülerine göre çok büyük; kanat ölçüsü sıfır veya negatif çıkıyor.");
  }

  const sonuc = bosSonuc();

  const parcalar: HesaplananParca[] = [
    { label: "Kasa (dikey)", profilKey: kasaProfilKey, uzunlukMm: Math.round(yukseklikMm), adet: 2 },
    { label: "Kasa (yatay)", profilKey: kasaProfilKey, uzunlukMm: Math.round(genislikMm), adet: 2 },
    { label: "Kanat (dikey)", profilKey: kanatProfilKey, uzunlukMm: Math.round(kanatYukseklikMm), adet: 2 },
    { label: "Kanat (yatay)", profilKey: kanatProfilKey, uzunlukMm: Math.round(kanatGenislikMm), adet: 2 },
  ];

  if (araKayitSayisi > 0 && girdi.araKayitProfilKey) {
    parcalar.push({
      label: "Kanat ara kayıt",
      profilKey: girdi.araKayitProfilKey,
      uzunlukMm: Math.round(kanatGenislikMm),
      adet: araKayitSayisi,
    });
  }

  sonuc.parcalar = parcalar;
  sonuc.profilOzet = profilOzetOlustur(parcalar);

  if (girdi.sacKalinlikMm) {
    sonuc.sacKalemleri.push({
      label: "Kanat kaplama sacı",
      enMm: Math.round(kanatGenislikMm),
      boyMm: Math.round(kanatYukseklikMm),
      kalinlikMm: girdi.sacKalinlikMm,
      materialKey: girdi.sacMalzemeKey,
      adet: sacIkiYuzlu ? 2 : 1,
    });
  }

  sonuc.baglantiKalemleri.push({ label: "Menteşe", birim: "adet", adet: menteseAdet, materialKey: girdi.menteseMalzemeKey });
  sonuc.baglantiKalemleri.push({ label: "Kilit", birim: "adet", adet: kilitAdet, materialKey: girdi.kilitMalzemeKey });
  sonuc.baglantiKalemleri.push({ label: "Kol", birim: "adet", adet: kolAdet, materialKey: girdi.kolMalzemeKey });

  sonuc.ozetDegerler = {
    kanatGenislikMm: Math.round(kanatGenislikMm),
    kanatYukseklikMm: Math.round(kanatYukseklikMm),
  };

  return sonuc;
}
