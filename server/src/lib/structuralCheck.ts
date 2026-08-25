// Şablon bazlı yapısal kontrol modelleri. calc motoru (calc/*.ts) sadece geometri üretir ve
// veritabanından bağımsızdır; bu dosya route katmanında, gerçek Material kayıtlarının kesit
// bilgisiyle (profilSekli/widthMm/heightMm/thicknessMm) birlikte çağrılır ve varsa bir "yapısal
// kontrol" sonucu üretir. Şablon veya malzeme kesit bilgisi desteklenmiyorsa sessizce undefined
// döner (hata fırlatmaz) - yapısal kontrol her zaman opsiyonel bir ek bilgidir.

import { Material } from "@prisma/client";
import {
  kesitOzellikleriHesapla,
  kirisKontrolEt,
  kolonBurkulmaKontrolEt,
  kgToN,
  KirisKontrolSonucu,
  KolonBurkulmaSonucu,
} from "../calc/engineering";
import { KAPLAMA_BILGI, KaplamaTuru } from "../calc/kaplama";
import { UrunHesapSonucu } from "../calc/types";

// Varsayılan, tipik yük kabulleri. Bunlar TAM bir yapısal projelendirme yerine geçmez;
// gerçek proje için bölge/kullanım amacına göre bir mühendisten onay alınmalıdır.
const KORKULUK_YATAY_YUK_N_M = 500; // TS EN 1991-1-1, konut/balkon tipi korkuluk için tipik çizgisel yük (0.5 kN/m)
const KAR_YUKU_N_M2 = 1000; // TS 498, orta rakım/bölge için tipik kar yükü (1.0 kN/m²) - bölgeye göre değişir
const BASAMAK_CANLI_YUK_N_M2 = 2000; // TS EN 1991-1-1 kategori A (konut) merdiven için tipik canlı yük (2.0 kN/m²)
const RUZGAR_YUKU_N_M2 = 600; // Düşük katlı hafif yapı duvar paneli için tipik, muhafazakâr rüzgar emme/basınç yükü (0.6 kN/m²)
const RAF_VARSAYILAN_TASARIM_YUKU_KG_M2 = 100; // Belirtilmezse, atölye/depo rafı için tipik hafif-orta depolama yükü varsayımı
const PERGOLA_YUK_N_M2 = 400; // Açık latalı, kaplamasız pergola için tipik kendi ağırlık + rüzgar yükü (0.4 kN/m²) - solid çatıdan daha hafif

const YAPISAL_KONTROL_UYARISI =
  "Bu, basitleştirilmiş bir mukavemet/sehim kontrolüdür - tam bir statik projelendirme değildir. Kritik/kamusal yapılarda mutlaka bir inşaat mühendisinden onay alın.";

export interface YapiselKontrolKalemiKiris extends KirisKontrolSonucu {
  tur: "kiris";
  eleman: string;
  profilAdi: string;
  yukAciklamasi: string;
}

export interface YapiselKontrolKalemiKolon extends KolonBurkulmaSonucu {
  tur: "kolon";
  eleman: string;
  profilAdi: string;
  yukAciklamasi: string;
}

export type YapiselKontrolKalemi = YapiselKontrolKalemiKiris | YapiselKontrolKalemiKolon;

export interface YapiselKontrolSonucu {
  kalemler: YapiselKontrolKalemi[];
  genelDurum: "uygun" | "sinirda" | "yetersiz";
  uyari: string;
}

function ozetOlustur(kalemler: YapiselKontrolKalemi[]): YapiselKontrolSonucu | undefined {
  if (kalemler.length === 0) return undefined;
  const genelDurum: YapiselKontrolSonucu["genelDurum"] = kalemler.some((k) => k.durum === "yetersiz")
    ? "yetersiz"
    : kalemler.some((k) => k.durum === "sinirda")
    ? "sinirda"
    : "uygun";
  return { kalemler, genelDurum, uyari: YAPISAL_KONTROL_UYARISI };
}

