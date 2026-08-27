import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiHatasi } from "../lib/errors";

const router = Router();

// Müşterinin girişsiz eriştiği teklif onay sayfası. Sadece onay için gereken alanları döndürür.
router.get(
  "/quotes/:token",
  asyncHandler(async (req, res) => {
    const teklif = await prisma.quote.findUnique({
      where: { publicToken: req.params.token },
      include: { items: true, project: { include: { customer: true } } },
    });
    if (!teklif) throw new ApiHatasi(404, "Teklif bulunamadı.");

    res.json({
      quoteNumber: teklif.quoteNumber,
      date: teklif.date,
      validUntil: teklif.validUntil,
      status: teklif.status,
      items: teklif.items.map((i) => ({
        description: i.description,
        qty: i.qty,
        unit: i.unit,
        unitPrice: i.unitPrice,
        lineTotal: i.lineTotal,
      })),
      subtotal: teklif.subtotal,
      vatPercent: teklif.vatPercent,
      vatAmount: teklif.vatAmount,
      total: teklif.total,
      notes: teklif.notes,
      musteriAdi: teklif.project.customer.name,
      isBasligi: teklif.project.title,
      firmaAdi: (await prisma.settings.findUnique({ where: { id: 1 } }))?.companyName ?? "Atölyemiz",
    });
  })
);

router.post(
  "/quotes/:token/accept",
  asyncHandler(async (req, res) => {
    const teklif = await prisma.quote.findUnique({ where: { publicToken: req.params.token } });
    if (!teklif) throw new ApiHatasi(404, "Teklif bulunamadı.");
    if (teklif.status === "ACCEPTED") return res.json({ status: "ACCEPTED" });
    if (teklif.status !== "DRAFT" && teklif.status !== "SENT") {
      throw new ApiHatasi(400, "Bu teklif artık onaylanamaz.");
    }
    if (teklif.validUntil < new Date()) {
      throw new ApiHatasi(400, "Bu teklifin geçerlilik süresi dolmuş. Lütfen atölyeyle iletişime geçin.");
    }
    await prisma.quote.update({ where: { id: teklif.id }, data: { status: "ACCEPTED" } });
    await prisma.project.update({ where: { id: teklif.projectId }, data: { status: "APPROVED" } });
    res.json({ status: "ACCEPTED" });
  })
);

// Müşterinin girişsiz eriştiği iş takip sayfası - maliyet/fiyat bilgisi içermez, sadece süreç durumu.
router.get(
  "/projects/:token",
  asyncHandler(async (req, res) => {
    const proje = await prisma.project.findUnique({
      where: { publicToken: req.params.token },
      include: {
        customer: { select: { name: true } },
        tasks: { orderBy: { order: "asc" } },
        photos: { where: { phase: "SON_HALI" }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!proje) throw new ApiHatasi(404, "İş bulunamadı.");

    res.json({
      title: proje.title,
      status: proje.status,
      dueDate: proje.dueDate,
      musteriAdi: proje.customer.name,
      gorevler: proje.tasks.map((t) => ({ label: t.label, done: t.done })),
      sonHaliFotograflari: proje.photos.map((p) => ({ dataBase64: p.dataBase64, mimeType: p.mimeType })),
    });
  })
);

export default router;
