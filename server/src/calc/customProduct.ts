// Manuel parça girişi / Çelik Konstrüksiyon modülü. bkz. spesifikasyon madde 9 ve 10.
// Kullanıcı hazır bir şablona bağlı kalmadan doğrudan parça listesi girer; bu motor
// girdiyi doğrular ve diğer ürün motorlarıyla aynı UrunHesapSonucu şekline dönüştürür.

import { HesaplamaHatasi } from "./units";
import { HesaplananParca, UrunHesapSonucu, bosSonuc, profilOzetOlustur } from "./types";

export interface OzelUrunGirdi {
  parcalar: HesaplananParca[];
}

export function calculateCustomProduct(girdi: OzelUrunGirdi): UrunHesapSonucu {
  if (!girdi.parcalar || girdi.parcalar.length === 0) {
    throw new HesaplamaHatasi("En az bir parça eklenmelidir.");
  }

  const sonuc = bosSonuc();
  for (const p of girdi.parcalar) {
    if (!p.profilKey) throw new HesaplamaHatasi(`"${p.label}" parçası için malzeme seçilmelidir.`);
    if (p.uzunlukMm <= 0) throw new HesaplamaHatasi(`"${p.label}" parçasının uzunluğu 0'dan büyük olmalı.`);
    if (!Number.isFinite(p.adet) || p.adet <= 0)
      throw new HesaplamaHatasi(`"${p.label}" parçasının adedi 0'dan büyük bir tam sayı olmalı.`);
  }

  sonuc.parcalar = girdi.parcalar;
  sonuc.profilOzet = profilOzetOlustur(girdi.parcalar);
  return sonuc;
}
