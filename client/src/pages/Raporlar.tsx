import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Spinner, StatCard } from "../components/ui";
import { YatayBarGrafik } from "../components/DashboardGrafikleri";
import { tl, sayi } from "../lib/format";
import { KATEGORI_ETIKET, ProjectCategory } from "../api/types";

interface RaporVerisi {
  toplamIsSayisi: number;
  toplamSatis: number;
  toplamMaliyet: number;
  toplamKar: number;
  enCokKullanilanProfil: { materialId: number; materialName: string; toplamMetre: number }[];
  stokDurumu: { id: number; name: string; stockQty: number; minStockQty: number; unit: string }[];
  fireOranlari: { materialId: number; materialName: string; ortalamaFireYuzde: number }[];
  aylikOzet: { ay: string; satis: number; kar: number }[];
  tahminiSureler: { kategori: string; ortalamaGun: number; ornekSayisi: number }[];
  kategoriKarliligi: { kategori: string; ciro: number; kar: number; marjYuzde: number; isSayisi: number }[];
}

const AY_ADI = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const ayEtiketi = (ay: string) => {
  const [yil, ayNo] = ay.split("-");
  return `${AY_ADI[Number(ayNo) - 1]} '${yil.slice(2)}`;
};

interface AiDegerlendirme {
  degerlendirme: string;
  dikkatEdilmesiGerekenler: string[];
}

