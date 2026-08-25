import { test } from "node:test";
import assert from "node:assert/strict";
import { Material } from "@prisma/client";
import { yapiselKontrolCalistir } from "../structuralCheck";
import { calculateStairs } from "../../calc/stairs";
import { calculateSpiralStairs } from "../../calc/spiralStairs";
import { calculateWallPanel } from "../../calc/wall";
import { calculateShelf } from "../../calc/shelf";

function mockMaterial(overrides: Partial<Material>): Material {
  return {
    id: 1,
    name: "Test Malzeme",
    category: "PROFILE",
    section: null,
    thicknessMm: null,
    standardLengthM: null,
    sheetWidthMm: null,
    sheetHeightMm: null,
    profilSekli: null,
    widthMm: null,
    heightMm: null,
    unit: "M",
    unitPrice: 0,
    unitWeightKgPerM: null,
    kgPerM2: null,
    kerfMm: 3,
    stockQty: 0,
    minStockQty: 0,
    supplier: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Material;
}

// Ortak zayıf/güçlü mock profiller - tüm testlerde aynı kutu kesit karşılaştırması kullanılır.
const ZAYIF_BOX = mockMaterial({ name: "20x20x2 Kutu (zayıf)", profilSekli: "BOX", widthMm: 20, heightMm: 20, thicknessMm: 2 });
const GUCLU_BOX = mockMaterial({ name: "150x150x8 Kutu (güçlü)", profilSekli: "BOX", widthMm: 150, heightMm: 150, thicknessMm: 8 });

test("merdiven kontrolü: zayıf taşıyıcı uzun açıklıkta yetersiz çıkar", () => {
  const sonuc = calculateStairs({
    katYuksekligiMm: 3000,
    genislikMm: 900,
    basamakYuksekligiHedefMm: 180,
    toplamDerinlikMm: 4500,
    tasiyiciProfilKey: "tasiyici",
  });
  const girdi = {
    katYuksekligiMm: 3000,
    genislikMm: 900,
    toplamDerinlikMm: 4500,
    tasiyiciProfilKey: "tasiyici",
  };
  const kontrol = yapiselKontrolCalistir("stairs", girdi, sonuc, { tasiyici: ZAYIF_BOX });
  assert.ok(kontrol);
  assert.equal(kontrol!.genelDurum, "yetersiz");
});

test("merdiven kontrolü: güçlü taşıyıcı kısa açıklıkta uygun/sınırda çıkar", () => {
  const sonuc = calculateStairs({
    katYuksekligiMm: 2400,
    genislikMm: 900,
    basamakYuksekligiHedefMm: 180,
    toplamDerinlikMm: 3200,
    tasiyiciProfilKey: "tasiyici",
    tasiyiciAdet: 2,
  });
  const girdi = {
    katYuksekligiMm: 2400,
    genislikMm: 900,
    toplamDerinlikMm: 3200,
    tasiyiciProfilKey: "tasiyici",
    tasiyiciAdet: 2,
  };
  const kontrol = yapiselKontrolCalistir("stairs", girdi, sonuc, { tasiyici: GUCLU_BOX });
  assert.ok(kontrol);
  assert.notEqual(kontrol!.genelDurum, "yetersiz");
});

test("merdiven kontrolü: malzeme sözlüğünde taşıyıcı yoksa undefined döner", () => {
  const sonuc = calculateStairs({
    katYuksekligiMm: 3000,
    genislikMm: 900,
    basamakYuksekligiHedefMm: 180,
    toplamDerinlikMm: 4500,
    tasiyiciProfilKey: "tasiyici",
  });
  const kontrol = yapiselKontrolCalistir("stairs", { tasiyiciProfilKey: "tasiyici" }, sonuc, {});
  assert.equal(kontrol, undefined);
});

test("döner merdiven kontrolü: zayıf basamak desteği yetersiz çıkar", () => {
  const sonuc = calculateSpiralStairs({
    katYuksekligiMm: 2800,
    icCapMm: 200,
    disCapMm: 1400,
    toplamDonusDerecesi: 360,
    basamakYuksekligiHedefMm: 200,
    merkezKolonProfilKey: "kolon",
    basamakDestekProfilKey: "destek",
  });
  const girdi = {
    katYuksekligiMm: 2800,
    icCapMm: 200,
    disCapMm: 1400,
    toplamDonusDerecesi: 360,
    basamakYuksekligiHedefMm: 200,
    merkezKolonProfilKey: "kolon",
    basamakDestekProfilKey: "destek",
  };
  const kontrol = yapiselKontrolCalistir("spiral_stairs", girdi, sonuc, { kolon: GUCLU_BOX, destek: ZAYIF_BOX });
  assert.ok(kontrol);
  assert.equal(kontrol!.genelDurum, "yetersiz");
  assert.equal(kontrol!.kalemler[0].eleman, "Basamak desteği (konsol)");
});

test("döner merdiven kontrolü: korkuluk varsa dikme kalemi de eklenir", () => {
  const sonuc = calculateSpiralStairs({
    katYuksekligiMm: 2800,
    icCapMm: 200,
    disCapMm: 1400,
    toplamDonusDerecesi: 360,
    basamakYuksekligiHedefMm: 200,
    merkezKolonProfilKey: "kolon",
    basamakDestekProfilKey: "destek",
    korkulukVar: true,
    korkulukYuksekligiMm: 900,
    korkulukDikmeProfilKey: "korkulukDikme",
    korkulukUstProfilKey: "korkulukUst",
  });
  const girdi = {
    katYuksekligiMm: 2800,
    icCapMm: 200,
    disCapMm: 1400,
    toplamDonusDerecesi: 360,
    basamakYuksekligiHedefMm: 200,
    merkezKolonProfilKey: "kolon",
    basamakDestekProfilKey: "destek",
    korkulukVar: true,
    korkulukYuksekligiMm: 900,
    korkulukDikmeProfilKey: "korkulukDikme",
    korkulukUstProfilKey: "korkulukUst",
  };
  const kontrol = yapiselKontrolCalistir("spiral_stairs", girdi, sonuc, {
    kolon: GUCLU_BOX,
    destek: GUCLU_BOX,
    korkulukDikme: GUCLU_BOX,
  });
  assert.ok(kontrol);
  assert.equal(kontrol!.kalemler.length, 2);
  assert.ok(kontrol!.kalemler.some((k) => k.eleman.includes("Korkuluk dikmesi")));
});

test("duvar kontrolü: zayıf dikme geniş aralıkta yetersiz çıkar", () => {
  const sonuc = calculateWallPanel({
    genislikMm: 3000,
    yukseklikMm: 3000,
    dikmeAraligiHedefMm: 800,
    ustProfilKey: "ray",
    altProfilKey: "ray",
    dikmeProfilKey: "dikme",
  });
  const girdi = {
    genislikMm: 3000,
    yukseklikMm: 3000,
    dikmeAraligiHedefMm: 800,
    ustProfilKey: "ray",
    altProfilKey: "ray",
    dikmeProfilKey: "dikme",
  };
  const kontrol = yapiselKontrolCalistir("wall", girdi, sonuc, { ray: GUCLU_BOX, dikme: ZAYIF_BOX });
  assert.ok(kontrol);
  assert.equal(kontrol!.genelDurum, "yetersiz");
});

test("duvar kontrolü: güçlü dikme dar aralıkta uygun/sınırda çıkar", () => {
  const sonuc = calculateWallPanel({
    genislikMm: 3000,
    yukseklikMm: 2500,
    dikmeAraligiHedefMm: 400,
    ustProfilKey: "ray",
    altProfilKey: "ray",
    dikmeProfilKey: "dikme",
  });
  const girdi = {
    genislikMm: 3000,
    yukseklikMm: 2500,
    dikmeAraligiHedefMm: 400,
    ustProfilKey: "ray",
    altProfilKey: "ray",
    dikmeProfilKey: "dikme",
  };
  const kontrol = yapiselKontrolCalistir("wall", girdi, sonuc, { ray: GUCLU_BOX, dikme: GUCLU_BOX });
  assert.ok(kontrol);
  assert.notEqual(kontrol!.genelDurum, "yetersiz");
});

test("raf kontrolü: zayıf çerçeve profili yüksek tasarım yükünde yetersiz çıkar", () => {
  const sonuc = calculateShelf({
    genislikMm: 1200,
    derinlikMm: 500,
    yukseklikMm: 1800,
    rafSayisi: 4,
    ayakProfilKey: "ayak",
    rafCercevesiProfilKey: "cerceve",
  });
  const girdi = {
    genislikMm: 1200,
    derinlikMm: 500,
    yukseklikMm: 1800,
    rafSayisi: 4,
    ayakProfilKey: "ayak",
    rafCercevesiProfilKey: "cerceve",
    tasarimYukuKgM2: 300,
  };
  const kontrol = yapiselKontrolCalistir("shelf", girdi, sonuc, { ayak: GUCLU_BOX, cerceve: ZAYIF_BOX });
  assert.ok(kontrol);
  assert.equal(kontrol!.genelDurum, "yetersiz");
});

test("raf kontrolü: tasarım yükü belirtilmezse varsayılan (100 kg/m²) kullanılır", () => {
  const sonuc = calculateShelf({
    genislikMm: 800,
    derinlikMm: 400,
    yukseklikMm: 1600,
    rafSayisi: 3,
    ayakProfilKey: "ayak",
    rafCercevesiProfilKey: "cerceve",
  });
  const girdi = {
    genislikMm: 800,
    derinlikMm: 400,
    yukseklikMm: 1600,
    rafSayisi: 3,
    ayakProfilKey: "ayak",
    rafCercevesiProfilKey: "cerceve",
  };
  const kontrol = yapiselKontrolCalistir("shelf", girdi, sonuc, { ayak: GUCLU_BOX, cerceve: GUCLU_BOX });
  assert.ok(kontrol);
  assert.ok(kontrol!.kalemler[0].yukAciklamasi.includes("100 kg/m²"));
});
