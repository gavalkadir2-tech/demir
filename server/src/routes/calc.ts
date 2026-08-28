import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";
import { calculateByTemplateKey, UrunHesapSonucu } from "../calc";
import { calculateSheetItem } from "../calc/sheet";
import { yapiselKontrolCalistir } from "../lib/structuralCheck";

const router = Router();

const kaplamaTuruEnum = z.enum(["trapez_sac", "sandvic_panel", "etermit", "plastik_etermit", "polikarbon", "yok"]);
// Duvar dış/iç cephe kaplaması, çatı kaplamasından farklı bir seçenek kümesi kullanır (bkz. calc/kaplama.ts).
const disKaplamaTuruEnum = z.enum(["trapez_sac", "sandvic_panel", "petopan", "yok"]);
const icKaplamaTuruEnum = z.enum(["alcipan", "yok"]);

const railingSchema = z.object({
  toplamUzunlukMm: z.number(),
  yukseklikMm: z.number(),
  dikmeAraligiHedefMm: z.number(),
  ustProfilId: z.number().int(),
  altProfilId: z.number().int(),
  dikmeProfilId: z.number().int(),
  araKayitProfilId: z.number().int().optional(),
  araKayitSayisi: z.number().int().optional(),
  tabanPlakaKullan: z.boolean().optional(),
  plakaEnMm: z.number().optional(),
  plakaBoyMm: z.number().optional(),
  plakaKalinlikMm: z.number().optional(),
  plakaMalzemeId: z.number().int().optional(),
  ankrajSayisiPerPlaka: z.number().int().optional(),
  ankrajMalzemeId: z.number().int().optional(),
});

const stairsSchema = z.object({
  katYuksekligiMm: z.number(),
  genislikMm: z.number(),
  basamakYuksekligiHedefMm: z.number(),
  toplamDerinlikMm: z.number(),
  tasiyiciProfilId: z.number().int(),
  tasiyiciAdet: z.number().int().optional(),
  basamakKalinlikMm: z.number().optional(),
  basamakSacMalzemeId: z.number().int().optional(),
  korkulukYuksekligiMm: z.number().optional(),
  korkulukDikmeProfilId: z.number().int().optional(),
  korkulukUstProfilId: z.number().int().optional(),
  korkulukDikmeAraligiHedefMm: z.number().optional(),
  korkulukBaglantiMalzemeId: z.number().int().optional(),
});

const spiralStairsSchema = z.object({
  katYuksekligiMm: z.number(),
  icCapMm: z.number(),
  disCapMm: z.number(),
  toplamDonusDerecesi: z.number(),
  basamakYuksekligiHedefMm: z.number(),
  merkezKolonProfilId: z.number().int(),
  basamakDestekProfilId: z.number().int(),
  basamakKalinlikMm: z.number().optional(),
  basamakSacMalzemeId: z.number().int().optional(),
  korkulukVar: z.boolean().optional(),
  korkulukYuksekligiMm: z.number().optional(),
  korkulukDikmeProfilId: z.number().int().optional(),
  korkulukUstProfilId: z.number().int().optional(),
  korkulukBaglantiMalzemeId: z.number().int().optional(),
});

const canopySchema = z.object({
  genislikMm: z.number(),
  boyMm: z.number(),
  yukseklikMm: z.number(),
  egimYuzde: z.number(),
  dikmeSayisi: z.number().int(),
  anaTasiyiciProfilId: z.number().int(),
  araTasiyiciProfilId: z.number().int(),
  dikmeProfilId: z.number().int(),
  caprazProfilId: z.number().int().optional(),
  asikAraligiHedefMm: z.number().optional(),
  kaplamaTuru: kaplamaTuruEnum.optional(),
  kaplamaKalinlikMm: z.number().optional(),
  kaplamaMalzemeId: z.number().int().optional(),
  plakaEnMm: z.number().optional(),
  plakaBoyMm: z.number().optional(),
  plakaKalinlikMm: z.number().optional(),
  plakaMalzemeId: z.number().int().optional(),
  ankrajSayisiPerPlaka: z.number().int().optional(),
  ankrajMalzemeId: z.number().int().optional(),
});

const doorSchema = z.object({
  genislikMm: z.number(),
  yukseklikMm: z.number(),
  kasaProfilId: z.number().int(),
  kanatProfilId: z.number().int(),
  kanatBosluguMm: z.number().optional(),
  araKayitProfilId: z.number().int().optional(),
  araKayitSayisi: z.number().int().optional(),
  sacKalinlikMm: z.number().optional(),
  sacIkiYuzlu: z.boolean().optional(),
  sacMalzemeId: z.number().int().optional(),
  menteseAdet: z.number().int().optional(),
  kilitAdet: z.number().int().optional(),
  kolAdet: z.number().int().optional(),
  menteseMalzemeId: z.number().int().optional(),
  kilitMalzemeId: z.number().int().optional(),
  kolMalzemeId: z.number().int().optional(),
});

