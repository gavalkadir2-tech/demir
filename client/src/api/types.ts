export type ProjectCategory =
  | "RAILING"
  | "STAIRS"
  | "CANOPY"
  | "ROOF"
  | "DOOR"
  | "FORGE"
  | "STEEL_STRUCTURE"
  | "CHASSIS"
  | "SHELF"
  | "TABLE"
  | "WORKBENCH"
  | "CUSTOM"
  | "OTHER";

export type ProjectStatus =
  | "DRAFT"
  | "CALCULATED"
  | "QUOTE_READY"
  | "QUOTE_SENT"
  | "APPROVED"
  | "IN_PRODUCTION"
  | "INSTALLING"
  | "COMPLETED"
  | "CANCELLED";

export const KATEGORI_ETIKET: Record<ProjectCategory, string> = {
  RAILING: "Korkuluk",
  STAIRS: "Merdiven",
  CANOPY: "Sundurma",
  ROOF: "Çatı",
  DOOR: "Kapı",
  FORGE: "Ferforje",
  STEEL_STRUCTURE: "Çelik Konstrüksiyon",
  CHASSIS: "Şase",
  SHELF: "Raf",
  TABLE: "Masa",
  WORKBENCH: "Tezgah",
  CUSTOM: "Özel Ürün",
  OTHER: "Diğer",
};

export const DURUM_ETIKET: Record<ProjectStatus, string> = {
  DRAFT: "Taslak",
  CALCULATED: "Hesaplandı",
  QUOTE_READY: "Teklif Hazır",
  QUOTE_SENT: "Teklif Gönderildi",
  APPROVED: "Onaylandı",
  IN_PRODUCTION: "Üretimde",
  INSTALLING: "Montajda",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};

export const DURUM_RENK: Record<ProjectStatus, string> = {
  DRAFT: "bg-neutral-200 text-neutral-700",
  CALCULATED: "bg-blue-100 text-blue-700",
  QUOTE_READY: "bg-amber-100 text-amber-700",
  QUOTE_SENT: "bg-amber-200 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-700",
  IN_PRODUCTION: "bg-purple-100 text-purple-700",
  INSTALLING: "bg-purple-200 text-purple-800",
  COMPLETED: "bg-green-200 text-green-800",
  CANCELLED: "bg-red-100 text-red-700",
};

export interface Customer {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  note?: string | null;
  createdAt: string;
  _count?: { projects: number };
  notes?: CustomerNote[];
}

export interface CustomerNote {
  id: number;
  customerId: number;
  note: string;
  createdAt: string;
}

export interface Worker {
  id: number;
  name: string;
  role?: string | null;
  active: boolean;
  createdAt: string;
}

export type ProductionTaskType = "CUTTING" | "WELDING" | "PAINTING" | "ASSEMBLY" | "INSTALLATION" | "OTHER";
export const GOREV_TURU_ETIKET: Record<ProductionTaskType, string> = {
  CUTTING: "Kesim",
  WELDING: "Kaynak",
  PAINTING: "Boya",
  ASSEMBLY: "Montaj",
  INSTALLATION: "Saha Montajı",
  OTHER: "Diğer",
};

export interface ProductionTask {
  id: number;
  projectId: number;
  type: ProductionTaskType;
  label: string;
  order: number;
  done: boolean;
  doneAt?: string | null;
  workerId?: number | null;
  worker?: Worker | null;
  createdAt: string;
}

export interface ProjectPhoto {
  id: number;
  projectId: number;
  caption?: string | null;
  dataBase64: string;
  mimeType: string;
  createdAt: string;
}

export interface StockMovement {
  id: number;
  materialId: number;
  qtyDelta: number;
  reason: string;
  supplier?: string | null;
  unitCost?: number | null;
  createdAt: string;
  project?: { id: number; title: string } | null;
}

export interface MaterialPrice {
  id: number;
  materialId: number;
  price: number;
  supplier?: string | null;
  effectiveDate: string;
}

export type MaterialCategory = "PROFILE" | "SHEET" | "CONSUMABLE" | "FASTENER" | "OTHER";
export type MaterialUnit = "M" | "KG" | "ADET" | "M2";
export type ProfilSekli = "BOX" | "ANGLE" | "CHANNEL" | "ROUND_SOLID" | "ROUND_PIPE" | "FLAT";

