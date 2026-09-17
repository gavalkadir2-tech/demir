import { Router } from "express";
import { z } from "zod";
import path from "path";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";

const router = Router();

// pdfkit'in yerleşik Helvetica fontu Türkçe karakterleri (ş, ğ, ı, İ, ö, ü, ç) desteklemiyor
// (WinAnsi/CP1252 kodlamasıyla sınırlı) - bunun yerine geniş Unicode kapsamlı DejaVu Sans
// gömülü font olarak kullanılıyor.
const FONT_DIR = path.join(path.dirname(require.resolve("dejavu-fonts-ttf/package.json")), "ttf");
const FONT_GOVDE = path.join(FONT_DIR, "DejaVuSans.ttf");
const FONT_GOVDE_KALIN = path.join(FONT_DIR, "DejaVuSans-Bold.ttf");

/** Ayarlar'daki logoUrl'i (http(s) URL veya data: URI) PDF'e gömülebilecek bir Buffer'a çevirir.
 * Ağ hatası/geçersiz URL gibi durumlarda PDF üretimini bozmamak için null döner. */
async function logoBufferGetir(logoUrl: string | null | undefined): Promise<Buffer | null> {
  if (!logoUrl) return null;
  try {
    if (logoUrl.startsWith("data:")) {
      const base64 = logoUrl.split(",")[1];
      return base64 ? Buffer.from(base64, "base64") : null;
    }
    if (!/^https?:\/\//.test(logoUrl)) return null;
    const resp = await fetch(logoUrl);
    if (!resp.ok) return null;
    return Buffer.from(await resp.arrayBuffer());
  } catch {
    return null;
  }
}

interface KonteynerPdfBilgi {
  genislikMm: number;
  uzunlukMm: number;
  katYuksekligiMm: number;
  katSayisi: number;
  catiVar?: boolean;
  catiEgimYuzde?: number;
  /** bkz. client CatiKafesiSemaVeri.catiTipi / server calc/roofTruss.ts CatiTipi. */
  catiTipi?: string;
}

/** Konteyner ürününün paramsJson'ından PDF'te çizim için gereken temel ölçüleri çıkarır. */
function konteynerPdfBilgisiCikar(paramsJson: unknown): KonteynerPdfBilgi | null {
  if (!paramsJson || typeof paramsJson !== "object") return null;
  const p = paramsJson as Record<string, unknown>;
  const genislikMm = Number(p.genislikMm);
  const uzunlukMm = Number(p.uzunlukMm);
  if (!genislikMm || !uzunlukMm) return null;
  const cati = p.cati as Record<string, unknown> | undefined;
  const catiTipi = cati && typeof cati.catiTipi === "string" ? cati.catiTipi : undefined;
  return {
    genislikMm,
    uzunlukMm,
    katYuksekligiMm: Number(p.katYuksekligiMm) || 0,
    katSayisi: Number(p.katSayisi) === 2 ? 2 : 1,
    catiVar: Boolean(p.catiVar),
    // "duz" çatı tipinde eğim hesaplama motorunda yok sayılır (bkz. calc/roofTruss.ts) - burada da
    // ham girdi değeri değil, gerçekte uygulanan %0 gösterilmeli.
    catiEgimYuzde: cati && catiTipi !== "duz" ? Number(cati.egimYuzde) || undefined : undefined,
    catiTipi,
  };
}

/** Konteynerin üstten planını (basit dikdörtgen) ve varsa çatı kesitini (temsili üçgen) pdfkit
 * vektör çizimiyle çizer - fotoğrafik değil, teklif dokümanında ölçü hissi vermek içindir. Bir
 * sonraki içeriğin başlayabileceği y konumunu döner. */
function konteynerSemaCiz(doc: PDFKit.PDFDocument, bilgi: KonteynerPdfBilgi, x: number, y: number): number {
  const maxW = 180;
  const maxH = 80;
  const { genislikMm, uzunlukMm, katYuksekligiMm, katSayisi, catiVar, catiEgimYuzde, catiTipi = "acik_besik" } = bilgi;
  const scale = Math.min(maxW / uzunlukMm, maxH / genislikMm);
  const w = Math.max(30, uzunlukMm * scale);
  const h = Math.max(20, genislikMm * scale);

  doc.fontSize(9).font("Govde-Kalin").fillColor("#000").text("Konteyner Planı (üstten görünüş, ölçekli, temsili)", x, y);
  const boxY = y + 14;
  doc.rect(x, boxY, w, h).lineWidth(1).strokeColor("#404040").stroke();

  doc.fontSize(7).font("Govde").fillColor("#666");
  const olcuMetni = `${Math.round(uzunlukMm)} x ${Math.round(genislikMm)} mm, kat yüksekliği ${Math.round(katYuksekligiMm)} mm, ${katSayisi} kat${
    catiVar ? (catiTipi === "duz" ? ", çatı eğimsiz (düz)" : `, çatı eğimi %${catiEgimYuzde ?? "-"}`) : ""
  }`;
  doc.text(olcuMetni, x, boxY + h + 6, { width: Math.max(w, 260) });

  let sonrakiY = boxY + h + 22;

  if (catiVar) {
    // "duz" eğimsizdir (mahya yok, tek düz çizgi); "sundurma" tek eğimlidir (mahya yok, tek eğik
    // çizgi); diğerleri (açık beşik/çatı katı/kırma) görsel olarak simetrik iki eğimli üçgeni
    // kullanır - bkz. client TrussSchematic/TrussIsometricView'daki aynı basitleştirme.
    const roofBaseY = sonrakiY + 32;
    const ridgeX = x + w / 2;
    const ridgeY = roofBaseY - 26;
    const CATI_TIPI_ETIKET: Record<string, string> = {
      duz: "Düz (yassı) çatı - eğimsiz (temsili, ölçekli değil)",
      sundurma: "Sundurma çatı - tek eğimli (temsili, ölçekli değil)",
      catikati: "Çatı katı kesiti - diz duvarı üzerinde (temsili, ölçekli değil)",
      kirma: "Kırma çatı kesiti - uçlarda pah eklenir (temsili, ölçekli değil)",
      acik_besik: "Açık beşik çatı kesiti (temsili, ölçekli değil)",
    };
    if (catiTipi === "duz") {
      doc.moveTo(x, roofBaseY).lineTo(x + w, roofBaseY).strokeColor("#7c3aed").lineWidth(1.5).stroke();
    } else if (catiTipi === "sundurma") {
      doc.moveTo(x, roofBaseY).lineTo(x + w, ridgeY).strokeColor("#7c3aed").lineWidth(1.5).stroke();
    } else {
      doc
        .moveTo(x, roofBaseY)
        .lineTo(ridgeX, ridgeY)
        .lineTo(x + w, roofBaseY)
        .strokeColor("#7c3aed")
        .lineWidth(1)
        .stroke();
    }
    if (catiTipi === "catikati") {
      const dizY = roofBaseY + 10;
      doc.moveTo(x, roofBaseY).lineTo(x, dizY).strokeColor("#2563eb").lineWidth(1.5).stroke();
      doc.moveTo(x + w, roofBaseY).lineTo(x + w, dizY).strokeColor("#2563eb").lineWidth(1.5).stroke();
      doc.moveTo(x, dizY).lineTo(x + w, dizY).strokeColor("#404040").stroke();
    } else {
      doc.moveTo(x, roofBaseY).lineTo(x + w, roofBaseY).strokeColor("#404040").stroke();
    }
    doc.fontSize(7).fillColor("#666").text(CATI_TIPI_ETIKET[catiTipi] ?? CATI_TIPI_ETIKET.acik_besik, x, roofBaseY + (catiTipi === "catikati" ? 14 : 4));
    sonrakiY = roofBaseY + (catiTipi === "catikati" ? 28 : 18);
  }

  doc.fillColor("#000").font("Govde").fontSize(10);
  return sonrakiY;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const teklifler = await prisma.quote.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: "desc" },
      include: { project: { include: { customer: true } } },
    });
    res.json(teklifler);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const teklif = await prisma.quote.findUniqueOrThrow({
      where: { id: Number(req.params.id) },
      include: { items: true, project: { include: { customer: true } } },
    });
    res.json(teklif);
  })
);

