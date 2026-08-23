export * from "./units";
export * from "./types";
export * from "./railing";
export * from "./stairs";
export * from "./canopy";
export * from "./door";
export * from "./wall";
export * from "./customProduct";
export * from "./sheet";
export * from "./cutting";
export * from "./costing";

import { calculateRailing } from "./railing";
import { calculateStairs } from "./stairs";
import { calculateCanopy } from "./canopy";
import { calculateDoor } from "./door";
import { calculateWallPanel } from "./wall";
import { calculateCustomProduct } from "./customProduct";
import { UrunHesapSonucu } from "./types";
import { HesaplamaHatasi } from "./units";

/** Ürün şablon anahtarından ilgili hesaplama fonksiyonuna yönlendirir. */
export const URUN_HESAPLAYICILAR: Record<string, (girdi: any) => UrunHesapSonucu> = {
  railing: calculateRailing,
  stairs: calculateStairs,
  canopy: calculateCanopy,
  door: calculateDoor,
  wall: calculateWallPanel,
  custom: calculateCustomProduct,
};

export function calculateByTemplateKey(key: string, girdi: unknown): UrunHesapSonucu {
  const fn = URUN_HESAPLAYICILAR[key];
  if (!fn) throw new HesaplamaHatasi(`Bilinmeyen ürün şablonu: ${key}`);
  return fn(girdi);
}
