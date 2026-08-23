import { Router } from "express";
import { z } from "zod";
import PDFDocument from "pdfkit";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/errors";

const router = Router();

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
      include: { items: true, project: { include: { customer: true } } },
    });
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="teklif-${teklif.quoteNumber}.pdf"`);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

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

    const tabloBasi = doc.y;
    const kolon = { aciklama: 40, adet: 300, birim: 350, birimFiyat: 410, tutar: 480 };
    doc.fontSize(9).font("Helvetica-Bold");
    doc.text("Açıklama", kolon.aciklama, tabloBasi);
    doc.text("Adet", kolon.adet, tabloBasi);
    doc.text("Birim", kolon.birim, tabloBasi);
    doc.text("B.Fiyat", kolon.birimFiyat, tabloBasi);
    doc.text("Tutar", kolon.tutar, tabloBasi);
    doc.font("Helvetica");
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#ccc").stroke();
    doc.moveDown(0.3);

    for (const kalem of teklif.items) {
      const y = doc.y;
      if (y > 720) doc.addPage();
      doc.fontSize(9);
      doc.text(kalem.description, kolon.aciklama, doc.y, { width: 250 });
      const satirY = doc.y === y ? y : y;
      doc.text(String(kalem.qty), kolon.adet, y);
      doc.text(kalem.unit, kolon.birim, y);
      doc.text(tl(kalem.unitPrice), kolon.birimFiyat, y);
      doc.text(tl(kalem.lineTotal), kolon.tutar, y);
      doc.moveDown(0.4);
    }

    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#ccc").stroke();
    doc.moveDown(0.5);

    const ozetSatir = (etiket: string, deger: number, kalin = false) => {
      doc.font(kalin ? "Helvetica-Bold" : "Helvetica").fontSize(kalin ? 11 : 10);
      doc.text(etiket, 350, doc.y, { continued: true, width: 130 });
      doc.text(tl(deger), { align: "right" });
    };

    ozetSatir("Malzeme maliyeti", teklif.materialCost);
    ozetSatir("Fire maliyeti", teklif.wasteCost);
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
    doc.moveDown(0.2);
    ozetSatir("GENEL TOPLAM", teklif.total, true);

    if (teklif.notes) {
      doc.moveDown(1);
      doc.fontSize(9).font("Helvetica").text(`Not: ${teklif.notes}`);
    }

    doc.end();
  })
);

export default router;
