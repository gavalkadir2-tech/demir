// Konteyner (2 katlı konteyner tipi yapı) hesaplama motoru.
//
// Bu ürün, konteynerin kendi gövdesinin SIFIRDAN kaynaklanmasını modeller: 4 adet Çelik Duvar
// Paneli (bkz. wall.ts) uç uca eklenerek bir kutunun 4 köşesini oluşturur (ön/arka/sol/sağ).
// Her duvar, calculateWallPanel motoru üzerinden hesaplanır - yani duvar panelindeki TÜM özellikler
// (dikme aralığı/profilleri, kapı/pencere boşlukları, iç/dış kaplama, dikme pozisyonlarının elle
// düzenlenmesi, yatay ara profiller) her bir konteyner duvarında ayrı ayrı kullanılabilir.
// 2 katlıysa bu 4 duvar seti bir kat daha (isteğe bağlı olarak farklı ayarlarla) tekrarlanır.
// Ayrıca atölyenin üretebileceği altı ek şey daha hesaplanır:
//   - konteyner içini odalara ayıran iç bölme duvarları (yine calculateWallPanel sarmalanarak, kat
//     sayısından bağımsız - her katta aynı liste tekrarlanır),
//   - taban/zemin döşemesi kaplaması (wall.ts'teki kaplamaKalemiEkle paylaşılarak, kat sayısından
//     bağımsız - sadece en alttaki taban, kat arası döşeme değil),
//   - konteynerin üzerine oturan çatı kafesi (calculateRoofTruss sarmalanarak, kat sayısından
//     bağımsız - her konteynerde olabilir),
//   - (yalnızca kat sayısı 2 ise) kat arası merdiven + korkuluk (calculateStairs sarmalanarak),
//   - (yalnızca kat sayısı 2 ise) 2. kat/balkon açık kenarına bağımsız platform korkuluğu
//     (calculateRailing sarmalanarak),
//   - (yalnızca kat sayısı 2 ise) 2. katı taşıyan ek çelik iskelet (calculateSteelFrame sarmalanarak).

import { HesaplamaHatasi } from "./units";
import { HesaplananParca, UrunHesapSonucu, bosSonuc, profilOzetOlustur } from "./types";
import { calculateWallPanel, DuvarPaneliGirdi, kaplamaKalemiEkle } from "./wall";
import { KaplamaTuru } from "./kaplama";
import { calculateStairs, MerdivenGirdi } from "./stairs";
import { calculateRailing, KorkulukGirdi } from "./railing";
import { calculateSteelFrame, KolonKirisGirdi } from "./steelFrame";
import { calculateRoofTruss, CatiKafesiGirdi } from "./roofTruss";

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

/** Konteyner içini odalara ayıran bir bölme duvarının ayarları - Çelik Duvar Paneli'nin tüm
 * alanları (yükseklik hariç, o kat yüksekliğinden otomatik atanır). Dış duvarların aksine uzunluğu
 * (genislikMm) konteynerin ölçüsüne bağlı değildir, kullanıcı tarafından serbestçe girilir. */
export type KonteynerIcDuvarGirdi = Omit<DuvarPaneliGirdi, "yukseklikMm">;

/** Konteynerin çatısının ayarları - Çatı Kafesi'nin (CatiKafesiGirdi) açıklık ve çatı uzunluğu
 * dışındaki tüm alanları. Açıklık/uzunluk konteynerin genel ölçülerinden (genislikMm/uzunlukMm)
 * otomatik atanır - çatı konteynerin tam üzerine oturmak zorundadır. */
