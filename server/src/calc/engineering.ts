// Yapısal (mukavemet) hesap motoru - kesit özellikleri (atalet momenti, mukavemet momenti) ve
// basit kiriş sehim/gerilme kontrolü. Bu bir tam yapısal projelendirme değildir; blacksmith/demirci
// atölyesi için "bu profil bu açıklıkta, bu yükte kaba olarak yeterli mi?" sorusuna hızlı, tutarlı
// bir mühendislik tahmini verir. Belirsiz varsayımlarda (örn. dikdörtgen kutu profilin hangi yönde
// monte edildiği) her zaman MUHAFAZAKÂR (daha zayıf) yönde hesaplanır - yani gerçek kapasite burada
// hesaplanandan daha kötü olamaz, ancak daha iyi olabilir.

import { HesaplamaHatasi } from "./units";

export type ProfilSekli = "BOX" | "ANGLE" | "CHANNEL" | "ROUND_SOLID" | "ROUND_PIPE" | "FLAT";

export interface ProfilKesitVerisi {
  profilSekli?: ProfilSekli | null;
  widthMm?: number | null;
  heightMm?: number | null;
  thicknessMm?: number | null;
}

export interface KesitOzellikleri {
  alanMm2: number;
  /** Muhafazakâr (zayıf yön) atalet momenti, mm^4. */
  ixMm4: number;
  /** Muhafazakâr (zayıf yön) mukavemet momenti, mm^3. */
  wxMm3: number;
  not: string;
}

/**
 * Bir profilin kesit özelliklerini (alan, atalet momenti, mukavemet momenti) hesaplar.
 * Belirsiz montaj yönü olan kesitlerde (kutu profil) daha zayıf yön esas alınır; lama'da ise
 * taşıyıcı elemanlarda standart uygulama olan "kenarına dik" montaj varsayılır.
 * Gerekli boyut verisi eksikse null döner (yapısal kontrol atlanır, hata verilmez).
 */
export function kesitOzellikleriHesapla(veri: ProfilKesitVerisi): KesitOzellikleri | null {
  const { profilSekli, widthMm, heightMm, thicknessMm } = veri;
  if (!profilSekli || !widthMm) return null;

  switch (profilSekli) {
    case "BOX": {
      if (!heightMm || !thicknessMm) return null;
      const t = thicknessMm;
      const derinlik = Math.min(widthMm, heightMm); // muhafazakâr: zayıf yön
      const genislik = Math.max(widthMm, heightMm);
      const icDerinlik = derinlik - 2 * t;
      const icGenislik = genislik - 2 * t;
      if (icDerinlik <= 0 || icGenislik <= 0) return null;
      const ix = (genislik * derinlik ** 3 - icGenislik * icDerinlik ** 3) / 12;
      const alan = genislik * derinlik - icGenislik * icDerinlik;
      return {
        alanMm2: alan,
        ixMm4: ix,
        wxMm3: ix / (derinlik / 2),
        not:
          widthMm === heightMm
            ? "Kare kutu profil."
            : "Dikdörtgen kutu profil; muhafazakâr olarak zayıf (dar) yönde monte edildiği varsayılmıştır.",
      };
    }
    case "FLAT": {
      if (!thicknessMm) return null;
      const B = widthMm; // derinlik (yapısal elemanlarda kenarına dik/dik monte edilir)
      const t = thicknessMm;
      const ix = (t * B ** 3) / 12;
      return {
        alanMm2: B * t,
        ixMm4: ix,
        wxMm3: ix / (B / 2),
        not: "Lama, kenarına dik (dik) monte edildiği varsayılmıştır; düz (yatık) montajda mukavemet çok daha düşüktür.",
      };
    }
    case "ANGLE": {
      if (!thicknessMm) return null;
      const a = widthMm;
      const t = thicknessMm;
      // Basitleştirilmiş yaklaşım: tek kolu düz bir lama gibi ele alır (diğer kolun katkısı
      // ihmal edilir) - bu gerçek kapasiteyi olduğundan düşük gösterir, muhafazakâr yöndedir.
      const ix = (t * a ** 3) / 12;
      return {
        alanMm2: t * (2 * a - t),
        ixMm4: ix,
        wxMm3: ix / (a / 2),
        not: "Köşebent için basitleştirilmiş (tek kol) yaklaşım; gerçek kapasite genelde daha yüksektir.",
      };
    }
    case "CHANNEL": {
      if (!heightMm || !thicknessMm) return null;
      const b = widthMm; // başlık (flanş) genişliği
      const h = heightMm; // gövde yüksekliği
      const t = thicknessMm;
      const govdeIc = h - 2 * t;
      if (govdeIc <= 0) return null;
      const ixBaslik = 2 * ((b * t ** 3) / 12 + b * t * ((h - t) / 2) ** 2);
      const ixGovde = (t * govdeIc ** 3) / 12;
      const ix = ixBaslik + ixGovde;
      return {
        alanMm2: 2 * b * t + t * govdeIc,
        ixMm4: ix,
        wxMm3: ix / (h / 2),
        not: "U (kanal) profil için basitleştirilmiş simetrik yaklaşım.",
      };
    }
    case "ROUND_SOLID": {
      const d = widthMm;
      const ix = (Math.PI * d ** 4) / 64;
      return { alanMm2: Math.PI * (d / 2) ** 2, ixMm4: ix, wxMm3: ix / (d / 2), not: "Dolu yuvarlak kesit." };
    }
    case "ROUND_PIPE": {
      if (!thicknessMm) return null;
      const D = widthMm;
      const dIc = D - 2 * thicknessMm;
      if (dIc <= 0) return null;
      const ix = (Math.PI * (D ** 4 - dIc ** 4)) / 64;
      return {
        alanMm2: (Math.PI * (D ** 2 - dIc ** 2)) / 4,
        ixMm4: ix,
        wxMm3: ix / (D / 2),
        not: "İçi boş yuvarlak boru kesiti.",
      };
    }
    default:
      return null;
  }
}

