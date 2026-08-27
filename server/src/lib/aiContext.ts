import { prisma } from "./prisma";

const AY_ADI = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const KATEGORI_TR: Record<string, string> = {
  RAILING: "Korkuluk",
  STAIRS: "Merdiven",
  CANOPY: "Sundurma",
  ROOF: "Çatı",
  DOOR: "Kapı",
  FORGE: "Demirci İşi",
  STEEL_STRUCTURE: "Çelik Konstrüksiyon",
  CHASSIS: "Şasi",
  SHELF: "Raf",
  TABLE: "Masa",
  WORKBENCH: "Tezgah",
  CUSTOM: "Özel",
  OTHER: "Diğer",
};

/** İşletmenin o anki durumunu (satış/kâr/tahsilat/stok/müşteri alacakları) tek bir Türkçe metin
 * halinde özetler - serbest AI soru-cevap panelinin cevap üretirken dayanacağı tek veri kaynağı.
 * Canlı sorgu/araç çağrısı yapmaz; anlık bir anlık görüntü sağlar. */
export async function isletmeOzetiMetni(): Promise<string> {
  const now = new Date();
  const ayBasi = new Date(now.getFullYear(), now.getMonth(), 1);
  const ayBitis = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const altiAyOnce = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    aktifIsler,
    bekleyenTeklifler,
    kritikStoklar,
    gecikmisIsler,
    yaklasanIsler,
    tumKabulEdilenTeklifler,
    musteriler,
  ] = await Promise.all([
    prisma.project.count({ where: { status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    prisma.project.count({ where: { status: { in: ["QUOTE_READY", "QUOTE_SENT"] } } }),
    prisma.material.findMany({ where: { minStockQty: { gt: 0 } } }),
    prisma.project.findMany({
      where: { dueDate: { lt: now }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      include: { customer: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.project.findMany({
      where: { dueDate: { gte: now, lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      include: { customer: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.quote.findMany({
      where: { status: "ACCEPTED" },
      select: { total: true, totalCost: true, profitAmount: true, date: true, project: { select: { category: true } } },
    }),
    prisma.customer.findMany({
      include: {
        projects: {
          include: {
            quotes: { where: { status: "ACCEPTED" }, orderBy: { createdAt: "desc" }, take: 1 },
            payments: { select: { amount: true } },
          },
        },
      },
    }),
  ]);

  const kritikStoklarFiltreli = kritikStoklar.filter((m) => m.stockQty <= m.minStockQty);

  const buAyTeklifler = tumKabulEdilenTeklifler.filter((q) => q.date >= ayBasi && q.date < ayBitis);
  const buAySatis = buAyTeklifler.reduce((s, q) => s + q.total, 0);
  const buAyKar = buAyTeklifler.reduce((s, q) => s + q.profitAmount, 0);

  const toplamSatis = tumKabulEdilenTeklifler.reduce((s, q) => s + q.total, 0);
  const toplamMaliyet = tumKabulEdilenTeklifler.reduce((s, q) => s + q.totalCost, 0);
  const toplamKar = tumKabulEdilenTeklifler.reduce((s, q) => s + q.profitAmount, 0);

  // Son 6 ay aylık satış/kâr trendi
  const aylikMap = new Map<string, { satis: number; kar: number }>();
  for (const q of tumKabulEdilenTeklifler) {
    if (q.date < altiAyOnce) continue;
    const key = `${AY_ADI[q.date.getMonth()]} ${q.date.getFullYear()}`;
    const mevcut = aylikMap.get(key) ?? { satis: 0, kar: 0 };
    mevcut.satis += q.total;
    mevcut.kar += q.profitAmount;
    aylikMap.set(key, mevcut);
  }
  const aylikTrendSatiri = Array.from(aylikMap.entries())
    .map(([ay, v]) => `${ay}: satış ${Math.round(v.satis)} TL, kâr ${Math.round(v.kar)} TL`)
    .join("; ");

  // Kategori bazlı kârlılık
  const karMap = new Map<string, { ciro: number; kar: number }>();
  for (const q of tumKabulEdilenTeklifler) {
    const kategori = q.project.category;
    const mevcut = karMap.get(kategori) ?? { ciro: 0, kar: 0 };
    mevcut.ciro += q.total;
    mevcut.kar += q.profitAmount;
    karMap.set(kategori, mevcut);
  }
  const kategoriSatiri = Array.from(karMap.entries())
    .map(([k, v]) => `${KATEGORI_TR[k] ?? k}: marj %${v.ciro > 0 ? Math.round((v.kar / v.ciro) * 1000) / 10 : 0}`)
    .join("; ");

  // Müşteri bazlı alacaklar
  const alacaklar = musteriler
    .map((m) => {
      const satis = m.projects.reduce((s, p) => s + (p.quotes[0]?.total ?? 0), 0);
      const tahsilat = m.projects.reduce((s, p) => s + p.payments.reduce((a, pay) => a + pay.amount, 0), 0);
      return { isim: m.name, alacak: satis - tahsilat };
    })
    .filter((m) => m.alacak > 0)
    .sort((a, b) => b.alacak - a.alacak)
    .slice(0, 10);
  const toplamAlacak = alacaklar.reduce((s, m) => s + m.alacak, 0);

  return `[İŞLETME DURUMU - ${now.toLocaleDateString("tr-TR")} itibarıyla]

AKTİF İŞLER: ${aktifIsler} adet aktif (devam eden) iş var. ${bekleyenTeklifler} teklif müşteri onayı bekliyor.

GECİKEN İŞLER (${gecikmisIsler.length}): ${
    gecikmisIsler.map((p) => `${p.title} (${p.customer.name}, teslim: ${p.dueDate?.toLocaleDateString("tr-TR")})`).join("; ") || "yok"
  }

YAKLAŞAN TESLİMLER (${yaklasanIsler.length}, önümüzdeki 3 gün): ${
    yaklasanIsler.map((p) => `${p.title} (${p.customer.name}, teslim: ${p.dueDate?.toLocaleDateString("tr-TR")})`).join("; ") || "yok"
  }

KRİTİK STOKTAKİ MALZEMELER (${kritikStoklarFiltreli.length}): ${
    kritikStoklarFiltreli.map((m) => `${m.name} (${m.stockQty}/${m.minStockQty} ${m.unit})`).join("; ") || "yok"
  }

BU AY: Satış ${Math.round(buAySatis)} TL, Kâr ${Math.round(buAyKar)} TL

TÜM ZAMANLAR (kabul edilmiş tüm teklifler): Toplam satış ${Math.round(toplamSatis)} TL, toplam maliyet ${Math.round(
    toplamMaliyet
  )} TL, toplam kâr ${Math.round(toplamKar)} TL (marj %${toplamSatis > 0 ? Math.round((toplamKar / toplamSatis) * 1000) / 10 : 0})

SON 6 AY AYLIK TREND: ${aylikTrendSatiri || "veri yok"}

İŞ TÜRÜNE GÖRE KÂR MARJI: ${kategoriSatiri || "veri yok"}

TOPLAM AÇIK ALACAK: ${Math.round(toplamAlacak)} TL
EN YÜKSEK ALACAKLI MÜŞTERİLER: ${alacaklar.map((m) => `${m.isim}: ${Math.round(m.alacak)} TL`).join("; ") || "yok"}`;
}
