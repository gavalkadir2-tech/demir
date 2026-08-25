// Sundurma (kanopi) hesaplama motoru. bkz. spesifikasyon madde 7.

import { HesaplamaHatasi } from "./units";
import { HesaplananParca, UrunHesapSonucu, bosSonuc, profilOzetOlustur } from "./types";
import { KAPLAMA_BILGI, KaplamaTuru, kaplamaHesapla } from "./kaplama";

export interface SundurmaGirdi {
  /** En (mm) - ön cephe genişliği */
  genislikMm: number;
  /** Boy (mm) - yatay projeksiyon / çıkma derinliği */
  boyMm: number;
  /** Alçak kenar yüksekliği (mm) */
  yukseklikMm: number;
  /** Çatı eğimi (%) örn. 10 */
  egimYuzde: number;
  /** Dikme (ön ayak) sayısı, en az 2 */
  dikmeSayisi: number;
  /** Ana taşıyıcı (kiriş, çıkma yönünde) profil kesiti */
  anaTasiyiciProfilKey: string;
  /** Ara taşıyıcı (aşık, en yönünde) profil kesiti */
  araTasiyiciProfilKey: string;
  /** Dikme profil kesiti */
  dikmeProfilKey: string;
  /** Çapraz (rüzgar bağlantısı) profil kesiti - opsiyonel */
  caprazProfilKey?: string;
  /** Aşıklar arası hedef aralık (mm), varsayılan 1000 */
  asikAraligiHedefMm?: number;
  /** Çatı kaplama türü */
  kaplamaTuru?: KaplamaTuru;
  kaplamaKalinlikMm?: number;
  plakaEnMm?: number;
  plakaBoyMm?: number;
  plakaKalinlikMm?: number;
  /** Taban plakasının alınacağı sac Material id'si (opsiyonel) - verilirse teklif maliyetine ve
   * iş onayında stok düşümüne dahil edilir. */
  plakaMalzemeKey?: string;
  ankrajSayisiPerPlaka?: number;
}

const VARSAYILAN = {
  asikAraligiHedefMm: 1000,
  kaplamaTuru: "trapez_sac" as const,
  plakaEnMm: 120,
  plakaBoyMm: 120,
  plakaKalinlikMm: 10,
  ankrajSayisiPerPlaka: 4,
};

