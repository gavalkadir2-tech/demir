import { test } from "node:test";
import assert from "node:assert/strict";
import { Material } from "@prisma/client";
import { yapiselKontrolCalistir } from "../structuralCheck";
import { calculateStairs } from "../../calc/stairs";
import { calculateSpiralStairs } from "../../calc/spiralStairs";
import { calculateWallPanel } from "../../calc/wall";
import { calculateShelf } from "../../calc/shelf";
import { calculatePergola } from "../../calc/pergola";
import { calculateSteelFrame } from "../../calc/steelFrame";
import { calculateCanopy } from "../../calc/canopy";

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

test("pergola kontrolü: zayıf kiriş geniş açıklıkta yetersiz çıkar", () => {
  const sonuc = calculatePergola({
    genislikMm: 8000,
    boyMm: 4000,
    yukseklikMm: 2400,
    kolonSayisi: 4,
    kolonProfilKey: "kolon",
    kirisProfilKey: "kiris",
    lataProfilKey: "lata",
  });
  const girdi = {
    genislikMm: 8000,
    boyMm: 4000,
    yukseklikMm: 2400,
    kolonSayisi: 4,
    kolonProfilKey: "kolon",
    kirisProfilKey: "kiris",
    lataProfilKey: "lata",
  };
  const kontrol = yapiselKontrolCalistir("pergola", girdi, sonuc, { kolon: GUCLU_BOX, kiris: ZAYIF_BOX, lata: GUCLU_BOX });
  assert.ok(kontrol);
  assert.equal(kontrol!.genelDurum, "yetersiz");
  assert.equal(kontrol!.kalemler[0].eleman, "Kenar kirişi (bitişik kolonlar arası açıklık)");
});

test("pergola kontrolü: güçlü kiriş dar açıklıkta (ara kolonlu) uygun/sınırda çıkar", () => {
  const sonuc = calculatePergola({
    genislikMm: 6000,
    boyMm: 3000,
    yukseklikMm: 2400,
    kolonSayisi: 6,
    kolonProfilKey: "kolon",
    kirisProfilKey: "kiris",
    lataProfilKey: "lata",
  });
  const girdi = {
    genislikMm: 6000,
    boyMm: 3000,
    yukseklikMm: 2400,
    kolonSayisi: 6,
    kolonProfilKey: "kolon",
    kirisProfilKey: "kiris",
    lataProfilKey: "lata",
  };
  const kontrol = yapiselKontrolCalistir("pergola", girdi, sonuc, { kolon: GUCLU_BOX, kiris: GUCLU_BOX, lata: GUCLU_BOX });
  assert.ok(kontrol);
  assert.notEqual(kontrol!.genelDurum, "yetersiz");
});

test("pergola kontrolü: kiriş malzemesi bulunamazsa undefined döner", () => {
  const sonuc = calculatePergola({
    genislikMm: 4000,
    boyMm: 3000,
    yukseklikMm: 2400,
    kolonSayisi: 4,
    kolonProfilKey: "kolon",
    kirisProfilKey: "kiris",
    lataProfilKey: "lata",
  });
  const kontrol = yapiselKontrolCalistir("pergola", { kirisProfilKey: "kiris" }, sonuc, {});
  assert.equal(kontrol, undefined);
});

test("kolon-kiriş kontrolü: zayıf kiriş geniş açıklıkta yetersiz çıkar", () => {
  const sonuc = calculateSteelFrame({
    acikligMm: 8000,
    uzunlukMm: 9000,
    yukseklikMm: 3000,
    kolonProfilKey: "kolon",
    kirisProfilKey: "kiris",
  });
  const girdi = {
    acikligMm: 8000,
    uzunlukMm: 9000,
    yukseklikMm: 3000,
    kolonProfilKey: "kolon",
    kirisProfilKey: "kiris",
  };
  const kontrol = yapiselKontrolCalistir("steel_frame", girdi, sonuc, { kolon: GUCLU_BOX, kiris: ZAYIF_BOX });
  assert.ok(kontrol);
  assert.equal(kontrol!.genelDurum, "yetersiz");
  assert.equal(kontrol!.kalemler[0].eleman, "Kiriş (açıklık)");
});

test("kolon-kiriş kontrolü: güçlü kiriş dar açıklıkta uygun/sınırda çıkar", () => {
  const sonuc = calculateSteelFrame({
    acikligMm: 3000,
    uzunlukMm: 6000,
    yukseklikMm: 3000,
    kolonProfilKey: "kolon",
    kirisProfilKey: "kiris",
  });
  const girdi = {
    acikligMm: 3000,
    uzunlukMm: 6000,
    yukseklikMm: 3000,
    kolonProfilKey: "kolon",
    kirisProfilKey: "kiris",
  };
  const kontrol = yapiselKontrolCalistir("steel_frame", girdi, sonuc, { kolon: GUCLU_BOX, kiris: GUCLU_BOX });
  assert.ok(kontrol);
  assert.notEqual(kontrol!.genelDurum, "yetersiz");
});