export type CelikSinifi = "S235" | "S275" | "S355";

export const CELIK_E_MPA = 210_000; // N/mm² (çeliğin elastisite modülü)
export const CELIK_AKMA_DAYANIMI_MPA: Record<CelikSinifi, number> = { S235: 235, S275: 275, S355: 355 };

export type MesnetTuru = "basit" | "konsol";
export type YukTuru = "yayili" | "tekil";

export interface KirisKontrolGirdi {
  /** Açıklık / konsol boyu (mm). */
  acikligMm: number;
  mesnetTuru: MesnetTuru;
  yukTuru: YukTuru;
  /** Toplam yük (N): yayılı ise açıklık üzerine toplam, tekil ise tek noktadaki yük. */
  toplamYukN: number;
  kesit: KesitOzellikleri;
  celikSinifi?: CelikSinifi;
  /** Akma dayanımına bölünecek emniyet katsayısı (varsayılan 1.8 - statik, ikincil yapı elemanları için tipik). */
  guvenlikKatsayisi?: number;
  /** Sehim sınırı oranı L/x (varsayılan 200, yani L/200). */
  sehimSiniriOrani?: number;
}

export interface KirisKontrolSonucu {
  maxSehimMm: number;
  izinVerilenSehimMm: number;
  sehimUygun: boolean;
  maxGerilmeMPa: number;
  izinVerilenGerilmeMPa: number;
  gerilmeUygun: boolean;
  /** izinVerilenGerilme / maxGerilme; 1'in altındaysa yetersiz demektir. */
  guvenlikOrani: number;
  durum: "uygun" | "sinirda" | "yetersiz";
  aciklama: string;
}

const VARSAYILAN_GUVENLIK_KATSAYISI = 1.8;
const VARSAYILAN_SEHIM_SINIRI_ORANI = 200;