export default function Raporlar() {
  const [veri, setVeri] = useState<RaporVerisi | null>(null);
  const [aiSonuc, setAiSonuc] = useState<AiDegerlendirme | null>(null);
  const [aiYukleniyor, setAiYukleniyor] = useState(false);
  const [aiHata, setAiHata] = useState<string | null>(null);

  useEffect(() => {
    api.get<RaporVerisi>("/reports").then(setVeri);
  }, []);

  if (!veri) return <Spinner />;

  const kritikStoklar = veri.stokDurumu.filter((m) => m.minStockQty > 0 && m.stockQty <= m.minStockQty);

  const aiDegerlendir = async () => {
    setAiYukleniyor(true);
    setAiHata(null);
    try {
      const sonuc = await api.post<AiDegerlendirme>("/ai/rapor-degerlendir", {
        toplamIsSayisi: veri.toplamIsSayisi,
        toplamSatis: veri.toplamSatis,
        toplamMaliyet: veri.toplamMaliyet,
        toplamKar: veri.toplamKar,
        aylikOzet: veri.aylikOzet,
        fireOranlari: veri.fireOranlari,
        kritikStokSayisi: kritikStoklar.length,
      });
      setAiSonuc(sonuc);
    } catch (e: any) {
      setAiHata(e.message);
    } finally {
      setAiYukleniyor(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Raporlar</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Toplam İş" value={String(veri.toplamIsSayisi)} />
        <StatCard label="Toplam Satış" value={tl(veri.toplamSatis)} />
        <StatCard label="Toplam Maliyet" value={tl(veri.toplamMaliyet)} />
        <StatCard label="Gerçekleşen Kâr" value={tl(veri.toplamKar)} />
      </div>

      <div className="card space-y-2">
        <h2 className="font-bold">🤖 AI Değerlendirmesi</h2>
        {!aiSonuc ? (
          <button className="btn-secondary btn-sm" onClick={aiDegerlendir} disabled={aiYukleniyor}>
            {aiYukleniyor ? "Değerlendiriliyor..." : "AI ile Değerlendir"}
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-neutral-700">{aiSonuc.degerlendirme}</p>
            {aiSonuc.dikkatEdilmesiGerekenler.length > 0 && (
              <ul className="text-sm text-neutral-700 list-disc pl-5 space-y-0.5">
                {aiSonuc.dikkatEdilmesiGerekenler.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {aiHata && <div className="text-sm text-red-600">{aiHata}</div>}
      </div>

      <div className="card">
        <h2 className="font-bold mb-3">🏆 Atölyenin Kârlılığı (İş Türüne Göre)</h2>
        {veri.kategoriKarliligi.length === 0 ? (
          <div className="text-sm text-neutral-500">Henüz kabul edilmiş teklif yok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-500 text-left">
                <tr>
                  <th className="px-3 py-2">Kategori</th>
                  <th className="px-3 py-2">Kâr Marjı</th>
                  <th className="px-3 py-2">Ciro</th>
                  <th className="px-3 py-2">Kâr</th>
                  <th className="px-3 py-2">İş Sayısı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {veri.kategoriKarliligi.map((k, i) => (
                  <tr key={k.kategori}>
                    <td className="px-3 py-2 font-medium">
                      {i === 0 && "🥇 "}
                      {i === veri.kategoriKarliligi.length - 1 && veri.kategoriKarliligi.length > 1 && "⚠️ "}
                      {KATEGORI_ETIKET[k.kategori as ProjectCategory] ?? k.kategori}
                    </td>
                    <td className={`px-3 py-2 font-bold ${k.marjYuzde >= 25 ? "text-emerald-700" : k.marjYuzde >= 10 ? "text-amber-700" : "text-red-600"}`}>
                      %{sayi(k.marjYuzde, 1)}
                    </td>
                    <td className="px-3 py-2">{tl(k.ciro)}</td>
                    <td className="px-3 py-2">{tl(k.kar)}</td>
                    <td className="px-3 py-2 text-neutral-500">{k.isSayisi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="font-bold mb-3">📅 Aylık Satış / Kâr</h2>
        {veri.aylikOzet.length === 0 ? (
          <div className="text-sm text-neutral-500">Henüz kabul edilmiş teklif yok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-500 text-left">
                <tr>
                  <th className="px-3 py-2">Ay</th>
                  <th className="px-3 py-2">Satış</th>
                  <th className="px-3 py-2">Kâr</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {veri.aylikOzet.map((a) => (
                  <tr key={a.ay}>
                    <td className="px-3 py-2 font-medium">{ayEtiketi(a.ay)}</td>
                    <td className="px-3 py-2">{tl(a.satis)}</td>
                    <td className="px-3 py-2 text-emerald-700 font-semibold">{tl(a.kar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-bold mb-3">🧱 En Çok Kullanılan Profiller</h2>
          <YatayBarGrafik
            kalemler={veri.enCokKullanilanProfil.map((p) => ({ etiket: p.materialName, deger: p.toplamMetre }))}
            renk="#2563eb"
            birim="m"
          />
        </div>
        <div className="card">
          <h2 className="font-bold mb-3">✂️ Ortalama Fire Oranı</h2>
          <YatayBarGrafik
            kalemler={veri.fireOranlari.map((f) => ({ etiket: f.materialName, deger: f.ortalamaFireYuzde }))}
            renk="#ea580c"
            birim="%"
          />
        </div>
      </div>

      <div className="card">
        <h2 className="font-bold mb-3">📦 Stok Durumu</h2>
        {kritikStoklar.length > 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 text-sm mb-3">
            ⚠️ {kritikStoklar.length} malzeme kritik stok seviyesinde.
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-500 text-left">
              <tr>
                <th className="px-3 py-2">Malzeme</th>
                <th className="px-3 py-2">Stok</th>
                <th className="px-3 py-2">Min. Stok</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {veri.stokDurumu.map((m) => {
                const kritik = m.minStockQty > 0 && m.stockQty <= m.minStockQty;
                return (
                  <tr key={m.id} className={kritik ? "bg-amber-50" : undefined}>
                    <td className="px-3 py-2 font-medium">{m.name}</td>
                    <td className={`px-3 py-2 ${kritik ? "text-amber-700 font-semibold" : ""}`}>
                      {sayi(m.stockQty, 2)} {m.unit}
                    </td>
                    <td className="px-3 py-2 text-neutral-500">
                      {m.minStockQty > 0 ? `${sayi(m.minStockQty, 2)} ${m.unit}` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="font-bold mb-3">⏱️ Tahmini Teslim Süresi (Kategoriye Göre)</h2>
        {veri.tahminiSureler.length === 0 ? (
          <div className="text-sm text-neutral-500">
            Henüz tamamlanmış iş yok - kategori bazlı ortalama süre, ilk işler tamamlandıkça burada görünecek.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-neutral-500 text-left">
                <tr>
                  <th className="px-3 py-2">Kategori</th>
                  <th className="px-3 py-2">Ortalama Süre</th>
                  <th className="px-3 py-2">Örnek Sayısı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {veri.tahminiSureler.map((t) => (
                  <tr key={t.kategori}>
                    <td className="px-3 py-2 font-medium">{KATEGORI_ETIKET[t.kategori as ProjectCategory] ?? t.kategori}</td>
                    <td className="px-3 py-2">{sayi(t.ortalamaGun, 1)} gün</td>
                    <td className="px-3 py-2 text-neutral-500">{t.ornekSayisi} iş</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
