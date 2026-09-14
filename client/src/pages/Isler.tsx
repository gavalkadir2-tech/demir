import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Project, ProjectStatus, DURUM_ETIKET, DURUM_RENK, DURUM_SIMGE, KATEGORI_ETIKET, ONCELIK_ETIKET, ONCELIK_RENK } from "../api/types";
import { Spinner, EmptyState, Badge } from "../components/ui";
import { tarih } from "../lib/format";

const DURUMLAR: ProjectStatus[] = [
  "DRAFT",
  "CALCULATED",
  "QUOTE_READY",
  "QUOTE_SENT",
  "APPROVED",
  "IN_PRODUCTION",
  "INSTALLING",
  "COMPLETED",
  "CANCELLED",
];

export default function Isler() {
  const [isler, setIsler] = useState<(Project & { customer: { name: string } })[] | null>(null);
  const [durum, setDurum] = useState<ProjectStatus | "">("");
  const navigate = useNavigate();

  useEffect(() => {
    api.get<(Project & { customer: { name: string } })[]>(`/projects${durum ? `?status=${durum}` : ""}`).then(setIsler);
  }, [durum]);

  const copeTasi = async (id: number) => {
    if (!confirm("Bu iş çöp kutusuna taşınsın mı? Çöp Kutusu'ndan geri yükleyebilirsiniz.")) return;
    await api.del(`/projects/${id}`);
    setIsler((liste) => liste?.filter((p) => p.id !== id) ?? liste);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">İşler</h1>
        <div className="flex items-center gap-2">
          <Link to="/cop-kutusu" className="btn-secondary" title="Çöp Kutusu">
            🗑️ Çöp Kutusu
          </Link>
          <Link to="/yeni-is" className="btn-primary">
            ➕ Yeni İş
          </Link>
        </div>
      </div>

      <select className="field-select w-auto" value={durum} onChange={(e) => setDurum(e.target.value as any)}>
        <option value="">Tüm durumlar</option>
        {DURUMLAR.map((d) => (
          <option key={d} value={d}>
            {DURUM_ETIKET[d]}
          </option>
        ))}
      </select>

      {!isler ? (
        <Spinner />
      ) : isler.length === 0 ? (
        <EmptyState title="İş bulunamadı" action={<Link to="/yeni-is" className="btn-primary">➕ Yeni İş Oluştur</Link>} />
      ) : (
        <div className="grid gap-3">
          {isler.map((p) => (
            <div key={p.id} className="card flex items-center justify-between gap-3 hover:shadow-md">
              <Link to={`/isler/${p.id}`} className="min-w-0 flex-1">
                <div className="font-bold text-lg flex items-center gap-2 flex-wrap">
                  {p.title}
                  {p.priority !== "NORMAL" && (
                    <Badge className={ONCELIK_RENK[p.priority]}>{ONCELIK_ETIKET[p.priority]}</Badge>
                  )}
                </div>
                <div className="text-sm text-neutral-500">
                  {p.customer.name} • {KATEGORI_ETIKET[p.category]} • {tarih(p.createdAt)}
                  {p.dueDate && ` • Teslim: ${tarih(p.dueDate)}`}
                </div>
              </Link>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={DURUM_RENK[p.status]}>
                  {DURUM_SIMGE[p.status]} {DURUM_ETIKET[p.status]}
                </Badge>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  title="İşi düzenle"
                  onClick={() => navigate(`/isler/${p.id}?duzenle=1`)}
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="btn-danger btn-sm"
                  title="Çöp kutusuna taşı"
                  onClick={() => copeTasi(p.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
