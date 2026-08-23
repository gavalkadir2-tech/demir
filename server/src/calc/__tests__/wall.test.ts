import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateWallPanel } from "../wall";
import { HesaplamaHatasi } from "../units";

test("duvar paneli: boşluksuz temel hesap doğru", () => {
  const sonuc = calculateWallPanel({
    genislikMm: 3000,
    yukseklikMm: 2500,
    dikmeAraligiHedefMm: 600,
    ustProfilKey: "ray",
    altProfilKey: "ray",
    dikmeProfilKey: "dikme",
  });

  // 3000/600 = 5 aralık -> 6 dikme
  assert.equal(sonuc.ozetDegerler.araliklarSayisi, 5);
  assert.equal(sonuc.ozetDegerler.dikmeSayisi, 6);
  assert.equal(sonuc.ozetDegerler.gercekAralikMm, 600);

  const dikme = sonuc.parcalar.find((p) => p.label === "Dikme")!;
  assert.equal(dikme.adet, 6);
  assert.equal(dikme.uzunlukMm, 2500);

  const ustRay = sonuc.parcalar.find((p) => p.label === "Üst ray")!;
  assert.equal(ustRay.uzunlukMm, 3000);
  assert.equal(ustRay.adet, 1);

  const altRaylar = sonuc.parcalar.filter((p) => p.label === "Alt ray");
  assert.equal(altRaylar.length, 1);
  assert.equal(altRaylar[0].uzunlukMm, 3000);

  assert.equal(sonuc.ozetDegerler.duvarAlaniM2, 7.5);
});

test("duvar paneli: kapı boşluğu alt rayı kesiyor ve lento ekliyor", () => {
  const sonuc = calculateWallPanel({
    genislikMm: 4000,
    yukseklikMm: 2500,
    dikmeAraligiHedefMm: 600,
    ustProfilKey: "ray",
    altProfilKey: "ray",
    dikmeProfilKey: "dikme",
    bosluklar: [{ etiket: "Kapı", konumMm: 1500, genislikMm: 1000, yukseklikMm: 2100 }],
  });

  // Alt ray boşluk nedeniyle iki parçaya bölünmeli: 0-1500 ve 2500-4000
  const altRaylar = sonuc.parcalar.filter((p) => p.label === "Alt ray");
  assert.equal(altRaylar.length, 2);
  assert.equal(altRaylar[0].uzunlukMm, 1500);
  assert.equal(altRaylar[1].uzunlukMm, 1500);

  // Üst ray kesintisiz, tam boy
  const ustRay = sonuc.parcalar.find((p) => p.label === "Üst ray")!;
  assert.equal(ustRay.uzunlukMm, 4000);

  // Lento eklenmiş olmalı, taşma payı dahil (1000 + 100 = 1100)
  const lento = sonuc.parcalar.find((p) => p.label.startsWith("Lento"))!;
  assert.ok(lento);
  assert.equal(lento.uzunlukMm, 1100);

  // Boşluk kenarlarında (1500 ve 2500) dikme olmalı
  assert.equal(sonuc.ozetDegerler.bosluklarSayisi, 1);
});

test("duvar paneli: pencere (yerden yükseklikli boşluk) alt rayı kesmiyor, eşik ekliyor", () => {
  const sonuc = calculateWallPanel({
    genislikMm: 4000,
    yukseklikMm: 2500,
    dikmeAraligiHedefMm: 600,
    ustProfilKey: "ray",
    altProfilKey: "ray",
    dikmeProfilKey: "dikme",
    bosluklar: [{ etiket: "Pencere", konumMm: 1500, genislikMm: 1000, tabanYuksekligiMm: 900, yukseklikMm: 1200 }],
  });

  // Pencere tabana inmediği için alt ray kesintisiz tek parça olmalı
  const altRaylar = sonuc.parcalar.filter((p) => p.label === "Alt ray");
  assert.equal(altRaylar.length, 1);
  assert.equal(altRaylar[0].uzunlukMm, 4000);

  // Hem lento hem eşik olmalı
  assert.ok(sonuc.parcalar.some((p) => p.label === "Lento (Pencere)"));
  assert.ok(sonuc.parcalar.some((p) => p.label === "Eşik (Pencere)"));
});

test("duvar paneli: boşluk üst kotu duvar yüksekliğini aşarsa hata verir", () => {
  assert.throws(
    () =>
      calculateWallPanel({
        genislikMm: 4000,
        yukseklikMm: 2500,
        dikmeAraligiHedefMm: 600,
        ustProfilKey: "ray",
        altProfilKey: "ray",
        dikmeProfilKey: "dikme",
        bosluklar: [{ etiket: "Pencere", konumMm: 1500, genislikMm: 1000, tabanYuksekligiMm: 2000, yukseklikMm: 1000 }],
      }),
    HesaplamaHatasi
  );
});

test("duvar paneli: sınırları aşan boşlukta hata verir", () => {
  assert.throws(
    () =>
      calculateWallPanel({
        genislikMm: 2000,
        yukseklikMm: 2500,
        dikmeAraligiHedefMm: 600,
        ustProfilKey: "ray",
        altProfilKey: "ray",
        dikmeProfilKey: "dikme",
        bosluklar: [{ etiket: "Kapı", konumMm: 1500, genislikMm: 1000, yukseklikMm: 2100 }],
      }),
    HesaplamaHatasi
  );
});

test("duvar paneli: çakışan boşluklarda hata verir", () => {
  assert.throws(
    () =>
      calculateWallPanel({
        genislikMm: 5000,
        yukseklikMm: 2500,
        dikmeAraligiHedefMm: 600,
        ustProfilKey: "ray",
        altProfilKey: "ray",
        dikmeProfilKey: "dikme",
        bosluklar: [
          { etiket: "Kapı", konumMm: 1000, genislikMm: 1000, yukseklikMm: 2100 },
          { etiket: "Pencere", konumMm: 1500, genislikMm: 800, yukseklikMm: 1200 },
        ],
      }),
    HesaplamaHatasi
  );
});
