// Konteyner (2 katlı konteyner tipi yapı) hesaplama motoru.
//
// Bu ürün, konteynerin kendi gövdesinin SIFIRDAN kaynaklanmasını modeller: 4 adet Çelik Duvar
// Paneli (bkz. wall.ts) uç uca eklenerek bir kutunun 4 köşesini oluşturur (ön/arka/sol/sağ).
// Her duvar, calculateWallPanel motoru üzerinden hesaplanır - yani duvar panelindeki TÜM özellikler
// (dikme aralığı/profilleri, kapı/pencere boşlukları, iç/dış kaplama, dikme pozisyonlarının elle
// düzenlenmesi, yatay ara profiller) her bir konteyner duvarında ayrı ayrı kullanılabilir.
// 2 katlıysa bu 4 duvar seti bir kat daha (isteğe bağlı olarak farklı ayarlarla) tekrarlanır.
// Ayrıca atölyenin üretebileceği üç ek şey daha hesaplanır (kat sayısı 2 ise):
//   - kat arası merdiven + korkuluk (calculateStairs sarmalanarak),
//   - 2. kat/balkon açık kenarına bağımsız platform korkuluğu (calculateRailing sarmalanarak),
//   - 2. katı taşıyan ek çelik iskelet (calculateSteelFrame sarmalanarak).
// Çatı ayrıca mühendislik gerektirmez (bu motorun kapsamı dışındadır - gerekirse ayrı bir
// "Çatı Kafesi" ürünü aynı işe eklenebilir).

import { HesaplamaHatasi } from "./units";
import { HesaplananParca, UrunHesapSonucu, bosSonuc, profilOzetOlustur } from "./types";
import { calculateWallPanel, DuvarPaneliGirdi } from "./wall";
import { calculateStairs, MerdivenGirdi } from "./stairs";
import { calculateRailing, KorkulukGirdi } from "./railing";
import { calculateSteelFrame, KolonKirisGirdi } from "./steelFrame";

/** Konteynerin bir duvarının ayarları - Çelik Duvar Paneli'nin (DuvarPaneliGirdi) genişlik ve
 * yükseklik dışındaki tüm alanları. Genişlik/yükseklik konteynerin genel ölçülerinden (genislikMm/
 * uzunlukMm/katYuksekligiMm) otomatik atanır, çünkü 4 duvar bir kutu oluşturacak şekilde birbirine
 * uymak zorundadır. */
export type KonteynerDuvarGirdi = Omit<DuvarPaneliGirdi, "genislikMm" | "yukseklikMm">;

export interface KonteynerDuvarSeti {
  on: KonteynerDuvarGirdi;
  arka: KonteynerDuvarGirdi;
  sol: KonteynerDuvarGirdi;
  sag: KonteynerDuvarGirdi;
}

export interface KonteynerGirdi {
  /** Konteyner eni (mm) - ön/arka duvarın genişliği, örn. 2438 standart 20/40ft konteyner genişliği */
  genislikMm: number;
  /** Konteyner boyu (mm) - sol/sağ duvarın genişliği, örn. 6058 (20ft) veya 12192 (40ft) */
  uzunlukMm: number;
  /** Kat yüksekliği (mm) - her duvarın yüksekliği, örn. 2591 standart / 2896 yüksek küp */
  katYuksekligiMm: number;
  katSayisi: 1 | 2;

  /** 1. kat (katSayisi=1 ise tek kat) duvar ayarları - 4 duvarın hepsi zorunlu. */
  duvarlar: KonteynerDuvarSeti;
  /** 2. kat duvar ayarları - verilmezse (katSayisi=2 iken) 1. kat duvarları (duvarlar) aynen
   * tekrar kullanılır; farklı pencere/kapı veya kaplama isteniyorsa burada ayrı girilir. */
  duvarlar2?: KonteynerDuvarSeti;

  // Kat arası merdiven + korkuluk (yalnızca katSayisi === 2 ise hesaplanır)
  merdivenVar?: boolean;
  merdivenGenislikMm?: number;
  merdivenBasamakYuksekligiHedefMm?: number;
  /** Merdivenin toplam yatay uzunluğu (mm) */
  merdivenDerinlikMm?: number;
  merdivenTasiyiciProfilKey?: string;
  merdivenTasiyiciAdet?: number;
  merdivenBasamakKalinlikMm?: number;
  merdivenBasamakSacMalzemeKey?: string;
  merdivenKorkulukYuksekligiMm?: number;
  merdivenKorkulukDikmeProfilKey?: string;
  merdivenKorkulukUstProfilKey?: string;
  merdivenKorkulukDikmeAraligiHedefMm?: number;
  merdivenKorkulukBaglantiMalzemeKey?: string;

