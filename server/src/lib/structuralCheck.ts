// Şablon bazlı yapısal kontrol modelleri. calc motoru (calc/*.ts) sadece geometri üretir ve
// veritabanından bağımsızdır; bu dosya route katmanında, gerçek Material kayıtlarının kesit
// bilgisiyle (profilSekli/widthMm/heightMm/thicknessMm) birlikte çağrılır ve varsa bir "yapısal
// kontrol" sonucu üretir. Şablon veya malzeme kesit bilgisi desteklenmiyorsa sessizce undefined
// döner (hata fırlatmaz) - yapısal kontrol her zaman opsiyonel bir ek bilgidir.

import { Material } from "@prisma/client";
import { kesitOzellikleriHesapla, kirisKontrolEt, kgToN, KirisKontrolSonucu } from "../calc/engineering";
import { KAPLAMA_BILGI, KaplamaTuru } from "../calc/kaplama";
import { UrunHesapSonucu } from "../calc/types";

// Varsayılan, tipik yük kabulleri. Bunlar TAM bir yapısal projelendirme yerine geçmez;
// gerçek proje için bölge/kullanım amacına göre bir mühendisten onay alınmalıdır.
const KORKULUK_YATAY_YUK_N_M = 500; // TS EN 1991-1-1, konut/balkon tipi korkuluk için tipik çizgisel yük (0.5 kN/m)
const KAR_YUKU_N_M2 = 1000; // TS 498, orta rakım/bölge için tipik kar yükü (1.0 kN/m²) - bölgeye göre değişir

const YAPISAL_KONTROL_UYARISI =
  "Bu, basitleştirilmiş bir mukavemet/sehim kontrolüdür - tam bir statik projelendirme değildir. Kritik/kamusal yapılarda mutlaka bir inşaat mühendisinden onay alın.";

export interface YapiselKontrolKalemi extends KirisKontrolSonucu {
  eleman: string;
  profilAdi: string;
  yukAciklamasi: string;
}

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
      eleman: "Aşık (kafesler arası açıklık)",
      profilAdi: asikMalzeme.name,
      yukAciklamasi: `Kar yükü ${(KAR_YUKU_N_M2 / 1000).toFixed(2)} kN/m² + kaplama ağırlığı ${(kaplamaYukNM2 / 1000).toFixed(
        3
      )} kN/m², ${(asikAraligiMm / 1000).toFixed(2)} m yayılma genişliği × ${(gercekAralikMm / 1000).toFixed(2)} m açıklık`,
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
    return undefined;
  } catch {
    // Yapısal kontrol her zaman opsiyoneldir - beklenmeyen bir hata ana hesaplamayı bozmamalı.
    return undefined;
  }
}
