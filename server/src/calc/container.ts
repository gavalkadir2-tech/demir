// Konteyner (2 katlı, kaplamalı, pencereli konteyner dönüşümü) hesaplama motoru.
//
// Konteynerin kendi çelik gövdesi hazır alınır; atölye dört şeyi üretir/hesaplar:
//   A) Pencere/kapı boşluklarının çevresine kaynaklanan takviye çerçevesi (kesilen sac
//      dayanımını geri kazandırmak için),
//   B) Dış cepheye giydirilen ek kaplama,
//   C) 2. kat varsa kat arası merdiven + korkuluk,
//   D) 2. kat varsa 2. katı taşıyan ek çelik iskelet (kolon-kiriş).
// (C) ve (D), mevcut Merdiven ve Kolon-Kiriş hesap motorları sarmalanarak hesaplanır - ayrıca
// istenirse 2. kat/balkon kenarına bağımsız bir korkuluk da (mevcut Korkuluk motoru sarmalanarak)
// eklenebilir. Basitleştirme notu: boşluklar tek bir elevasyon (konteynerin uzun kenarı) üzerinde
// varsayılır; çatı ayrıca mühendislik gerektirmez (bu motorun kapsamı dışındadır - gerekirse ayrı
// bir "Çatı Kafesi" ürünü aynı işe eklenebilir).

import { HesaplamaHatasi } from "./units";
import { HesaplananParca, UrunHesapSonucu, bosSonuc, profilOzetOlustur } from "./types";
import { KAPLAMA_BILGI, KaplamaTuru, kaplamaHesapla } from "./kaplama";
import { calculateStairs, MerdivenGirdi } from "./stairs";
import { calculateRailing, KorkulukGirdi } from "./railing";
import { calculateSteelFrame, KolonKirisGirdi } from "./steelFrame";

export interface KonteynerBosluk {
  /** Boşluğun adı, örn. "Pencere 1", "Giriş Kapısı" */
  etiket: string;
  tipi: "pencere" | "kapi";
  katNo: 1 | 2;
  /** Konteynerin uzun kenarı (uzunlukMm) boyunca, sol köşeden boşluğun sol kenarına mesafe (mm) */
  konumMm: number;
  genislikMm: number;
  yukseklikMm: number;
  /** O katın tabanından boşluğun altına kadar mesafe (mm). 0 = kapı gibi tabana kadar iner. */
  tabanYuksekligiMm?: number;
}

export interface KonteynerGirdi {
  /** Konteyner eni (mm), örn. 2438 standart 20/40ft konteyner genişliği */
  genislikMm: number;
  /** Konteyner boyu (mm), örn. 6058 (20ft) veya 12192 (40ft) */
  uzunlukMm: number;
  /** Kat yüksekliği (mm), örn. 2591 standart / 2896 yüksek küp (high cube) */
  katYuksekligiMm: number;
  katSayisi: 1 | 2;

  // A) Pencere/kapı boşluk çerçeveleri
  bosluklar?: KonteynerBosluk[];
  /** Boşluk çerçevesi profil kesiti - boşluk varsa zorunlu */
  cerceveProfilKey?: string;
  /** Çerçevenin boşluk kenarından taşma payı (mm, kaynak/oturma payı), varsayılan 40 */
  cerceveTasmaMm?: number;

  // B) Dış kaplama (opsiyonel ek giydirme - konteynerin kendi sac gövdesinden ayrı)
  kaplamaTuru?: KaplamaTuru;
  kaplamaKalinlikMm?: number;
  kaplamaMalzemeKey?: string;

  // C) Kat arası merdiven + korkuluk (yalnızca katSayisi === 2 ise hesaplanır)
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

  // D) 2. katı taşıyan ek çelik iskelet (yalnızca katSayisi === 2 ise hesaplanır)
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
  cerceveTasmaMm: 40,
  merdivenGenislikMm: 900,
  merdivenBasamakYuksekligiHedefMm: 180,
  merdivenTasiyiciAdet: 2,
  merdivenBasamakKalinlikMm: 3,
  platformKorkulukYuksekligiMm: 1000,
  platformKorkulukDikmeAraligiHedefMm: 1200,
  iskeletAcikSayisi: 1,
  iskeletCerceveAraligiHedefMm: 3000,
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

  const cerceveTasmaMm = girdi.cerceveTasmaMm ?? VARSAYILAN.cerceveTasmaMm;
  const bosluklar = girdi.bosluklar ?? [];

  const sonuc = bosSonuc();
  const parcalar: HesaplananParca[] = [];

  // --- A) Pencere/kapı boşluk çerçeveleri ---
  const siraliBosluklar = [...bosluklar]
    .map((b) => ({ ...b, tabanYuksekligiMm: Math.max(0, b.tabanYuksekligiMm ?? 0) }))
    .sort((a, b) => a.katNo - b.katNo || a.konumMm - b.konumMm);

