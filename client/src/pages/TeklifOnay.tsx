import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { Spinner } from "../components/ui";
import { tl, tarih } from "../lib/format";

interface KamuTeklifKalemi {
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
}

interface KamuTeklif {
  quoteNumber: string;
  date: string;
  validUntil: string;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED";
  items: KamuTeklifKalemi[];
  subtotal: number;
  vatPercent: number;
  vatAmount: number;
  total: number;
  notes?: string | null;
  musteriAdi: string;
  isBasligi: string;
  firmaAdi: string;
}

/** Müşterinin girişsiz eriştiği teklif onay sayfası - "Yeni İş" gibi iç yönetim ekranlarından
 * bağımsız, tek başına render edilir (Layout/menü yok). */
export default function TeklifOnay() {
  const { token } = useParams();
  const [teklif, setTeklif] = useState<KamuTeklif | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [onaylaniyor, setOnaylaniyor] = useState(false);

  const yukle = () =>
    api
      .get<KamuTeklif>(`/public/quotes/${token}`)
      .then(setTeklif)
      .catch((e) => setHata(e.message));

  useEffect(() => {
    yukle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const onayla = async () => {
    setOnaylaniyor(true);
    setHata(null);
    try {
      await api.post(`/public/quotes/${token}/accept`);
      yukle();
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setOnaylaniyor(false);
    }
  };

  if (hata && !teklif) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
        <div className="card max-w-sm text-center text-neutral-600">{hata}</div>
      </div>
    );
  }
  if (!teklif) return <Spinner />;

  return (
    <div className="min-h-screen bg-neutral-100 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="text-lg font-bold text-brand-700">🔧 {teklif.firmaAdi}</div>
          <div className="text-neutral-500 text-sm">Teklif {teklif.quoteNumber}</div>
        </div>

        <div className="card space-y-1">
          <div className="text-sm text-neutral-500">Sayın {teklif.musteriAdi},</div>
          <div className="font-semibold">{teklif.isBasligi}</div>
          <div className="text-sm text-neutral-500">
            Tarih: {tarih(teklif.date)} • Geçerlilik: {tarih(teklif.validUntil)}
          </div>
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-500 text-left">
              <tr>
                <th className="px-3 py-2">Açıklama</th>
                <th className="px-3 py-2">Adet</th>
                <th className="px-3 py-2">Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {teklif.items.map((i, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2">{i.description}</td>
                  <td className="px-3 py-2">
                    {i.qty} {i.unit}
                  </td>
                  <td className="px-3 py-2 font-semibold">{tl(i.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card space-y-1">
          <div className="flex justify-between text-sm">
            <span>Ara Toplam</span>
            <span>{tl(teklif.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>KDV (%{teklif.vatPercent})</span>
            <span>{tl(teklif.vatAmount)}</span>
          </div>
          <hr className="my-2" />
          <div className="flex justify-between text-xl font-extrabold text-brand-700">
            <span>GENEL TOPLAM</span>
            <span>{tl(teklif.total)}</span>
          </div>
          {teklif.notes && <div className="text-sm text-neutral-500 pt-2">Not: {teklif.notes}</div>}
        </div>

        {hata && <div className="text-sm text-red-600 text-center">{hata}</div>}

        <div className="card text-center">
          {teklif.status === "ACCEPTED" ? (
            <div className="text-emerald-700 font-bold text-lg">✅ Bu teklifi onayladınız. Teşekkür ederiz!</div>
          ) : teklif.status === "REJECTED" ? (
            <div className="text-neutral-500 font-semibold">Bu teklif reddedilmiş olarak işaretlendi.</div>
          ) : (
            <>
              <p className="text-sm text-neutral-500 mb-3">Teklifi inceledikten sonra onaylayabilirsiniz.</p>
              <button className="btn-primary w-full" onClick={onayla} disabled={onaylaniyor}>
                {onaylaniyor ? "Onaylanıyor..." : "✅ Teklifi Onayla"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
