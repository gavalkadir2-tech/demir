// Genel kolon-kiriş çelik iskelet hesaplama motoru. Duvar paneli veya çatı kafesi gibi tamamlanmış
// bir eleman değil, atölye/depo gibi yapıların temel taşıyıcı iskeletidir (kolon + kiriş + boy
// yönünde bağlantı kirişleri) - üzerine ayrıca duvar paneli ve/veya çatı kafesi eklenmesi beklenir.

import { HesaplamaHatasi } from "./units";
import { HesaplananParca, UrunHesapSonucu, bosSonuc, profilOzetOlustur } from "./types";

export interface KolonKirisGirdi {
  /** Tek açıklık genişliği (mm) - kolon arası, X yönü */
  acikligMm: number;
  /** Yapı derinliği (mm) - çerçevelerin dizildiği Y yönü */
  uzunlukMm: number;
  /** Kolon yüksekliği (mm) */
  yukseklikMm: number;
  /** Açıklık (bay) sayısı, varsayılan 1. 2+ ise ara kolon eklenir. */
  acikSayisi?: number;
  kolonProfilKey: string;
  kirisProfilKey: string;
  /** Çerçeveler arası hedef aralık (mm, Y yönü), varsayılan 3000 */
  cerceveAraligiHedefMm?: number;
  /** Boy yönünde çerçeveleri birbirine bağlayan kirişler (stabilite/duvar-çatı montaj desteği için) */
  baglantiKirisiProfilKey?: string;
  /** İlk açıklığa X çaprazı (rüzgar/deprem stabilitesi) eklensin mi */
  stabiliteBaglantisiVar?: boolean;
  stabiliteProfilKey?: string;
  plakaEnMm?: number;
  plakaBoyMm?: number;
  plakaKalinlikMm?: number;
  ankrajSayisiPerPlaka?: number;
}

const VARSAYILAN = {
  acikSayisi: 1,
  cerceveAraligiHedefMm: 3000,
  plakaEnMm: 150,
  plakaBoyMm: 150,
  plakaKalinlikMm: 12,
  ankrajSayisiPerPlaka: 4,
};

export function calculateSteelFrame(girdi: KolonKirisGirdi): UrunHesapSonucu {
  const { acikligMm, uzunlukMm, yukseklikMm, kolonProfilKey, kirisProfilKey } = girdi;
  const acikSayisi = girdi.acikSayisi ?? VARSAYILAN.acikSayisi;
  const cerceveAraligiHedefMm = girdi.cerceveAraligiHedefMm ?? VARSAYILAN.cerceveAraligiHedefMm;
  const plakaEnMm = girdi.plakaEnMm ?? VARSAYILAN.plakaEnMm;
  const plakaBoyMm = girdi.plakaBoyMm ?? VARSAYILAN.plakaBoyMm;
  const plakaKalinlikMm = girdi.plakaKalinlikMm ?? VARSAYILAN.plakaKalinlikMm;
  const ankrajSayisiPerPlaka = girdi.ankrajSayisiPerPlaka ?? VARSAYILAN.ankrajSayisiPerPlaka;

  if (acikligMm <= 0) throw new HesaplamaHatasi("Açıklık 0'dan büyük olmalı.");
  if (uzunlukMm <= 0) throw new HesaplamaHatasi("Uzunluk (derinlik) 0'dan büyük olmalı.");
  if (yukseklikMm <= 0) throw new HesaplamaHatasi("Kolon yüksekliği 0'dan büyük olmalı.");
  if (acikSayisi < 1) throw new HesaplamaHatasi("Açıklık sayısı en az 1 olmalı.");
  if (cerceveAraligiHedefMm <= 0) throw new HesaplamaHatasi("Çerçeve aralığı 0'dan büyük olmalı.");
  if (!kolonProfilKey || !kirisProfilKey) throw new HesaplamaHatasi("Kolon ve kiriş profilleri seçilmelidir.");
  if (girdi.stabiliteBaglantisiVar && !girdi.stabiliteProfilKey)
    throw new HesaplamaHatasi("Stabilite çaprazı seçildi ama profili belirtilmedi.");

  const sonuc = bosSonuc();

  const kolonSayisiPerCerceve = acikSayisi + 1;
  const cerceveSayisi = Math.max(2, Math.ceil(uzunlukMm / cerceveAraligiHedefMm) + 1);
  const gercekAralikMm = uzunlukMm / (cerceveSayisi - 1);

  if (gercekAralikMm > 6000) {
    sonuc.uyarilar.push(`Çerçeve aralığı ${gercekAralikMm.toFixed(0)} mm oldukça geniş; ara kolon veya destek düşünülmeli.`);
  }

  const parcalar: HesaplananParca[] = [];

  parcalar.push({
    label: "Kolon",
    profilKey: kolonProfilKey,
    uzunlukMm: Math.round(yukseklikMm),
    adet: cerceveSayisi * kolonSayisiPerCerceve,
  });

  parcalar.push({
    label: "Kiriş (açıklık başına)",
    profilKey: kirisProfilKey,
    uzunlukMm: Math.round(acikligMm),
    adet: cerceveSayisi * acikSayisi,
    not: acikSayisi > 1 ? "Her açıklık ayrı parça olarak hesaplanmıştır; sahada tek parça montajı da mümkündür." : undefined,
  });

  if (girdi.baglantiKirisiProfilKey) {
    parcalar.push({
      label: "Bağlantı kirişi (boy yönü)",
      profilKey: girdi.baglantiKirisiProfilKey,
      uzunlukMm: Math.round(uzunlukMm),
      adet: kolonSayisiPerCerceve,
      not: cerceveSayisi > 2 ? "Ara çerçevelerin üzerinden geçen tek parça olarak hesaplanmıştır." : undefined,
    });
  }

  if (girdi.stabiliteBaglantisiVar && girdi.stabiliteProfilKey) {
    const caprazUzunlukMm = Math.sqrt(acikligMm ** 2 + yukseklikMm ** 2);
    parcalar.push({
      label: "Stabilite çaprazı (X, ilk açıklık)",
      profilKey: girdi.stabiliteProfilKey,
      uzunlukMm: Math.ceil(caprazUzunlukMm),
      adet: 2,
      not: "İlk açıklığın bir yüzünde X şeklinde rüzgar/deprem stabilitesi.",
    });
  }

  sonuc.parcalar = parcalar;
  sonuc.profilOzet = profilOzetOlustur(parcalar);

  const kolonToplamAdet = cerceveSayisi * kolonSayisiPerCerceve;
  sonuc.sacKalemleri.push({
    label: "Taban plakası",
    enMm: plakaEnMm,
    boyMm: plakaBoyMm,
    kalinlikMm: plakaKalinlikMm,
    adet: kolonToplamAdet,
  });

  sonuc.baglantiKalemleri.push({
    label: "Ankraj (kimyasal/mekanik dübel)",
    birim: "adet",
    adet: kolonToplamAdet * ankrajSayisiPerPlaka,
  });

  const tabanAlaniM2 = (acikligMm * acikSayisi / 1000) * (uzunlukMm / 1000);

  sonuc.ozetDegerler = {
    cerceveSayisi,
    kolonSayisiPerCerceve,
    kolonToplamAdet,
    gercekAralikMm: Math.round(gercekAralikMm * 100) / 100,
    tabanAlaniM2: Math.round(tabanAlaniM2 * 100) / 100,
  };

  return sonuc;
}