  for (const b of siraliBosluklar) {
    if (b.genislikMm <= 0 || b.yukseklikMm <= 0) throw new HesaplamaHatasi(`"${b.etiket}" boşluğunun ölçüleri 0'dan büyük olmalı.`);
    if (b.katNo === 2 && katSayisi !== 2) throw new HesaplamaHatasi(`"${b.etiket}" 2. kata ekli ama konteyner tek katlı.`);
    if (b.konumMm < 0 || b.konumMm + b.genislikMm > uzunlukMm)
      throw new HesaplamaHatasi(`"${b.etiket}" boşluğu konteyner uzunluğu sınırlarının dışına taşıyor.`);
    if (b.tabanYuksekligiMm + b.yukseklikMm > katYuksekligiMm)
      throw new HesaplamaHatasi(`"${b.etiket}" boşluğu (taban yüksekliği + boşluk yüksekliği) kat yüksekliğini aşıyor.`);
  }
  for (let i = 1; i < siraliBosluklar.length; i++) {
    const onceki = siraliBosluklar[i - 1];
    const simdiki = siraliBosluklar[i];
    if (onceki.katNo === simdiki.katNo && simdiki.konumMm < onceki.konumMm + onceki.genislikMm) {
      throw new HesaplamaHatasi(`"${onceki.etiket}" ve "${simdiki.etiket}" boşlukları çakışıyor.`);
    }
  }
  if (siraliBosluklar.length > 0 && !girdi.cerceveProfilKey) {
    throw new HesaplamaHatasi("Pencere/kapı boşluğu eklendi ama çerçeve profili seçilmedi.");
  }

  let pencereSayisi = 0;
  let kapiSayisi = 0;
  for (const b of siraliBosluklar) {
    if (b.tipi === "kapi") kapiSayisi++;
    else pencereSayisi++;

    parcalar.push({
      label: `Boşluk çerçevesi (üst+alt) - ${b.etiket}`,
      profilKey: girdi.cerceveProfilKey!,
      uzunlukMm: Math.round(b.genislikMm + 2 * cerceveTasmaMm),
      adet: 2,
      not: `${b.katNo}. kat, taban seviyesinden ${Math.round(b.tabanYuksekligiMm)} mm yükseklikte.`,
    });
    parcalar.push({
      label: `Boşluk çerçevesi (sol+sağ) - ${b.etiket}`,
      profilKey: girdi.cerceveProfilKey!,
      uzunlukMm: Math.round(b.yukseklikMm + 2 * cerceveTasmaMm),
      adet: 2,
      not: "Köşe gönyeleri sahada birleştirilir (gerinim payı dahil değildir).",
    });
  }

  // --- B) Dış kaplama (opsiyonel ek giydirme) ---
  const kaplamaTuru = girdi.kaplamaTuru ?? "yok";
  let kaplamaOzet: ReturnType<typeof kaplamaHesapla> | null = null;
  if (kaplamaTuru !== "yok") {
    const toplamYukseklikMm = katYuksekligiMm * katSayisi;
    const cevreMm = 2 * (genislikMm + uzunlukMm);
    const kaplamaBilgisi = KAPLAMA_BILGI[kaplamaTuru];
    kaplamaOzet = kaplamaHesapla(kaplamaTuru, toplamYukseklikMm, cevreMm);
    sonuc.sacKalemleri.push({
      label: `Dış cephe kaplaması (${kaplamaBilgisi.label})`,
      enMm: kaplamaBilgisi.faydaliGenislikMm,
      boyMm: Math.ceil(toplamYukseklikMm),
      kalinlikMm: girdi.kaplamaKalinlikMm ?? kaplamaBilgisi.varsayilanKalinlikMm,
      adet: kaplamaOzet.panelSayisi,
      yogunlukKgM3: kaplamaBilgisi.efektifYogunlukKgM3,
      materialKey: girdi.kaplamaMalzemeKey,
      not: `${kaplamaOzet.panelSayisi} panel (${kaplamaBilgisi.faydaliGenislikMm} mm faydalı genişlik), konteynerin tüm çevresi (${Math.round(
        cevreMm
      )} mm) tek şerit gibi açılarak hesaplanmıştır; net alan ${kaplamaOzet.netAlaniM2} m², sipariş edilecek alan (fire dahil) ${
        kaplamaOzet.siparisAlaniM2
      } m². Pencere/kapı boşlukları panelden sahada kesilir, ayrıca düşülmemiştir.`,
    });
  }

  // --- C) Kat arası merdiven + korkuluk ---
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

  // --- D) 2. katı taşıyan ek çelik iskelet ---
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

  sonuc.ozetDegerler = {
    pencereSayisi,
    kapiSayisi,
    toplamBoslukSayisi: siraliBosluklar.length,
    tabanAlaniM2: Math.round(tabanAlaniM2 * 100) / 100,
    toplamAlanM2: Math.round(tabanAlaniM2 * katSayisi * 100) / 100,
    ...(kaplamaOzet ? { kaplamaSiparisAlaniM2: kaplamaOzet.siparisAlaniM2, kaplamaFireYuzde: kaplamaOzet.fireYuzde } : {}),
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