  // 2. kat/balkon açık kenarı korkuluğu - merdivenden bağımsız, opsiyonel
  platformKorkulukVar?: boolean;
  platformKorkulukUzunlukMm?: number;
  platformKorkulukYuksekligiMm?: number;
  platformKorkulukDikmeAraligiHedefMm?: number;
  platformUstProfilKey?: string;
  platformAltProfilKey?: string;
  platformDikmeProfilKey?: string;
  platformAraKayitSayisi?: number;
  platformAraKayitProfilKey?: string;

  // 2. katı taşıyan ek çelik iskelet (yalnızca katSayisi === 2 ise hesaplanır)
  ikinciKatIskeletVar?: boolean;
  iskeletAcikSayisi?: number;
  iskeletKolonProfilKey?: string;
  iskeletKirisProfilKey?: string;
  iskeletCerceveAraligiHedefMm?: number;
  iskeletBaglantiKirisiProfilKey?: string;
  iskeletStabiliteBaglantisiVar?: boolean;
  iskeletStabiliteProfilKey?: string;
}

const VARSAYILAN = {
  merdivenGenislikMm: 900,
  merdivenBasamakYuksekligiHedefMm: 180,
  merdivenTasiyiciAdet: 2,
  merdivenBasamakKalinlikMm: 3,
  platformKorkulukYuksekligiMm: 1000,
  platformKorkulukDikmeAraligiHedefMm: 1200,
  iskeletAcikSayisi: 1,
  iskeletCerceveAraligiHedefMm: 3000,
};

const YON_ETIKET: Record<keyof KonteynerDuvarSeti, string> = {
  on: "Ön Duvar",
  arka: "Arka Duvar",
  sol: "Sol Duvar",
  sag: "Sağ Duvar",
};

/** Alt hesap motorlarından gelen parça/sac/bağlantı kalemlerini bir etiket ön ekiyle, verilen
 * dizilere ekler (dizileri yerinde mutasyona uğratır). */
function altSonucuBirlestir(
  parcalar: HesaplananParca[],
  sacKalemleri: UrunHesapSonucu["sacKalemleri"],
  baglantiKalemleri: UrunHesapSonucu["baglantiKalemleri"],
  uyarilar: string[],
  alt: UrunHesapSonucu,
  onEk: string
) {
  for (const p of alt.parcalar) parcalar.push({ ...p, label: `${onEk}: ${p.label}` });
  for (const s of alt.sacKalemleri) sacKalemleri.push({ ...s, label: `${onEk}: ${s.label}` });
  for (const b of alt.baglantiKalemleri) baglantiKalemleri.push({ ...b, label: `${onEk}: ${b.label}` });
  for (const u of alt.uyarilar) uyarilar.push(`${onEk}: ${u}`);
}

