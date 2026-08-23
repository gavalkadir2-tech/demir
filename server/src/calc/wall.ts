// Çelik Duvar Paneli hesaplama motoru (LGS/çelik karkas duvar - basitleştirilmiş).
// Prefabrik yapıların temel yapı taşı: dikmeler (stud) + üst/alt ray (track),
// isteğe bağlı kapı/pencere benzeri boşluklar (lento ile çerçevelenir).
//
// Basitleştirme notu: gerçek LGS detaylandırmasında boşluk kenarlarına hem "king stud"
// (tam boy) hem "jack stud" (kısa, lentoyu taşıyan) olmak üzere çift dikme konur. Bu motor
// sadeleştirme amacıyla her boşluk kenarına tek, tam yükseklikte bir "kenar dikmesi" koyar;
// sahada ustanın çift dikme uygulaması gerekebilir.

import { HesaplamaHatasi } from "./units";
import { HesaplananParca, UrunHesapSonucu, bosSonuc, profilOzetOlustur } from "./types";

export interface DuvarBosluk {
  /** Boşluğun adı, örn. "Kapı", "Pencere" */
  etiket: string;
  /** Duvarın sol kenarından boşluğun sol kenarına mesafe (mm) */
  konumMm: number;
  genislikMm: number;
  /** Boşluk yüksekliği, tabandan (mm) */
  yukseklikMm: number;
}

export interface DuvarPaneliGirdi {
  /** Duvar genişliği/uzunluğu (mm) */
  genislikMm: number;
  /** Duvar yüksekliği (mm) */
  yukseklikMm: number;
  /** Hedeflenen dikme aralığı (mm), örn. 600 */
  dikmeAraligiHedefMm: number;
  /** Üst ray profil kesiti */
  ustProfilKey: string;
  /** Alt ray profil kesiti */
  altProfilKey: string;
  /** Dikme profil kesiti */
  dikmeProfilKey: string;
  /** Lento (boşluk üstü) profil kesiti - verilmezse dikme profili kullanılır */
  lentoProfilKey?: string;
  /** Lento'nun boşluk kenarlarından taşma payı (mm), oturma payı için */
  lentoTasmaMm?: number;
  bosluklar?: DuvarBosluk[];
}

const VARSAYILAN = {
  lentoTasmaMm: 100,
};