function korkulukKontrolu(
  girdi: Record<string, unknown>,
  sonuc: UrunHesapSonucu,
  malzemeler: Record<string, Material>
): YapiselKontrolSonucu | undefined {
  const gercekAralikMm = sonuc.ozetDegerler.gercekAralikMm;
  const yukseklikMm = Number(girdi.yukseklikMm);
  const ustMalzeme = malzemeler[String(girdi.ustProfilKey)];
  const dikmeMalzeme = malzemeler[String(girdi.dikmeProfilKey)];
  if (!gercekAralikMm || !yukseklikMm || !ustMalzeme || !dikmeMalzeme) return undefined;

  const kalemler: YapiselKontrolKalemi[] = [];
  const toplamYukN = KORKULUK_YATAY_YUK_N_M * (gercekAralikMm / 1000);

  const ustKesit = kesitOzellikleriHesapla(ustMalzeme);
  if (ustKesit) {
    const s = kirisKontrolEt({ acikligMm: gercekAralikMm, mesnetTuru: "basit", yukTuru: "yayili", toplamYukN, kesit: ustKesit });
    kalemler.push({
      ...s,
      tur: "kiris" as const,
      eleman: "Üst profil (dikmeler arası açıklık)",
      profilAdi: ustMalzeme.name,
      yukAciklamasi: `Yatay çizgisel yük ${KORKULUK_YATAY_YUK_N_M / 1000} kN/m × ${(gercekAralikMm / 1000).toFixed(2)} m açıklık`,
    });
  }

  const dikmeKesit = kesitOzellikleriHesapla(dikmeMalzeme);
  if (dikmeKesit) {
    // Dikme, konsol (ankastre) olarak zemine oturur; en üstte yatay itme yükü etkir. Korkuluk
    // dikmeleri için asıl belirleyici kontrol mukavemettir (gerilme) - kat/çatı kirişlerinde
    // kullanılan L/200 gibi sıkı sehim sınırları burada uygun değildir (birkaç mm'lik esneme
    // güvenlik açısından sorun oluşturmaz); bu yüzden daha gerçekçi bir sehim sınırı (L/75) kullanılır.
    const s = kirisKontrolEt({
      acikligMm: yukseklikMm,
      mesnetTuru: "konsol",
      yukTuru: "tekil",
      toplamYukN,
      kesit: dikmeKesit,
      sehimSiniriOrani: 75,
    });
    kalemler.push({
      ...s,
      tur: "kiris" as const,
      eleman: "Dikme (konsol, tepe noktasında yatay itme)",
      profilAdi: dikmeMalzeme.name,
      yukAciklamasi: `Yatay itme ${(toplamYukN / 1000).toFixed(2)} kN, ${(yukseklikMm / 1000).toFixed(2)} m yükseklikte`,
    });
  }

  return ozetOlustur(kalemler);
}

function catiKafesiKontrolu(
  girdi: Record<string, unknown>,
  sonuc: UrunHesapSonucu,
  malzemeler: Record<string, Material>
): YapiselKontrolSonucu | undefined {
  const asikMalzeme = malzemeler[String(girdi.asikProfilKey)];
  const gercekAralikMm = sonuc.ozetDegerler.gercekAralikMm; // kafesler arası (aşığın açıklığı)
  const asikAraligiMm = Number(girdi.asikAraligiHedefMm) || 1000; // aşığın taşıdığı yayılma genişliği
  if (!asikMalzeme || !gercekAralikMm) return undefined;

  const asikKesit = kesitOzellikleriHesapla(asikMalzeme);
  if (!asikKesit) return undefined;

  const kaplamaTuru = girdi.kaplamaTuru as KaplamaTuru | undefined;
  let kaplamaYukNM2 = 0;
  if (kaplamaTuru && kaplamaTuru !== "yok") {
    const bilgi = KAPLAMA_BILGI[kaplamaTuru];
    const kalinlikMm = Number(girdi.kaplamaKalinlikMm) || bilgi.varsayilanKalinlikMm;
    const agirlikKgM2 = (kalinlikMm / 1000) * bilgi.efektifYogunlukKgM3;
    kaplamaYukNM2 = kgToN(agirlikKgM2);
  }

  const toplamAlanYukNM2 = KAR_YUKU_N_M2 + kaplamaYukNM2;
  const cizgiselYukNMm = (toplamAlanYukNM2 / 1_000_000) * asikAraligiMm; // N/mm
  const toplamYukN = cizgiselYukNMm * gercekAralikMm;

  const s = kirisKontrolEt({ acikligMm: gercekAralikMm, mesnetTuru: "basit", yukTuru: "yayili", toplamYukN, kesit: asikKesit });

  return ozetOlustur([
    {
      ...s,
      tur: "kiris" as const,
      eleman: "Aşık (kafesler arası açıklık)",
      profilAdi: asikMalzeme.name,
      yukAciklamasi: `Kar yükü ${(KAR_YUKU_N_M2 / 1000).toFixed(2)} kN/m² + kaplama ağırlığı ${(kaplamaYukNM2 / 1000).toFixed(
        3
      )} kN/m², ${(asikAraligiMm / 1000).toFixed(2)} m yayılma genişliği × ${(gercekAralikMm / 1000).toFixed(2)} m açıklık`,
    },
  ]);
}

