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

test("duvar paneli: kaplama türü belirtilmezse sac kalemi eklenmez (çıplak karkas)", () => {
  const sonuc = calculateWallPanel({
    genislikMm: 3000,
    yukseklikMm: 2500,
    dikmeAraligiHedefMm: 600,
    ustProfilKey: "ray",
    altProfilKey: "ray",
    dikmeProfilKey: "dikme",
  });
  assert.equal(sonuc.sacKalemleri.length, 0);
  assert.equal(sonuc.ozetDegerler.disKaplamaSiparisAlaniM2, undefined);
  assert.equal(sonuc.ozetDegerler.icKaplamaSiparisAlaniM2, undefined);
});

test("duvar paneli: dış cephe sandviç panel kaplama seçilirse sac kalemi ve sipariş alanı eklenir", () => {
  const sonuc = calculateWallPanel({
    genislikMm: 3000,
    yukseklikMm: 2500,
    dikmeAraligiHedefMm: 600,
    ustProfilKey: "ray",
    altProfilKey: "ray",
    dikmeProfilKey: "dikme",
    disKaplamaTuru: "sandvic_panel",
  });

  const kaplama = sonuc.sacKalemleri.find((s) => s.label.includes("Dış cephe kaplaması"))!;
  assert.ok(kaplama);
  assert.equal(kaplama.boyMm, 2500);
  // 3000mm genişlik / 1000mm faydalı panel genişliği = 3 panel
  assert.equal(kaplama.adet, 3);
  assert.ok(sonuc.ozetDegerler.disKaplamaSiparisAlaniM2! > 0);
  assert.equal(sonuc.ozetDegerler.icKaplamaSiparisAlaniM2, undefined);
  assert.equal(kaplama.materialKey, undefined);
});

test("duvar paneli: dış/iç kaplama malzeme id'leri ayrı ayrı materialKey olarak yansır", () => {
  const sonuc = calculateWallPanel({
    genislikMm: 3000,
    yukseklikMm: 2500,
    dikmeAraligiHedefMm: 600,
    ustProfilKey: "ray",
    altProfilKey: "ray",
    dikmeProfilKey: "dikme",
    disKaplamaTuru: "sandvic_panel",
    disKaplamaMalzemeKey: "10",
    icKaplamaTuru: "alcipan",
    icKaplamaMalzemeKey: "20",
  });

  const dis = sonuc.sacKalemleri.find((s) => s.label.includes("Dış cephe kaplaması"))!;
  const ic = sonuc.sacKalemleri.find((s) => s.label.includes("İç cephe kaplaması"))!;
  assert.equal(dis.materialKey, "10");
  assert.equal(ic.materialKey, "20");
});

test("duvar paneli: içeriden alçıpan dışarıdan petopan - iki kat kaplama aynı anda eklenir", () => {
  const sonuc = calculateWallPanel({
    genislikMm: 3000,
    yukseklikMm: 2500,
    dikmeAraligiHedefMm: 600,
    ustProfilKey: "ray",
    altProfilKey: "ray",
    dikmeProfilKey: "dikme",
    disKaplamaTuru: "petopan",
    icKaplamaTuru: "alcipan",
  });

  const dis = sonuc.sacKalemleri.find((s) => s.label.includes("Dış cephe kaplaması"))!;
  const ic = sonuc.sacKalemleri.find((s) => s.label.includes("İç cephe kaplaması"))!;
  assert.ok(dis);
  assert.ok(ic);
  assert.ok(dis.label.includes("petopan"));
  assert.ok(ic.label.includes("alçıpan"));
  // İki farklı yoğunluk kullanılmalı (petopan hafif EPS sistemi, alçıpan alçı levha)
  assert.notEqual(dis.yogunlukKgM3, ic.yogunlukKgM3);
  assert.ok(sonuc.ozetDegerler.disKaplamaSiparisAlaniM2! > 0);
  assert.ok(sonuc.ozetDegerler.icKaplamaSiparisAlaniM2! > 0);
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

test("duvar paneli: elle düzenlenmiş dikme pozisyonları otomatik yerleşimi geçersiz kılar", () => {
  const sonuc = calculateWallPanel({
    genislikMm: 3000,
    yukseklikMm: 2500,
    dikmeAraligiHedefMm: 600,
    ustProfilKey: "ray",
    altProfilKey: "ray",
    dikmeProfilKey: "dikme",
    dikmePozisyonlariMm: [0, 750, 1500, 2250, 3000], // ortadaki bir dikme kaldırılmış (5 yerine 5 pozisyon, farklı aralık)
  });

  assert.equal(sonuc.ozetDegerler.dikmeSayisi, 5);
  const dikme = sonuc.parcalar.find((p) => p.label === "Dikme")!;
  assert.equal(dikme.adet, 5);
  assert.equal(sonuc.uyarilar.length, 0);
});

test("duvar paneli: elle düzenlenmiş dikme listesinde kenar/boşluk kenarı eksikse uyarı verir", () => {
  const sonuc = calculateWallPanel({
    genislikMm: 3000,
    yukseklikMm: 2500,
    dikmeAraligiHedefMm: 600,
    ustProfilKey: "ray",
    altProfilKey: "ray",
    dikmeProfilKey: "dikme",
    bosluklar: [{ etiket: "Kapı", konumMm: 1000, genislikMm: 900, yukseklikMm: 2100 }],
    // Sol kenarda (0) ve kapının sağ kenarında (1900) dikme yok.
    dikmePozisyonlariMm: [500, 1000, 3000],
  });

  assert.equal(sonuc.ozetDegerler.dikmeSayisi, 3);
  assert.ok(sonuc.uyarilar.some((u) => u.includes("sol kenarında")));
  assert.ok(sonuc.uyarilar.some((u) => u.includes("Kapı")));
});

test("duvar paneli: elle eklenen yatay ara profil doğru uzunlukta parça olarak eklenir", () => {
  const sonuc = calculateWallPanel({
    genislikMm: 3000,
    yukseklikMm: 2500,
    dikmeAraligiHedefMm: 600,
    ustProfilKey: "ray",
    altProfilKey: "ray",
    dikmeProfilKey: "dikme",
    yatayAraProfilleri: [{ yMm: 1000, xBaslangicMm: 600, xBitisMm: 1200 }],
  });

  const yatay = sonuc.parcalar.filter((p) => p.label === "Yatay ara profil");
  assert.equal(yatay.length, 1);
  assert.equal(yatay[0].uzunlukMm, 600);
  assert.equal(yatay[0].profilKey, "dikme");
  assert.equal(sonuc.uyarilar.length, 0);
});

test("duvar paneli: sınırların dışına taşan yatay ara profil yok sayılır ve uyarı verir", () => {
  const sonuc = calculateWallPanel({
    genislikMm: 3000,
    yukseklikMm: 2500,
    dikmeAraligiHedefMm: 600,
    ustProfilKey: "ray",
    altProfilKey: "ray",
    dikmeProfilKey: "dikme",
    yatayAraProfilleri: [
      { yMm: 1000, xBaslangicMm: 2800, xBitisMm: 3400 }, // duvar dışına taşıyor
      { yMm: 3000, xBaslangicMm: 0, xBitisMm: 600 }, // yükseklik dışında
    ],
  });

  assert.equal(sonuc.parcalar.filter((p) => p.label === "Yatay ara profil").length, 0);
  assert.equal(sonuc.uyarilar.length, 2);
});
