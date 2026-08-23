import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Quote, QuoteStatus, TEKLIF_DURUM_ETIKET } from "../api/types";
import { Spinner, EmptyState, Badge } from "../components/ui";
import { tl, tarih } from "../lib/format";

const DURUMLAR: QuoteStatus[] = ["DRAFT", "SENT", "ACCEPTED", "REJECTED"];
const RENK: Record<QuoteStatus, string> = {
  DRAFT: "bg-neutral-200 text-neutral-700",
  SENT: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function Teklifler() {
  const [teklifler, setTeklifler] = useState<Quote[] | null>(null);
  const [durum, setDurum] = useState<QuoteStatus | "">("");

  useEffect(() => {
    api.get<Quote[]>(`/quotes${durum ? `?status=${durum}` : ""}`).then(setTeklifler);
  }, [durum]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Teklifler</h1>

      <select className="field-select w-auto" value={durum} onChange={(e) => setDurum(e.target.value as any)}>
        <option value="">Tüm durumlar</option>
        {DURUMLAR.map((d) => (
          <option key={d} value={d}>
            {TEKLIF_DURUM_ETIKET[d]}
          </option>
        ))}
      </select>

      {!teklifler ? (
        <Spinner />
      ) : teklifler.length === 0 ? (
        <EmptyState title="Henüz teklif yok" />
      ) : (
        <div className="grid gap-3">
          {teklifler.map((q) => (
            <Link to={`/teklifler/${q.id}`} key={q.id} className="card flex items-center justify-between hover:shadow-md">
              <div>
                <div className="font-bold">{q.quoteNumber}</div>
                <div className="text-sm text-neutral-500">
                  {q.project?.customer?.name} • {q.project?.title} • {tarih(q.date)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg">{tl(q.total)}</span>
                <Badge className={RENK[q.status]}>{TEKLIF_DURUM_ETIKET[q.status]}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