function merdivenKontrolu(
  girdi: Record<string, unknown>,
  sonuc: UrunHesapSonucu,
  malzemeler: Record<string, Material>
): YapiselKontrolSonucu | undefined {
  const kosegenMm = sonuc.ozetDegerler.kosegenMm;
  const genislikMm = Number(girdi.genislikMm);
  const tasiyiciAdet = Number(girdi.tasiyiciAdet) || 2;
  const tasiyiciMalzeme = malzemeler[String(girdi.tasiyiciProfilKey)];
  if (!kosegenMm || !genislikMm || !tasiyiciMalzeme) return undefined;

  const tasiyiciKesit = kesitOzellikleriHesapla(tasiyiciMalzeme);
  if (!tasiyiciKesit) return undefined;

  // Basamak canlı yükü, merdiven genişliği boyunca yayılı; taşıyıcılar arasında eşit paylaşılır.
  const cizgiselYukNMm = (BASAMAK_CANLI_YUK_N_M2 / 1_000_000) * genislikMm;
  const toplamYukN = (cizgiselYukNMm * kosegenMm) / tasiyiciAdet;

  const s = kirisKontrolEt({ acikligMm: kosegenMm, mesnetTuru: "basit", yukTuru: "yayili", toplamYukN, kesit: tasiyiciKesit });

  return ozetOlustur([
    {
      ...s,
      tur: "kiris" as const,
      eleman: `Taşıyıcı (kiriş, ${tasiyiciAdet} adet arasında paylaşılan yük)`,
      profilAdi: tasiyiciMalzeme.name,
      yukAciklamasi: `Basamak canlı yükü ${(BASAMAK_CANLI_YUK_N_M2 / 1000).toFixed(2)} kN/m² × ${(genislikMm / 1000).toFixed(
        2
      )} m genişlik, ${(kosegenMm / 1000).toFixed(2)} m açıklık, ${tasiyiciAdet} taşıyıcı arasında paylaşılmış`,
    },
  ]);
}

