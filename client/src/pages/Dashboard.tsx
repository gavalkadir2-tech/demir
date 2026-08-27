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

interface GunlukOzet {
  ozet: string;
  oncelikler: string[];
}

interface SoruCevap {
  cevap: string;
  yetersizVeri: boolean;
}

interface SohbetSatiri {
  soru: string;
  cevap: string;
  yetersizVeri: boolean;
}

const ORNEK_SORULAR = [
  "Bu ay neden kârımız düştü?",
  "Bu ay hangi müşterilerden ödeme bekliyoruz?",
  "En kârlı iş türümüz hangisi?",
  "Hangi malzemeleri sipariş etmem lazım?",
];

function AiAsistanKarti() {
  const [soru, setSoru] = useState("");
  const [gecmis, setGecmis] = useState<SohbetSatiri[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const sor = async (metin: string) => {
    if (!metin.trim() || yukleniyor) return;
    setYukleniyor(true);
    setHata(null);
    try {
      const sonuc = await api.post<SoruCevap>("/ai/soru-cevap", { soru: metin });
      setGecmis((g) => [...g, { soru: metin, cevap: sonuc.cevap, yetersizVeri: sonuc.yetersizVeri }]);
      setSoru("");
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="card space-y-3">
      <h2 className="font-bold">🤖 AI Asistana Sor</h2>
      {gecmis.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {ORNEK_SORULAR.map((s) => (
            <button key={s} className="btn-secondary btn-sm" onClick={() => sor(s)} disabled={yukleniyor}>
              {s}
            </button>
          ))}
        </div>
      )}
      {gecmis.length > 0 && (
        <div className="space-y-3">
          {gecmis.map((satir, i) => (
            <div key={i} className="space-y-1">
              <div className="text-sm font-semibold text-neutral-700">🙋 {satir.soru}</div>
              <div className={`text-sm rounded-xl px-3 py-2 ${satir.yetersizVeri ? "bg-amber-50 text-amber-800" : "bg-neutral-50 text-neutral-700"}`}>
                {satir.cevap}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className="field-input flex-1"
          placeholder="İşletmenle ilgili bir şey sor..."
          value={soru}
          onChange={(e) => setSoru(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sor(soru)}
          disabled={yukleniyor}
        />
        <button className="btn-primary btn-sm" onClick={() => sor(soru)} disabled={yukleniyor || !soru.trim()}>
          {yukleniyor ? "..." : "Sor"}
        </button>
      </div>
      {hata && <div className="text-sm text-red-600">{hata}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [veri, setVeri] = useState<DashboardData | null>(null);
  const [trend, setTrend] = useState<AylikTrendVeri[] | null>(null);
  const [kategoriKarliligi, setKategoriKarliligi] = useState<KategoriKarliligiVeri[] | null>(null);
  const [enCokKullanilan, setEnCokKullanilan] = useState<EnCokKullanilanMalzeme[] | null>(null);
  const [aiOzet, setAiOzet] = useState<GunlukOzet | null>(null);
  const [aiYukleniyor, setAiYukleniyor] = useState(false);
  const [aiHata, setAiHata] = useState<string | null>(null);

  useEffect(() => {
    api.get<DashboardData>("/dashboard").then(setVeri);
    api.get<AylikTrendVeri[]>("/dashboard/aylik-trend").then(setTrend);
    api.get<KategoriKarliligiVeri[]>("/dashboard/kategori-karliligi").then(setKategoriKarliligi);
    api.get<EnCokKullanilanMalzeme[]>("/dashboard/en-cok-kullanilan-malzemeler").then(setEnCokKullanilan);
  }, []);

  if (!veri) return <Spinner />;

  const gunToFarki = (iso: string) => Math.round((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));

  const aiOzetOlustur = async () => {
    setAiYukleniyor(true);
    setAiHata(null);
    try {
      const sonuc = await api.post<GunlukOzet>("/ai/gunluk-ozet", {
        gecikmisIsler: veri.gecikmisIsler.map((p) => ({
          baslik: p.title,
          musteri: p.customer.name,
          kacGunGecikti: p.dueDate ? gunToFarki(p.dueDate) : 0,
        })),
        yaklasanIsler: veri.yaklasanIsler.map((p) => ({
          baslik: p.title,
          musteri: p.customer.name,
          kacGunKaldi: p.dueDate ? -gunToFarki(p.dueDate) : 0,
        })),
        kritikStoklar: veri.kritikStoklar.map((m) => ({ ad: m.name, stok: m.stockQty, minStok: m.minStockQty, birim: m.unit })),
        bekleyenTeklifSayisi: veri.bekleyenTeklifler,
        aktifIsSayisi: veri.aktifIsler,
      });
      setAiOzet(sonuc);
    } catch (e: any) {
      setAiHata(e.message);
    } finally {
      setAiYukleniyor(false);
    }
  };

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

        <div className="mt-3 pt-3 border-t border-brand-100">
          {!aiOzet ? (
            <button className="btn-secondary btn-sm" onClick={aiOzetOlustur} disabled={aiYukleniyor}>
              {aiYukleniyor ? "Hazırlanıyor..." : "🤖 AI Günlük Özet"}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-neutral-700">{aiOzet.ozet}</p>
              {aiOzet.oncelikler.length > 0 && (
                <ul className="text-sm text-neutral-700 list-disc pl-5 space-y-0.5">
                  {aiOzet.oncelikler.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {aiHata && <div className="text-sm text-red-600 mt-2">{aiHata}</div>}
        </div>
      </div>

      <AiAsistanKarti />

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
        <StatCard label="💰 Tahsil Edilecek" value={tl(veri.toplamAlacak)} sub={veri.toplamAlacak > 0 ? "Açık alacaklar" : undefined} />
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
