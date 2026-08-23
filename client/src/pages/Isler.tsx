import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Project, ProjectStatus, DURUM_ETIKET, DURUM_RENK, KATEGORI_ETIKET } from "../api/types";
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

  useEffect(() => {
    api.get<(Project & { customer: { name: string } })[]>(`/projects${durum ? `?status=${durum}` : ""}`).then(setIsler);
  }, [durum]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">İşler</h1>
        <Link to="/yeni-is" className="btn-primary">
          ➕ Yeni İş
        </Link>
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
            <Link to={`/isler/${p.id}`} key={p.id} className="card flex items-center justify-between hover:shadow-md">
              <div>
                <div className="font-bold text-lg">{p.title}</div>
                <div className="text-sm text-neutral-500">
                  {p.customer.name} • {KATEGORI_ETIKET[p.category]} • {tarih(p.createdAt)}
                </div>
              </div>
              <Badge className={DURUM_RENK[p.status]}>{DURUM_ETIKET[p.status]}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
