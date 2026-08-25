// Döner (spiral) merdiven hesaplama motoru. Merkez kolon etrafında, pasta dilimi şeklinde
// basamakların döndüğü tipik atölye imalatı döner merdiven - normal (düz) merdivenden ayrı bir
// şablondur çünkü geometrisi tamamen farklıdır (kiriş/rıht yerine merkez kolon + radyal basamak).

import { HesaplamaHatasi } from "./units";
import { HesaplananParca, UrunHesapSonucu, bosSonuc, profilOzetOlustur } from "./types";

export interface DonerMerdivenGirdi {
  /** Kat yüksekliği (mm) - toplam düşey yükselme */
  katYuksekligiMm: number;
  /** İç çap (mm) - merkez kolonun basamakların başladığı çap, genelde kolon çapına yakın */
  icCapMm: number;
  /** Dış çap (mm) - basamakların dış ucunun çizdiği çap */
  disCapMm: number;
  /** Toplam dönüş açısı (derece), örn. 360 (tam tur) veya 270/450 gibi */
  toplamDonusDerecesi: number;
  /** Hedeflenen basamak yüksekliği / rıht (mm) */
  basamakYuksekligiHedefMm: number;
  /** Merkez kolon profil kesiti (genelde boru) */
  merkezKolonProfilKey: string;
  /** Basamak konsolu/desteği profil kesiti (merkez kolondan dışa, basamağı taşıyan) */
  basamakDestekProfilKey: string;
  /** Basamak plaka kalınlığı (mm) */
  basamakKalinlikMm?: number;

  korkulukVar?: boolean;
  korkulukYuksekligiMm?: number;
  korkulukDikmeProfilKey?: string;
  korkulukUstProfilKey?: string;
}

const VARSAYILAN = {
  basamakKalinlikMm: 3,
};