export const MALZEME_KATEGORI_ETIKET: Record<MaterialCategory, string> = {
  PROFILE: "Profil",
  SHEET: "Sac",
  CONSUMABLE: "Sarf Malzeme",
  FASTENER: "Bağlantı Elemanı",
  OTHER: "Diğer",
};

export const PROFIL_SEKLI_ETIKET: Record<ProfilSekli, string> = {
  BOX: "Kutu Profil",
  ANGLE: "Köşebent",
  CHANNEL: "U Profil (Kanal)",
  ROUND_SOLID: "Yuvarlak Demir",
  ROUND_PIPE: "Boru",
  FLAT: "Lama",
};

export interface Material {
  id: number;
  name: string;
  category: MaterialCategory;
  section?: string | null;
  thicknessMm?: number | null;
  standardLengthM?: number | null;
  alternatifBoylarM?: number[];
  sheetWidthMm?: number | null;
  sheetHeightMm?: number | null;
  profilSekli?: ProfilSekli | null;
  widthMm?: number | null;
  heightMm?: number | null;
  unit: MaterialUnit;
  unitPrice: number;
  unitWeightKgPerM?: number | null;
  kgPerM2?: number | null;
  kerfMm: number;
  stockQty: number;
  minStockQty: number;
  priceHistory?: MaterialPrice[];
  supplier?: string | null;
}

export interface ProductTemplate {
  id: number;
  key: string;
  name: string;
  description?: string | null;
}

export interface Part {
  id: number;
  projectId: number;
  projectItemId?: number | null;
  materialId: number;
  material: Material;
  label?: string | null;
  lengthMm: number;
  qty: number;
  note?: string | null;
}

export interface ProjectItem {
  id: number;
  templateId: number;
  template: ProductTemplate;
  name: string;
  paramsJson: Record<string, unknown>;
  resultJson: UrunHesapSonucu;
  parts?: Part[];
}

export interface HesaplananParca {
  label: string;
  profilKey: string;
  uzunlukMm: number;
  adet: number;
  not?: string;
}

export interface UrunHesapSonucu {
  parcalar: HesaplananParca[];
  profilOzet: { profilKey: string; toplamMetre: number; toplamAdetParca: number }[];
  sacKalemleri: { label: string; enMm: number; boyMm: number; kalinlikMm?: number; adet: number; not?: string }[];
  baglantiKalemleri: { label: string; birim: string; adet: number }[];
  uyarilar: string[];
  ozetDegerler: Record<string, number>;
}

export interface YapiselKontrolKalemi {
  eleman: string;
  profilAdi: string;
  yukAciklamasi: string;
  maxSehimMm: number;
  izinVerilenSehimMm: number;
  sehimUygun: boolean;
  maxGerilmeMPa: number;
  izinVerilenGerilmeMPa: number;
  gerilmeUygun: boolean;
  guvenlikOrani: number;
  durum: "uygun" | "sinirda" | "yetersiz";
  aciklama: string;
}

export interface YapiselKontrolSonucu {
  kalemler: YapiselKontrolKalemi[];
  genelDurum: "uygun" | "sinirda" | "yetersiz";
  uyari: string;
}

export type ProjectPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export const ONCELIK_ETIKET: Record<ProjectPriority, string> = {
  LOW: "Düşük",
  NORMAL: "Normal",
  HIGH: "Yüksek",
  URGENT: "Acil",
};
export const ONCELIK_RENK: Record<ProjectPriority, string> = {
  LOW: "bg-neutral-100 text-neutral-600",
  NORMAL: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-700",
};

