import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateRailing } from "../railing";
import { optimizeCutting, expandPieces } from "../cutting";
import { HesaplamaHatasi } from "../units";

// Spesifikasyon madde 30 - test senaryosu:
// Uzunluk 12000mm, yükseklik 1200mm, dikme aralığı 1500mm, üst/alt/dikme 40x40x2,
// ara kayıt 20x20x2, standart profil 6000mm, kesim payı 3mm.
test("korkuluk: 12m test senaryosu - dikme ve parça sayıları doğru", () => {
  const sonuc = calculateRailing({
    toplamUzunlukMm: 12000,
    yukseklikMm: 1200,
    dikmeAraligiHedefMm: 1500,
    ustProfilKey: "40x40x2",
    altProfilKey: "40x40x2",
    dikmeProfilKey: "40x40x2",
    araKayitProfilKey: "20x20x2",
    araKayitSayisi: 1,
  });

  assert.equal(sonuc.ozetDegerler.araliklarSayisi, 8);
  assert.equal(sonuc.ozetDegerler.dikmeSayisi, 9);
  assert.equal(sonuc.ozetDegerler.gercekAralikMm, 1500);

  const dikme = sonuc.parcalar.find((p) => p.label === "Dikme")!;
  assert.equal(dikme.uzunlukMm, 1200);
  assert.equal(dikme.adet, 9);

  const ust = sonuc.parcalar.find((p) => p.label === "Üst profil")!;
  assert.equal(ust.uzunlukMm, 1500);
  assert.equal(ust.adet, 8);

  const alt = sonuc.parcalar.find((p) => p.label === "Alt profil")!;
  assert.equal(alt.uzunlukMm, 1500);
  assert.equal(alt.adet, 8);

  const araKayit = sonuc.parcalar.find((p) => p.label === "Ara kayıt 1")!;
  assert.equal(araKayit.uzunlukMm, 1500);
  assert.equal(araKayit.adet, 8);

  // 40x40x2 toplam metraj: dikme(9*1200=10800) + üst(8*1500=12000) + alt(8*1500=12000) = 34800mm = 34.8m
  const ozet4040 = sonuc.profilOzet.find((p) => p.profilKey === "40x40x2")!;
  assert.equal(ozet4040.toplamMetre, 34.8);

  // 20x20x2 toplam metraj: 8*1500=12000mm = 12m
  const ozet2020 = sonuc.profilOzet.find((p) => p.profilKey === "20x20x2")!;
  assert.equal(ozet2020.toplamMetre, 12);

  // Taban plakası ve ankraj: 9 dikme, plaka başına 4 ankraj = 36
  assert.equal(sonuc.ozetDegerler.tabanPlakaSayisi, 9);
  assert.equal(sonuc.ozetDegerler.ankrajToplam, 36);
});

test("korkuluk: kesim planı ve fire doğru hesaplanıyor (40x40x2, 6000mm standart, 3mm kesim payı)", () => {
  const sonuc = calculateRailing({
    toplamUzunlukMm: 12000,
    yukseklikMm: 1200,
    dikmeAraligiHedefMm: 1500,
    ustProfilKey: "40x40x2",
    altProfilKey: "40x40x2",
    dikmeProfilKey: "40x40x2",
  });

  const parcalar40 = sonuc.parcalar.filter((p) => p.profilKey === "40x40x2");
  const pieces = expandPieces(parcalar40.map((p) => ({ uzunlukMm: p.uzunlukMm, adet: p.adet })));
  // 9x1200 (dikme) + 8x1500 (üst) + 8x1500 (alt) = 25 parça
  assert.equal(pieces.length, 25);

  const kesim = optimizeCutting(pieces, 6000, 3);
  assert.ok(kesim.totalBars > 0);
  // Hiçbir çubuğun kullanılan+fire toplamı 6000mm'yi aşmamalı
  for (const bar of kesim.bars) {
    const kullanilan = bar.cuts.reduce((s, c) => s + c, 0) + (bar.cuts.length - 1) * 3;
    assert.ok(kullanilan + bar.wasteMm <= 6000 + 1e-6);
    assert.ok(Math.abs(kullanilan + bar.wasteMm - 6000) < 1e-6);
  }
  // Toplam kesilen parça sayısı 25 olmalı
  const toplamParca = kesim.bars.reduce((s, b) => s + b.cuts.length, 0);
  assert.equal(toplamParca, 25);
});

test("korkuluk: geçersiz girdilerde hata fırlatır", () => {
  assert.throws(
    () =>
      calculateRailing({
        toplamUzunlukMm: -1,
        yukseklikMm: 1200,
        dikmeAraligiHedefMm: 1500,
        ustProfilKey: "a",
        altProfilKey: "a",
        dikmeProfilKey: "a",
      }),
    HesaplamaHatasi
  );

  assert.throws(
    () =>
      calculateRailing({
        toplamUzunlukMm: 1000,
        yukseklikMm: 1200,
        dikmeAraligiHedefMm: 1500,
        ustProfilKey: "a",
        altProfilKey: "a",
        dikmeProfilKey: "a",
        araKayitSayisi: 1, // ara kayıt profili verilmedi
      }),
    HesaplamaHatasi
  );
});

test("korkuluk: elle düzenlenmiş dikme pozisyonları eşit olmayan gözlerde ayrı parça üretir", () => {
  const sonuc = calculateRailing({
    toplamUzunlukMm: 3000,
    yukseklikMm: 1000,
    dikmeAraligiHedefMm: 1000,
    ustProfilKey: "40x40x2",
    altProfilKey: "40x40x2",
    dikmeProfilKey: "40x40x2",
    dikmePozisyonlariMm: [0, 1000, 1500, 3000], // eşit olmayan 3 göz
  });

  assert.equal(sonuc.ozetDegerler.dikmeSayisi, 4);
  const ustParcalari = sonuc.parcalar.filter((p) => p.label === "Üst profil");
  assert.equal(ustParcalari.length, 3);
  assert.deepEqual(
    ustParcalari.map((p) => p.uzunlukMm).sort((a, b) => a - b),
    [500, 1000, 1500]
  );
  assert.equal(sonuc.uyarilar.length, 0);
});

test("korkuluk: elle düzenlenmiş dikme listesinde eşit gözler yine tek gruplu parça üretir", () => {
  const sonuc = calculateRailing({
    toplamUzunlukMm: 3000,
    yukseklikMm: 1000,
    dikmeAraligiHedefMm: 1000,
    ustProfilKey: "40x40x2",
    altProfilKey: "40x40x2",
    dikmeProfilKey: "40x40x2",
    dikmePozisyonlariMm: [0, 1000, 2000, 3000], // otomatik yerleşimle aynı, eşit gözler
  });

  const ustParcalari = sonuc.parcalar.filter((p) => p.label === "Üst profil");
  assert.equal(ustParcalari.length, 1);
  assert.equal(ustParcalari[0].adet, 3);
});
