import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Dashboard as DashboardData } from "../api/types";
import { DURUM_ETIKET, DURUM_RENK, KATEGORI_ETIKET } from "../api/types";
import { Spinner, StatCard, Badge } from "../components/ui";
import { tl, tarih } from "../lib/format";

export default function Dashboard() {
  const [veri, setVeri] = useState<DashboardData | null>(null);

  useEffect(() => {
    api.get<DashboardData>("/dashboard").then(setVeri);
  }, []);

  if (!veri) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link to="/yeni-is" className="btn-primary">
          ➕ Yeni İş
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Aktif İşler" value={String(veri.aktifIsler)} />
        <StatCard label="Bekleyen Teklifler" value={String(veri.bekleyenTeklifler)} />
        <StatCard label="Bu Ay Tamamlanan" value={String(veri.buAyYapilanIsler)} />
        <StatCard label="Bu Ay Toplam Satış" value={tl(veri.buAyToplamSatis)} />
        <StatCard label="Tahmini Kâr" value={tl(veri.tahminiKar)} />
        <StatCard label="Kritik Stok" value={String(veri.kritikStoklar.length)} sub={veri.kritikStoklar.length > 0 ? "Malzeme sipariş edin" : undefined} />
      </div>

      {veri.kritikStoklar.length > 0 && (
        <div className="card border-amber-300 bg-amber-50">
          <h2 className="font-bold text-amber-800 mb-2">⚠️ Kritik Stok Seviyesindeki Malzemeler</h2>
          <ul className="space-y-1 text-sm text-amber-900">
            {veri.kritikStoklar.map((m) => (
              <li key={m.id}>
                {m.name}: <strong>{m.stockQty}</strong> (min. {m.minStockQty})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2 className="font-bold mb-3">Son İşler</h2>
        {veri.sonIsler.length === 0 ? (
          <div className="text-neutral-500 text-sm">Henüz iş oluşturulmadı.</div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {veri.sonIsler.map((p) => (
              <Link
                key={p.id}
                to={`/isler/${p.id}`}
                className="flex items-center justify-between py-3 hover:bg-neutral-50 -mx-2 px-2 rounded-lg"
              >
                <div>
                  <div className="font-semibold">{p.title}</div>
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
    </div>
  );
}
