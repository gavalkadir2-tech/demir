import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateSpiralStairs } from "../spiralStairs";
import { HesaplamaHatasi } from "../units";

test("döner merdiven: temel hesap doğru (basamak sayısı, açı, radyal uzunluk)", () => {
  const sonuc = calculateSpiralStairs({
    katYuksekligiMm: 2800,
    icCapMm: 200,
    disCapMm: 1400,
    toplamDonusDerecesi: 360,
    basamakYuksekligiHedefMm: 200,
    merkezKolonProfilKey: "kolon",
    basamakDestekProfilKey: "destek",
  });

  // 2800 / 200 = 14 basamak
  assert.equal(sonuc.ozetDegerler.basamakSayisi, 14);
  assert.equal(sonuc.ozetDegerler.gercekBasamakYuksekligiMm, 200);
  // 360 / 14 = 25.71 derece
  assert.ok(Math.abs(sonuc.ozetDegerler.basamakAcisiDerece - 25.71) < 0.1);
  // (1400-200)/2 = 600
  assert.equal(sonuc.ozetDegerler.radyalUzunlukMm, 600);

  const kolon = sonuc.parcalar.find((p) => p.label === "Merkez kolon")!;
  assert.equal(kolon.uzunlukMm, 2800);
  assert.equal(kolon.adet, 1);

  const destek = sonuc.parcalar.find((p) => p.label === "Basamak desteği (konsol)")!;
  assert.equal(destek.uzunlukMm, 600);
  assert.equal(destek.adet, 14);

  const basamakPlakasi = sonuc.sacKalemleri.find((s) => s.label.includes("Basamak plakası"))!;
  assert.equal(basamakPlakasi.adet, 14);
  assert.equal(basamakPlakasi.enMm, 600);
});

test("döner merdiven: korkuluk verilirse dikme + spiral üst profil eklenir", () => {
  const sonuc = calculateSpiralStairs({
    katYuksekligiMm: 2800,
    icCapMm: 200,
    disCapMm: 1400,
    toplamDonusDerecesi: 360,
    basamakYuksekligiHedefMm: 200,
    merkezKolonProfilKey: "kolon",
    basamakDestekProfilKey: "destek",
    korkulukVar: true,
    korkulukYuksekligiMm: 900,
    korkulukDikmeProfilKey: "korkulukDikme",
    korkulukUstProfilKey: "korkulukUst",
  });

  const dikme = sonuc.parcalar.find((p) => p.label === "Korkuluk dikmesi")!;
  assert.equal(dikme.adet, 14); // basamakSayisi ile aynı
  assert.equal(dikme.uzunlukMm, 900);

  const ustProfil = sonuc.parcalar.find((p) => p.label.includes("Korkuluk üst profili"))!;
  // pi * 1400 * (360/360) = 4398.2mm
  assert.ok(Math.abs(ustProfil.uzunlukMm - 4399) < 2);
  assert.equal(sonuc.ozetDegerler.korkulukDikmeSayisi, 14);
});

test("döner merdiven: korkuluk yüksekliği girilip profil seçilmezse hata verir", () => {
  assert.throws(
    () =>
      calculateSpiralStairs({
        katYuksekligiMm: 2800,
        icCapMm: 200,
        disCapMm: 1400,
        toplamDonusDerecesi: 360,
        basamakYuksekligiHedefMm: 200,
        merkezKolonProfilKey: "kolon",
        basamakDestekProfilKey: "destek",
        korkulukVar: true,
        korkulukYuksekligiMm: 900,
      }),
    HesaplamaHatasi
  );
});

test("döner merdiven: dış çap iç çaptan küçük/eşitse hata verir", () => {
  assert.throws(
    () =>
      calculateSpiralStairs({
        katYuksekligiMm: 2800,
        icCapMm: 1000,
        disCapMm: 1000,
        toplamDonusDerecesi: 360,
        basamakYuksekligiHedefMm: 200,
        merkezKolonProfilKey: "kolon",
        basamakDestekProfilKey: "destek",
      }),
    HesaplamaHatasi
  );
});

test("döner merdiven: 270 derece kısmi dönüşte basamak açısı doğru hesaplanır", () => {
  const sonuc = calculateSpiralStairs({
    katYuksekligiMm: 2400,
    icCapMm: 150,
    disCapMm: 1200,
    toplamDonusDerecesi: 270,
    basamakYuksekligiHedefMm: 200,
    merkezKolonProfilKey: "kolon",
    basamakDestekProfilKey: "destek",
  });
  // 2400/200 = 12 basamak, 270/12 = 22.5 derece
  assert.equal(sonuc.ozetDegerler.basamakSayisi, 12);
  assert.equal(sonuc.ozetDegerler.basamakAcisiDerece, 22.5);
});

test("döner merdiven: geçersiz girdilerde hata fırlatır", () => {
  assert.throws(
    () =>
      calculateSpiralStairs({
        katYuksekligiMm: 0,
        icCapMm: 200,
        disCapMm: 1400,
        toplamDonusDerecesi: 360,
        basamakYuksekligiHedefMm: 200,
        merkezKolonProfilKey: "kolon",
        basamakDestekProfilKey: "destek",
      }),
    HesaplamaHatasi
  );
  assert.throws(
    () =>
      calculateSpiralStairs({
        katYuksekligiMm: 2800,
        icCapMm: 200,
        disCapMm: 1400,
        toplamDonusDerecesi: 360,
        basamakYuksekligiHedefMm: 200,
        merkezKolonProfilKey: "",
        basamakDestekProfilKey: "destek",
      }),
    HesaplamaHatasi
  );
});