function donerMerdivenKontrolu(
  girdi: Record<string, unknown>,
  sonuc: UrunHesapSonucu,
  malzemeler: Record<string, Material>
): YapiselKontrolSonucu | undefined {
  const radyalUzunlukMm = sonuc.ozetDegerler.radyalUzunlukMm;
  const basamakGenislikMm = sonuc.ozetDegerler.basamakGenislikMm;
  const destekMalzeme = malzemeler[String(girdi.basamakDestekProfilKey)];
  if (!radyalUzunlukMm || !basamakGenislikMm || !destekMalzeme) return undefined;

  const destekKesit = kesitOzellikleriHesapla(destekMalzeme);
  if (!destekKesit) return undefined;

  // Basamak desteği, merkez kolondan dışa doğru bir konsol; basamağın taşıdığı yayılma
  // genişliği (basamakGenislikMm) kadar canlı yükü tek başına taşır.
  const cizgiselYukNMm = (BASAMAK_CANLI_YUK_N_M2 / 1_000_000) * basamakGenislikMm;
  const toplamYukN = cizgiselYukNMm * radyalUzunlukMm;

  const s = kirisKontrolEt({ acikligMm: radyalUzunlukMm, mesnetTuru: "konsol", yukTuru: "yayili", toplamYukN, kesit: destekKesit });

  const kalemler: YapiselKontrolKalemi[] = [
    {
      ...s,
      tur: "kiris" as const,
      eleman: "Basamak desteği (konsol)",
      profilAdi: destekMalzeme.name,
      yukAciklamasi: `Basamak canlı yükü ${(BASAMAK_CANLI_YUK_N_M2 / 1000).toFixed(2)} kN/m² × ${(
        basamakGenislikMm / 1000
      ).toFixed(2)} m yayılma genişliği, ${(radyalUzunlukMm / 1000).toFixed(2)} m konsol boyu`,
    },
  ];

  if (girdi.korkulukVar && girdi.korkulukDikmeProfilKey) {
    const dikmeMalzeme = malzemeler[String(girdi.korkulukDikmeProfilKey)];
    const korkulukYuksekligiMm = Number(girdi.korkulukYuksekligiMm);
    if (dikmeMalzeme && korkulukYuksekligiMm > 0) {
      const dikmeKesit = kesitOzellikleriHesapla(dikmeMalzeme);
      if (dikmeKesit) {
        // Korkuluk dikmesi de konsol; her basamağın dış ucunda tekil, korkulukKontrolu ile aynı
        // yatay itme yükü ve L/75 sehim sınırı (bkz. korkulukKontrolu notu).
        const s2 = kirisKontrolEt({
          acikligMm: korkulukYuksekligiMm,
          mesnetTuru: "konsol",
          yukTuru: "tekil",
          toplamYukN: KORKULUK_YATAY_YUK_N_M * (basamakGenislikMm / 1000),
          kesit: dikmeKesit,
          sehimSiniriOrani: 75,
        });
        kalemler.push({
          ...s2,
          tur: "kiris" as const,
          eleman: "Korkuluk dikmesi (konsol, tepe noktasında yatay itme)",
          profilAdi: dikmeMalzeme.name,
          yukAciklamasi: `Yatay itme ${(KORKULUK_YATAY_YUK_N_M / 1000).toFixed(2)} kN/m × ${(basamakGenislikMm / 1000).toFixed(
            2
          )} m basamak genişliği, ${(korkulukYuksekligiMm / 1000).toFixed(2)} m yükseklikte`,
        });
      }
    }
  }

  return ozetOlustur(kalemler);
}

function duvarKontrolu(
  girdi: Record<string, unknown>,
  sonuc: UrunHesapSonucu,
  malzemeler: Record<string, Material>
): YapiselKontrolSonucu | undefined {
  const yukseklikMm = Number(girdi.yukseklikMm);
  const gercekAralikMm = sonuc.ozetDegerler.gercekAralikMm;
  const dikmeMalzeme = malzemeler[String(girdi.dikmeProfilKey)];
  if (!yukseklikMm || !gercekAralikMm || !dikmeMalzeme) return undefined;

  const dikmeKesit = kesitOzellikleriHesapla(dikmeMalzeme);
  if (!dikmeKesit) return undefined;

  // Dikme, üst/alt ray arasında basit mesnetli, düzleme dik (rüzgar) yükü taşır.
  const cizgiselYukNMm = (RUZGAR_YUKU_N_M2 / 1_000_000) * gercekAralikMm;
  const toplamYukN = cizgiselYukNMm * yukseklikMm;

  const s = kirisKontrolEt({ acikligMm: yukseklikMm, mesnetTuru: "basit", yukTuru: "yayili", toplamYukN, kesit: dikmeKesit });

  return ozetOlustur([
    {
      ...s,
      tur: "kiris" as const,
      eleman: "Dikme (üst/alt ray arası, düzleme dik rüzgar yükü)",
      profilAdi: dikmeMalzeme.name,
      yukAciklamasi: `Rüzgar yükü ${(RUZGAR_YUKU_N_M2 / 1000).toFixed(2)} kN/m² × ${(gercekAralikMm / 1000).toFixed(
        2
      )} m dikme aralığı, ${(yukseklikMm / 1000).toFixed(2)} m yükseklik`,
    },
  ]);
}