/** Basit bir kiriş/konsolün sehim ve gerilme (mukavemet) kontrolünü yapar. */
export function kirisKontrolEt(girdi: KirisKontrolGirdi): KirisKontrolSonucu {
  const { acikligMm, mesnetTuru, yukTuru, toplamYukN, kesit } = girdi;
  if (acikligMm <= 0) throw new HesaplamaHatasi("Kiriş kontrolü için açıklık 0'dan büyük olmalı.");
  if (toplamYukN < 0) throw new HesaplamaHatasi("Yük negatif olamaz.");
  if (kesit.ixMm4 <= 0 || kesit.wxMm3 <= 0) throw new HesaplamaHatasi("Geçersiz kesit özellikleri.");

  const celikSinifi = girdi.celikSinifi ?? "S235";
  const fy = CELIK_AKMA_DAYANIMI_MPA[celikSinifi];
  const guvenlikKatsayisi = girdi.guvenlikKatsayisi ?? VARSAYILAN_GUVENLIK_KATSAYISI;
  const sehimSiniriOrani = girdi.sehimSiniriOrani ?? VARSAYILAN_SEHIM_SINIRI_ORANI;

  const E = CELIK_E_MPA;
  const L = acikligMm;
  const I = kesit.ixMm4;
  const W = kesit.wxMm3;
  const P = toplamYukN;

  let maxSehimMm: number;
  let maxMomentNmm: number;

  if (mesnetTuru === "basit") {
    if (yukTuru === "yayili") {
      const w = P / L; // N/mm
      maxSehimMm = (5 * w * L ** 4) / (384 * E * I);
      maxMomentNmm = (w * L ** 2) / 8;
    } else {
      maxSehimMm = (P * L ** 3) / (48 * E * I);
      maxMomentNmm = (P * L) / 4;
    }
  } else {
    if (yukTuru === "yayili") {
      const w = P / L;
      maxSehimMm = (w * L ** 4) / (8 * E * I);
      maxMomentNmm = (w * L ** 2) / 2;
    } else {
      maxSehimMm = (P * L ** 3) / (3 * E * I);
      maxMomentNmm = P * L;
    }
  }

  const maxGerilmeMPa = maxMomentNmm / W;
  const izinVerilenGerilmeMPa = fy / guvenlikKatsayisi;
  const izinVerilenSehimMm = L / sehimSiniriOrani;

  const sehimUygun = maxSehimMm <= izinVerilenSehimMm;
  const gerilmeUygun = maxGerilmeMPa <= izinVerilenGerilmeMPa;
  const guvenlikOrani = izinVerilenGerilmeMPa / maxGerilmeMPa;

  let durum: KirisKontrolSonucu["durum"];
  if (!sehimUygun || !gerilmeUygun) durum = "yetersiz";
  else if (maxSehimMm > 0.85 * izinVerilenSehimMm || maxGerilmeMPa > 0.85 * izinVerilenGerilmeMPa) durum = "sinirda";
  else durum = "uygun";

  const aciklama =
    durum === "yetersiz"
      ? !gerilmeUygun
        ? "Gerilme sınırı aşılıyor - daha güçlü bir profil seçin veya açıklığı azaltın."
        : "Sehim (eğilme) sınırı aşılıyor - daha güçlü bir profil seçin veya açıklığı azaltın."
      : durum === "sinirda"
      ? "Sınırların içinde ama payı az; ek güvenlik için daha güçlü profil düşünülebilir."
      : "Hesaplanan yük altında profil yeterli.";

  return {
    maxSehimMm: Math.round(maxSehimMm * 100) / 100,
    izinVerilenSehimMm: Math.round(izinVerilenSehimMm * 100) / 100,
    sehimUygun,
    maxGerilmeMPa: Math.round(maxGerilmeMPa * 10) / 10,
    izinVerilenGerilmeMPa: Math.round(izinVerilenGerilmeMPa * 10) / 10,
    gerilmeUygun,
    guvenlikOrani: Math.round(guvenlikOrani * 100) / 100,
    durum,
    aciklama,
  };
}

const G = 9.81; // yerçekimi ivmesi, kg -> N çevrimi için

export function kgToN(kg: number): number {
  return kg * G;
}

export interface KolonBurkulmaGirdi {
  /** Kolon/eleman boyu (mm). */
  boyMm: number;
  /** Eksenel basınç yükü (N). */
  eksenelYukN: number;
  kesit: KesitOzellikleri;
  celikSinifi?: CelikSinifi;
  guvenlikKatsayisi?: number;
  /** Etkin boy faktörü K (mesnet koşuluna göre). Varsayılan 1 (iki ucu mafsallı) - basit çelik
   * yapılarda (basit bağlantılı taban plakası + kirişe mafsallı bağlantı) tipik bir varsayımdır.
   * Ankastre-serbest (konsol) için 2, ankastre-mafsallı için 0.7, ankastre-ankastre için 0.5. */
  etkinBoyFaktoru?: number;
}

