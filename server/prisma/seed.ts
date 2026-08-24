import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CELIK_YOGUNLUK = 0.00785; // kg/mm² başına (7850 kg/m³) - kesit alanından kg/m bulmak için çarpan

/** Kutu profil için yaklaşık kg/m ağırlığı (ince cidarlı dikdörtgen kesit yaklaşımı). */
function kutuProfilAgirlik(aMm: number, bMm: number, tMm: number): number {
  const alanMm2 = (2 * aMm + 2 * bMm - 4 * tMm) * tMm;
  return Math.round(alanMm2 * CELIK_YOGUNLUK * 100) / 100;
}

/** Lama (düz demir) için kg/m ağırlığı: en x kalınlık kesiti. */
function lamaAgirlik(enMm: number, tMm: number): number {
  return Math.round(enMm * tMm * CELIK_YOGUNLUK * 100) / 100;
}

/** Yuvarlak demir (dolu daire kesit) için kg/m ağırlığı. */
function yuvarlakAgirlik(dMm: number): number {
  const alanMm2 = Math.PI * (dMm / 2) ** 2;
  return Math.round(alanMm2 * CELIK_YOGUNLUK * 100) / 100;
}

/** Köşebent (eşit kollu L profil, köşe radüsü ihmal edilmiş kaba yaklaşım) için kg/m ağırlığı. */
function kosebentAgirlik(aMm: number, tMm: number): number {
  const alanMm2 = tMm * (2 * aMm - tMm);
  return Math.round(alanMm2 * CELIK_YOGUNLUK * 100) / 100;
}

/** Boru (yuvarlak, içi boş) için kg/m ağırlığı. dMm: dış çap, tMm: et kalınlığı. */
function boruAgirlik(dMm: number, tMm: number): number {
  const disAlan = Math.PI * (dMm / 2) ** 2;
  const icAlan = Math.PI * ((dMm - 2 * tMm) / 2) ** 2;
  return Math.round((disAlan - icAlan) * CELIK_YOGUNLUK * 100) / 100;
}

/** U (kanal) profil için kg/m ağırlığı: gövde + iki kanat, ince cidarlı kaba yaklaşım. */
function uProfilAgirlik(hMm: number, bMm: number, tMm: number): number {
  const alanMm2 = tMm * (hMm + 2 * bMm - 2 * tMm);
  return Math.round(alanMm2 * CELIK_YOGUNLUK * 100) / 100;
}

