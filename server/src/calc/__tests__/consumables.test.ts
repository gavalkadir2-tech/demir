import { test } from "node:test";
import assert from "node:assert/strict";
import { kesitCevresiHesapla, yuzeyAlaniM2Hesapla, sarfTahminiHesapla } from "../consumables";

test("kesit çevresi: kare kutu profil (40x40) doğru hesaplanır", () => {
  const cevre = kesitCevresiHesapla({ profilSekli: "BOX", widthMm: 40, heightMm: 40, thicknessMm: 3 });
  assert.equal(cevre, 160); // 2*(40+40)
});

test("kesit çevresi: dolu yuvarlak (Ø12) doğru hesaplanır", () => {
  const cevre = kesitCevresiHesapla({ profilSekli: "ROUND_SOLID", widthMm: 12 });
  assert.ok(cevre && Math.abs(cevre - Math.PI * 12) < 0.01);
});

test("kesit çevresi: eksik boyut verisiyle null döner", () => {
  assert.equal(kesitCevresiHesapla({ profilSekli: "BOX", widthMm: 40 }), null);
});

test("yüzey alanı: tek bir 40x40 kutu profil parçası doğru hesaplanır", () => {
  const { yuzeyAlaniM2, eksikVeri } = yuzeyAlaniM2Hesapla([
    { lengthMm: 1000, qty: 4, kesit: { profilSekli: "BOX", widthMm: 40, heightMm: 40, thicknessMm: 3 } },
  ]);
  // çevre 160mm * uzunluk 1000mm * adet 4 / 1e6 = 0.64 m²
  assert.equal(yuzeyAlaniM2, 0.64);
  assert.equal(eksikVeri, false);
});

test("yüzey alanı: kesit verisi eksik parça varsa eksikVeri true olur", () => {
  const { eksikVeri } = yuzeyAlaniM2Hesapla([{ lengthMm: 1000, qty: 1, kesit: {} }]);
  assert.equal(eksikVeri, true);
});

test("sarf tahmini: kaynak teli ve boya kg cinsinden makul oranda hesaplanır", () => {
  const sonuc = sarfTahminiHesapla(100, [
    { lengthMm: 1000, qty: 10, kesit: { profilSekli: "BOX", widthMm: 40, heightMm: 40, thicknessMm: 3 } },
  ]);
  assert.equal(sonuc.kaynakTeliTahminiKg, 1.5); // %1.5 * 100kg
  assert.ok(sonuc.boyaTahminiKg > 0);
  assert.equal(sonuc.yuzeyAlaniEksikVeri, false);
});
