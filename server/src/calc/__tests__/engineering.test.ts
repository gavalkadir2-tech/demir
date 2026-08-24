import { test } from "node:test";
import assert from "node:assert/strict";
import { kesitOzellikleriHesapla, kirisKontrolEt } from "../engineering";
import { HesaplamaHatasi } from "../units";

test("kesit: kare kutu profil (40x40x2) atalet momenti doğru hesaplanır", () => {
  const kesit = kesitOzellikleriHesapla({ profilSekli: "BOX", widthMm: 40, heightMm: 40, thicknessMm: 2 });
  assert.ok(kesit);
  // Ix = (40*40^3 - 36*36^3) / 12 = 73365.33 mm^4
  assert.ok(Math.abs(kesit!.ixMm4 - 73365.33) < 1);
  assert.equal(kesit!.not, "Kare kutu profil.");
});

test("kesit: dikdörtgen kutu profilde zayıf yön (min boyut) esas alınır", () => {
  const kesit = kesitOzellikleriHesapla({ profilSekli: "BOX", widthMm: 60, heightMm: 40, thicknessMm: 3 });
  const kareEsdeger = kesitOzellikleriHesapla({ profilSekli: "BOX", widthMm: 40, heightMm: 40, thicknessMm: 3 });
  assert.ok(kesit && kareEsdeger);
  // 60x40 profilin zayıf yönü, 40x40 kareninkiyle aynı derinliği kullanmalı (40mm), o yüzden Ix'leri
  // birbirine yakın olmalı (genişlik farkı nedeniyle 60x40 biraz daha büyük).
  assert.ok(kesit!.ixMm4 > kareEsdeger!.ixMm4);
  assert.ok(kesit!.not.includes("zayıf"));
});

test("kesit: dolu yuvarlak demir (Ø12) atalet momenti doğru hesaplanır", () => {
  const kesit = kesitOzellikleriHesapla({ profilSekli: "ROUND_SOLID", widthMm: 12 });
  assert.ok(kesit);
  // Ix = pi*d^4/64 = pi*12^4/64 = 1017.9 mm^4
  assert.ok(Math.abs(kesit!.ixMm4 - 1017.9) < 1);
});

test("kesit: eksik boyut verisiyle null döner (hata fırlatmaz)", () => {
  const kesit = kesitOzellikleriHesapla({ profilSekli: "BOX", widthMm: 40 }); // heightMm/thicknessMm eksik
  assert.equal(kesit, null);
  const kesitSekilsiz = kesitOzellikleriHesapla({});
  assert.equal(kesitSekilsiz, null);
});

test("kiriş kontrolü: basit mesnetli, yayılı yük altında sehim/gerilme doğru hesaplanır", () => {
  const kesit = kesitOzellikleriHesapla({ profilSekli: "BOX", widthMm: 40, heightMm: 40, thicknessMm: 3 })!;
  const sonuc = kirisKontrolEt({
    acikligMm: 1000,
    mesnetTuru: "basit",
    yukTuru: "yayili",
    toplamYukN: 1000, // 1 N/mm
    kesit,
  });
  // δ = 5wL^4/(384EI); w=1 N/mm, L=1000, E=210000, I≈101972mm^4 -> ~0.61mm
  assert.ok(Math.abs(sonuc.maxSehimMm - 0.61) < 0.05);
  assert.equal(sonuc.izinVerilenSehimMm, 5); // L/200 = 1000/200
  assert.equal(sonuc.durum, "uygun");
  assert.ok(sonuc.sehimUygun && sonuc.gerilmeUygun);
});

test("kiriş kontrolü: yetersiz profil/aşırı yükte 'yetersiz' durumu döner", () => {
  const kesit = kesitOzellikleriHesapla({ profilSekli: "ROUND_SOLID", widthMm: 8 })!; // ince, zayıf çubuk
  const sonuc = kirisKontrolEt({
    acikligMm: 3000,
    mesnetTuru: "basit",
    yukTuru: "yayili",
    toplamYukN: 5000, // büyük yük, uzun açıklık, ince profil -> kesin yetersiz
    kesit,
  });
  assert.equal(sonuc.durum, "yetersiz");
  assert.ok(!sonuc.sehimUygun || !sonuc.gerilmeUygun);
});

test("kiriş kontrolü: konsol (cantilever) tekil yükte formül farklı uygulanır", () => {
  const kesit = kesitOzellikleriHesapla({ profilSekli: "BOX", widthMm: 40, heightMm: 40, thicknessMm: 3 })!;
  const basit = kirisKontrolEt({ acikligMm: 800, mesnetTuru: "basit", yukTuru: "tekil", toplamYukN: 200, kesit });
  const konsol = kirisKontrolEt({ acikligMm: 800, mesnetTuru: "konsol", yukTuru: "tekil", toplamYukN: 200, kesit });
  // Aynı açıklık ve yükte konsol her zaman basit mesnetliden çok daha fazla sehim/gerilme verir.
  assert.ok(konsol.maxSehimMm > basit.maxSehimMm);
  assert.ok(konsol.maxGerilmeMPa > basit.maxGerilmeMPa);
});

test("kiriş kontrolü: geçersiz girdilerde hata fırlatır", () => {
  const kesit = kesitOzellikleriHesapla({ profilSekli: "ROUND_SOLID", widthMm: 12 })!;
  assert.throws(
    () => kirisKontrolEt({ acikligMm: 0, mesnetTuru: "basit", yukTuru: "yayili", toplamYukN: 100, kesit }),
    HesaplamaHatasi
  );
  assert.throws(
    () => kirisKontrolEt({ acikligMm: 1000, mesnetTuru: "basit", yukTuru: "yayili", toplamYukN: -1, kesit }),
    HesaplamaHatasi
  );
});

test("kiriş kontrolü: daha yüksek emniyet katsayısı izin verilen gerilmeyi düşürür", () => {
  const kesit = kesitOzellikleriHesapla({ profilSekli: "BOX", widthMm: 40, heightMm: 40, thicknessMm: 3 })!;
  const dusukEmniyet = kirisKontrolEt({
    acikligMm: 1000,
    mesnetTuru: "basit",
    yukTuru: "yayili",
    toplamYukN: 1000,
    kesit,
    guvenlikKatsayisi: 1.5,
  });
  const yuksekEmniyet = kirisKontrolEt({
    acikligMm: 1000,
    mesnetTuru: "basit",
    yukTuru: "yayili",
    toplamYukN: 1000,
    kesit,
    guvenlikKatsayisi: 3,
  });
  assert.ok(yuksekEmniyet.izinVerilenGerilmeMPa < dusukEmniyet.izinVerilenGerilmeMPa);
});
