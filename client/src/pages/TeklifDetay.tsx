import { Fragment, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Quote, QuoteStatus, TEKLIF_DURUM_ETIKET } from "../api/types";
import { Spinner, Badge } from "../components/ui";
import { tl, tarih, telefonNormallestir } from "../lib/format";

const KALEM_BOLUM_SIRASI: Array<"MATERIAL" | "LABOR" | "EXPENSE" | "PRODUCT"> = ["MATERIAL", "LABOR", "EXPENSE", "PRODUCT"];
const KALEM_BOLUM_ETIKET: Record<string, string> = {
  MATERIAL: "Malzeme",
  LABOR: "İşçilik",
  EXPENSE: "Giderler",
  PRODUCT: "Ürün",
};

export default function TeklifDetay() {
  const { id } = useParams();
  const [teklif, setTeklif] = useState<Quote | null>(null);

  const yukle = () => api.get<Quote>(`/quotes/${id}`).then(setTeklif);

  useEffect(() => {
    yukle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!teklif) return <Spinner />;

  const durumDegistir = async (status: QuoteStatus) => {
    await api.patch(`/quotes/${id}`, { status });
    yukle();
  };

  const whatsappLinki = () => {
    const telefon = telefonNormallestir(teklif.project?.customer?.phone);
    const onayLinki = `${window.location.origin}/teklif-onay/${teklif.publicToken}`;
    const mesaj = `Merhaba ${teklif.project?.customer?.name ?? ""}, "${teklif.project?.title ?? ""}" işiniz için teklifimiz hazır: ${tl(
      teklif.total
    )}. Teklifi görüntülemek ve onaylamak için: ${onayLinki}`;
    const q = `text=${encodeURIComponent(mesaj)}`;
    return telefon ? `https://wa.me/${telefon}?${q}` : `https://wa.me/?${q}`;
  };

  return (
    <div className="space-y-6">
      <Link to="/teklifler" className="text-sm text-brand-700 font-semibold">
        ← Teklifler
      </Link>

      <div className="card">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{teklif.quoteNumber}</h1>
            <div className="text-neutral-500">
              {teklif.project?.customer?.name} • {teklif.project?.title}
            </div>
            <div className="text-sm text-neutral-500">
              Tarih: {tarih(teklif.date)} • Geçerlilik: {tarih(teklif.validUntil)}
            </div>
          </div>
          <Badge>{TEKLIF_DURUM_ETIKET[teklif.status]}</Badge>
        </div>

        <div className="flex gap-2 flex-wrap mt-4">
          <a className="btn-secondary" href={`/api/quotes/${teklif.id}/pdf`} target="_blank" rel="noreferrer">
            📄 PDF Görüntüle
          </a>
          <a className="btn-secondary" href={whatsappLinki()} target="_blank" rel="noreferrer">
            📱 WhatsApp ile Gönder
          </a>
          {teklif.status === "DRAFT" && (
            <button className="btn-secondary" onClick={() => durumDegistir("SENT")}>
              Gönderildi Olarak İşaretle
            </button>
          )}
          {(teklif.status === "DRAFT" || teklif.status === "SENT") && (
            <button className="btn-primary" onClick={() => durumDegistir("ACCEPTED")}>
              ✅ Kabul Edildi
            </button>
          )}
          {(teklif.status === "DRAFT" || teklif.status === "SENT") && (
            <button className="btn-danger" onClick={() => durumDegistir("REJECTED")}>
              ❌ Reddedildi
            </button>
          )}
          <Link to={`/isler/${teklif.projectId}`} className="btn-secondary">
            İşe Git
          </Link>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="font-bold mb-3">Kalemler</h2>
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-500 text-left">
            <tr>
              <th className="px-3 py-2">Açıklama</th>
              <th className="px-3 py-2">Adet</th>
              <th className="px-3 py-2">Birim</th>
              <th className="px-3 py-2">B. Fiyat</th>
              <th className="px-3 py-2">Tutar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {KALEM_BOLUM_SIRASI.filter((bolum) => teklif.items?.some((i) => i.type === bolum)).map((bolum) => (
              <Fragment key={bolum}>
                <tr className="bg-neutral-50">
                  <td colSpan={5} className="px-3 py-1.5 text-xs font-bold text-neutral-500 uppercase tracking-wide">
                    {KALEM_BOLUM_ETIKET[bolum]}
                  </td>
                </tr>
                {teklif.items!
                  .filter((i) => i.type === bolum)
                  .map((i) => (
                    <tr key={i.id}>
                      <td className="px-3 py-2">{i.description}</td>
                      <td className="px-3 py-2">{i.qty}</td>
                      <td className="px-3 py-2">{i.unit}</td>
                      <td className="px-3 py-2">{tl(i.unitPrice)}</td>
                      <td className="px-3 py-2 font-semibold">{tl(i.lineTotal)}</td>
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card space-y-1 max-w-md ml-auto">
        <OzetSatir label="Malzeme maliyeti" deger={teklif.materialCost} />
        <OzetSatir label="Fire maliyeti" deger={teklif.wasteCost} />
        <OzetSatir label="Sarf malzeme" deger={teklif.consumableCost} />
        <OzetSatir label="İşçilik" deger={teklif.laborCost} />
        <OzetSatir label="Boya" deger={teklif.paintCost} />
        <OzetSatir label="Nakliye" deger={teklif.transportCost} />
        <OzetSatir label="Montaj" deger={teklif.installCost} />
        <OzetSatir label="Diğer giderler" deger={teklif.otherCost} />
        <hr className="my-2" />
        <OzetSatir label="Toplam Maliyet" deger={teklif.totalCost} kalin />
        <OzetSatir label="Genel Gider" deger={teklif.overheadAmount} />
        <OzetSatir label="Kâr" deger={teklif.profitAmount} />
        <hr className="my-2" />
        <OzetSatir label="Ara Toplam (KDV Hariç)" deger={teklif.subtotal} kalin />
        <OzetSatir label={`KDV (%${teklif.vatPercent})`} deger={teklif.vatAmount} />
        <hr className="my-2" />
        <OzetSatir label="GENEL TOPLAM" deger={teklif.total} buyuk />
      </div>
    </div>
  );
}

function OzetSatir({ label, deger, kalin, buyuk }: { label: string; deger: number; kalin?: boolean; buyuk?: boolean }) {
  return (
    <div className={`flex justify-between ${kalin ? "font-bold" : ""} ${buyuk ? "text-xl font-extrabold text-brand-700" : "text-sm"}`}>
      <span>{label}</span>
      <span>{tl(deger)}</span>
    </div>
  );
}
