import { test } from "node:test";
import assert from "node:assert/strict";
import { nestSheets } from "../sheetNesting";
import { HesaplamaHatasi } from "../units";

test("sac nesting: iki parça aynı rafa yan yana yerleşir", () => {
  const sonuc = nestSheets([{ enMm: 600, boyMm: 400, adet: 2 }], 1250, 2500, 3);
  assert.equal(sonuc.toplamLevha, 1);
  assert.equal(sonuc.levhalar[0].parcalar.length, 2);
  assert.deepEqual(
    sonuc.levhalar[0].parcalar.map((p) => [p.xMm, p.yMm]),
    [
      [0, 0],
      [603, 0],
    ]
  );
});

test("sac nesting: genişliğe sığmayan parça yeni raf açar (aynı levhada, altta)", () => {
  const sonuc = nestSheets(
    [
      { enMm: 1000, boyMm: 400, adet: 1 },
      { enMm: 400, boyMm: 300, adet: 1 },
    ],
    1250,
    2500,
    3
  );
  assert.equal(sonuc.toplamLevha, 1);
  assert.equal(sonuc.levhalar[0].parcalar.length, 2);
  const ikinciParca = sonuc.levhalar[0].parcalar.find((p) => p.enMm === 400)!;
  assert.equal(ikinciParca.xMm, 0);
  assert.equal(ikinciParca.yMm, 403); // ilk rafın yüksekliği (400) + kesim payı (3)
});

test("sac nesting: levha yüksekliği dolunca yeni levha açılır", () => {
  const sonuc = nestSheets([{ enMm: 1250, boyMm: 400, adet: 7 }], 1250, 2500, 3);
  // Her parça tam genişlik olduğu için her biri kendi rafını açar; 400+3=403 yükseklikte
  // 2500mm'ye 6 raf sığar (6*403=2418), 7.parça yeni levhaya taşar.
  assert.equal(sonuc.toplamLevha, 2);
  assert.equal(sonuc.levhalar[0].parcalar.length, 6);
  assert.equal(sonuc.levhalar[1].parcalar.length, 1);
  assert.equal(sonuc.toplamParca, 7);
});

test("sac nesting: levhadan büyük parça hata verir (rotasyon kapalıyken)", () => {
  assert.throws(
    () => nestSheets([{ enMm: 1300, boyMm: 400, adet: 1 }], 1250, 2500, 3, false),
    HesaplamaHatasi
  );
  assert.throws(
    () => nestSheets([{ enMm: 400, boyMm: 2600, adet: 1 }], 1250, 2500, 3, false),
    HesaplamaHatasi
  );
});

test("sac nesting: her iki yönde de sığmayan parça, rotasyon açıkken de hata verir", () => {
  assert.throws(() => nestSheets([{ enMm: 2600, boyMm: 1300, adet: 1 }], 1250, 2500, 3), HesaplamaHatasi);
});

test("sac nesting: sadece döndürülünce sığan parça, rotasyon açıkken (varsayılan) yerleşir ve döndürülmüş olarak işaretlenir", () => {
  const sonuc = nestSheets([{ enMm: 1300, boyMm: 400, adet: 1 }], 1250, 2500, 3);
  assert.equal(sonuc.toplamLevha, 1);
  const parca = sonuc.levhalar[0].parcalar[0];
  assert.equal(parca.donduruldu, true);
  assert.equal(parca.enMm, 400);
  assert.equal(parca.boyMm, 1300);
});

test("sac nesting: boş liste güvenli döner", () => {
  const sonuc = nestSheets([], 1250, 2500, 3);
  assert.equal(sonuc.toplamLevha, 0);
  assert.equal(sonuc.fireYuzde, 0);
});

test("sac nesting: fire alanı ve yüzdesi doğru hesaplanır", () => {
  const sonuc = nestSheets([{ enMm: 600, boyMm: 400, adet: 2 }], 1250, 2500, 3);
  assert.equal(sonuc.kullanilanAlanMm2, 2 * 600 * 400);
  assert.equal(sonuc.toplamAlanMm2, 1250 * 2500);
  assert.equal(sonuc.fireAlanMm2, 1250 * 2500 - 2 * 600 * 400);
});

test("sac nesting: rotasyon, levha sayısını azaltabilir (3 parça, rotasyonsuz 2 levha, rotasyonlu 1 levha)", () => {
  const parcalar = [{ enMm: 700, boyMm: 1200, adet: 3 }];

  const rotasyonsuz = nestSheets(parcalar, 1250, 2500, 0, false);
  assert.equal(rotasyonsuz.toplamLevha, 2);
  assert.ok(rotasyonsuz.levhalar.every((l) => l.parcalar.every((p) => !p.donduruldu)));

  const rotasyonlu = nestSheets(parcalar, 1250, 2500, 0, true);
  assert.equal(rotasyonlu.toplamLevha, 1);
  assert.equal(rotasyonlu.levhalar[0].parcalar.length, 3);
  assert.ok(rotasyonlu.levhalar[0].parcalar.every((p) => p.donduruldu === true));
  assert.ok(rotasyonlu.levhalar[0].parcalar.every((p) => p.enMm === 1200 && p.boyMm === 700));
});

test("sac nesting: geçersiz levha boyutunda hata verir", () => {
  assert.throws(() => nestSheets([{ enMm: 100, boyMm: 100, adet: 1 }], 0, 2500, 3), HesaplamaHatasi);
});
