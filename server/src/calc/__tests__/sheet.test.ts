import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateSheetItem, calculateSheetTotals } from "../sheet";

// Spesifikasyon madde 12 örneği: 2mm siyah sac, 1250x2500mm, 5 adet.
test("sac hesaplama: m2 ve ağırlık doğru", () => {
  const sonuc = calculateSheetItem({ kalinlikMm: 2, enMm: 1250, boyMm: 2500, adet: 5 });
  assert.equal(sonuc.alanM2, 15.63); // 1.25*2.5*5 = 15.625 -> round2
  // ağırlık = 15.625 * 0.002 * 7850 = 245.3125 kg
  assert.equal(sonuc.agirlikKg, 245.31);
});

test("sac hesaplama: m2 fiyatı varsa onu kullanır, yoksa kg fiyatına düşer", () => {
  const m2Fiyatli = calculateSheetItem({ kalinlikMm: 2, enMm: 1000, boyMm: 1000, adet: 1, birimFiyatM2: 300 });
  assert.equal(m2Fiyatli.maliyet, 300);

  const kgFiyatli = calculateSheetItem({ kalinlikMm: 2, enMm: 1000, boyMm: 1000, adet: 1, birimFiyatKg: 30 });
  // ağırlık = 1*0.002*7850 = 15.7 kg -> 15.7*30 = 471
  assert.equal(kgFiyatli.maliyet, 471);
});

test("sac hesaplama: toplamlar birden fazla kalemi doğru toplar", () => {
  const toplam = calculateSheetTotals([
    { kalinlikMm: 2, enMm: 1000, boyMm: 1000, adet: 1, birimFiyatM2: 100 },
    { kalinlikMm: 3, enMm: 1000, boyMm: 1000, adet: 1, birimFiyatM2: 150 },
  ]);
  assert.equal(toplam.toplamAlanM2, 2);
  assert.equal(toplam.toplamMaliyet, 250);
});
