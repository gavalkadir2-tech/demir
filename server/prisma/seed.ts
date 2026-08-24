import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Kutu profil için yaklaşık kg/m ağırlığı (ince cidarlı dikdörtgen kesit yaklaşımı). */
function kutuProfilAgirlik(aMm: number, bMm: number, tMm: number): number {
  const alanMm2 = (2 * aMm + 2 * bMm - 4 * tMm) * tMm;
  return Math.round(alanMm2 * 0.00785 * 100) / 100;
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

  const digerMalzemeler = [
    {
      name: "40x4 Lama",
      category: "PROFILE" as const,
      section: "40x4",
      standardLengthM: 6,
      unit: "KG" as const,
      unitWeightKgPerM: 1.26,
      unitPrice: BIRIM_FIYAT_KG,
      stockQty: 10,
      minStockQty: 3,
    },
    {
      name: "Ø12 Yuvarlak Demir",
      category: "PROFILE" as const,
      section: "Ø12",
      standardLengthM: 6,
      unit: "KG" as const,
      unitWeightKgPerM: 0.89,
      unitPrice: BIRIM_FIYAT_KG,
      stockQty: 10,
      minStockQty: 3,
    },
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
