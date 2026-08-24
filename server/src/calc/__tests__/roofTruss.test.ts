import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateRoofTruss } from "../roofTruss";
import { HesaplamaHatasi } from "../units";

test("çatı kafesi: temel hesap doğru (Pisagor + kafes sayısı)", () => {
  const sonuc = calculateRoofTruss({
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
    kralKirisiProfilKey: "kral",
  });

  // yarı açıklık 3000, mahya yüksekliği = 3000*0.30 = 900
  assert.equal(sonuc.ozetDegerler.mahyaYuksekligiMm, 900);
  // üst başlık = sqrt(3000^2 + 900^2) ≈ 3132.09
  assert.equal(sonuc.ozetDegerler.ustBaslikUzunlukMm, 3132);

  // 9000/900 = 10 aralık -> 11 kafes
  assert.equal(sonuc.ozetDegerler.araliklarSayisi, 10);
  assert.equal(sonuc.ozetDegerler.kafesSayisi, 11);

  const ustBaslik = sonuc.parcalar.find((p) => p.label === "Üst başlık")!;
  assert.equal(ustBaslik.adet, 22); // 2 * 11

  const altBaslik = sonuc.parcalar.find((p) => p.label === "Alt başlık")!;
  assert.equal(altBaslik.uzunlukMm, 6000);
  assert.equal(altBaslik.adet, 11);

  const kralKirisi = sonuc.parcalar.find((p) => p.label === "Kral kirişi")!;
  assert.equal(kralKirisi.uzunlukMm, 900);
  assert.equal(kralKirisi.adet, 11);

  // Her kafes 2 mesnet noktası, plaka başına 4 ankraj
  assert.equal(sonuc.sacKalemleri[0].adet, 22);
  assert.equal(sonuc.baglantiKalemleri[0].adet, 88);
});

test("çatı kafesi: diyagonal sayısı girilip profili girilmezse hata verir", () => {
  assert.throws(
    () =>
      calculateRoofTruss({
        acikligMm: 6000,
        egimYuzde: 30,
        catiUzunluguMm: 9000,
        kafesAraligiHedefMm: 900,
        ustBaslikProfilKey: "ust",
        altBaslikProfilKey: "alt",
        diyagonalSayisi: 2,
      }),
    HesaplamaHatasi
  );
});

test("çatı kafesi: geniş açıklıkta diyagonal yoksa uyarı üretir", () => {
  const sonuc = calculateRoofTruss({
    acikligMm: 10000,
    egimYuzde: 30,
    catiUzunluguMm: 5000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
  });
  assert.ok(sonuc.uyarilar.some((u) => u.includes("çapraz")));
});

test("çatı kafesi: geçersiz girdilerde hata fırlatır", () => {
  assert.throws(
    () =>
      calculateRoofTruss({
        acikligMm: -1,
        egimYuzde: 30,
        catiUzunluguMm: 9000,
        kafesAraligiHedefMm: 900,
        ustBaslikProfilKey: "ust",
        altBaslikProfilKey: "alt",
      }),
    HesaplamaHatasi
  );
});