export function calculateContainer(girdi: KonteynerGirdi): UrunHesapSonucu {
  const { genislikMm, uzunlukMm, katYuksekligiMm, katSayisi } = girdi;

  if (genislikMm <= 0) throw new HesaplamaHatasi("Konteyner eni 0'dan büyük olmalı.");
  if (uzunlukMm <= 0) throw new HesaplamaHatasi("Konteyner boyu 0'dan büyük olmalı.");
  if (katYuksekligiMm <= 0) throw new HesaplamaHatasi("Kat yüksekliği 0'dan büyük olmalı.");
  if (katSayisi !== 1 && katSayisi !== 2) throw new HesaplamaHatasi("Kat sayısı 1 veya 2 olmalı.");
  if (!girdi.duvarlar) throw new HesaplamaHatasi("Konteynerin 4 duvarının (ön/arka/sol/sağ) ayarları girilmelidir.");

  const sonuc = bosSonuc();
  const parcalar: HesaplananParca[] = [];

  // --- 4 duvar × (1 veya 2 kat) - her biri tam bir Çelik Duvar Paneli hesabı ---
  const duvarSonuclari: { yon: keyof KonteynerDuvarSeti; kat: number; sonuc: UrunHesapSonucu }[] = [];
  const katSetleri: { kat: number; set: KonteynerDuvarSeti; etiketOnEki: string }[] =
    katSayisi === 2
      ? [
          { kat: 1, set: girdi.duvarlar, etiketOnEki: "1. Kat " },
          { kat: 2, set: girdi.duvarlar2 ?? girdi.duvarlar, etiketOnEki: "2. Kat " },
        ]
      : [{ kat: 1, set: girdi.duvarlar, etiketOnEki: "" }];

  for (const { kat, set, etiketOnEki } of katSetleri) {
    (Object.keys(YON_ETIKET) as (keyof KonteynerDuvarSeti)[]).forEach((yon) => {
      const duvarGenislikMm = yon === "on" || yon === "arka" ? genislikMm : uzunlukMm;
      const duvarGirdi: DuvarPaneliGirdi = { ...set[yon], genislikMm: duvarGenislikMm, yukseklikMm: katYuksekligiMm };
      let duvarSonuc: UrunHesapSonucu;
      try {
        duvarSonuc = calculateWallPanel(duvarGirdi);
      } catch (e) {
        if (e instanceof HesaplamaHatasi) throw new HesaplamaHatasi(`${etiketOnEki}${YON_ETIKET[yon]}: ${e.message}`);
        throw e;
      }
      altSonucuBirlestir(parcalar, sonuc.sacKalemleri, sonuc.baglantiKalemleri, sonuc.uyarilar, duvarSonuc, `${etiketOnEki}${YON_ETIKET[yon]}`);
      duvarSonuclari.push({ yon, kat, sonuc: duvarSonuc });
    });
  }

  // --- Kat arası merdiven + korkuluk ---
  let merdivenSonuc: UrunHesapSonucu | null = null;
  if (girdi.merdivenVar) {
    if (katSayisi !== 2) {
      sonuc.uyarilar.push("Merdiven yalnızca 2 katlı konteynerde hesaplanır; kat sayısı 2 olmadığından merdiven atlandı.");
    } else {
      if (!girdi.merdivenTasiyiciProfilKey) throw new HesaplamaHatasi("Merdiven eklendi ama taşıyıcı profili seçilmedi.");
      if (!girdi.merdivenDerinlikMm || girdi.merdivenDerinlikMm <= 0)
        throw new HesaplamaHatasi("Merdiven eklendi ama toplam yatay uzunluk (derinlik) girilmedi.");
      const merdivenGirdi: MerdivenGirdi = {
        katYuksekligiMm,
        genislikMm: girdi.merdivenGenislikMm ?? VARSAYILAN.merdivenGenislikMm,
        basamakYuksekligiHedefMm: girdi.merdivenBasamakYuksekligiHedefMm ?? VARSAYILAN.merdivenBasamakYuksekligiHedefMm,
        toplamDerinlikMm: girdi.merdivenDerinlikMm,
        tasiyiciProfilKey: girdi.merdivenTasiyiciProfilKey,
        tasiyiciAdet: girdi.merdivenTasiyiciAdet ?? VARSAYILAN.merdivenTasiyiciAdet,
        basamakKalinlikMm: girdi.merdivenBasamakKalinlikMm ?? VARSAYILAN.merdivenBasamakKalinlikMm,
        basamakSacMalzemeKey: girdi.merdivenBasamakSacMalzemeKey,
        korkulukYuksekligiMm: girdi.merdivenKorkulukYuksekligiMm,
        korkulukDikmeProfilKey: girdi.merdivenKorkulukDikmeProfilKey,
        korkulukUstProfilKey: girdi.merdivenKorkulukUstProfilKey,
        korkulukDikmeAraligiHedefMm: girdi.merdivenKorkulukDikmeAraligiHedefMm,
        korkulukBaglantiMalzemeKey: girdi.merdivenKorkulukBaglantiMalzemeKey,
      };
      merdivenSonuc = calculateStairs(merdivenGirdi);
      altSonucuBirlestir(parcalar, sonuc.sacKalemleri, sonuc.baglantiKalemleri, sonuc.uyarilar, merdivenSonuc, "Merdiven");
    }
  }

  // --- Platform/balkon kenarı korkuluğu (merdivenden bağımsız) ---
  let platformSonuc: UrunHesapSonucu | null = null;
  if (girdi.platformKorkulukVar) {
    if (katSayisi !== 2) {
      sonuc.uyarilar.push("Platform korkuluğu yalnızca 2 katlı konteynerde hesaplanır; kat sayısı 2 olmadığından atlandı.");
    } else {
      if (!girdi.platformKorkulukUzunlukMm || girdi.platformKorkulukUzunlukMm <= 0)
        throw new HesaplamaHatasi("Platform korkuluğu eklendi ama toplam uzunluk girilmedi.");
      if (!girdi.platformUstProfilKey || !girdi.platformAltProfilKey || !girdi.platformDikmeProfilKey)
        throw new HesaplamaHatasi("Platform korkuluğu eklendi ama üst/alt/dikme profilleri seçilmedi.");
      const platformGirdi: KorkulukGirdi = {
        toplamUzunlukMm: girdi.platformKorkulukUzunlukMm,
        yukseklikMm: girdi.platformKorkulukYuksekligiMm ?? VARSAYILAN.platformKorkulukYuksekligiMm,
        dikmeAraligiHedefMm: girdi.platformKorkulukDikmeAraligiHedefMm ?? VARSAYILAN.platformKorkulukDikmeAraligiHedefMm,
        ustProfilKey: girdi.platformUstProfilKey,
        altProfilKey: girdi.platformAltProfilKey,
        dikmeProfilKey: girdi.platformDikmeProfilKey,
        araKayitSayisi: girdi.platformAraKayitSayisi,
        araKayitProfilKey: girdi.platformAraKayitProfilKey,
      };
      platformSonuc = calculateRailing(platformGirdi);
      altSonucuBirlestir(parcalar, sonuc.sacKalemleri, sonuc.baglantiKalemleri, sonuc.uyarilar, platformSonuc, "Platform korkuluğu");
    }
  }

  // --- 2. katı taşıyan ek çelik iskelet ---
  let iskeletSonuc: UrunHesapSonucu | null = null;
  if (girdi.ikinciKatIskeletVar) {
    if (katSayisi !== 2) {
      sonuc.uyarilar.push("2. kat iskeleti yalnızca 2 katlı konteynerde hesaplanır; kat sayısı 2 olmadığından atlandı.");
    } else {
      if (!girdi.iskeletKolonProfilKey || !girdi.iskeletKirisProfilKey)
        throw new HesaplamaHatasi("2. kat iskeleti eklendi ama kolon/kiriş profilleri seçilmedi.");
      const iskeletGirdi: KolonKirisGirdi = {
        acikligMm: genislikMm,
        uzunlukMm,
        yukseklikMm: katYuksekligiMm,
        acikSayisi: girdi.iskeletAcikSayisi ?? VARSAYILAN.iskeletAcikSayisi,
        kolonProfilKey: girdi.iskeletKolonProfilKey,
        kirisProfilKey: girdi.iskeletKirisProfilKey,
        cerceveAraligiHedefMm: girdi.iskeletCerceveAraligiHedefMm ?? VARSAYILAN.iskeletCerceveAraligiHedefMm,
        baglantiKirisiProfilKey: girdi.iskeletBaglantiKirisiProfilKey,
        stabiliteBaglantisiVar: girdi.iskeletStabiliteBaglantisiVar,
        stabiliteProfilKey: girdi.iskeletStabiliteProfilKey,
      };
      iskeletSonuc = calculateSteelFrame(iskeletGirdi);
      altSonucuBirlestir(parcalar, sonuc.sacKalemleri, sonuc.baglantiKalemleri, sonuc.uyarilar, iskeletSonuc, "2. Kat İskeleti");
    }
  }

  sonuc.parcalar = parcalar;
  sonuc.profilOzet = profilOzetOlustur(parcalar);

  const tabanAlaniM2 = (genislikMm / 1000) * (uzunlukMm / 1000);
  const toplamDikmeSayisi = duvarSonuclari.reduce((s, d) => s + (d.sonuc.ozetDegerler.dikmeSayisi ?? 0), 0);
  const toplamBoslukSayisi = duvarSonuclari.reduce((s, d) => s + (d.sonuc.ozetDegerler.bosluklarSayisi ?? 0), 0);
  const toplamDuvarAlaniM2 =
    Math.round(duvarSonuclari.reduce((s, d) => s + (d.sonuc.ozetDegerler.duvarAlaniM2 ?? 0), 0) * 100) / 100;

  sonuc.ozetDegerler = {
    tabanAlaniM2: Math.round(tabanAlaniM2 * 100) / 100,
    toplamAlanM2: Math.round(tabanAlaniM2 * katSayisi * 100) / 100,
    toplamDikmeSayisi,
    toplamBoslukSayisi,
    toplamDuvarAlaniM2,
    ...(merdivenSonuc
      ? {
          merdivenBasamakSayisi: merdivenSonuc.ozetDegerler.basamakSayisi,
          merdivenGercekBasamakYuksekligiMm: merdivenSonuc.ozetDegerler.gercekBasamakYuksekligiMm,
        }
      : {}),
    ...(platformSonuc ? { platformKorkulukDikmeSayisi: platformSonuc.ozetDegerler.dikmeSayisi } : {}),
    ...(iskeletSonuc
      ? {
          iskeletKolonSayisi: iskeletSonuc.ozetDegerler.kolonToplamAdet,
          iskeletCerceveSayisi: iskeletSonuc.ozetDegerler.cerceveSayisi,
        }
      : {}),
  };

  return sonuc;
}