export function calculateWallPanel(girdi: DuvarPaneliGirdi): UrunHesapSonucu {
  const { genislikMm, yukseklikMm, dikmeAraligiHedefMm, ustProfilKey, altProfilKey, dikmeProfilKey } = girdi;
  const lentoProfilKey = girdi.lentoProfilKey ?? dikmeProfilKey;
  const lentoTasmaMm = girdi.lentoTasmaMm ?? VARSAYILAN.lentoTasmaMm;
  const bosluklar = girdi.bosluklar ?? [];

  if (genislikMm <= 0) throw new HesaplamaHatasi("Duvar genişliği 0'dan büyük olmalı.");
  if (yukseklikMm <= 0) throw new HesaplamaHatasi("Duvar yüksekliği 0'dan büyük olmalı.");
  if (dikmeAraligiHedefMm <= 0) throw new HesaplamaHatasi("Dikme aralığı 0'dan büyük olmalı.");
  if (!ustProfilKey || !altProfilKey || !dikmeProfilKey)
    throw new HesaplamaHatasi("Üst ray, alt ray ve dikme profili seçilmelidir.");

  const siraliBosluklar = [...bosluklar].sort((a, b) => a.konumMm - b.konumMm);
  for (const b of siraliBosluklar) {
    if (b.genislikMm <= 0 || b.yukseklikMm <= 0) throw new HesaplamaHatasi(`"${b.etiket}" boşluğunun ölçüleri 0'dan büyük olmalı.`);
    if (b.konumMm < 0 || b.konumMm + b.genislikMm > genislikMm)
      throw new HesaplamaHatasi(`"${b.etiket}" boşluğu duvar sınırlarının dışına taşıyor.`);
    if (b.yukseklikMm > yukseklikMm)
      throw new HesaplamaHatasi(`"${b.etiket}" boşluğunun yüksekliği duvar yüksekliğinden fazla olamaz.`);
  }
  for (let i = 1; i < siraliBosluklar.length; i++) {
    if (siraliBosluklar[i].konumMm < siraliBosluklar[i - 1].konumMm + siraliBosluklar[i - 1].genislikMm) {
      throw new HesaplamaHatasi(`"${siraliBosluklar[i - 1].etiket}" ve "${siraliBosluklar[i].etiket}" boşlukları çakışıyor.`);
    }
  }

  const sonuc = bosSonuc();

  const araliklarSayisi = Math.max(1, Math.ceil(genislikMm / dikmeAraligiHedefMm));
  const gercekAralikMm = genislikMm / araliklarSayisi;

  if (gercekAralikMm > 800) {
    sonuc.uyarilar.push(
      `Dikme aralığı ${gercekAralikMm.toFixed(0)} mm, LGS duvar karkası için önerilen 600 mm sınırını aşıyor. Aralığı azaltmayı düşünün.`
    );
  }

  // Temel (eşit aralıklı) dikme pozisyonları.
  const temelPozisyonlar = Array.from({ length: araliklarSayisi + 1 }, (_, i) => Math.round(i * gercekAralikMm));

  // Boşluk aralığına denk gelen temel dikmeleri çıkar, kenarlara dikme ekle.
  const EPSILON = 1;
  let dikmePozisyonlari = temelPozisyonlar.filter(
    (x) => !siraliBosluklar.some((b) => x > b.konumMm + EPSILON && x < b.konumMm + b.genislikMm - EPSILON)
  );
  for (const b of siraliBosluklar) {
    for (const kenar of [b.konumMm, b.konumMm + b.genislikMm]) {
      if (!dikmePozisyonlari.some((x) => Math.abs(x - kenar) < EPSILON)) {
        dikmePozisyonlari.push(Math.round(kenar));
      }
    }
  }
  dikmePozisyonlari.sort((a, b) => a - b);

  const parcalar: HesaplananParca[] = [];

  parcalar.push({
    label: "Dikme",
    profilKey: dikmeProfilKey,
    uzunlukMm: yukseklikMm,
    adet: dikmePozisyonlari.length,
    not:
      siraliBosluklar.length > 0
        ? "Boşluk kenarlarındaki dikmeler basitleştirilmiştir; sahada çift dikme (king/jack stud) gerekebilir."
        : undefined,
  });

  parcalar.push({ label: "Üst ray", profilKey: ustProfilKey, uzunlukMm: Math.round(genislikMm), adet: 1 });

  // Alt ray: kapı/boşluk aralıklarında kesintiye uğrar.
  const altRaySegmentleri: { baslangic: number; bitis: number }[] = [];
  let imlec = 0;
  for (const b of siraliBosluklar) {
    if (b.konumMm > imlec) altRaySegmentleri.push({ baslangic: imlec, bitis: b.konumMm });
    imlec = Math.max(imlec, b.konumMm + b.genislikMm);
  }
  if (imlec < genislikMm) altRaySegmentleri.push({ baslangic: imlec, bitis: genislikMm });
  if (altRaySegmentleri.length === 0 && siraliBosluklar.length === 0) {
    altRaySegmentleri.push({ baslangic: 0, bitis: genislikMm });
  }

  for (const seg of altRaySegmentleri) {
    const uzunluk = Math.round(seg.bitis - seg.baslangic);
    if (uzunluk <= 0) continue;
    parcalar.push({ label: "Alt ray", profilKey: altProfilKey, uzunlukMm: uzunluk, adet: 1 });
  }

  for (const b of siraliBosluklar) {
    parcalar.push({
      label: `Lento (${b.etiket})`,
      profilKey: lentoProfilKey,
      uzunlukMm: Math.round(b.genislikMm + lentoTasmaMm),
      adet: 1,
      not: `${b.etiket} boşluğu üstü, taban seviyesinden ${Math.round(b.yukseklikMm)} mm yükseklikte.`,
    });
  }

  sonuc.parcalar = parcalar;
  sonuc.profilOzet = profilOzetOlustur(parcalar);

  const duvarAlaniM2 = (genislikMm / 1000) * (yukseklikMm / 1000);
  const dubelSayisi = 2 * Math.ceil(genislikMm / 500); // üst + alt ray, ~500mm aralıkla

  sonuc.baglantiKalemleri.push({ label: "Ray dübeli", birim: "adet", adet: dubelSayisi });

  sonuc.ozetDegerler = {
    dikmeSayisi: dikmePozisyonlari.length,
    araliklarSayisi,
    gercekAralikMm: Math.round(gercekAralikMm * 100) / 100,
    duvarAlaniM2: Math.round(duvarAlaniM2 * 100) / 100,
    bosluklarSayisi: siraliBosluklar.length,
  };

  return sonuc;
}
