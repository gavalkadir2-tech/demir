import { test } from "node:test";
import assert from "node:assert/strict";
import { Material } from "@prisma/client";
import { sacGrubuMaliyetHesapla, sacGrubuStokMiktari, SacMalzemeGrubu } from "../sheetMaterialAggregation";
import { nestSheets } from "../../calc/sheetNesting";

function mockMaterial(overrides: Partial<Material>): Material {
  return {
    id: 1,
    name: "Test Sac",
    category: "SHEET",
    section: null,
    thicknessMm: null,
    standardLengthM: null,
    alternatifBoylarM: [],
    sheetWidthMm: 1250,
    sheetHeightMm: 2500,
    profilSekli: null,
    widthMm: null,
    heightMm: null,
    unit: "KG",
    unitPrice: 42,
    unitWeightKgPerM: null,
    kgPerM2: null,
    kerfMm: 3,
    stockQty: 100,
    minStockQty: 0,
    supplier: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Material;
}

test("sac grubu maliyeti: KG birimli malzemede kgPerM2 varsa onu kullanır", () => {
  const material = mockMaterial({ unit: "KG", unitPrice: 40, kgPerM2: 16 });
  const nesting = nestSheets([{ enMm: 600, boyMm: 400, adet: 1 }], 1250, 2500, 3);
  const grup: SacMalzemeGrubu = { materialId: 1, material, nesting, temsiliKalinlikMm: 2 };

  // 1 levha x (1.25*2.5=3.125 m2) x 16 kg/m2 x 40 TL/kg
  const beklenen = 1 * 3.125 * 16 * 40;
  assert.equal(Math.round(sacGrubuMaliyetHesapla(grup) * 100) / 100, Math.round(beklenen * 100) / 100);
});

test("sac grubu maliyeti: kgPerM2 yoksa temsili kalınlık + çelik yoğunluğu kullanılır", () => {
  const material = mockMaterial({ unit: "KG", unitPrice: 40, kgPerM2: null });
  const nesting = nestSheets([{ enMm: 600, boyMm: 400, adet: 1 }], 1250, 2500, 3);
  const grup: SacMalzemeGrubu = { materialId: 1, material, nesting, temsiliKalinlikMm: 2 };

  // kg/m2 = (2/1000)*7850 = 15.7
  const alanM2 = 3.125;
  const kgM2 = (2 / 1000) * 7850;
  const beklenen = 1 * alanM2 * kgM2 * 40;
  assert.ok(Math.abs(sacGrubuMaliyetHesapla(grup) - beklenen) < 0.01);
});

test("sac grubu maliyeti: M2 birimli malzemede alan üzerinden hesaplanır", () => {
  const material = mockMaterial({ unit: "M2", unitPrice: 250 });
  const nesting = nestSheets([{ enMm: 600, boyMm: 400, adet: 1 }], 1250, 2500, 3);
  const grup: SacMalzemeGrubu = { materialId: 1, material, nesting, temsiliKalinlikMm: 2 };

  const beklenen = 1 * 3.125 * 250;
  assert.equal(sacGrubuMaliyetHesapla(grup), beklenen);
});

test("sac grubu maliyeti: ADET birimli malzemede levha başına birim fiyat kullanılır", () => {
  const material = mockMaterial({ unit: "ADET", unitPrice: 900 });
  const nesting = nestSheets(
    [
      { enMm: 1250, boyMm: 400, adet: 7 }, // 6 tanesi 1 levhaya, 1 tanesi 2. levhaya sığar
    ],
    1250,
    2500,
    3
  );
  const grup: SacMalzemeGrubu = { materialId: 1, material, nesting, temsiliKalinlikMm: 2 };
  assert.equal(nesting.toplamLevha, 2);
  assert.equal(sacGrubuMaliyetHesapla(grup), 2 * 900);
});

test("sac grubu stok miktarı: KG biriminde ağırlık, M2 biriminde alan, diğerlerinde levha sayısı döner", () => {
  const nesting = nestSheets([{ enMm: 600, boyMm: 400, adet: 1 }], 1250, 2500, 3);

  const kgMalzeme = mockMaterial({ unit: "KG", kgPerM2: 16 });
  const kgGrup: SacMalzemeGrubu = { materialId: 1, material: kgMalzeme, nesting, temsiliKalinlikMm: 2 };
  assert.equal(sacGrubuStokMiktari(kgGrup), 1 * 3.125 * 16);

  const m2Malzeme = mockMaterial({ unit: "M2" });
  const m2Grup: SacMalzemeGrubu = { materialId: 1, material: m2Malzeme, nesting, temsiliKalinlikMm: 2 };
  assert.equal(sacGrubuStokMiktari(m2Grup), 3.125);

  const adetMalzeme = mockMaterial({ unit: "ADET" });
  const adetGrup: SacMalzemeGrubu = { materialId: 1, material: adetMalzeme, nesting, temsiliKalinlikMm: 2 };
  assert.equal(sacGrubuStokMiktari(adetGrup), 1);
});
