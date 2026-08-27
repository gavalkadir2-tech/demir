import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateDoor } from "../door";
import { calculateStairs } from "../stairs";
import { calculateCanopy } from "../canopy";
import { HesaplamaHatasi } from "../units";

// Spesifikasyon madde 8 örneği: kasa 2x2200, 2x1000; kanat 2x2150, 2x950.
test("kapı: örnek ölçülerle kasa/kanat parçaları doğru", () => {
  const sonuc = calculateDoor({
    genislikMm: 1000,
    yukseklikMm: 2200,
    kasaProfilKey: "40x40x2",
    kanatProfilKey: "40x40x2",
  });

  const kasaDikey = sonuc.parcalar.find((p) => p.label === "Kasa (dikey)")!;
  assert.equal(kasaDikey.uzunlukMm, 2200);
  assert.equal(kasaDikey.adet, 2);

  const kasaYatay = sonuc.parcalar.find((p) => p.label === "Kasa (yatay)")!;
  assert.equal(kasaYatay.uzunlukMm, 1000);
  assert.equal(kasaYatay.adet, 2);

  const kanatDikey = sonuc.parcalar.find((p) => p.label === "Kanat (dikey)")!;
  assert.equal(kanatDikey.uzunlukMm, 2150);

  const kanatYatay = sonuc.parcalar.find((p) => p.label === "Kanat (yatay)")!;
  assert.equal(kanatYatay.uzunlukMm, 950);
});

test("merdiven: basamak sayısı ve adım formülü kontrolü", () => {
  const sonuc = calculateStairs({
    katYuksekligiMm: 3000,
    genislikMm: 900,
    basamakYuksekligiHedefMm: 180,
    toplamDerinlikMm: 4590, // 17 basamak x 270mm
    tasiyiciProfilKey: "100x50x3",
  });
  // 3000/180 = 16.67 -> round -> 17 basamak
  assert.equal(sonuc.ozetDegerler.basamakSayisi, 17);
  assert.ok(sonuc.ozetDegerler.gercekBasamakYuksekligiMm > 170 && sonuc.ozetDegerler.gercekBasamakYuksekligiMm < 180);
  // toplamDerinlikMm/basamakSayisi = 4590/17 = 270
  assert.equal(sonuc.ozetDegerler.basamakDerinligiMm, 270);
  // kiriş (hipotenüs) ve eğim açısı da hesaplanmalı
  assert.equal(sonuc.ozetDegerler.kosegenMm, Math.round(Math.sqrt(3000 ** 2 + 4590 ** 2)));
  assert.ok(sonuc.ozetDegerler.egimAcisiDerece > 0 && sonuc.ozetDegerler.egimAcisiDerece < 90);
});

test("merdiven: uygunsuz geometri uyarı üretir", () => {
  const sonuc = calculateStairs({
    katYuksekligiMm: 3000,
    genislikMm: 900,
    basamakYuksekligiHedefMm: 260, // çok yüksek rıht
    toplamDerinlikMm: 2400, // 12 basamak x 200mm
    tasiyiciProfilKey: "100x50x3",
  });
  assert.ok(sonuc.uyarilar.length > 0);
});

test("sundurma: çatı alanı ve eğim hesaplanır", () => {
  const sonuc = calculateCanopy({
    genislikMm: 4000,
    boyMm: 3000,
    yukseklikMm: 2200,
    egimYuzde: 10,
    dikmeSayisi: 3,
    anaTasiyiciProfilKey: "80x40x3",
    araTasiyiciProfilKey: "40x40x2",
    dikmeProfilKey: "80x80x3",
  });
  assert.ok(sonuc.ozetDegerler.catiAlaniM2 > 12); // eğim nedeniyle 4*3=12'den biraz fazla
  assert.equal(sonuc.ozetDegerler.dikmeSayisi, 3);
});

test("sundurma: kaplamaMalzemeKey verilirse kaplama sac kalemine materialKey olarak yansır", () => {
  const sonuc = calculateCanopy({
    genislikMm: 4000,
    boyMm: 3000,
    yukseklikMm: 2200,
    egimYuzde: 10,
    dikmeSayisi: 3,
    anaTasiyiciProfilKey: "80x40x3",
    araTasiyiciProfilKey: "40x40x2",
    dikmeProfilKey: "80x80x3",
    kaplamaMalzemeKey: "7",
  });
  const kaplama = sonuc.sacKalemleri.find((s) => s.label.includes("kaplaması"))!;
  assert.ok(kaplama);
  assert.equal(kaplama.materialKey, "7");
});

test("kapı: kanat boşluğu ölçüden büyükse hata verir", () => {
  assert.throws(
    () =>
      calculateDoor({
        genislikMm: 40,
        yukseklikMm: 2200,
        kasaProfilKey: "a",
        kanatProfilKey: "a",
        kanatBosluguMm: 50,
      }),
    HesaplamaHatasi
  );
});
