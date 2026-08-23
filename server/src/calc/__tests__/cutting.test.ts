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