const bosluklarSchema = z.array(
  z.object({
    etiket: z.string().min(1),
    konumMm: z.number(),
    genislikMm: z.number(),
    yukseklikMm: z.number(),
    tabanYuksekligiMm: z.number().optional(),
  })
);

const wallSchema = z.object({
  genislikMm: z.number(),
  yukseklikMm: z.number(),
  dikmeAraligiHedefMm: z.number(),
  ustProfilId: z.number().int(),
  altProfilId: z.number().int(),
  dikmeProfilId: z.number().int(),
  lentoProfilId: z.number().int().optional(),
  lentoTasmaMm: z.number().optional(),
  bosluklar: bosluklarSchema.optional(),
  // Kullanıcının şematik üzerinden elle düzenlediği dikme pozisyonları (mm) - verilirse otomatik
  // eşit-aralık yerleşimi yerine doğrudan bu liste kullanılır.
  dikmePozisyonlariMm: z.array(z.number()).optional(),
  // Kullanıcının şematik üzerinden elle eklediği yatay ara profiller (tek gözde kısa segment).
  yatayAraProfilleri: z
    .array(z.object({ yMm: z.number(), xBaslangicMm: z.number(), xBitisMm: z.number() }))
    .optional(),
  disKaplamaTuru: disKaplamaTuruEnum.optional(),
  disKaplamaKalinlikMm: z.number().optional(),
  disKaplamaMalzemeId: z.number().int().optional(),
  icKaplamaTuru: icKaplamaTuruEnum.optional(),
  icKaplamaKalinlikMm: z.number().optional(),
  icKaplamaMalzemeId: z.number().int().optional(),
  dubelMalzemeId: z.number().int().optional(),
});

const trussSchema = z.object({
  acikligMm: z.number(),
  egimYuzde: z.number(),
  catiUzunluguMm: z.number(),
  kafesAraligiHedefMm: z.number(),
  ustBaslikProfilId: z.number().int(),
  altBaslikProfilId: z.number().int(),
  kralKirisiProfilId: z.number().int().optional(),
  diyagonalProfilId: z.number().int().optional(),
  diyagonalSayisi: z.number().int().optional(),
  asikProfilId: z.number().int().optional(),
  asikAraligiHedefMm: z.number().optional(),
  kaplamaTuru: kaplamaTuruEnum.optional(),
  kaplamaKalinlikMm: z.number().optional(),
  kaplamaMalzemeId: z.number().int().optional(),
  plakaEnMm: z.number().optional(),
  plakaBoyMm: z.number().optional(),
  plakaKalinlikMm: z.number().optional(),
  plakaMalzemeId: z.number().int().optional(),
  ankrajSayisiPerPlaka: z.number().int().optional(),
  ankrajMalzemeId: z.number().int().optional(),
  stabiliteBaglantisiVar: z.boolean().optional(),
  stabiliteProfilId: z.number().int().optional(),
  olukluMu: z.boolean().optional(),
  olukMesafesiMm: z.number().optional(),
  cikmaPayiMm: z.number().optional(),
  direkSayisi: z.number().int().optional(),
  direkProfilId: z.number().int().optional(),
});

const shelfSchema = z.object({
  genislikMm: z.number(),
  derinlikMm: z.number(),
  yukseklikMm: z.number(),
  rafSayisi: z.number().int(),
  ayakProfilId: z.number().int(),
  rafCercevesiProfilId: z.number().int(),
  rafSacKullan: z.boolean().optional(),
  sacKalinlikMm: z.number().optional(),
  rafSacMalzemeId: z.number().int().optional(),
  caprazProfilId: z.number().int().optional(),
  tasarimYukuKgM2: z.number().optional(),
});

const pergolaSchema = z.object({
  genislikMm: z.number(),
  boyMm: z.number(),
  yukseklikMm: z.number(),
  kolonSayisi: z.number().int(),
  kolonProfilId: z.number().int(),
  kirisProfilId: z.number().int(),
  lataProfilId: z.number().int(),
  lataYonu: z.enum(["genislik", "boy"]).optional(),
  lataAraligiHedefMm: z.number().optional(),
  plakaEnMm: z.number().optional(),
  plakaBoyMm: z.number().optional(),
  plakaKalinlikMm: z.number().optional(),
  plakaMalzemeId: z.number().int().optional(),
  ankrajSayisiPerPlaka: z.number().int().optional(),
  ankrajMalzemeId: z.number().int().optional(),
});

