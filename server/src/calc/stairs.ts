// Merdiven hesaplama motoru. bkz. spesifikasyon madde 6.

import { HesaplamaHatasi } from "./units";
import { HesaplananParca, UrunHesapSonucu, bosSonuc, profilOzetOlustur } from "./types";

export interface MerdivenGirdi {
  /** Kat yüksekliği (mm) - toplam düşey yükselme */
  katYuksekligiMm: number;
  /** Merdiven genişliği (mm) */
  genislikMm: number;
  /** Hedeflenen basamak yüksekliği / rıht (mm), örn. 180 */
  basamakYuksekligiHedefMm: number;
  /** Merdivenin toplam yatay uzunluğu / merdiven boşluğu (mm) - basamak derinliği (aynakol) bundan hesaplanır */
  toplamDerinlikMm: number;
  /** Taşıyıcı (kiriş) profil kesiti */
  tasiyiciProfilKey: string;
  /** Taşıyıcı adedi (varsayılan 2) */
  tasiyiciAdet?: number;
  /** Basamak plaka kalınlığı (mm), sac ihtiyacı için */
  basamakKalinlikMm?: number;
  /** Basamak plakasının alınacağı sac Material id'si (opsiyonel) - verilirse teklif maliyetine ve
   * iş onayında stok düşümüne dahil edilir. */
  basamakSacMalzemeKey?: string;

  /** Korkuluk yüksekliği (mm) - verilirse merdiven korkuluğu da hesaplanır */
  korkulukYuksekligiMm?: number;
  korkulukDikmeProfilKey?: string;
  korkulukUstProfilKey?: string;
  korkulukDikmeAraligiHedefMm?: number;
}

const VARSAYILAN = {
  tasiyiciAdet: 2,
  basamakKalinlikMm: 3,
  korkulukDikmeAraligiHedefMm: 1000,
};

export function calculateStairs(girdi: MerdivenGirdi): UrunHesapSonucu {
  const {
    katYuksekligiMm,
    genislikMm,
    basamakYuksekligiHedefMm,
    toplamDerinlikMm,
    tasiyiciProfilKey,
  } = girdi;
  const tasiyiciAdet = girdi.tasiyiciAdet ?? VARSAYILAN.tasiyiciAdet;
  const basamakKalinlikMm = girdi.basamakKalinlikMm ?? VARSAYILAN.basamakKalinlikMm;

  if (katYuksekligiMm <= 0) throw new HesaplamaHatasi("Kat yüksekliği 0'dan büyük olmalı.");
  if (genislikMm <= 0) throw new HesaplamaHatasi("Merdiven genişliği 0'dan büyük olmalı.");
  if (basamakYuksekligiHedefMm <= 0) throw new HesaplamaHatasi("Basamak yüksekliği 0'dan büyük olmalı.");
  if (toplamDerinlikMm <= 0) throw new HesaplamaHatasi("Toplam yatay uzunluk 0'dan büyük olmalı.");
  if (!tasiyiciProfilKey) throw new HesaplamaHatasi("Taşıyıcı profil seçilmelidir.");

  const sonuc = bosSonuc();

  const basamakSayisi = Math.max(1, Math.round(katYuksekligiMm / basamakYuksekligiHedefMm));
  const gercekBasamakYuksekligiMm = katYuksekligiMm / basamakSayisi;
  const basamakDerinligiMm = toplamDerinlikMm / basamakSayisi;

  // Konfor / adım formülü kontrolü: 2*rıht + aynakol yaklaşık 600-650 mm olmalı.
  const adimFormulu = 2 * gercekBasamakYuksekligiMm + basamakDerinligiMm;
  if (adimFormulu < 580 || adimFormulu > 660) {
    sonuc.uyarilar.push(
      `Basamak yüksekliği/derinliği önerilen aralığın dışında (2×rıht + aynakol = ${adimFormulu.toFixed(
        0
      )} mm, önerilen 580-660 mm).`
    );
  }
  if (gercekBasamakYuksekligiMm < 150 || gercekBasamakYuksekligiMm > 200) {
    sonuc.uyarilar.push(
      `Basamak yüksekliği (${gercekBasamakYuksekligiMm.toFixed(0)} mm) önerilen 150-200 mm aralığının dışında.`
    );
  }

  const kosegenMm = Math.sqrt(katYuksekligiMm ** 2 + toplamDerinlikMm ** 2);
  const egimAcisiDerece = (Math.atan(katYuksekligiMm / toplamDerinlikMm) * 180) / Math.PI;

  const parcalar: HesaplananParca[] = [];

  parcalar.push({
    label: "Taşıyıcı (kiriş)",
    profilKey: tasiyiciProfilKey,
    uzunlukMm: Math.ceil(kosegenMm),
    adet: tasiyiciAdet,
    not: "Merdiven eğimine göre diyagonal uzunluk; saha kesimi ile son ayar gerekebilir.",
  });

  sonuc.sacKalemleri.push({
    label: "Basamak plakası",
    enMm: genislikMm,
    boyMm: basamakDerinligiMm,
    kalinlikMm: basamakKalinlikMm,
    materialKey: girdi.basamakSacMalzemeKey,
    adet: basamakSayisi,
  });

  let korkulukDikmeSayisi = 0;
  if (girdi.korkulukYuksekligiMm && girdi.korkulukYuksekligiMm > 0) {
    if (!girdi.korkulukDikmeProfilKey || !girdi.korkulukUstProfilKey) {
      throw new HesaplamaHatasi("Korkuluk yüksekliği girildi ama korkuluk dikme/üst profili seçilmedi.");
    }
    const dikmeAraligiHedefMm = girdi.korkulukDikmeAraligiHedefMm ?? VARSAYILAN.korkulukDikmeAraligiHedefMm;
    const araliklarSayisi = Math.max(1, Math.ceil(kosegenMm / dikmeAraligiHedefMm));
    const gercekAralikMm = kosegenMm / araliklarSayisi;
    korkulukDikmeSayisi = araliklarSayisi + 1;

    parcalar.push({
      label: "Korkuluk dikmesi",
      profilKey: girdi.korkulukDikmeProfilKey,
      uzunlukMm: Math.ceil(girdi.korkulukYuksekligiMm),
      adet: korkulukDikmeSayisi,
      not: "Eğimli montaj için dikme boyu yaklaşık değerdir, sahada son ayar gerekir.",
    });
    parcalar.push({
      label: "Korkuluk üst profili",
      profilKey: girdi.korkulukUstProfilKey,
      uzunlukMm: Math.round(gercekAralikMm),
      adet: araliklarSayisi,
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
    basamakDerinligiMm: Math.round(basamakDerinligiMm * 100) / 100,
    kosegenMm: Math.round(kosegenMm),
    egimAcisiDerece: Math.round(egimAcisiDerece * 100) / 100,
    korkulukDikmeSayisi,
  };

  return sonuc;
}
