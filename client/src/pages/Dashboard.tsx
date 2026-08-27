import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Dashboard as DashboardData, AylikTrendVeri, KategoriKarliligiVeri, EnCokKullanilanMalzeme } from "../api/types";
import { DURUM_ETIKET, DURUM_RENK, DURUM_SIMGE, KATEGORI_ETIKET } from "../api/types";
import { Spinner, StatCard, Badge } from "../components/ui";
import { tl, tarih } from "../lib/format";
import {
  AylikTrendGrafik,
  YatayBarGrafik,
  kategoriKarliligiKalemleri,
  enCokKullanilanKalemleri,
} from "../components/DashboardGrafikleri";

export default function Dashboard() {
  const [veri, setVeri] = useState<DashboardData | null>(null);
  const [trend, setTrend] = useState<AylikTrendVeri[] | null>(null);
  const [kategoriKarliligi, setKategoriKarliligi] = useState<KategoriKarliligiVeri[] | null>(null);
  const [enCokKullanilan, setEnCokKullanilan] = useState<EnCokKullanilanMalzeme[] | null>(null);

  useEffect(() => {
    api.get<DashboardData>("/dashboard").then(setVeri);
    api.get<AylikTrendVeri[]>("/dashboard/aylik-trend").then(setTrend);
    api.get<KategoriKarliligiVeri[]>("/dashboard/kategori-karliligi").then(setKategoriKarliligi);
    api.get<EnCokKullanilanMalzeme[]>("/dashboard/en-cok-kullanilan-malzemeler").then(setEnCokKullanilan);
  }, []);

  if (!veri) return <Spinner />;

  const bugunSorunSayisi = veri.gecikmisIsler.length + veri.yaklasanIsler.length + veri.kritikStoklar.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ana Sayfa</h1>
        <Link to="/yeni-is" className="btn-primary">
          ➕ Yeni İş
        </Link>
      </div>

      <div className="card border-brand-200 bg-brand-50/40">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-brand-800">☀️ Bugün</h2>
          {bugunSorunSayisi === 0 && <span className="text-sm text-emerald-700 font-medium">🟢 Her şey yolunda</span>}
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className={`text-2xl font-bold ${veri.gecikmisIsler.length > 0 ? "text-red-600" : "text-neutral-400"}`}>
              {veri.gecikmisIsler.length}
            </div>
            <div className="text-xs text-neutral-600">🔴 Geciken iş</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${veri.yaklasanIsler.length > 0 ? "text-amber-600" : "text-neutral-400"}`}>
              {veri.yaklasanIsler.length}
            </div>
            <div className="text-xs text-neutral-600">🟡 Yaklaşan termin</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${veri.kritikStoklar.length > 0 ? "text-amber-600" : "text-neutral-400"}`}>
              {veri.kritikStoklar.length}
            </div>
            <div className="text-xs text-neutral-600">📦 Kritik stok</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/yeni-is" className="btn-secondary btn-sm">➕ Yeni İş</Link>
        <Link to="/musteriler" className="btn-secondary btn-sm">👥 Yeni Müşteri</Link>
        <Link to="/teklifler" className="btn-secondary btn-sm">📄 Teklifler</Link>
        <Link to="/stok" className="btn-secondary btn-sm">📦 Stok</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Aktif İşler" value={String(veri.aktifIsler)} />
        <StatCard label="Bekleyen Teklifler" value={String(veri.bekleyenTeklifler)} />
        <StatCard label="Bu Ay Tamamlanan" value={String(veri.buAyYapilanIsler)} />
        <StatCard label="Bu Ay Toplam Satış" value={tl(veri.buAyToplamSatis)} />
        <StatCard label="Tahmini Kâr" value={tl(veri.tahminiKar)} />
        <StatCard label="Kritik Stok" value={String(veri.kritikStoklar.length)} sub={veri.kritikStoklar.length > 0 ? "Malzeme sipariş edin" : undefined} />
      </div>

      {veri.gecikmisIsler.length > 0 && (
        <div className="card border-red-300 bg-red-50">
          <h2 className="font-bold text-red-800 mb-2">🔴 Teslim Tarihi Geçmiş İşler</h2>
          <div className="space-y-1 text-sm text-red-900">
            {veri.gecikmisIsler.map((p) => (
              <Link key={p.id} to={`/isler/${p.id}`} className="flex justify-between hover:underline">
                <span>
                  {p.title} — {p.customer.name}
                </span>
                <span className="font-semibold">{p.dueDate && tarih(p.dueDate)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {veri.yaklasanIsler.length > 0 && (
        <div className="card border-amber-300 bg-amber-50">
          <h2 className="font-bold text-amber-800 mb-2">🟡 Önümüzdeki 3 Gün İçinde Teslim</h2>
          <div className="space-y-1 text-sm text-amber-900">
            {veri.yaklasanIsler.map((p) => (
              <Link key={p.id} to={`/isler/${p.id}`} className="flex justify-between hover:underline">
                <span>
                  {p.title} — {p.customer.name}
                </span>
                <span className="font-semibold">{p.dueDate && tarih(p.dueDate)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

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

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-bold mb-3">📈 Son 6 Ay Ciro/Kâr Trendi</h2>
          {!trend ? <Spinner /> : <AylikTrendGrafik veri={trend} />}
        </div>
        <div className="card">
          <h2 className="font-bold mb-3">🏆 Ürün Türüne Göre Ciro</h2>
          {!kategoriKarliligi ? (
            <Spinner />
          ) : kategoriKarliligi.length === 0 ? (
            <div className="text-sm text-neutral-500">Henüz kabul edilmiş teklif yok.</div>
          ) : (
            <YatayBarGrafik kalemler={kategoriKarliligiKalemleri(kategoriKarliligi)} renk="#ea580c" birim="TL" />
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="font-bold mb-3">🧱 En Çok Kullanılan Malzemeler</h2>
        {!enCokKullanilan ? (
          <Spinner />
        ) : enCokKullanilan.length === 0 ? (
          <div className="text-sm text-neutral-500">Henüz parça hesaplanmadı.</div>
        ) : (
          <YatayBarGrafik kalemler={enCokKullanilanKalemleri(enCokKullanilan)} renk="#2563eb" birim="m" />
        )}
      </div>

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
                <Badge className={DURUM_RENK[p.status]}>
                  {DURUM_SIMGE[p.status]} {DURUM_ETIKET[p.status]}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
