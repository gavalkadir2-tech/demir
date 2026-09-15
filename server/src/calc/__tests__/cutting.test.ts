import { test } from "node:test";
import assert from "node:assert/strict";
import { optimizeCutting, splitOversizedPiece } from "../cutting";

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
  assert.equal(sonuc.warnings.length, 0);
});

test("splitOversizedPiece: 8m parçayı 6m tam boy + 2m olarak böler", () => {
  assert.deepEqual(splitOversizedPiece(8000, 6000), [6000, 2000]);
});

test("splitOversizedPiece: tam katlarda ek parça kalmaz", () => {
  assert.deepEqual(splitOversizedPiece(12000, 6000), [6000, 6000]);
});

test("splitOversizedPiece: çok kısa kalan son parça dengelenir", () => {
  const parcalar = splitOversizedPiece(6100, 6000);
  assert.equal(parcalar.reduce((s, p) => s + p, 0), 6100);
  assert.ok(parcalar.every((p) => p >= 500));
});

test("kesim optimizasyonu: standart boydan uzun parça artık hata vermez, ek (kaynak) parçalarına bölünür", () => {
  const sonuc = optimizeCutting([8000], 6000, 3);
  assert.equal(sonuc.totalPieces, 1);
  assert.equal(sonuc.warnings.length, 1);
  assert.match(sonuc.warnings[0], /8000 mm/);
  assert.match(sonuc.warnings[0], /kaynakla birleştirilecek/);

  const tumParcalar = sonuc.bars.flatMap((b) => b.cuts);
  assert.equal(tumParcalar.length, 2);
  const altiMetrelik = tumParcalar.find((c) => c.lengthMm === 6000)!;
  const ikiMetrelik = tumParcalar.find((c) => c.lengthMm === 2000)!;
  assert.ok(altiMetrelik && ikiMetrelik);
  assert.equal(altiMetrelik.spliceGroupId, ikiMetrelik.spliceGroupId);
  assert.equal(altiMetrelik.spliceCount, 2);
  assert.equal(altiMetrelik.originalLengthMm, 8000);
  assert.equal(ikiMetrelik.originalLengthMm, 8000);

  // Fire, hiçbiri boşa gitmeden gerçek stok tüketimini yansıtmalı.
  const toplamStok = sonuc.bars.reduce((s, b) => s + b.stockLengthMm, 0);
  assert.ok(toplamStok >= 8000);
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
  const kisaCubuk = sonuc.bars.find((b) => b.cuts.some((c) => c.lengthMm === 1200))!;
  assert.equal(kisaCubuk.stockLengthMm, 3000);
  assert.equal(kisaCubuk.wasteMm, 1800);
  const uzunCubuk = sonuc.bars.find((b) => b.cuts.some((c) => c.lengthMm === 5900))!;
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

test("kesim optimizasyonu: mevcut en uzun boydan uzun parça, kısa stok boyu da varken ek parçalarına bölünür", () => {
  const sonuc = optimizeCutting([7000], [3000, 6000], 3);
  assert.equal(sonuc.warnings.length, 1);
  const tumParcalar = sonuc.bars.flatMap((b) => b.cuts);
  assert.equal(
    tumParcalar.reduce((s, c) => s + c.lengthMm, 0),
    7000
  );
  assert.ok(tumParcalar.every((c) => c.spliceGroupId));
});