const durumSchema = z.object({ status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED"]) });

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { status } = durumSchema.parse(req.body);
    const teklif = await prisma.quote.update({ where: { id: Number(req.params.id) }, data: { status } });

    if (status === "SENT") {
      await prisma.project.update({ where: { id: teklif.projectId }, data: { status: "QUOTE_SENT" } });
    }
    if (status === "ACCEPTED") {
      await prisma.project.update({ where: { id: teklif.projectId }, data: { status: "APPROVED" } });
    }

    res.json(teklif);
  })
);

router.get(
  "/:id/pdf",
  asyncHandler(async (req, res) => {
    const teklif = await prisma.quote.findUniqueOrThrow({
      where: { id: Number(req.params.id) },
      include: {
        items: true,
        project: { include: { customer: true, items: { include: { template: true } } } },
      },
    });
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const konteynerItem = teklif.project.items.find((i) => i.template.key === "container");
    const konteynerBilgi = konteynerItem ? konteynerPdfBilgisiCikar(konteynerItem.paramsJson) : null;
    const logoBuffer = await logoBufferGetir(settings?.logoUrl);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="teklif-${teklif.quoteNumber}.pdf"`);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);
    doc.registerFont("Govde", FONT_GOVDE);
    doc.registerFont("Govde-Kalin", FONT_GOVDE_KALIN);
    doc.font("Govde");

    if (logoBuffer) {
      try {
        const logoGenislikMm = 90;
        doc.image(logoBuffer, doc.page.width - doc.page.margins.right - logoGenislikMm, 40, { fit: [logoGenislikMm, 60] });
      } catch {
        // Bozuk/desteklenmeyen bir görsel formatı PDF üretimini durdurmasın.
      }
    }

    const tl = (n: number) => `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;

    doc.fontSize(18).text(settings?.companyName ?? "Atölyem", { continued: false });
    doc.fontSize(9).fillColor("#555");
    if (settings?.address) doc.text(settings.address);
    const iletisim = [settings?.phone, settings?.email].filter(Boolean).join("  •  ");
    if (iletisim) doc.text(iletisim);
    if (settings?.taxNumber) doc.text(`Vergi No: ${settings.taxNumber}`);
    doc.fillColor("#000");
    doc.moveDown(1);

    doc.fontSize(14).text(`TEKLİF ${teklif.quoteNumber}`, { underline: true });
    doc.fontSize(10).moveDown(0.3);
    doc.text(`Tarih: ${teklif.date.toLocaleDateString("tr-TR")}`);
    doc.text(`Geçerlilik: ${teklif.validUntil.toLocaleDateString("tr-TR")}`);
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Müşteri: ${teklif.project.customer.name}`);
    if (teklif.project.customer.phone) doc.fontSize(9).text(`Tel: ${teklif.project.customer.phone}`);
    if (teklif.project.customer.address) doc.fontSize(9).text(`Adres: ${teklif.project.customer.address}`);
    doc.fontSize(11).text(`İş: ${teklif.project.title}`);
    doc.moveDown(1);

    if (konteynerBilgi) {
      if (doc.y > 620) doc.addPage();
      const semaSonrasiY = konteynerSemaCiz(doc, konteynerBilgi, 40, doc.y);
      doc.y = semaSonrasiY;
      doc.moveDown(0.5);
    }

    const tabloBasi = doc.y;
    const kolon = { aciklama: 40, adet: 300, birim: 350, birimFiyat: 410, tutar: 480 };
    doc.fontSize(9).font("Govde-Kalin");
    doc.text("Açıklama", kolon.aciklama, tabloBasi);
    doc.text("Adet", kolon.adet, tabloBasi);
    doc.text("Birim", kolon.birim, tabloBasi);
    doc.text("B.Fiyat", kolon.birimFiyat, tabloBasi);
    doc.text("Tutar", kolon.tutar, tabloBasi);
    doc.font("Govde");
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#ccc").stroke();
    doc.moveDown(0.3);

    const BOLUM_ETIKET: Record<string, string> = { MATERIAL: "MALZEME", LABOR: "İŞÇİLİK", EXPENSE: "GİDERLER", PRODUCT: "ÜRÜN" };
    const BOLUM_SIRASI = ["MATERIAL", "LABOR", "EXPENSE", "PRODUCT"] as const;
    for (const bolum of BOLUM_SIRASI) {
      const kalemler = teklif.items.filter((k) => k.type === bolum);
      if (kalemler.length === 0) continue;

      if (doc.y > 700) doc.addPage();
      doc.fontSize(8.5).font("Govde-Kalin").fillColor("#666").text(BOLUM_ETIKET[bolum], kolon.aciklama, doc.y);
      doc.fillColor("#000").font("Govde");
      doc.moveDown(0.2);

      for (const kalem of kalemler) {
        const y = doc.y;
        if (y > 720) doc.addPage();
        doc.fontSize(9);
        doc.text(kalem.description, kolon.aciklama, doc.y, { width: 250 });
        doc.text(String(kalem.qty), kolon.adet, y);
        doc.text(kalem.unit, kolon.birim, y);
        doc.text(tl(kalem.unitPrice), kolon.birimFiyat, y);
        doc.text(tl(kalem.lineTotal), kolon.tutar, y);
        doc.moveDown(0.4);
      }
    }

    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#ccc").stroke();
    doc.moveDown(0.5);

    const ozetSatir = (etiket: string, deger: number, kalin = false) => {
      doc.font(kalin ? "Govde-Kalin" : "Govde").fontSize(kalin ? 11 : 10);
      doc.text(etiket, 350, doc.y, { continued: true, width: 130 });
      doc.text(tl(deger), { align: "right" });
    };

    ozetSatir("Malzeme maliyeti (fire dahil)", teklif.materialCost);
    ozetSatir("Sarf malzeme", teklif.consumableCost);
    ozetSatir("İşçilik", teklif.laborCost);
    ozetSatir("Boya", teklif.paintCost);
    ozetSatir("Nakliye", teklif.transportCost);
    ozetSatir("Montaj", teklif.installCost);
    ozetSatir("Diğer giderler", teklif.otherCost);
    doc.moveDown(0.2);
    ozetSatir("Toplam maliyet", teklif.totalCost);
    ozetSatir("Genel gider", teklif.overheadAmount);
    ozetSatir(`Kâr`, teklif.profitAmount);
    doc.moveDown(0.2);
    ozetSatir("Ara toplam (KDV hariç)", teklif.subtotal, true);
    ozetSatir(`KDV (%${teklif.vatPercent})`, teklif.vatAmount);
    doc.moveDown(0.4);

    const kutuY = doc.y;
    doc.rect(340, kutuY - 4, 215, 26).fillAndStroke("#f5f5f5", "#ccc");
    doc.fillColor("#000").font("Govde-Kalin").fontSize(13);
    doc.text("GENEL TOPLAM", 350, kutuY + 3, { continued: true, width: 130 });
    doc.text(tl(teklif.total), { align: "right" });
    doc.font("Govde").fontSize(10);
    doc.moveDown(1.2);

    if (teklif.notes) {
      doc.moveDown(1);
      doc.fontSize(9).font("Govde").text(`Not: ${teklif.notes}`);
    }

    doc.end();
  })
);

export default router;