export interface Project {
  id: number;
  customerId: number;
  customer?: Customer;
  title: string;
  category: ProjectCategory;
  status: ProjectStatus;
  note?: string | null;
  date: string;
  dueDate?: string | null;
  priority: ProjectPriority;
  laborMode: "PER_METER" | "PER_HOUR" | "FIXED";
  laborRate: number;
  overheadPercent: number;
  profitMode: "PERCENT" | "FIXED";
  profitValue: number;
  vatPercent: number;
  validityDays: number;
  stockDeducted: boolean;
  createdAt: string;
  updatedAt: string;
  items?: ProjectItem[];
  parts?: Part[];
  laborItems?: LaborItem[];
  expenses?: Expense[];
  cuttingLists?: CuttingList[];
  quotes?: Quote[];
  tasks?: ProductionTask[];
  photos?: ProjectPhoto[];
  agirlikOzeti?: { profilAgirlikKg: number; sacAgirlikKg: number; toplamAgirlikKg: number; eksikAgirlikVerisi: boolean };
  sarfTahmini?: { yuzeyAlaniM2: number; yuzeyAlaniEksikVeri: boolean; kaynakTeliTahminiKg: number; boyaTahminiKg: number };
}

export type LaborType = "WELDING" | "CUTTING" | "ASSEMBLY" | "PAINTING" | "OTHER";
export const ISCILIK_ETIKET: Record<LaborType, string> = {
  WELDING: "Kaynak",
  CUTTING: "Kesim",
  ASSEMBLY: "Montaj",
  PAINTING: "Boya",
  OTHER: "Diğer",
};

export interface LaborItem {
  id: number;
  type: LaborType;
  description?: string | null;
  hours?: number | null;
  rate?: number | null;
  fixedAmount?: number | null;
  amount: number;
}

export type ExpenseType = "TRANSPORT" | "INSTALLATION" | "PAINT" | "CONSUMABLE" | "OTHER";
export const GIDER_ETIKET: Record<ExpenseType, string> = {
  TRANSPORT: "Nakliye",
  INSTALLATION: "Montaj Gideri",
  PAINT: "Boya Malzemesi",
  CONSUMABLE: "Sarf Malzeme",
  OTHER: "Diğer Gider",
};

export interface Expense {
  id: number;
  type: ExpenseType;
  name: string;
  amount: number;
}

export interface KesimCubugu {
  cuts: number[];
  wasteMm: number;
  stockLengthMm: number;
}

export interface CuttingList {
  id: number;
  projectId: number;
  materialId: number;
  material: Material;
  groupLabel?: string | null;
  standardLengthMm: number;
  kerfMm: number;
  barsJson: KesimCubugu[];
  totalBars: number;
  totalWasteMm: number;
  wastePercent: number;
  generatedAt: string;
}

export type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED";
export const TEKLIF_DURUM_ETIKET: Record<QuoteStatus, string> = {
  DRAFT: "Taslak",
  SENT: "Gönderildi",
  ACCEPTED: "Kabul Edildi",
  REJECTED: "Reddedildi",
};

export interface QuoteItem {
  id: number;
  type: "MATERIAL" | "LABOR" | "EXPENSE" | "PRODUCT";
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
}

export interface Quote {
  id: number;
  projectId: number;
  project?: Project;
  quoteNumber: string;
  date: string;
  validUntil: string;
  status: QuoteStatus;
  materialCost: number;
  wasteCost: number;
  consumableCost: number;
  laborCost: number;
  paintCost: number;
  transportCost: number;
  installCost: number;
  otherCost: number;
  totalCost: number;
  overheadAmount: number;
  subtotalBeforeProfit: number;
  profitAmount: number;
  subtotal: number;
  vatPercent: number;
  vatAmount: number;
  total: number;
  notes?: string | null;
  items?: QuoteItem[];
}

export interface Settings {
  id: number;
  companyName: string;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  defaultVatPercent: number;
  defaultProfitPercent: number;
  currency: string;
  quoteValidityDays: number;
}

export interface Dashboard {
  aktifIsler: number;
  bekleyenTeklifler: number;
  buAyYapilanIsler: number;
  buAyToplamSatis: number;
  tahminiKar: number;
  kritikStoklar: Material[];
  sonIsler: (Project & { customer: { name: string } })[];
  gecikmisIsler: (Project & { customer: { name: string } })[];
  yaklasanIsler: (Project & { customer: { name: string } })[];
}

export interface AylikTrendVeri {
  ay: string;
  ciro: number;
  kar: number;
}

export interface KategoriKarliligiVeri {
  kategori: ProjectCategory;
  ciro: number;
  kar: number;
}

export interface EnCokKullanilanMalzeme {
  id: number;
  name: string;
  toplamMetre: number;
}
