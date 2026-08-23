import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Customer, Project, DURUM_ETIKET, DURUM_RENK, KATEGORI_ETIKET } from "../api/types";
import { Spinner, Badge } from "../components/ui";
import { tarih } from "../lib/format";

export default function MusteriDetay() {
  const { id } = useParams();
  const [musteri, setMusteri] = useState<(Customer & { projects: Project[] }) | null>(null);

  useEffect(() => {
    api.get<Customer & { projects: Project[] }>(`/customers/${id}`).then(setMusteri);
  }, [id]);

  if (!musteri) return <Spinner />;

  return (
    <div className="space-y-6">
      <Link to="/musteriler" className="text-sm text-brand-700 font-semibold">
        ← Müşteriler
      </Link>
      <div className="card">
        <h1 className="text-2xl font-bold">{musteri.name}</h1>
        <div className="mt-2 text-sm text-neutral-600 space-y-1">
          {musteri.phone && <div>📞 {musteri.phone}</div>}
          {musteri.email && <div>✉️ {musteri.email}</div>}
          {musteri.address && <div>📍 {musteri.address}</div>}
          {musteri.note && <div>📝 {musteri.note}</div>}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-3">Geçmiş İşler</h2>
        {musteri.projects.length === 0 ? (
          <div className="text-neutral-500 text-sm">Bu müşteriye ait iş yok.</div>
        ) : (
          <div className="grid gap-3">
            {musteri.projects.map((p) => (
              <Link to={`/isler/${p.id}`} key={p.id} className="card flex items-center justify-between hover:shadow-md">
                <div>
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-sm text-neutral-500">
                    {KATEGORI_ETIKET[p.category]} • {tarih(p.createdAt)}
                  </div>
                </div>
                <Badge className={DURUM_RENK[p.status]}>{DURUM_ETIKET[p.status]}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
