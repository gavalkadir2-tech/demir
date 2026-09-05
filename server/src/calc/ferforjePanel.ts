// Ferforje panel (dekoratif demir panel / pencere korkuluğu) hesaplama motoru. Doğrudan bir pencere
// boşluğuna monte edilen veya bir kapı/duvara eklenen dikdörtgen, dekoratif çerçeveli panel.
//
// Basitleştirme notu: gerçek ferforje süslemeler (kıvrım, yaprak, spiral motifler) elle işlenir ve
// tam geometrik olarak hesaplanamaz. Süsleme girdisi, motif başına tipik bir malzeme uzunluğu
// varsayımıyla yalnızca KABA bir ek malzeme tahmini verir - gerçek şekil/desen bu motorun kapsamı
// dışındadır.

import { HesaplamaHatasi } from "./units";
import { HesaplananParca, UrunHesapSonucu, bosSonuc, profilOzetOlustur } from "./types";

export interface FerforjePanelGirdi {
  genislikMm: number;
  yukseklikMm: number;
  cerceveProfilKey: string;
  dikeyCubukProfilKey: string;
  /** Hedeflenen dikey çubuk aralığı (mm) - dekoratif/güvenlik panelinde tipik 100-150mm */
  dikeyCubukAraligiHedefMm?: number;
  /** Yatay ara kayıt sayısı (opsiyonel, dikey çubukları desteklemek/desen için) */
  yatayAraKayitSayisi?: number;
  yatayAraKayitProfilKey?: string;
  /** Dekoratif süsleme (kıvrım/motif) eklensin mi */
  susVar?: boolean;
  susProfilKey?: string;
  susSayisi?: number;
  /** Bir süsleme motifi için tahmini malzeme uzunluğu (mm), varsayılan 300 */
  susBirimUzunlukMm?: number;
  /** Kullanıcının şematik üzerinden elle ayarladığı dikey çubuk sayısı. Verilirse
   * dikeyCubukAraligiHedefMm'den otomatik hesap yerine doğrudan bu sayı kullanılır (çubuklar yine
   * eşit aralıklı dağıtılır, sadece sayı değişir). */
  dikeyCubukSayisiOverride?: number;
}

const VARSAYILAN = {
  dikeyCubukAraligiHedefMm: 120,
  yatayAraKayitSayisi: 0,
  susSayisi: 0,
  susBirimUzunlukMm: 300,
};

export function calculateFerforjePanel(girdi: FerforjePanelGirdi): UrunHesapSonucu {
  const { genislikMm, yukseklikMm, cerceveProfilKey, dikeyCubukProfilKey } = girdi;
  const dikeyCubukAraligiHedefMm = girdi.dikeyCubukAraligiHedefMm ?? VARSAYILAN.dikeyCubukAraligiHedefMm;
  const yatayAraKayitSayisi = girdi.yatayAraKayitSayisi ?? VARSAYILAN.yatayAraKayitSayisi;
  const susSayisi = girdi.susSayisi ?? VARSAYILAN.susSayisi;
  const susBirimUzunlukMm = girdi.susBirimUzunlukMm ?? VARSAYILAN.susBirimUzunlukMm;

  if (genislikMm <= 0) throw new HesaplamaHatasi("Genişlik 0'dan büyük olmalı.");
  if (yukseklikMm <= 0) throw new HesaplamaHatasi("Yükseklik 0'dan büyük olmalı.");
  if (dikeyCubukAraligiHedefMm <= 0) throw new HesaplamaHatasi("Dikey çubuk aralığı 0'dan büyük olmalı.");
  if (!cerceveProfilKey || !dikeyCubukProfilKey) throw new HesaplamaHatasi("Çerçeve ve dikey çubuk profilleri seçilmelidir.");
  if (yatayAraKayitSayisi > 0 && !girdi.yatayAraKayitProfilKey)
    throw new HesaplamaHatasi("Yatay ara kayıt sayısı girildi ama profili seçilmedi.");
  if (girdi.susVar && (!girdi.susProfilKey || susSayisi <= 0))
    throw new HesaplamaHatasi("Süsleme seçildi ama süsleme profili veya sayısı eksik.");

  const sonuc = bosSonuc();

  let araliklarSayisi: number;
  let dikeyCubukSayisi: number;
  if (girdi.dikeyCubukSayisiOverride && girdi.dikeyCubukSayisiOverride >= 2) {
    dikeyCubukSayisi = Math.round(girdi.dikeyCubukSayisiOverride);
    araliklarSayisi = dikeyCubukSayisi - 1;
  } else {
    araliklarSayisi = Math.max(1, Math.ceil(genislikMm / dikeyCubukAraligiHedefMm));
    dikeyCubukSayisi = araliklarSayisi + 1;
  }
  const gercekAralikMm = genislikMm / araliklarSayisi;

  if (gercekAralikMm > 150) {
    sonuc.uyarilar.push(
      `Dikey çubuk aralığı ${gercekAralikMm.toFixed(0)} mm; güvenlik amaçlı pencere korkuluğunda 120 mm'yi aşmaması önerilir (çocuk güvenliği).`
    );
  }

  const parcalar: HesaplananParca[] = [];

  parcalar.push({
    label: "Çerçeve (üst + alt)",
    profilKey: cerceveProfilKey,
    uzunlukMm: Math.round(genislikMm),
    adet: 2,
  });
  parcalar.push({
    label: "Çerçeve (sol + sağ)",
    profilKey: cerceveProfilKey,
    uzunlukMm: Math.round(yukseklikMm),
    adet: 2,
  });

  parcalar.push({
    label: "Dikey çubuk",
    profilKey: dikeyCubukProfilKey,
    uzunlukMm: Math.round(yukseklikMm),
    adet: dikeyCubukSayisi,
    not: "Çerçeve kalınlığı ihmal edilmiştir; sahada küçük kısaltma gerekebilir.",
  });

  if (yatayAraKayitSayisi > 0) {
    parcalar.push({
      label: "Yatay ara kayıt",
      profilKey: girdi.yatayAraKayitProfilKey!,
      uzunlukMm: Math.round(genislikMm),
      adet: yatayAraKayitSayisi,
    });
  }

  if (girdi.susVar && girdi.susProfilKey) {
    parcalar.push({
      label: "Süsleme (dekoratif motif)",
      profilKey: girdi.susProfilKey,
      uzunlukMm: Math.round(susBirimUzunlukMm),
      adet: susSayisi,
      not: "Kaba malzeme tahmini - gerçek motif şekli/deseni elle işlenir, bu motorun kapsamı dışındadır.",
    });
  }

  sonuc.parcalar = parcalar;
  sonuc.profilOzet = profilOzetOlustur(parcalar);

  const alanM2 = (genislikMm / 1000) * (yukseklikMm / 1000);

  sonuc.ozetDegerler = {
    dikeyCubukSayisi,
    gercekAralikMm: Math.round(gercekAralikMm * 100) / 100,
    alanM2: Math.round(alanM2 * 100) / 100,
  };

  return sonuc;
}