function rafKontrolu(
  girdi: Record<string, unknown>,
  sonuc: UrunHesapSonucu,
  malzemeler: Record<string, Material>
): YapiselKontrolSonucu | undefined {
  const genislikMm = Number(girdi.genislikMm);
  const derinlikMm = Number(girdi.derinlikMm);
  const cerceveMalzeme = malzemeler[String(girdi.rafCercevesiProfilKey)];
  if (!genislikMm || !derinlikMm || !cerceveMalzeme) return undefined;

  const cerceveKesit = kesitOzellikleriHesapla(cerceveMalzeme);
  if (!cerceveKesit) return undefined;

  const tasarimYukuKgM2 = Number(girdi.tasarimYukuKgM2) || RAF_VARSAYILAN_TASARIM_YUKU_KG_M2;
  const seviyeYukN = kgToN(tasarimYukuKgM2 * (genislikMm / 1000) * (derinlikMm / 1000));
  // Bir raf seviyesinin yükü ön + arka (genişlik yönü) çerçeve profili arasında yaklaşık eşit paylaşılır.
  const toplamYukN = seviyeYukN / 2;

  const s = kirisKontrolEt({ acikligMm: genislikMm, mesnetTuru: "basit", yukTuru: "yayili", toplamYukN, kesit: cerceveKesit });

  const kalemler: YapiselKontrolKalemi[] = [
    {
      ...s,
      tur: "kiris" as const,
      eleman: "Raf çerçevesi (genişlik yönü, ayaklar arası açıklık)",
      profilAdi: cerceveMalzeme.name,
      yukAciklamasi: `Tasarım yükü ${tasarimYukuKgM2} kg/m² × ${(genislikMm / 1000).toFixed(2)}×${(derinlikMm / 1000).toFixed(
        2
      )} m raf alanı, ön/arka çerçeve arasında paylaşılmış (belirtilmezse ${RAF_VARSAYILAN_TASARIM_YUKU_KG_M2} kg/m² varsayılır)`,
    },
  ];

  const ayakMalzeme = malzemeler[String(girdi.ayakProfilKey)];
  const yukseklikMm = Number(girdi.yukseklikMm);
  const rafSayisi = Number(girdi.rafSayisi) || sonuc.ozetDegerler.rafSayisi;
  if (ayakMalzeme && yukseklikMm) {
    const ayakKesit = kesitOzellikleriHesapla(ayakMalzeme);
    if (ayakKesit) {
      // Tüm raf seviyelerinin toplam yükü, 4 ayak arasında eşit paylaşılır.
      const tumSeviyelerYukN = kgToN(tasarimYukuKgM2 * (genislikMm / 1000) * (derinlikMm / 1000) * rafSayisi);
      const eksenelYukN = tumSeviyelerYukN / 4;
      const sKolon = kolonBurkulmaKontrolEt({ boyMm: yukseklikMm, eksenelYukN, kesit: ayakKesit });
      kalemler.push({
        ...sKolon,
        tur: "kolon" as const,
        eleman: "Ayak (eksenel burkulma, 4 ayak arası paylaşılmış toplam raf yükü)",
        profilAdi: ayakMalzeme.name,
        yukAciklamasi: `Tasarım yükü ${tasarimYukuKgM2} kg/m² × ${rafSayisi} seviye × raf alanı, 4 ayak arasında paylaşılmış, ${(
          yukseklikMm / 1000
        ).toFixed(2)} m ayak boyu`,
      });
    }
  }

  return ozetOlustur(kalemler);
}

function pergolaKontrolu(
  girdi: Record<string, unknown>,
  sonuc: UrunHesapSonucu,
  malzemeler: Record<string, Material>
): YapiselKontrolSonucu | undefined {
  const genislikMm = Number(girdi.genislikMm);
  const boyMm = Number(girdi.boyMm);
  const kolonSiraAdedi = sonuc.ozetDegerler.kolonSiraAdedi;
  const kirisMalzeme = malzemeler[String(girdi.kirisProfilKey)];
  if (!genislikMm || !boyMm || !kolonSiraAdedi || kolonSiraAdedi < 2 || !kirisMalzeme) return undefined;

  const kirisKesit = kesitOzellikleriHesapla(kirisMalzeme);
  if (!kirisKesit) return undefined;

  // Kenar kirişi, aynı sıradaki bitişik kolonlar arasında basit mesnetli; yapının yarı derinliğini
  // (boyMm/2) taşıdığı varsayılır (ön/arka kenar kirişi arasında yaklaşık eşit paylaşım).
  const spanMm = genislikMm / (kolonSiraAdedi - 1);
  const cizgiselYukNMm = (PERGOLA_YUK_N_M2 / 1_000_000) * (boyMm / 2);
  const toplamYukN = cizgiselYukNMm * spanMm;

  const s = kirisKontrolEt({ acikligMm: spanMm, mesnetTuru: "basit", yukTuru: "yayili", toplamYukN, kesit: kirisKesit });

  const kalemler: YapiselKontrolKalemi[] = [
    {
      ...s,
      tur: "kiris" as const,
      eleman: "Kenar kirişi (bitişik kolonlar arası açıklık)",
      profilAdi: kirisMalzeme.name,
      yukAciklamasi: `Kendi ağırlık + rüzgar yükü ${(PERGOLA_YUK_N_M2 / 1000).toFixed(2)} kN/m² × ${(boyMm / 2000).toFixed(
        2
      )} m yayılma genişliği (yapı derinliğinin yarısı), ${(spanMm / 1000).toFixed(2)} m kolon açıklığı`,
    },
  ];

  const yukseklikMm = Number(girdi.yukseklikMm);
  const kolonMalzeme = malzemeler[String(girdi.kolonProfilKey)];
  if (yukseklikMm && kolonMalzeme) {
    const kolonKesit = kesitOzellikleriHesapla(kolonMalzeme);
    if (kolonKesit) {
      // İç kolon, iki bitişik açıklığın mesnet tepkisini birden taşır (muhafazakâr, en yüklü kolon).
      const sKolon = kolonBurkulmaKontrolEt({ boyMm: yukseklikMm, eksenelYukN: toplamYukN, kesit: kolonKesit });
      kalemler.push({
        ...sKolon,
        tur: "kolon" as const,
        eleman: "Kolon (eksenel burkulma, en yüklü iç kolon)",
        profilAdi: kolonMalzeme.name,
        yukAciklamasi: `Bitişik kenar kirişi açıklıklarından gelen mesnet yükü, ${(yukseklikMm / 1000).toFixed(2)} m kolon boyu`,
      });
    }
  }

  return ozetOlustur(kalemler);
}