test("raf kontrolü: ayak burkulma kalemi de eklenir ve zayıf ayak yetersiz çıkar", () => {
  const sonuc = calculateShelf({
    genislikMm: 1200,
    derinlikMm: 500,
    yukseklikMm: 3000,
    rafSayisi: 6,
    ayakProfilKey: "ayak",
    rafCercevesiProfilKey: "cerceve",
  });
  const girdi = {
    genislikMm: 1200,
    derinlikMm: 500,
    yukseklikMm: 3000,
    rafSayisi: 6,
    ayakProfilKey: "ayak",
    rafCercevesiProfilKey: "cerceve",
    tasarimYukuKgM2: 300,
  };
  const kontrol = yapiselKontrolCalistir("shelf", girdi, sonuc, { ayak: ZAYIF_BOX, cerceve: GUCLU_BOX });
  assert.ok(kontrol);
  assert.equal(kontrol!.kalemler.length, 2);
  const ayakKalemi = kontrol!.kalemler.find((k) => k.eleman.includes("Ayak"))!;
  assert.ok(ayakKalemi);
  assert.equal(ayakKalemi.tur, "kolon");
  assert.equal(kontrol!.genelDurum, "yetersiz");
});

test("pergola kontrolü: kolon burkulma kalemi de eklenir", () => {
  const sonuc = calculatePergola({
    genislikMm: 4000,
    boyMm: 3000,
    yukseklikMm: 2400,
    kolonSayisi: 4,
    kolonProfilKey: "kolon",
    kirisProfilKey: "kiris",
    lataProfilKey: "lata",
  });
  const girdi = {
    genislikMm: 4000,
    boyMm: 3000,
    yukseklikMm: 2400,
    kolonSayisi: 4,
    kolonProfilKey: "kolon",
    kirisProfilKey: "kiris",
    lataProfilKey: "lata",
  };
  const kontrol = yapiselKontrolCalistir("pergola", girdi, sonuc, { kolon: GUCLU_BOX, kiris: GUCLU_BOX, lata: GUCLU_BOX });
  assert.ok(kontrol);
  assert.equal(kontrol!.kalemler.length, 2);
  assert.ok(kontrol!.kalemler.some((k) => k.tur === "kolon" && k.eleman.includes("Kolon")));
});

test("kolon-kiriş kontrolü: kolon burkulma kalemi de eklenir", () => {
  const sonuc = calculateSteelFrame({
    acikligMm: 6000,
    uzunlukMm: 9000,
    yukseklikMm: 3000,
    kolonProfilKey: "kolon",
    kirisProfilKey: "kiris",
  });
  const girdi = {
    acikligMm: 6000,
    uzunlukMm: 9000,
    yukseklikMm: 3000,
    kolonProfilKey: "kolon",
    kirisProfilKey: "kiris",
  };
  const kontrol = yapiselKontrolCalistir("steel_frame", girdi, sonuc, { kolon: GUCLU_BOX, kiris: GUCLU_BOX });
  assert.ok(kontrol);
  assert.equal(kontrol!.kalemler.length, 2);
  assert.ok(kontrol!.kalemler.some((k) => k.tur === "kolon"));
});

test("sundurma kontrolü: zayıf dikme yüksek çıkmada yetersiz çıkar", () => {
  const sonuc = calculateCanopy({
    genislikMm: 6000,
    boyMm: 4000,
    yukseklikMm: 2200,
    egimYuzde: 10,
    dikmeSayisi: 3,
    anaTasiyiciProfilKey: "ana",
    araTasiyiciProfilKey: "ara",
    dikmeProfilKey: "dikme",
  });
  const girdi = {
    genislikMm: 6000,
    boyMm: 4000,
    yukseklikMm: 2200,
    egimYuzde: 10,
    dikmeSayisi: 3,
    anaTasiyiciProfilKey: "ana",
    araTasiyiciProfilKey: "ara",
    dikmeProfilKey: "dikme",
  };
  const kontrol = yapiselKontrolCalistir("canopy", girdi, sonuc, { ana: GUCLU_BOX, ara: GUCLU_BOX, dikme: ZAYIF_BOX });
  assert.ok(kontrol);
  assert.equal(kontrol!.genelDurum, "yetersiz");
  assert.equal(kontrol!.kalemler[0].tur, "kolon");
  assert.equal(kontrol!.kalemler[0].eleman, "Dikme (eksenel burkulma)");
});

test("sundurma kontrolü: güçlü dikme kısa çıkmada uygun/sınırda çıkar", () => {
  const sonuc = calculateCanopy({
    genislikMm: 4000,
    boyMm: 2000,
    yukseklikMm: 2200,
    egimYuzde: 10,
    dikmeSayisi: 3,
    anaTasiyiciProfilKey: "ana",
    araTasiyiciProfilKey: "ara",
    dikmeProfilKey: "dikme",
  });
  const girdi = {
    genislikMm: 4000,
    boyMm: 2000,
    yukseklikMm: 2200,
    egimYuzde: 10,
    dikmeSayisi: 3,
    anaTasiyiciProfilKey: "ana",
    araTasiyiciProfilKey: "ara",
    dikmeProfilKey: "dikme",
  };
  const kontrol = yapiselKontrolCalistir("canopy", girdi, sonuc, { ana: GUCLU_BOX, ara: GUCLU_BOX, dikme: GUCLU_BOX });
  assert.ok(kontrol);
  assert.notEqual(kontrol!.genelDurum, "yetersiz");
});

test("sundurma kontrolü: dikme malzemesi bulunamazsa undefined döner", () => {
  const sonuc = calculateCanopy({
    genislikMm: 4000,
    boyMm: 2000,
    yukseklikMm: 2200,
    egimYuzde: 10,
    dikmeSayisi: 3,
    anaTasiyiciProfilKey: "ana",
    araTasiyiciProfilKey: "ara",
    dikmeProfilKey: "dikme",
  });
  const kontrol = yapiselKontrolCalistir("canopy", { dikmeProfilKey: "dikme" }, sonuc, {});
  assert.equal(kontrol, undefined);
});