async function main() {
  await prisma.productTemplate.createMany({
    data: [
      { key: "railing", name: "Korkuluk", description: "Bahçe, balkon, teras korkuluğu" },
      { key: "stairs", name: "Merdiven", description: "Çelik merdiven, isteğe bağlı korkuluk" },
      { key: "canopy", name: "Sundurma", description: "Sundurma / kanopi çatı sistemi" },
      { key: "door", name: "Kapı", description: "Demir kapı (kasa + kanat)" },
      { key: "wall", name: "Çelik Duvar Paneli", description: "Prefabrik/çelik karkas duvar paneli (dikme + ray + boşluklar)" },
      { key: "truss", name: "Çatı Kafesi", description: "Kral kirişi tipi çatı makası (üst/alt başlık + kral kirişi)" },
      { key: "custom", name: "Manuel / Çelik Konstrüksiyon", description: "Elle parça girişi, hazır şablona bağlı değil" },
    ],
    skipDuplicates: true,
  });

  await prisma.settings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      companyName: "Atölyem Demir Doğrama",
      defaultVatPercent: 20,
      defaultProfitPercent: 20,
      currency: "TRY",
      quoteValidityDays: 15,
    },
    update: {},
  });

  const kutuProfiller: { boyut: string; a: number; b: number; t: number }[] = [
    { boyut: "20x20x2", a: 20, b: 20, t: 2 },
    { boyut: "40x40x2", a: 40, b: 40, t: 2 },
    { boyut: "40x40x3", a: 40, b: 40, t: 3 },
    { boyut: "50x50x2", a: 50, b: 50, t: 2 },
    { boyut: "50x50x3", a: 50, b: 50, t: 3 },
    { boyut: "60x40x2", a: 60, b: 40, t: 2 },
    { boyut: "60x40x3", a: 60, b: 40, t: 3 },
    { boyut: "80x80x3", a: 80, b: 80, t: 3 },
    { boyut: "80x80x4", a: 80, b: 80, t: 4 },
    { boyut: "100x50x3", a: 100, b: 50, t: 3 },
    { boyut: "100x100x3", a: 100, b: 100, t: 3 },
  ];

  const BIRIM_FIYAT_KG = 45; // TL/kg - başlangıç yer tutucu, Ayarlar/Malzemeler'den güncellenmeli

  for (const p of kutuProfiller) {
    const mevcut = await prisma.material.findFirst({ where: { section: p.boyut, category: "PROFILE" } });
    if (!mevcut) {
      await prisma.material.create({
        data: {
          name: `${p.boyut} Kutu Profil`,
          category: "PROFILE",
          section: p.boyut,
          thicknessMm: p.t,
          standardLengthM: 6,
          unit: "KG",
          unitPrice: BIRIM_FIYAT_KG,
          unitWeightKgPerM: kutuProfilAgirlik(p.a, p.b, p.t),
          kerfMm: 3,
          stockQty: 20,
          minStockQty: 5,
          priceHistory: { create: { price: BIRIM_FIYAT_KG } },
        },
      });
    }
  }

  const lamalar: { boyut: string; en: number; t: number }[] = [
    { boyut: "20x3", en: 20, t: 3 },
    { boyut: "25x3", en: 25, t: 3 },
    { boyut: "25x5", en: 25, t: 5 },
    { boyut: "30x3", en: 30, t: 3 },
    { boyut: "30x5", en: 30, t: 5 },
    { boyut: "40x4", en: 40, t: 4 },
    { boyut: "40x5", en: 40, t: 5 },
    { boyut: "40x6", en: 40, t: 6 },
    { boyut: "50x5", en: 50, t: 5 },
    { boyut: "50x6", en: 50, t: 6 },
    { boyut: "60x6", en: 60, t: 6 },
    { boyut: "60x8", en: 60, t: 8 },
    { boyut: "80x8", en: 80, t: 8 },
    { boyut: "100x10", en: 100, t: 10 },
  ];
  for (const p of lamalar) {
    const mevcut = await prisma.material.findFirst({ where: { section: p.boyut, category: "PROFILE", name: { contains: "Lama" } } });
    if (!mevcut) {
      await prisma.material.create({
        data: {
          name: `${p.boyut} Lama`,
          category: "PROFILE",
          section: p.boyut,
          thicknessMm: p.t,
          standardLengthM: 6,
          unit: "KG",
          unitPrice: BIRIM_FIYAT_KG,
          unitWeightKgPerM: lamaAgirlik(p.en, p.t),
          kerfMm: 3,
          stockQty: 10,
          minStockQty: 3,
          priceHistory: { create: { price: BIRIM_FIYAT_KG } },
        },
      });
    }
  }

  const yuvarlaklar: number[] = [8, 10, 12, 14, 16, 18, 20, 25, 30];
  for (const d of yuvarlaklar) {
    const boyut = `Ø${d}`;
    const mevcut = await prisma.material.findFirst({ where: { section: boyut, category: "PROFILE", name: { contains: "Yuvarlak" } } });
    if (!mevcut) {
      await prisma.material.create({
        data: {
          name: `${boyut} Yuvarlak Demir`,
          category: "PROFILE",
          section: boyut,
          standardLengthM: 6,
          unit: "KG",
          unitPrice: BIRIM_FIYAT_KG,
          unitWeightKgPerM: yuvarlakAgirlik(d),
          kerfMm: 3,
          stockQty: 10,
          minStockQty: 3,
          priceHistory: { create: { price: BIRIM_FIYAT_KG } },
        },
      });
    }
  }

  const kosebentler: { boyut: string; a: number; t: number }[] = [
    { boyut: "20x20x3", a: 20, t: 3 },
    { boyut: "25x25x3", a: 25, t: 3 },
    { boyut: "30x30x3", a: 30, t: 3 },
    { boyut: "30x30x4", a: 30, t: 4 },
    { boyut: "40x40x4", a: 40, t: 4 },
    { boyut: "40x40x5", a: 40, t: 5 },
    { boyut: "50x50x5", a: 50, t: 5 },
    { boyut: "50x50x6", a: 50, t: 6 },
    { boyut: "60x60x6", a: 60, t: 6 },
    { boyut: "70x70x7", a: 70, t: 7 },
    { boyut: "80x80x8", a: 80, t: 8 },
  ];
  for (const p of kosebentler) {
    const mevcut = await prisma.material.findFirst({ where: { section: p.boyut, category: "PROFILE", name: { contains: "Köşebent" } } });
    if (!mevcut) {
      await prisma.material.create({
        data: {
          name: `${p.boyut} Köşebent`,
          category: "PROFILE",
          section: p.boyut,
          thicknessMm: p.t,
          standardLengthM: 6,
          unit: "KG",
          unitPrice: BIRIM_FIYAT_KG,
          unitWeightKgPerM: kosebentAgirlik(p.a, p.t),
          kerfMm: 3,
          stockQty: 10,
          minStockQty: 3,
          priceHistory: { create: { price: BIRIM_FIYAT_KG } },
        },
      });
    }
  }

  const borular: { boyut: string; d: number; t: number }[] = [
    { boyut: "Ø21.3x2", d: 21.3, t: 2 },
    { boyut: "Ø26.9x2", d: 26.9, t: 2 },
    { boyut: "Ø33.7x2.6", d: 33.7, t: 2.6 },
    { boyut: "Ø42.4x2.6", d: 42.4, t: 2.6 },
    { boyut: "Ø48.3x3", d: 48.3, t: 3 },
    { boyut: "Ø60.3x3", d: 60.3, t: 3 },
  ];
  for (const p of borular) {
    const mevcut = await prisma.material.findFirst({ where: { section: p.boyut, category: "PROFILE", name: { contains: "Boru" } } });
    if (!mevcut) {
      await prisma.material.create({
        data: {
          name: `${p.boyut} Boru`,
          category: "PROFILE",
          section: p.boyut,
          thicknessMm: p.t,
          standardLengthM: 6,
          unit: "KG",
          unitPrice: BIRIM_FIYAT_KG,
          unitWeightKgPerM: boruAgirlik(p.d, p.t),
          kerfMm: 3,
          stockQty: 10,
          minStockQty: 3,
          priceHistory: { create: { price: BIRIM_FIYAT_KG } },
        },
      });
    }
  }

  const uProfiller: { boyut: string; h: number; b: number; t: number }[] = [
    { boyut: "U40", h: 40, b: 20, t: 4 },
    { boyut: "U50", h: 50, b: 25, t: 4.5 },
    { boyut: "U65", h: 65, b: 30, t: 5 },
    { boyut: "U80", h: 80, b: 35, t: 5.5 },
    { boyut: "U100", h: 100, b: 40, t: 6 },
    { boyut: "U120", h: 120, b: 45, t: 7 },
  ];
  for (const p of uProfiller) {
    const mevcut = await prisma.material.findFirst({ where: { section: p.boyut, category: "PROFILE", name: { contains: "U Profil" } } });
    if (!mevcut) {
      await prisma.material.create({
        data: {
          name: `${p.boyut} U Profil`,
          category: "PROFILE",
          section: p.boyut,
          thicknessMm: p.t,
          standardLengthM: 6,
          unit: "KG",
          unitPrice: BIRIM_FIYAT_KG,
          unitWeightKgPerM: uProfilAgirlik(p.h, p.b, p.t),
          kerfMm: 3,
          stockQty: 10,
          minStockQty: 3,
          priceHistory: { create: { price: BIRIM_FIYAT_KG } },
        },
      });
    }
  }

  const digerMalzemeler = [
    {
      name: "2mm Siyah Sac (1250x2500)",
      category: "SHEET" as const,
      thicknessMm: 2,
      sheetWidthMm: 1250,
      sheetHeightMm: 2500,
      unit: "KG" as const,
      unitPrice: 42,
      stockQty: 5,
      minStockQty: 2,
    },
    { name: "Kaynak Teli", category: "CONSUMABLE" as const, unit: "KG" as const, unitPrice: 180, stockQty: 10, minStockQty: 2 },
    { name: "Kesme Taşı", category: "CONSUMABLE" as const, unit: "ADET" as const, unitPrice: 25, stockQty: 30, minStockQty: 10 },
    { name: "Taşlama Taşı", category: "CONSUMABLE" as const, unit: "ADET" as const, unitPrice: 30, stockQty: 20, minStockQty: 5 },
    { name: "Astar Boya", category: "CONSUMABLE" as const, unit: "KG" as const, unitPrice: 90, stockQty: 8, minStockQty: 2 },
    { name: "Son Kat Boya", category: "CONSUMABLE" as const, unit: "KG" as const, unitPrice: 110, stockQty: 8, minStockQty: 2 },
    { name: "Ankraj (Kimyasal Dübel)", category: "FASTENER" as const, unit: "ADET" as const, unitPrice: 12, stockQty: 100, minStockQty: 20 },
    { name: "Menteşe", category: "FASTENER" as const, unit: "ADET" as const, unitPrice: 45, stockQty: 20, minStockQty: 5 },
    { name: "Kapı Kilidi", category: "FASTENER" as const, unit: "ADET" as const, unitPrice: 220, stockQty: 5, minStockQty: 2 },
    { name: "Kapı Kolu", category: "FASTENER" as const, unit: "ADET" as const, unitPrice: 150, stockQty: 5, minStockQty: 2 },
  ];

  for (const m of digerMalzemeler) {
    const mevcut = await prisma.material.findFirst({ where: { name: m.name } });
    if (!mevcut) {
      await prisma.material.create({ data: { ...m, priceHistory: { create: { price: m.unitPrice } } } });
    }
  }

  console.log("Seed tamamlandı.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
