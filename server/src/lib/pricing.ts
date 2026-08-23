import { Material } from "@prisma/client";

export interface MalzemeMaliyetSatiri {
  netCost: number;
  boughtCost: number;
  wasteCost: number;
  uyari?: string;
}

/** Bir profil malzemesinin mm başına maliyetini (TL/mm) hesaplar. */
export function costPerMm(material: Pick<Material, "unit" | "unitPrice" | "unitWeightKgPerM">): {
  value: number;
  uyari?: string;
} {
  if (material.unit === "KG") {
    if (!material.unitWeightKgPerM) {
      return { value: 0, uyari: `"${(material as any).name ?? "Malzeme"}" için kg/m ağırlık bilgisi girilmemiş; maliyet hesaplanamadı.` };
    }
    return { value: (material.unitWeightKgPerM / 1000) * material.unitPrice };
  }
  // M (metre) birimi - varsayılan
  return { value: material.unitPrice / 1000 };
}

/**
 * Bir malzeme için net kullanılan uzunluk (kesim listesindeki parçalar) ile
 * satın alınan toplam çubuk uzunluğu (kesim planındaki çubuk sayısı x standart boy)
 * üzerinden net malzeme maliyeti ve fire maliyetini ayırır.
 */
export function calculateMaterialLineCost(
  material: Pick<Material, "unit" | "unitPrice" | "unitWeightKgPerM" | "standardLengthM" | "name">,
  netLengthMm: number,
  totalBars: number
): MalzemeMaliyetSatiri {
  const { value: mmFiyat, uyari } = costPerMm(material);
  const netCost = netLengthMm * mmFiyat;
  const boughtLengthMm = totalBars * (material.standardLengthM ?? 0) * 1000;
  const boughtCost = boughtLengthMm * mmFiyat;
  const wasteCost = Math.max(0, boughtCost - netCost);
  return {
    netCost: Math.round(netCost * 100) / 100,
    boughtCost: Math.round(boughtCost * 100) / 100,
    wasteCost: Math.round(wasteCost * 100) / 100,
    uyari,
  };
}
