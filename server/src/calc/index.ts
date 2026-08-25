export * from "./units";
export * from "./types";
export * from "./railing";
export * from "./stairs";
export * from "./spiralStairs";
export * from "./canopy";
export * from "./door";
export * from "./wall";
export * from "./roofTruss";
export * from "./shelf";
export * from "./pergola";
export * from "./ferforjePanel";
export * from "./steelFrame";
export * from "./customProduct";
export * from "./sheet";
export * from "./cutting";
export * from "./sheetNesting";
export * from "./costing";

import { calculateRailing } from "./railing";
import { calculateStairs } from "./stairs";
import { calculateSpiralStairs } from "./spiralStairs";
import { calculateCanopy } from "./canopy";
import { calculateDoor } from "./door";
import { calculateWallPanel } from "./wall";
import { calculateRoofTruss } from "./roofTruss";
import { calculateShelf } from "./shelf";
import { calculatePergola } from "./pergola";
import { calculateFerforjePanel } from "./ferforjePanel";
import { calculateSteelFrame } from "./steelFrame";
import { calculateCustomProduct } from "./customProduct";
import { UrunHesapSonucu } from "./types";
import { HesaplamaHatasi } from "./units";

/** Ürün şablon anahtarından ilgili hesaplama fonksiyonuna yönlendirir. */
export const URUN_HESAPLAYICILAR: Record<string, (girdi: any) => UrunHesapSonucu> = {
  railing: calculateRailing,
  stairs: calculateStairs,
  spiral_stairs: calculateSpiralStairs,
  canopy: calculateCanopy,
  door: calculateDoor,
  wall: calculateWallPanel,
  truss: calculateRoofTruss,
  shelf: calculateShelf,
  pergola: calculatePergola,
  ferforje_panel: calculateFerforjePanel,
  steel_frame: calculateSteelFrame,
  custom: calculateCustomProduct,
};

export function calculateByTemplateKey(key: string, girdi: unknown): UrunHesapSonucu {
  const fn = URUN_HESAPLAYICILAR[key];
  if (!fn) throw new HesaplamaHatasi(`Bilinmeyen ürün şablonu: ${key}`);
  return fn(girdi);
}
