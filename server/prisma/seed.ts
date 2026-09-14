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
      { key: "stairs", name: "Düz Merdiven", description: "Düz (tek kollu) çelik merdiven, isteğe bağlı korkuluk" },
      { key: "spiral_stairs", name: "Döner Merdiven", description: "Merkez kolon etrafında dönen spiral merdiven" },
      { key: "canopy", name: "Sundurma", description: "Sundurma / kanopi çatı sistemi" },
      { key: "door", name: "Kapı", description: "Demir kapı (kasa + kanat)" },
      { key: "wall", name: "Çelik Duvar Paneli", description: "Prefabrik/çelik karkas duvar paneli (dikme + ray + boşluklar)" },
      { key: "truss", name: "Çatı Kafesi", description: "Kral kirişi tipi çatı makası (üst/alt başlık + kral kirişi)" },
      { key: "shelf", name: "Raf", description: "Depo/atölye rafı (4 ayak + çok seviyeli çerçeve, opsiyonel sac yüzey)" },
      { key: "pergola", name: "Pergola", description: "Serbest duran, açık latalı gölgelik yapısı" },
      { key: "ferforje_panel", name: "Ferforje Panel", description: "Dekoratif demir panel / pencere korkuluğu" },
      { key: "steel_frame", name: "Kolon-Kiriş İskelet", description: "Genel amaçlı çelik taşıyıcı iskelet (kolon + kiriş, tek/çok açıklıklı)" },
      {
        key: "container",
        name: "Konteyner Ev/Ofis",
        description: "2 katlı konteyner dönüşümü: pencere/kapı boşluk çerçevesi, dış kaplama, kat arası merdiven + korkuluk, 2. kat çelik iskeleti",
      },
      { key: "custom", name: "Manuel / Çelik Konstrüksiyon", description: "Elle parça girişi, hazır şablona bağlı değil" },
    ],
    skipDuplicates: true,
  });
  // "stairs" adı önceden "Merdiven" idi; döner merdiven eklenince ayrım için yeniden adlandırıldı.
  await prisma.productTemplate.updateMany({
    where: { key: "stairs", name: "Merdiven" },
    data: { name: "Düz Merdiven", description: "Düz (tek kollu) çelik merdiven, isteğe bağlı korkuluk" },
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

  // fiyat: TEPECİLER DEMİR TİCARETİ "Boyalı Profil Satış Listesi" fişindeki "TL" (liste) sütunundan
  // (TL/kg). Verilmezse (mevcut ölçülerden bazıları listede yer almıyor) BIRIM_FIYAT_KG yer tutucusu
  // kullanılır.
  const kutuProfiller: { boyut: string; a: number; b: number; t: number; fiyat?: number }[] = [
    { boyut: "20x20x2", a: 20, b: 20, t: 2 },
    { boyut: "40x40x2", a: 40, b: 40, t: 2, fiyat: 119.64 },
    { boyut: "40x40x3", a: 40, b: 40, t: 3, fiyat: 172.25 },
    { boyut: "50x50x2", a: 50, b: 50, t: 2, fiyat: 151.62 },
    { boyut: "50x50x3", a: 50, b: 50, t: 3, fiyat: 217.53 },
    { boyut: "60x40x2", a: 60, b: 40, t: 2, fiyat: 151.62 },
    { boyut: "60x40x3", a: 60, b: 40, t: 3, fiyat: 217.53 },
    { boyut: "80x80x3", a: 80, b: 80, t: 3, fiyat: 360.3 },
    { boyut: "80x80x4", a: 80, b: 80, t: 4 },
    { boyut: "100x50x3", a: 100, b: 50, t: 3, fiyat: 333.67 },
    { boyut: "100x100x3", a: 100, b: 100, t: 3, fiyat: 460.63 },
    // Tepeciler fişindeki, katalogda henüz olmayan ek ölçüler:
    { boyut: "10x20x1", a: 10, b: 20, t: 1, fiyat: 23.46 },
    { boyut: "10x30x1", a: 10, b: 30, t: 1, fiyat: 30.54 },
    { boyut: "10x30x1.2", a: 10, b: 30, t: 1.2, fiyat: 36.29 },
    { boyut: "10x30x1.5", a: 10, b: 30, t: 1.5, fiyat: 51.91 },
    { boyut: "20x30x1", a: 20, b: 30, t: 1, fiyat: 37.2 },
    { boyut: "20x30x1.2", a: 20, b: 30, t: 1.2, fiyat: 45.07 },
    { boyut: "20x30x1.5", a: 20, b: 30, t: 1.5, fiyat: 62.97 },
    { boyut: "30x30x1.2", a: 30, b: 30, t: 1.2, fiyat: 53.38 },
    { boyut: "30x30x1.5", a: 30, b: 30, t: 1.5, fiyat: 73.81 },
    { boyut: "30x30x2", a: 30, b: 30, t: 2, fiyat: 91.05 },
    { boyut: "30x40x1", a: 30, b: 40, t: 1, fiyat: 53.61 },
    { boyut: "30x40x1.2", a: 30, b: 40, t: 1.2, fiyat: 63.03 },
    { boyut: "30x40x1.5", a: 30, b: 40, t: 1.5, fiyat: 85.4 },
    { boyut: "30x40x2", a: 30, b: 40, t: 2, fiyat: 105.95 },
    { boyut: "40x40x1.2", a: 40, b: 40, t: 1.2, fiyat: 72.06 },
    { boyut: "40x40x1.5", a: 40, b: 40, t: 1.5, fiyat: 97.8 },
    { boyut: "40x40x2.5", a: 40, b: 40, t: 2.5, fiyat: 144.47 },
    { boyut: "40x60x1.5", a: 40, b: 60, t: 1.5, fiyat: 124.66 },
    { boyut: "40x60x2.5", a: 40, b: 60, t: 2.5, fiyat: 182.37 },
    { boyut: "40x80x1.5", a: 40, b: 80, t: 1.5, fiyat: 155.38 },
    { boyut: "40x80x2", a: 40, b: 80, t: 2, fiyat: 184.86 },
    { boyut: "40x80x2.5", a: 40, b: 80, t: 2.5, fiyat: 222.6 },
    { boyut: "40x80x3", a: 40, b: 80, t: 3, fiyat: 265.62 },
    { boyut: "40x100x2", a: 40, b: 100, t: 2, fiyat: 226.92 },
    { boyut: "40x100x2.5", a: 40, b: 100, t: 2.5, fiyat: 264.91 },
    { boyut: "40x100x3", a: 40, b: 100, t: 3, fiyat: 316.19 },
    { boyut: "50x100x2", a: 50, b: 100, t: 2, fiyat: 241.49 },
    { boyut: "50x100x2.5", a: 50, b: 100, t: 2.5, fiyat: 283.78 },
    { boyut: "80x80x2", a: 80, b: 80, t: 2, fiyat: 259.56 },
    { boyut: "80x80x2.5", a: 80, b: 80, t: 2.5, fiyat: 303.49 },
    { boyut: "80x80x6", a: 80, b: 80, t: 6, fiyat: 676.74 },
    { boyut: "60x120x2.5", a: 60, b: 120, t: 2.5, fiyat: 341.3 },
    { boyut: "60x120x3", a: 60, b: 120, t: 3, fiyat: 409.18 },
    { boyut: "100x100x2", a: 100, b: 100, t: 2, fiyat: 332.26 },
    { boyut: "100x100x2.5", a: 100, b: 100, t: 2.5, fiyat: 390.1 },
    { boyut: "100x100x4", a: 100, b: 100, t: 4, fiyat: 604.89 },
    { boyut: "120x120x3", a: 120, b: 120, t: 3, fiyat: 560.26 },
    { boyut: "30x20x2", a: 30, b: 20, t: 2, fiyat: 75.45 },
    { boyut: "90x90x2.5", a: 90, b: 90, t: 2.5, fiyat: 341.3 },
    { boyut: "70x70x5", a: 70, b: 70, t: 5, fiyat: 497.3 },
    { boyut: "60x60x5", a: 60, b: 60, t: 5, fiyat: 420.39 },
  ];

  const BIRIM_FIYAT_KG = 45; // TL/kg - başlangıç yer tutucu, Ayarlar/Malzemeler'den güncellenmeli
  const TEDARIKCI_TEPECILER = "Tepeciler Demir Ticareti";

  for (const p of kutuProfiller) {
    const mevcut = await prisma.material.findFirst({ where: { section: p.boyut, category: "PROFILE" } });
    const sekilAlanlari = { profilSekli: "BOX" as const, widthMm: p.a, heightMm: p.b };
    if (mevcut) {
      const fiyatDegisti = p.fiyat != null && p.fiyat !== mevcut.unitPrice;
      await prisma.material.update({
        where: { id: mevcut.id },
        data: {
          ...sekilAlanlari,
          ...(fiyatDegisti
            ? { unitPrice: p.fiyat, supplier: TEDARIKCI_TEPECILER, priceHistory: { create: { price: p.fiyat! } } }
            : {}),
        },
      });
    } else {
      const fiyat = p.fiyat ?? BIRIM_FIYAT_KG;
      await prisma.material.create({
        data: {
          name: `${p.boyut} Kutu Profil`,
          category: "PROFILE",
          section: p.boyut,
          thicknessMm: p.t,
          standardLengthM: 6,
          unit: "KG",
          unitPrice: fiyat,
          unitWeightKgPerM: kutuProfilAgirlik(p.a, p.b, p.t),
          kerfMm: 3,
          stockQty: 20,
          minStockQty: 5,
          supplier: p.fiyat != null ? TEDARIKCI_TEPECILER : undefined,
          ...sekilAlanlari,
          priceHistory: { create: { price: fiyat } },
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
    const sekilAlanlari = { profilSekli: "FLAT" as const, widthMm: p.en };
    if (mevcut) {
      await prisma.material.update({ where: { id: mevcut.id }, data: sekilAlanlari });
    } else {
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
          ...sekilAlanlari,
          priceHistory: { create: { price: BIRIM_FIYAT_KG } },
        },
      });
    }
  }

  const yuvarlaklar: number[] = [8, 10, 12, 14, 16, 18, 20, 25, 30];
  for (const d of yuvarlaklar) {
    const boyut = `Ø${d}`;
    const mevcut = await prisma.material.findFirst({ where: { section: boyut, category: "PROFILE", name: { contains: "Yuvarlak" } } });
    const sekilAlanlari = { profilSekli: "ROUND_SOLID" as const, widthMm: d };
    if (mevcut) {
      await prisma.material.update({ where: { id: mevcut.id }, data: sekilAlanlari });
    } else {
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
          ...sekilAlanlari,
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
    const sekilAlanlari = { profilSekli: "ANGLE" as const, widthMm: p.a };
    if (mevcut) {
      await prisma.material.update({ where: { id: mevcut.id }, data: sekilAlanlari });
    } else {
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
          ...sekilAlanlari,
          priceHistory: { create: { price: BIRIM_FIYAT_KG } },
        },
      });
    }
  }

  const borular: { boyut: string; d: number; t: number; fiyat?: number }[] = [
    { boyut: "Ø21.3x2", d: 21.3, t: 2, fiyat: 59.24 },
    { boyut: "Ø26.9x2", d: 26.9, t: 2, fiyat: 68.16 },
    // Fotoğraftaki 34mm/2mm listeye en yakın ölçü ama et kalınlığı (2.6mm) listede yok - yer tutucu kalıyor.
    { boyut: "Ø33.7x2.6", d: 33.7, t: 2.6 },
    { boyut: "Ø42.4x2.6", d: 42.4, t: 2.6 },
    { boyut: "Ø48.3x3", d: 48.3, t: 3, fiyat: 173.46 },
    { boyut: "Ø60.3x3", d: 60.3, t: 3, fiyat: 215.4 },
    // Tepeciler fişindeki, katalogda henüz olmayan ek ölçüler (fişteki yuvarlatılmış mm etiketiyle):
    { boyut: "32x2", d: 32, t: 2, fiyat: 80.24 },
    { boyut: "34x2", d: 34, t: 2, fiyat: 84.59 },
    { boyut: "42x1.5", d: 42, t: 1.5, fiyat: 87.84 },
    { boyut: "42x2", d: 42, t: 2, fiyat: 109.02 },
    // Not: fişte 42mm için iki ayrı 2,5mm satırı vardı (102,210 ve 129,220) - ikisi de ayrı kalem
    // olarak eklendi, kontrol edilmesi gerekiyor.
    { boyut: "42x2.5", d: 42, t: 2.5, fiyat: 102.21 },
    { boyut: "42x2.5-b", d: 42, t: 2.5, fiyat: 129.22 },
    { boyut: "42x3", d: 42, t: 3, fiyat: 151.8 },
    { boyut: "48x1.5", d: 48, t: 1.5, fiyat: 98.86 },
    { boyut: "48x2", d: 48, t: 2, fiyat: 123.29 },
    { boyut: "48x2.5", d: 48, t: 2.5, fiyat: 146.72 },
    { boyut: "60x1.5", d: 60, t: 1.5, fiyat: 124.16 },
    { boyut: "60x2", d: 60, t: 2, fiyat: 149.5 },
    { boyut: "60x2.5", d: 60, t: 2.5, fiyat: 182.67 },
    { boyut: "76x2", d: 76, t: 2, fiyat: 192.01 },
    { boyut: "76x2.5", d: 76, t: 2.5, fiyat: 232.97 },
    { boyut: "76x3", d: 76, t: 3, fiyat: 277.41 },
    { boyut: "89x2", d: 89, t: 2, fiyat: 232.7 },
    { boyut: "89x2.5", d: 89, t: 2.5, fiyat: 275.03 },
    { boyut: "89x3", d: 89, t: 3, fiyat: 326.96 },
    { boyut: "89x4", d: 89, t: 4, fiyat: 429.07 },
    { boyut: "102x2", d: 102, t: 2, fiyat: 269.27 },
    { boyut: "114x2.5", d: 114, t: 2.5, fiyat: 357.61 },
    { boyut: "114x3", d: 114, t: 3, fiyat: 425.64 },
    { boyut: "114x4", d: 114, t: 4, fiyat: 562.24 },
    { boyut: "139x4", d: 139, t: 4, fiyat: 711.66 },
  ];
  for (const p of borular) {
    const mevcut = await prisma.material.findFirst({ where: { section: p.boyut, category: "PROFILE", name: { contains: "Boru" } } });
    const sekilAlanlari = { profilSekli: "ROUND_PIPE" as const, widthMm: p.d };
    if (mevcut) {
      const fiyatDegisti = p.fiyat != null && p.fiyat !== mevcut.unitPrice;
      await prisma.material.update({
        where: { id: mevcut.id },
        data: {
          ...sekilAlanlari,
          ...(fiyatDegisti
            ? { unitPrice: p.fiyat, supplier: TEDARIKCI_TEPECILER, priceHistory: { create: { price: p.fiyat! } } }
            : {}),
        },
      });
    } else {
      const fiyat = p.fiyat ?? BIRIM_FIYAT_KG;
      await prisma.material.create({
        data: {
          name: `${p.boyut} Boru`,
          category: "PROFILE",
          section: p.boyut,
          thicknessMm: p.t,
          standardLengthM: 6,
          unit: "KG",
          unitPrice: fiyat,
          unitWeightKgPerM: boruAgirlik(p.d, p.t),
          kerfMm: 3,
          stockQty: 10,
          minStockQty: 3,
          supplier: p.fiyat != null ? TEDARIKCI_TEPECILER : undefined,
          ...sekilAlanlari,
          priceHistory: { create: { price: fiyat } },
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
    const sekilAlanlari = { profilSekli: "CHANNEL" as const, widthMm: p.b, heightMm: p.h };
    if (mevcut) {
      await prisma.material.update({ where: { id: mevcut.id }, data: sekilAlanlari });
    } else {
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
          ...sekilAlanlari,
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
    { name: "Taş Yünü İzolasyon (m²)", category: "CONSUMABLE" as const, unit: "M2" as const, unitPrice: 65, stockQty: 100, minStockQty: 20 },
    { name: "Strafor (EPS) İzolasyon (m²)", category: "CONSUMABLE" as const, unit: "M2" as const, unitPrice: 45, stockQty: 100, minStockQty: 20 },
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