export function calculateCanopy(girdi: SundurmaGirdi): UrunHesapSonucu {
  const { genislikMm, boyMm, yukseklikMm, egimYuzde, dikmeSayisi, anaTasiyiciProfilKey, araTasiyiciProfilKey, dikmeProfilKey } =
    girdi;

  if (genislikMm <= 0) throw new HesaplamaHatasi("En 0'dan büyük olmalı.");
  if (boyMm <= 0) throw new HesaplamaHatasi("Boy (çıkma) 0'dan büyük olmalı.");
  if (yukseklikMm <= 0) throw new HesaplamaHatasi("Yükseklik 0'dan büyük olmalı.");
  if (egimYuzde < 0) throw new HesaplamaHatasi("Eğim negatif olamaz.");
  if (dikmeSayisi < 2) throw new HesaplamaHatasi("Dikme sayısı en az 2 olmalı.");
  if (!anaTasiyiciProfilKey || !araTasiyiciProfilKey || !dikmeProfilKey)
    throw new HesaplamaHatasi("Ana taşıyıcı, ara taşıyıcı ve dikme profilleri seçilmelidir.");

  const asikAraligiHedefMm = girdi.asikAraligiHedefMm ?? VARSAYILAN.asikAraligiHedefMm;
  const kaplamaTuru = girdi.kaplamaTuru ?? VARSAYILAN.kaplamaTuru;
  const plakaEnMm = girdi.plakaEnMm ?? VARSAYILAN.plakaEnMm;
  const plakaBoyMm = girdi.plakaBoyMm ?? VARSAYILAN.plakaBoyMm;
  const plakaKalinlikMm = girdi.plakaKalinlikMm ?? VARSAYILAN.plakaKalinlikMm;
  const ankrajSayisiPerPlaka = girdi.ankrajSayisiPerPlaka ?? VARSAYILAN.ankrajSayisiPerPlaka;

  const sonuc = bosSonuc();

  if (egimYuzde < 5) {
    sonuc.uyarilar.push("Eğim %5'in altında; su tahliyesi için en az %5 eğim önerilir.");
  }
  if (egimYuzde > 45) {
    sonuc.uyarilar.push("Eğim %45'in üzerinde; bu değer olağan sundurma uygulamaları için oldukça yüksek.");
  }

  const egimRad = Math.atan(egimYuzde / 100);
  const kirisUzunlukMm = boyMm / Math.cos(egimRad);

  const parcalar: HesaplananParca[] = [];

  parcalar.push({
    label: "Dikme",
    profilKey: dikmeProfilKey,
    uzunlukMm: yukseklikMm,
    adet: dikmeSayisi,
  });

  parcalar.push({
    label: "Ana kiriş (taşıyıcı)",
    profilKey: anaTasiyiciProfilKey,
    uzunlukMm: Math.ceil(kirisUzunlukMm),
    adet: dikmeSayisi,
    not: "Çatı eğimine göre hesaplanan diyagonal uzunluk.",
  });

  const asikSatirSayisi = Math.max(2, Math.ceil(kirisUzunlukMm / asikAraligiHedefMm) + 1);
  parcalar.push({
    label: "Aşık (ara taşıyıcı)",
    profilKey: araTasiyiciProfilKey,
    uzunlukMm: Math.round(genislikMm),
    adet: asikSatirSayisi,
  });

  if (girdi.caprazProfilKey) {
    const caprazUzunlukMm = Math.sqrt((yukseklikMm * 0.3) ** 2 + (kirisUzunlukMm * 0.3) ** 2);
    parcalar.push({
      label: "Çapraz (rüzgar bağlantısı)",
      profilKey: girdi.caprazProfilKey,
      uzunlukMm: Math.ceil(caprazUzunlukMm),
      adet: dikmeSayisi,
      not: "Yaklaşık diyagonal destek uzunluğu, sahada son ayar gerekebilir.",
    });
  }

  sonuc.parcalar = parcalar;
  sonuc.profilOzet = profilOzetOlustur(parcalar);

  sonuc.sacKalemleri.push({
    label: "Taban plakası",
    enMm: plakaEnMm,
    boyMm: plakaBoyMm,
    kalinlikMm: plakaKalinlikMm,
    materialKey: girdi.plakaMalzemeKey,
    adet: dikmeSayisi,
  });

  const catiAlaniM2 = (genislikMm / 1000) * (kirisUzunlukMm / 1000);
  let kaplamaOzet: ReturnType<typeof kaplamaHesapla> | null = null;
  if (kaplamaTuru !== "yok") {
    const kaplamaBilgisi = KAPLAMA_BILGI[kaplamaTuru];
    kaplamaOzet = kaplamaHesapla(kaplamaTuru, kirisUzunlukMm, genislikMm);
    sonuc.sacKalemleri.push({
      label: `Çatı kaplaması (${kaplamaBilgisi.label})`,
      enMm: kaplamaBilgisi.faydaliGenislikMm,
      boyMm: Math.ceil(kirisUzunlukMm),
      kalinlikMm: girdi.kaplamaKalinlikMm ?? kaplamaBilgisi.varsayilanKalinlikMm,
      adet: kaplamaOzet.panelSayisi,
      yogunlukKgM3: kaplamaBilgisi.efektifYogunlukKgM3,
      not: `${kaplamaOzet.panelSayisi} panel (${kaplamaBilgisi.faydaliGenislikMm} mm faydalı genişlik) yan yana; net alan ${kaplamaOzet.netAlaniM2} m², sipariş edilecek alan (fire dahil, ~%${kaplamaBilgisi.tipikFireYuzde} bindirme/kesim payı) ${kaplamaOzet.siparisAlaniM2} m².`,
    });
  }

  sonuc.baglantiKalemleri.push({
    label: "Ankraj (kimyasal/mekanik dübel)",
    birim: "adet",
    adet: dikmeSayisi * ankrajSayisiPerPlaka,
  });

  sonuc.ozetDegerler = {
    dikmeSayisi,
    kirisUzunlukMm: Math.round(kirisUzunlukMm),
    egimDerece: Math.round((egimRad * 180) / Math.PI * 100) / 100,
    catiAlaniM2: Math.round(catiAlaniM2 * 100) / 100,
    asikSatirSayisi,
    ...(kaplamaOzet
      ? {
          kaplamaSiparisAlaniM2: kaplamaOzet.siparisAlaniM2,
          kaplamaFireM2: kaplamaOzet.fireM2,
          kaplamaFireYuzde: kaplamaOzet.fireYuzde,
        }
      : {}),
  };

  return sonuc;
}