function kolonKirisKontrolu(
  girdi: Record<string, unknown>,
  sonuc: UrunHesapSonucu,
  malzemeler: Record<string, Material>
): YapiselKontrolSonucu | undefined {
  const acikligMm = Number(girdi.acikligMm);
  const gercekAralikMm = sonuc.ozetDegerler.gercekAralikMm; // çerçeveler arası (kirişin taşıdığı yayılma genişliği)
  const kirisMalzeme = malzemeler[String(girdi.kirisProfilKey)];
  if (!acikligMm || !gercekAralikMm || !kirisMalzeme) return undefined;

  const kirisKesit = kesitOzellikleriHesapla(kirisMalzeme);
  if (!kirisKesit) return undefined;

  // İskelet henüz çıplaktır; üzerine sonradan eklenecek çatı/kaplama için tipik kar yükü kadar bir
  // tasarım yükü varsayılır (bkz. catiKafesiKontrolu ile aynı KAR_YUKU_N_M2 sabiti).
  const cizgiselYukNMm = (KAR_YUKU_N_M2 / 1_000_000) * gercekAralikMm;
  const toplamYukN = cizgiselYukNMm * acikligMm;

  const s = kirisKontrolEt({ acikligMm, mesnetTuru: "basit", yukTuru: "yayili", toplamYukN, kesit: kirisKesit });

  const kalemler: YapiselKontrolKalemi[] = [
    {
      ...s,
      tur: "kiris" as const,
      eleman: "Kiriş (açıklık)",
      profilAdi: kirisMalzeme.name,
      yukAciklamasi: `Üzerine eklenecek çatı/kaplama için tipik kar yükü varsayımı ${(KAR_YUKU_N_M2 / 1000).toFixed(
        2
      )} kN/m² × ${(gercekAralikMm / 1000).toFixed(2)} m çerçeve aralığı, ${(acikligMm / 1000).toFixed(2)} m açıklık`,
    },
  ];

  const yukseklikMm = Number(girdi.yukseklikMm);
  const kolonMalzeme = malzemeler[String(girdi.kolonProfilKey)];
  if (yukseklikMm && kolonMalzeme) {
    const kolonKesit = kesitOzellikleriHesapla(kolonMalzeme);
    if (kolonKesit) {
      // İç kolon (birden fazla açıklık varsa), iki bitişik açıklığın mesnet tepkisini birden taşır.
      const sKolon = kolonBurkulmaKontrolEt({ boyMm: yukseklikMm, eksenelYukN: toplamYukN, kesit: kolonKesit });
      kalemler.push({
        ...sKolon,
        tur: "kolon" as const,
        eleman: "Kolon (eksenel burkulma, en yüklü iç kolon)",
        profilAdi: kolonMalzeme.name,
        yukAciklamasi: `Bitişik kiriş açıklıklarından gelen mesnet yükü, ${(yukseklikMm / 1000).toFixed(2)} m kolon boyu`,
      });
    }
  }

  return ozetOlustur(kalemler);
}

