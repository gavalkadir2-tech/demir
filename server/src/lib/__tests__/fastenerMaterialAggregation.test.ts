import { test } from "node:test";
import assert from "node:assert/strict";
import { Material } from "@prisma/client";
import { baglantiGrubuMaliyetHesapla, BaglantiMalzemeGrubu } from "../fastenerMaterialAggregation";

function mockMaterial(overrides: Partial<Material>): Material {
  return {
    id: 1,
    name: "Ankraj (Kimyasal Dübel)",
    category: "FASTENER",
    section: null,
    thicknessMm: null,
    standardLengthM: null,
    alternatifBoylarM: [],
    sheetWidthMm: null,
    sheetHeightMm: null,
    profilSekli: null,
    widthMm: null,
    heightMm: null,
    unit: "ADET",
    unitPrice: 12,
    unitWeightKgPerM: null,
    kgPerM2: null,
    kerfMm: 0,
    stockQty: 100,
    minStockQty: 20,
    supplier: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Material;
}

test("bağlantı grubu maliyeti: toplam adet x birim fiyat", () => {
  const material = mockMaterial({ unitPrice: 12 });
  const grup: BaglantiMalzemeGrubu = { materialId: 1, material, toplamAdet: 16, kaynaklar: [] };
  assert.equal(baglantiGrubuMaliyetHesapla(grup), 16 * 12);
});

test("bağlantı grubu maliyeti: sıfır adet sıfır maliyet verir", () => {
  const material = mockMaterial({ unitPrice: 45 });
  const grup: BaglantiMalzemeGrubu = { materialId: 1, material, toplamAdet: 0, kaynaklar: [] };
  assert.equal(baglantiGrubuMaliyetHesapla(grup), 0);
});