const ferforjePanelSchema = z.object({
  genislikMm: z.number(),
  yukseklikMm: z.number(),
  cerceveProfilId: z.number().int(),
  dikeyCubukProfilId: z.number().int(),
  dikeyCubukAraligiHedefMm: z.number().optional(),
  yatayAraKayitSayisi: z.number().int().optional(),
  yatayAraKayitProfilId: z.number().int().optional(),
  susVar: z.boolean().optional(),
  susProfilId: z.number().int().optional(),
  susSayisi: z.number().int().optional(),
  susBirimUzunlukMm: z.number().optional(),
});

const steelFrameSchema = z.object({
  acikligMm: z.number(),
  uzunlukMm: z.number(),
  yukseklikMm: z.number(),
  acikSayisi: z.number().int().optional(),
  kolonProfilId: z.number().int(),
  kirisProfilId: z.number().int(),
  cerceveAraligiHedefMm: z.number().optional(),
  baglantiKirisiProfilId: z.number().int().optional(),
  stabiliteBaglantisiVar: z.boolean().optional(),
  stabiliteProfilId: z.number().int().optional(),
  plakaEnMm: z.number().optional(),
  plakaBoyMm: z.number().optional(),
  plakaKalinlikMm: z.number().optional(),
  plakaMalzemeId: z.number().int().optional(),
  ankrajSayisiPerPlaka: z.number().int().optional(),
  ankrajMalzemeId: z.number().int().optional(),
});

const customSchema = z.object({
  parcalar: z.array(
    z.object({
      label: z.string().min(1),
      materialId: z.number().int(),
      uzunlukMm: z.number(),
      adet: z.number().int(),
      not: z.string().optional(),
    })
  ),
});

/** İstemciden gelen "...ProfilId" alanlarını hesaplama motorunun beklediği "...ProfilKey" (string) alanlarına çevirir. */
export function idToKey(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    if (k.endsWith("Id") && typeof v === "number") {
      out[k.replace(/Id$/, "Key")] = String(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export const TEMPLATE_SCHEMAS: Record<string, z.ZodTypeAny> = {
  railing: railingSchema,
  stairs: stairsSchema,
  spiral_stairs: spiralStairsSchema,
  canopy: canopySchema,
  door: doorSchema,
  wall: wallSchema,
  truss: trussSchema,
  shelf: shelfSchema,
  pergola: pergolaSchema,
  ferforje_panel: ferforjePanelSchema,
  steel_frame: steelFrameSchema,
};

export const CUSTOM_SCHEMA = customSchema;

export async function malzemeSozlugu(sonuc: UrunHesapSonucu) {
  const idler = Array.from(new Set(sonuc.parcalar.map((p) => Number(p.profilKey)).filter((n) => !Number.isNaN(n))));
  if (idler.length === 0) return {};
  const malzemeler = await prisma.material.findMany({ where: { id: { in: idler } } });
  const sozluk: Record<string, (typeof malzemeler)[number]> = {};
  for (const m of malzemeler) sozluk[String(m.id)] = m;
  return sozluk;
}

router.post(
  "/:templateKey",
  asyncHandler(async (req, res) => {
    const { templateKey } = req.params;

    let girdi: unknown;
    if (templateKey === "custom") {
      const parsed = customSchema.parse(req.body);
      girdi = { parcalar: parsed.parcalar.map((p) => ({ ...p, profilKey: String(p.materialId) })) };
    } else {
      const schema = TEMPLATE_SCHEMAS[templateKey];
      if (!schema) {
        res.status(404).json({ error: `Bilinmeyen ürün şablonu: ${templateKey}` });
        return;
      }
      const parsed = schema.parse(req.body);
      girdi = idToKey(parsed as Record<string, unknown>);
    }

    const sonuc = calculateByTemplateKey(templateKey, girdi);
    const malzemeler = await malzemeSozlugu(sonuc);
    const yapiselKontrol = yapiselKontrolCalistir(templateKey, girdi as Record<string, unknown>, sonuc, malzemeler);
    res.json({ sonuc, malzemeler, yapiselKontrol });
  })
);

const sacSchema = z.object({
  kalinlikMm: z.number(),
  enMm: z.number(),
  boyMm: z.number(),
  adet: z.number().int(),
  birimFiyatM2: z.number().optional(),
  birimFiyatKg: z.number().optional(),
  yogunlukKgM3: z.number().optional(),
});

router.post(
  "/araclar/sac",
  asyncHandler(async (req, res) => {
    const girdi = sacSchema.parse(req.body);
    res.json(calculateSheetItem(girdi));
  })
);

export default router;