function sundurmaKontrolu(
  girdi: Record<string, unknown>,
  sonuc: UrunHesapSonucu,
  malzemeler: Record<string, Material>
): YapiselKontrolSonucu | undefined {
  const dikmeSayisi = Number(girdi.dikmeSayisi);
  const genislikMm = Number(girdi.genislikMm);
  const yukseklikMm = Number(girdi.yukseklikMm);
  const kirisUzunlukMm = sonuc.ozetDegerler.kirisUzunlukMm;
  const dikmeMalzeme = malzemeler[String(girdi.dikmeProfilKey)];
  if (!dikmeSayisi || !genislikMm || !yukseklikMm || !kirisUzunlukMm || !dikmeMalzeme) return undefined;

  const dikmeKesit = kesitOzellikleriHesapla(dikmeMalzeme);
  if (!dikmeKesit) return undefined;

  const kaplamaTuru = girdi.kaplamaTuru as KaplamaTuru | undefined;
  let kaplamaYukNM2 = 0;
  if (kaplamaTuru && kaplamaTuru !== "yok") {
    const bilgi = KAPLAMA_BILGI[kaplamaTuru];
    const kalinlikMm = Number(girdi.kaplamaKalinlikMm) || bilgi.varsayilanKalinlikMm;
    kaplamaYukNM2 = kgToN((kalinlikMm / 1000) * bilgi.efektifYogunlukKgM3);
  }
  const toplamAlanYukNM2 = KAR_YUKU_N_M2 + kaplamaYukNM2;
  const tributaryGenislikMm = genislikMm / dikmeSayisi;
  const eksenelYukN = toplamAlanYukNM2 * (tributaryGenislikMm / 1000) * (kirisUzunlukMm / 1000);

  const s = kolonBurkulmaKontrolEt({ boyMm: yukseklikMm, eksenelYukN, kesit: dikmeKesit });

  return ozetOlustur([
    {
      ...s,
      tur: "kolon" as const,
      eleman: "Dikme (eksenel burkulma)",
      profilAdi: dikmeMalzeme.name,
      yukAciklamasi: `Kar yükü ${(KAR_YUKU_N_M2 / 1000).toFixed(2)} kN/m² + kaplama ağırlığı ${(kaplamaYukNM2 / 1000).toFixed(
        3
      )} kN/m², ${(tributaryGenislikMm / 1000).toFixed(2)} m yayılma genişliği × ${(kirisUzunlukMm / 1000).toFixed(
        2
      )} m çıkma, ${(yukseklikMm / 1000).toFixed(2)} m dikme boyu`,
    },
  ]);
}

/** Şablon anahtarına göre uygun yapısal kontrol modelini çalıştırır; desteklenmiyorsa undefined döner. */
export function yapiselKontrolCalistir(
  templateKey: string,
  girdi: Record<string, unknown>,
  sonuc: UrunHesapSonucu,
  malzemeler: Record<string, Material>
): YapiselKontrolSonucu | undefined {
  try {
    if (templateKey === "railing") return korkulukKontrolu(girdi, sonuc, malzemeler);
    if (templateKey === "truss" && girdi.asikProfilKey) return catiKafesiKontrolu(girdi, sonuc, malzemeler);
    if (templateKey === "stairs") return merdivenKontrolu(girdi, sonuc, malzemeler);
    if (templateKey === "spiral_stairs") return donerMerdivenKontrolu(girdi, sonuc, malzemeler);
    if (templateKey === "wall") return duvarKontrolu(girdi, sonuc, malzemeler);
    if (templateKey === "shelf") return rafKontrolu(girdi, sonuc, malzemeler);
    if (templateKey === "pergola") return pergolaKontrolu(girdi, sonuc, malzemeler);
    if (templateKey === "steel_frame") return kolonKirisKontrolu(girdi, sonuc, malzemeler);
    if (templateKey === "canopy") return sundurmaKontrolu(girdi, sonuc, malzemeler);
    return undefined;
  } catch {
    // Yapısal kontrol her zaman opsiyoneldir - beklenmeyen bir hata ana hesaplamayı bozmamalı.
    return undefined;
  }
}
