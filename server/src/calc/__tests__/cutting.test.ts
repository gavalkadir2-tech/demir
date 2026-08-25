import { test } from "node:test";
import assert from "node:assert/strict";
import { optimizeCutting } from "../cutting";
import { HesaplamaHatasi } from "../units";

// Spesifikasyon madde 13 örneği: 1850x8, 1200x6, 750x10, standart 6000mm.
test("kesim optimizasyonu: spesifikasyon örneği ile tutarlı sonuç üretir", () => {
  const pieces = [
    ...Array(8).fill(1850),
    ...Array(6).fill(1200),
    ...Array(10).fill(750),
  ];
  const sonuc = optimizeCutting(pieces, 6000, 3);

  const toplamParca = sonuc.bars.reduce((s, b) => s + b.cuts.length, 0);
  assert.equal(toplamParca, 24);
  assert.ok(sonuc.totalBars >= 5); // 8*1850+6*1200+10*750 = 29800mm net, 6000mm çubuklarda en az 5 çubuk gerekir
  assert.ok(sonuc.wastePercent >= 0 && sonuc.wastePercent < 100);
});

test("kesim optimizasyonu: standart boydan uzun parça hata verir", () => {
  assert.throws(() => optimizeCutting([6500], 6000, 3), HesaplamaHatasi);
});

test("kesim optimizasyonu: tam sığan parçalarda fire sıfır olmalı", () => {
  const sonuc = optimizeCutting([3000, 3000], 6000, 3);
  // 3000+3000 = 6000, ama aralarında 1 kesim payı (3mm) var, bu yüzden ikisi aynı çubuğa sığmaz.
  assert.equal(sonuc.totalBars, 2);
});

test("kesim optimizasyonu: kesim payı olmadan tam sığan parçalar tek çubukta", () => {
  const sonuc = optimizeCutting([3000, 2997], 6000, 3);
  assert.equal(sonuc.totalBars, 1);
  assert.equal(sonuc.bars[0].wasteMm, 0);
});

test("kesim optimizasyonu: boş liste güvenli döner", () => {
  const sonuc = optimizeCutting([], 6000, 3);
  assert.equal(sonuc.totalBars, 0);
  assert.equal(sonuc.totalWasteMm, 0);
});

test("kesim optimizasyonu: karışık stok boyu - küçük artan parça için en kısa uygun boy seçilir", () => {
  // Tek 6000mm stokta: 5900+1200 sığmaz (2 çubuk gerekir, 6000'lik ikinci çubukta 4797mm fire).
  // 6000 ve 3000mm ikisi de mevcutken: küçük parça (1200mm) için 3000mm'lik kısa stok seçilmeli.
  const sonuc = optimizeCutting([5900, 1200], [6000, 3000], 3);
  assert.equal(sonuc.totalBars, 2);
  const kisaCubuk = sonuc.bars.find((b) => b.cuts.includes(1200))!;
  assert.equal(kisaCubuk.stockLengthMm, 3000);
  assert.equal(kisaCubuk.wasteMm, 1800);
  const uzunCubuk = sonuc.bars.find((b) => b.cuts.includes(5900))!;
  assert.equal(uzunCubuk.stockLengthMm, 6000);
});

test("kesim optimizasyonu: karışık stok boyu - tek boy verilmesiyle aynı sonucu üretir (geriye dönük uyum)", () => {
  const pieces = [1850, 1850, 1200, 750];
  const tekBoy = optimizeCutting(pieces, 6000, 3);
  const diziIleTekBoy = optimizeCutting(pieces, [6000], 3);
  assert.deepEqual(tekBoy.bars, diziIleTekBoy.bars);
  assert.equal(diziIleTekBoy.availableLengthsMm.length, 1);
  assert.equal(diziIleTekBoy.availableLengthsMm[0], 6000);
});

test("kesim optimizasyonu: mevcut en uzun boydan uzun parça, diğer boylar yeterli olsa da hata verir", () => {
  assert.throws(() => optimizeCutting([7000], [3000, 6000], 3), HesaplamaHatasi);
});