export type KonteynerCatiGirdi = Omit<CatiKafesiGirdi, "acikligMm" | "catiUzunluguMm">;

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

  /** Yan yana zincirlenen modül sayısı (uzunluk ekseni boyunca, tren vagonu gibi uç uca) - verilmezse
   * (veya 1 ise) tek bir konteyner hesaplanır. N modül için sol/sağ (uzun kenar) duvarları her modülde
   * ayrı ayrı tekrarlanır (her biri kendi tam dış duvarı), ancak modüller arasındaki (N-1) adet uç
   * duvarı artık dışarıya bakmadığından, bunların yerine tek bir paylaşımlı `araDuvar` hesaplanır -
   * modülleri iki ayrı "on"+"arka" duvarı yerine tek bir ortak duvarla birleştirerek malzeme
   * tasarrufu gerçekçi şekilde yansıtılır. */
  modulSayisi?: number;
  /** Modüller arasındaki paylaşımlı duvarın ayarları (dış duvarlarla aynı şema, genişliği konteyner
   * eniyle otomatik eşleşir) - modulSayisi > 1 ise zorunludur. */
  araDuvar?: KonteynerDuvarGirdi;

  /** İç bölme duvarları (odalar arası) - her kat için aynı liste kullanılır (2 katlıysa her katta
   * aynı bölme planı tekrarlanır). Konteynerin dış kutusunu etkilemez, sadece ek malzeme olarak
   * hesaplanır. */
  icDuvarlar?: KonteynerIcDuvarGirdi[];

  // Taban/zemin döşemesi - konteynerin taban alanı (genislikMm x uzunlukMm) kadar kaplama
  tabanVar?: boolean;
  tabanKaplamaTuru?: KaplamaTuru;
  tabanKaplamaKalinlikMm?: number;
  tabanKaplamaMalzemeKey?: string;

  // Çatı kafesi - kat sayısından bağımsız, konteynerin üzerine oturur
  catiVar?: boolean;
  cati?: KonteynerCatiGirdi;

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
  const modulSayisi = girdi.modulSayisi ?? 1;
  if (!Number.isInteger(modulSayisi) || modulSayisi < 1) throw new HesaplamaHatasi("Modül sayısı 1 veya daha büyük bir tam sayı olmalı.");
  if (modulSayisi > 1 && !girdi.araDuvar) throw new HesaplamaHatasi("Modül sayısı 1'den büyük ama modüller arası paylaşımlı duvar (araDuvar) ayarları girilmedi.");

  const sonuc = bosSonuc();
  const parcalar: HesaplananParca[] = [];
  const icDuvarSonuclari: UrunHesapSonucu[] = [];

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

    // --- Ek modüller (modulSayisi > 1): her ek modül kendi sol+sağ duvarını tekrar getirir, ve
    // modüller arasındaki (N-1) paylaşımlı ara duvar, iki ayrı dış duvar yerine tek sefer hesaplanır. ---
    if (modulSayisi > 1) {
      for (let m = 2; m <= modulSayisi; m++) {
        (["sol", "sag"] as const).forEach((yon) => {
          const duvarGirdi: DuvarPaneliGirdi = { ...set[yon], genislikMm: uzunlukMm, yukseklikMm: katYuksekligiMm };
          const etiket = `${etiketOnEki}Modül ${m} ${YON_ETIKET[yon]}`;
          let duvarSonuc: UrunHesapSonucu;
          try {
            duvarSonuc = calculateWallPanel(duvarGirdi);
          } catch (e) {
            if (e instanceof HesaplamaHatasi) throw new HesaplamaHatasi(`${etiket}: ${e.message}`);
            throw e;
          }
          altSonucuBirlestir(parcalar, sonuc.sacKalemleri, sonuc.baglantiKalemleri, sonuc.uyarilar, duvarSonuc, etiket);
          duvarSonuclari.push({ yon, kat, sonuc: duvarSonuc });
        });
      }
      for (let m = 1; m <= modulSayisi - 1; m++) {
        const araDuvarGirdi: DuvarPaneliGirdi = { ...girdi.araDuvar!, genislikMm, yukseklikMm: katYuksekligiMm };
        const etiket = `${etiketOnEki}Ara Duvar ${m}`;
        let araDuvarSonuc: UrunHesapSonucu;
        try {
          araDuvarSonuc = calculateWallPanel(araDuvarGirdi);
        } catch (e) {
          if (e instanceof HesaplamaHatasi) throw new HesaplamaHatasi(`${etiket}: ${e.message}`);
          throw e;
        }
        altSonucuBirlestir(parcalar, sonuc.sacKalemleri, sonuc.baglantiKalemleri, sonuc.uyarilar, araDuvarSonuc, etiket);
        icDuvarSonuclari.push(araDuvarSonuc);
      }
    }
  }

  // --- İç bölme duvarları (odalar arası) - her katta aynı liste tekrarlanır ---
  for (const { etiketOnEki } of katSetleri) {
    (girdi.icDuvarlar ?? []).forEach((icDuvar, index) => {
      const icDuvarGirdi: DuvarPaneliGirdi = { ...icDuvar, yukseklikMm: katYuksekligiMm };
      const icDuvarEtiketi = `${etiketOnEki}İç Duvar ${index + 1}`;
      let icDuvarSonuc: UrunHesapSonucu;
      try {
        icDuvarSonuc = calculateWallPanel(icDuvarGirdi);
      } catch (e) {
        if (e instanceof HesaplamaHatasi) throw new HesaplamaHatasi(`${icDuvarEtiketi}: ${e.message}`);
        throw e;
      }
      altSonucuBirlestir(parcalar, sonuc.sacKalemleri, sonuc.baglantiKalemleri, sonuc.uyarilar, icDuvarSonuc, icDuvarEtiketi);
      icDuvarSonuclari.push(icDuvarSonuc);
    });
  }

  // --- Taban/zemin döşemesi (kat sayısından bağımsız, sadece taban - kat arası döşeme değil) ---
  let tabanKaplamaOzet: ReturnType<typeof kaplamaKalemiEkle> = null;
  if (girdi.tabanVar) {
    if (!girdi.tabanKaplamaTuru || girdi.tabanKaplamaTuru === "yok")
      throw new HesaplamaHatasi("Taban döşemesi eklendi ama kaplama türü seçilmedi.");
    tabanKaplamaOzet = kaplamaKalemiEkle(
      sonuc,
      "Taban kaplaması",
      girdi.tabanKaplamaTuru,
      girdi.tabanKaplamaKalinlikMm,
      girdi.tabanKaplamaMalzemeKey,
      uzunlukMm * modulSayisi,
      genislikMm
    );
  }

  // --- Çatı kafesi (kat sayısından bağımsız, konteynerin üzerine oturur) ---
  let catiSonuc: UrunHesapSonucu | null = null;
  if (girdi.catiVar) {
    if (!girdi.cati) throw new HesaplamaHatasi("Çatı eklendi ama çatı ayarları girilmedi.");
    const catiGirdi: CatiKafesiGirdi = { ...girdi.cati, acikligMm: genislikMm, catiUzunluguMm: uzunlukMm * modulSayisi };
    try {
      catiSonuc = calculateRoofTruss(catiGirdi);
    } catch (e) {
      if (e instanceof HesaplamaHatasi) throw new HesaplamaHatasi(`Çatı: ${e.message}`);
      throw e;
    }
    altSonucuBirlestir(parcalar, sonuc.sacKalemleri, sonuc.baglantiKalemleri, sonuc.uyarilar, catiSonuc, "Çatı");
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
        uzunlukMm: uzunlukMm * modulSayisi,
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

  const tabanAlaniM2 = (genislikMm / 1000) * (uzunlukMm / 1000) * modulSayisi;
  const tumDuvarSonuclari = [...duvarSonuclari.map((d) => d.sonuc), ...icDuvarSonuclari];
  const toplamDikmeSayisi = tumDuvarSonuclari.reduce((s, d) => s + (d.ozetDegerler.dikmeSayisi ?? 0), 0);
  const toplamBoslukSayisi = tumDuvarSonuclari.reduce((s, d) => s + (d.ozetDegerler.bosluklarSayisi ?? 0), 0);
  const toplamDuvarAlaniM2 =
    Math.round(tumDuvarSonuclari.reduce((s, d) => s + (d.ozetDegerler.duvarAlaniM2 ?? 0), 0) * 100) / 100;

  sonuc.ozetDegerler = {
    tabanAlaniM2: Math.round(tabanAlaniM2 * 100) / 100,
    toplamAlanM2: Math.round(tabanAlaniM2 * katSayisi * 100) / 100,
    toplamDikmeSayisi,
    toplamBoslukSayisi,
    toplamDuvarAlaniM2,
    ...(icDuvarSonuclari.length > 0 ? { icDuvarSayisi: (girdi.icDuvarlar ?? []).length } : {}),
    ...(modulSayisi > 1 ? { modulSayisi } : {}),
    ...(tabanKaplamaOzet
      ? {
          tabanKaplamaSiparisAlaniM2: tabanKaplamaOzet.siparisAlaniM2,
          tabanKaplamaFireM2: tabanKaplamaOzet.fireM2,
          tabanKaplamaFireYuzde: tabanKaplamaOzet.fireYuzde,
        }
      : {}),
    ...(catiSonuc
      ? {
          catiKafesSayisi: catiSonuc.ozetDegerler.kafesSayisi,
          catiMahyaYuksekligiMm: catiSonuc.ozetDegerler.mahyaYuksekligiMm,
          catiGercekAralikMm: catiSonuc.ozetDegerler.gercekAralikMm,
          catiDiyagonalPanelSayisi: catiSonuc.ozetDegerler.diyagonalPanelSayisi,
        }
      : {}),
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
