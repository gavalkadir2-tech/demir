// Pergola hesaplama motoru. Sundurmadan (canopy) farkı: tek eğimli/duvara dayalı değil, dört
// tarafı bağımsız (serbest duran) bir çerçeve + üstte açık, gölgelik latalardan oluşur (katı bir
// çatı kaplaması yoktur - pergolanın karakteristik özelliği budur).

import { HesaplamaHatasi } from "./units";
import { HesaplananParca, UrunHesapSonucu, bosSonuc, profilOzetOlustur } from "./types";

export type PergolaLataYonu = "genislik" | "boy";

export interface PergolaGirdi {
  /** En (mm) - X yönü */
  genislikMm: number;
  /** Boy (mm) - Y yönü */
  boyMm: number;
  /** Kolon yüksekliği (mm) */
  yukseklikMm: number;
  /** Toplam kolon sayısı, en az 4 ve çift olmalı (ön + arka sırada eşit dağıtılır) */
  kolonSayisi: number;
  kolonProfilKey: string;
  /** Çevre kirişi (ön/arka kenar, genişlik yönü) ve kolon hizası bağlantı kirişi (boy yönü) profili */
  kirisProfilKey: string;
  lataProfilKey: string;
  /** Lataların uzandığı yön: "genislik" latalar en yönünde uzanır ve boy ekseninde dizilir; "boy" tersi. */
  lataYonu?: PergolaLataYonu;
  /** Hedeflenen lata aralığı (mm), varsayılan 200 */
  lataAraligiHedefMm?: number;
  plakaEnMm?: number;
  plakaBoyMm?: number;
  plakaKalinlikMm?: number;
  /** Taban plakasının alınacağı sac Material id'si (opsiyonel) - verilirse teklif maliyetine ve
   * iş onayında stok düşümüne dahil edilir. */
  plakaMalzemeKey?: string;
  ankrajSayisiPerPlaka?: number;
  /** Ankrajın alınacağı Material id'si (opsiyonel, FASTENER kategorisi). */
  ankrajMalzemeKey?: string;
}

const VARSAYILAN = {
  lataYonu: "genislik" as PergolaLataYonu,
  lataAraligiHedefMm: 200,
  plakaEnMm: 120,
  plakaBoyMm: 120,
  plakaKalinlikMm: 10,
  ankrajSayisiPerPlaka: 4,
};

export function calculatePergola(girdi: PergolaGirdi): UrunHesapSonucu {
  const { genislikMm, boyMm, yukseklikMm, kolonSayisi, kolonProfilKey, kirisProfilKey, lataProfilKey } = girdi;
  const lataYonu = girdi.lataYonu ?? VARSAYILAN.lataYonu;
  const lataAraligiHedefMm = girdi.lataAraligiHedefMm ?? VARSAYILAN.lataAraligiHedefMm;
  const plakaEnMm = girdi.plakaEnMm ?? VARSAYILAN.plakaEnMm;
  const plakaBoyMm = girdi.plakaBoyMm ?? VARSAYILAN.plakaBoyMm;
  const plakaKalinlikMm = girdi.plakaKalinlikMm ?? VARSAYILAN.plakaKalinlikMm;
  const ankrajSayisiPerPlaka = girdi.ankrajSayisiPerPlaka ?? VARSAYILAN.ankrajSayisiPerPlaka;

  if (genislikMm <= 0) throw new HesaplamaHatasi("En 0'dan büyük olmalı.");
  if (boyMm <= 0) throw new HesaplamaHatasi("Boy 0'dan büyük olmalı.");
  if (yukseklikMm <= 0) throw new HesaplamaHatasi("Yükseklik 0'dan büyük olmalı.");
  if (kolonSayisi < 4 || kolonSayisi % 2 !== 0) throw new HesaplamaHatasi("Kolon sayısı en az 4 ve çift olmalı (ön + arka sıra eşit).");
  if (!kolonProfilKey || !kirisProfilKey || !lataProfilKey)
    throw new HesaplamaHatasi("Kolon, kiriş ve lata profilleri seçilmelidir.");
  if (lataAraligiHedefMm <= 0) throw new HesaplamaHatasi("Lata aralığı 0'dan büyük olmalı.");

  const sonuc = bosSonuc();
  const kolonSiraAdedi = kolonSayisi / 2; // her sırada (ön/arka) kolon sayısı

  const parcalar: HesaplananParca[] = [];

  parcalar.push({
    label: "Kolon",
    profilKey: kolonProfilKey,
    uzunlukMm: Math.round(yukseklikMm),
    adet: kolonSayisi,
  });

  parcalar.push({
    label: "Kenar kirişi (ön + arka, genişlik yönü)",
    profilKey: kirisProfilKey,
    uzunlukMm: Math.round(genislikMm),
    adet: 2,
    not: kolonSiraAdedi > 2 ? "Ara kolonların üzerinden geçen tek parça olarak hesaplanmıştır." : undefined,
  });

  parcalar.push({
    label: "Bağlantı kirişi (kolon hizası, boy yönü)",
    profilKey: kirisProfilKey,
    uzunlukMm: Math.round(boyMm),
    adet: kolonSiraAdedi,
    not: "Her kolon hizasında ön-arka kirişi birleştirir.",
  });

  // Latalar: lataYonu span yönünü, dizilme ekseni ise diğer boyutu belirler.
  const dizilmeMm = lataYonu === "genislik" ? boyMm : genislikMm;
  const spanMm = lataYonu === "genislik" ? genislikMm : boyMm;
  const araliklarSayisi = Math.max(1, Math.ceil(dizilmeMm / lataAraligiHedefMm));
  const gercekAralikMm = dizilmeMm / araliklarSayisi;
  const lataSayisi = araliklarSayisi + 1;

  if (gercekAralikMm > 350) {
    sonuc.uyarilar.push(`Lata aralığı ${gercekAralikMm.toFixed(0)} mm oldukça geniş; tipik gölgelik etkisi için 100-250 mm önerilir.`);
  }

  parcalar.push({
    label: `Lata (${lataYonu === "genislik" ? "en" : "boy"} yönünde)`,
    profilKey: lataProfilKey,
    uzunlukMm: Math.round(spanMm),
    adet: lataSayisi,
    not: `${lataSayisi} adet, ${(gercekAralikMm / 10).toFixed(1)} cm gerçek aralıkla dizilmiştir.`,
  });

  sonuc.parcalar = parcalar;
  sonuc.profilOzet = profilOzetOlustur(parcalar);

  sonuc.sacKalemleri.push({
    label: "Taban plakası",
    enMm: plakaEnMm,
    boyMm: plakaBoyMm,
    kalinlikMm: plakaKalinlikMm,
    materialKey: girdi.plakaMalzemeKey,
    adet: kolonSayisi,
  });

  sonuc.baglantiKalemleri.push({
    label: "Ankraj (kimyasal/mekanik dübel)",
    birim: "adet",
    adet: kolonSayisi * ankrajSayisiPerPlaka,
    materialKey: girdi.ankrajMalzemeKey,
  });

  const alanM2 = (genislikMm / 1000) * (boyMm / 1000);

  sonuc.ozetDegerler = {
    kolonSayisi,
    kolonSiraAdedi,
    alanM2: Math.round(alanM2 * 100) / 100,
    lataSayisi,
    gercekLataAralikMm: Math.round(gercekAralikMm * 100) / 100,
  };

  return sonuc;
}