export function calculateSpiralStairs(girdi: DonerMerdivenGirdi): UrunHesapSonucu {
  const {
    katYuksekligiMm,
    icCapMm,
    disCapMm,
    toplamDonusDerecesi,
    basamakYuksekligiHedefMm,
    merkezKolonProfilKey,
    basamakDestekProfilKey,
  } = girdi;
  const basamakKalinlikMm = girdi.basamakKalinlikMm ?? VARSAYILAN.basamakKalinlikMm;

  if (katYuksekligiMm <= 0) throw new HesaplamaHatasi("Kat yüksekliği 0'dan büyük olmalı.");
  if (icCapMm <= 0) throw new HesaplamaHatasi("İç çap 0'dan büyük olmalı.");
  if (disCapMm <= icCapMm) throw new HesaplamaHatasi("Dış çap, iç çaptan büyük olmalı.");
  if (toplamDonusDerecesi <= 0) throw new HesaplamaHatasi("Toplam dönüş açısı 0'dan büyük olmalı.");
  if (basamakYuksekligiHedefMm <= 0) throw new HesaplamaHatasi("Basamak yüksekliği 0'dan büyük olmalı.");
  if (!merkezKolonProfilKey || !basamakDestekProfilKey)
    throw new HesaplamaHatasi("Merkez kolon ve basamak desteği profilleri seçilmelidir.");

  const sonuc = bosSonuc();

  const basamakSayisi = Math.max(2, Math.round(katYuksekligiMm / basamakYuksekligiHedefMm));
  const gercekBasamakYuksekligiMm = katYuksekligiMm / basamakSayisi;
  const basamakAcisiDerece = toplamDonusDerecesi / basamakSayisi;

  if (gercekBasamakYuksekligiMm < 150 || gercekBasamakYuksekligiMm > 220) {
    sonuc.uyarilar.push(
      `Basamak yüksekliği (${gercekBasamakYuksekligiMm.toFixed(0)} mm) döner merdiven için tipik 150-220 mm aralığının dışında.`
    );
  }
  if (basamakAcisiDerece > 50) {
    sonuc.uyarilar.push(
      `Basamak açısı ${basamakAcisiDerece.toFixed(0)}° oldukça büyük; daha fazla basamak veya daha düşük toplam dönüş açısı düşünün.`
    );
  }

  const radyalUzunlukMm = (disCapMm - icCapMm) / 2;
  const ortalamaCapMm = (icCapMm + disCapMm) / 2;
  // Her basamağın ortalama çapta kapladığı yay genişliği (pasta diliminin orta genişliği).
  const basamakGenislikMm = Math.PI * ortalamaCapMm * (basamakAcisiDerece / 360);

  const parcalar: HesaplananParca[] = [];

  parcalar.push({
    label: "Merkez kolon",
    profilKey: merkezKolonProfilKey,
    uzunlukMm: Math.ceil(katYuksekligiMm),
    adet: 1,
    not: "Merdivenin döndüğü dikey ana boru/kolon.",
  });

  parcalar.push({
    label: "Basamak desteği (konsol)",
    profilKey: basamakDestekProfilKey,
    uzunlukMm: Math.ceil(radyalUzunlukMm),
    adet: basamakSayisi,
    not: "Merkez kolondan dışa doğru, basamağı taşıyan radyal destek.",
  });

  sonuc.parcalar = parcalar;
  sonuc.profilOzet = profilOzetOlustur(parcalar);

  sonuc.sacKalemleri.push({
    label: "Basamak plakası (pasta dilimi)",
    enMm: Math.ceil(radyalUzunlukMm),
    boyMm: Math.ceil(basamakGenislikMm),
    kalinlikMm: basamakKalinlikMm,
    adet: basamakSayisi,
    not: "Gerçek şekil pasta dilimidir; burada ortalama genişlikte dikdörtgen olarak yaklaşıklanmıştır - sac kesimi şablonla yapılmalıdır.",
  });

  let korkulukDikmeSayisi = 0;
  if (girdi.korkulukVar && girdi.korkulukYuksekligiMm && girdi.korkulukYuksekligiMm > 0) {
    if (!girdi.korkulukDikmeProfilKey || !girdi.korkulukUstProfilKey) {
      throw new HesaplamaHatasi("Korkuluk yüksekliği girildi ama korkuluk dikme/üst profili seçilmedi.");
    }
    korkulukDikmeSayisi = basamakSayisi;
    const disCevreToplamMm = Math.PI * disCapMm * (toplamDonusDerecesi / 360);

    parcalar.push({
      label: "Korkuluk dikmesi",
      profilKey: girdi.korkulukDikmeProfilKey,
      uzunlukMm: Math.ceil(girdi.korkulukYuksekligiMm),
      adet: korkulukDikmeSayisi,
      not: "Her basamağın dış ucuna bir dikme; eğimli/dönel montaj için sahada son ayar gerekir.",
    });
    parcalar.push({
      label: "Korkuluk üst profili (spiral)",
      profilKey: girdi.korkulukUstProfilKey,
      uzunlukMm: Math.ceil(disCevreToplamMm),
      adet: 1,
      not: "Dış çevre boyunca düz uzunluk olarak hesaplanmıştır; gerçek montaj helis (spiral) şeklindedir, profil sahada bükülmelidir.",
    });

    sonuc.baglantiKalemleri.push({
      label: "Korkuluk dikme bağlantı plakası",
      birim: "adet",
      adet: korkulukDikmeSayisi,
    });
  }

  sonuc.parcalar = parcalar;
  sonuc.profilOzet = profilOzetOlustur(parcalar);

  sonuc.ozetDegerler = {
    basamakSayisi,
    gercekBasamakYuksekligiMm: Math.round(gercekBasamakYuksekligiMm * 100) / 100,
    basamakAcisiDerece: Math.round(basamakAcisiDerece * 100) / 100,
    radyalUzunlukMm: Math.round(radyalUzunlukMm),
    toplamDonusDerecesi,
    icCapMm,
    disCapMm,
    korkulukDikmeSayisi,
  };

  return sonuc;
}