export interface KolonBurkulmaSonucu {
  eksenelYukN: number;
  /** Euler kritik burkulma yükü (N). */
  burkulmaYukuKrN: number;
  izinVerilenBurkulmaYukuN: number;
  burkulmaUygun: boolean;
  /** Kesitin salt akma (ezilme) yükü, A×Fy (N). */
  akmaYukuN: number;
  izinVerilenAkmaYukuN: number;
  akmaUygun: boolean;
  /** min(izinVerilenBurkulma, izinVerilenAkma) / eksenelYük; 1'in altındaysa yetersiz demektir. */
  guvenlikOrani: number;
  /** Narinlik oranı KL/r - bilgi amaçlı; genelde 200'ü aşan değerler aşırı narin kabul edilir. */
  narinlikOrani: number;
  durum: "uygun" | "sinirda" | "yetersiz";
  aciklama: string;
}

/** Eksenel basınç altındaki bir kolon/elemanın burkulma (Euler) ve akma (ezilme) kontrolünü yapar.
 * Gerçek kapasite, iki modun (burkulma/akma) daha düşük olanıyla sınırlıdır. */
export function kolonBurkulmaKontrolEt(girdi: KolonBurkulmaGirdi): KolonBurkulmaSonucu {
  const { boyMm, eksenelYukN, kesit } = girdi;
  if (boyMm <= 0) throw new HesaplamaHatasi("Kolon burkulma kontrolü için boy 0'dan büyük olmalı.");
  if (eksenelYukN < 0) throw new HesaplamaHatasi("Eksenel yük negatif olamaz.");
  if (kesit.ixMm4 <= 0 || kesit.alanMm2 <= 0) throw new HesaplamaHatasi("Geçersiz kesit özellikleri.");

  const celikSinifi = girdi.celikSinifi ?? "S235";
  const fy = CELIK_AKMA_DAYANIMI_MPA[celikSinifi];
  const guvenlikKatsayisi = girdi.guvenlikKatsayisi ?? VARSAYILAN_GUVENLIK_KATSAYISI;
  const K = girdi.etkinBoyFaktoru ?? 1;

  const E = CELIK_E_MPA;
  const I = kesit.ixMm4;
  const A = kesit.alanMm2;
  const etkinBoyMm = K * boyMm;

  const burkulmaYukuKrN = (Math.PI ** 2 * E * I) / etkinBoyMm ** 2;
  const izinVerilenBurkulmaYukuN = burkulmaYukuKrN / guvenlikKatsayisi;
  const akmaYukuN = A * fy;
  const izinVerilenAkmaYukuN = akmaYukuN / guvenlikKatsayisi;

  const izinVerilenN = Math.min(izinVerilenBurkulmaYukuN, izinVerilenAkmaYukuN);
  const burkulmaUygun = eksenelYukN <= izinVerilenBurkulmaYukuN;
  const akmaUygun = eksenelYukN <= izinVerilenAkmaYukuN;
  const guvenlikOrani = eksenelYukN > 0 ? izinVerilenN / eksenelYukN : Infinity;
  const narinlikOrani = etkinBoyMm / Math.sqrt(I / A);

  let durum: KolonBurkulmaSonucu["durum"];
  if (!burkulmaUygun || !akmaUygun) durum = "yetersiz";
  else if (eksenelYukN > 0.85 * izinVerilenN) durum = "sinirda";
  else durum = "uygun";

  const aciklama =
    durum === "yetersiz"
      ? !burkulmaUygun
        ? "Burkulma (elastik stabilite) sınırı aşılıyor - daha güçlü/kalın kesit seçin veya boyu (mesnet aralığını) azaltın."
        : "Akma (ezilme) sınırı aşılıyor - daha güçlü bir profil seçin."
      : durum === "sinirda"
      ? "Sınırların içinde ama payı az; ek güvenlik için daha güçlü profil düşünülebilir."
      : "Hesaplanan eksenel yük altında profil yeterli.";

  return {
    eksenelYukN: Math.round(eksenelYukN),
    burkulmaYukuKrN: Math.round(burkulmaYukuKrN),
    izinVerilenBurkulmaYukuN: Math.round(izinVerilenBurkulmaYukuN),
    burkulmaUygun,
    akmaYukuN: Math.round(akmaYukuN),
    izinVerilenAkmaYukuN: Math.round(izinVerilenAkmaYukuN),
    akmaUygun,
    guvenlikOrani: Math.round(guvenlikOrani * 100) / 100,
    narinlikOrani: Math.round(narinlikOrani * 10) / 10,
    durum,
    aciklama,
  };
}
