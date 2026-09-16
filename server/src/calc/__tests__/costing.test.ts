import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateCost, calculateLaborAmount } from "../costing";
import { HesaplamaHatasi } from "../units";

test("maliyet motoru: yüzde kâr (malzeme maliyeti tabanlı) ve KDV zinciri doğru", () => {
  const sonuc = calculateCost({
    materialCost: 1100, // fire dahil
    consumableCost: 50,
    laborCost: 300,
    paintCost: 50,
    transportCost: 100,
    installCost: 100,
    otherCost: 0,
    overheadPercent: 10,
    profitMode: "PERCENT",
    profitValue: 20,
    vatPercent: 20,
  });

  assert.equal(sonuc.totalCost, 1700);
  assert.equal(sonuc.overheadAmount, 170); // 1700*0.10
  assert.equal(sonuc.subtotalBeforeProfit, 1870);
  assert.equal(sonuc.profitAmount, 220); // materialCost tabanlı: 1100*0.20
  assert.equal(sonuc.subtotal, 2090);
  assert.equal(sonuc.vatAmount, 418); // 2090*0.20
  assert.equal(sonuc.total, 2508);
});

test("maliyet motoru: kâr varsayılanı malzeme fiyatının yarısı (%50)", () => {
  const sonuc = calculateCost({
    materialCost: 1000,
    consumableCost: 0,
    laborCost: 0,
    paintCost: 0,
    transportCost: 0,
    installCost: 0,
    otherCost: 0,
    overheadPercent: 0,
    profitMode: "PERCENT",
    profitValue: 50,
    vatPercent: 0,
  });

  assert.equal(sonuc.profitAmount, 500); // 1000'in yarısı
  assert.equal(sonuc.subtotal, 1500);
});

test("maliyet motoru: sabit TL kâr modu", () => {
  const sonuc = calculateCost({
    materialCost: 1000,
    consumableCost: 0,
    laborCost: 0,
    paintCost: 0,
    transportCost: 0,
    installCost: 0,
    otherCost: 0,
    overheadPercent: 0,
    profitMode: "FIXED",
    profitValue: 500,
    vatPercent: 20,
  });

  assert.equal(sonuc.profitAmount, 500);
  assert.equal(sonuc.subtotal, 1500);
  assert.equal(sonuc.total, 1800);
});

test("maliyet motoru: negatif kalemlerde hata verir", () => {
  assert.throws(
    () =>
      calculateCost({
        materialCost: -10,
        consumableCost: 0,
        laborCost: 0,
        paintCost: 0,
        transportCost: 0,
        installCost: 0,
        otherCost: 0,
        overheadPercent: 0,
        profitMode: "PERCENT",
        profitValue: 20,
        vatPercent: 20,
      }),
    HesaplamaHatasi
  );
});

test("işçilik tutarı: saat x ücret ve sabit tutar modları", () => {
  assert.equal(calculateLaborAmount({ hours: 8, rate: 250 }), 2000);
  assert.equal(calculateLaborAmount({ fixedAmount: 1500 }), 1500);
  assert.throws(() => calculateLaborAmount({}), HesaplamaHatasi);
});
