import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Settings } from "../api/types";
import { Spinner, HataKutusu } from "../components/ui";

export default function Ayarlar() {
  const [form, setForm] = useState<Settings | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [basarili, setBasarili] = useState(false);

  useEffect(() => {
    api.get<Settings>("/settings").then(setForm);
  }, []);

  if (!form) return <Spinner />;

  const set = (k: keyof Settings, v: unknown) => setForm({ ...form, [k]: v } as Settings);

  const kaydet = async () => {
    setKaydediliyor(true);
    setHata(null);
    setBasarili(false);
    try {
      const kaydedilen = await api.put<Settings>("/settings", form);
      setForm(kaydedilen);
      setBasarili(true);
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">Ayarlar</h1>
      <div className="card space-y-3">
        <h2 className="font-bold text-neutral-700">Firma Bilgileri</h2>
        <HataKutusu mesaj={hata} />
        {basarili && <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 text-sm font-medium">Kaydedildi.</div>}
        <div>
          <label className="field-label">Firma Adı</label>
          <input className="field-input" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
        </div>
        <div>
          <label className="field-label">Telefon</label>
          <input className="field-input" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div>
          <label className="field-label">E-posta</label>
          <input className="field-input" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div>
          <label className="field-label">Adres</label>
          <textarea className="field-input" rows={2} value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
        </div>
        <div>
          <label className="field-label">Vergi No</label>
          <input className="field-input" value={form.taxNumber ?? ""} onChange={(e) => set("taxNumber", e.target.value)} />
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-bold text-neutral-700">Varsayılan Değerler</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Varsayılan KDV (%)</label>
            <input type="number" className="field-input" value={form.defaultVatPercent} onChange={(e) => set("defaultVatPercent", Number(e.target.value))} />
          </div>
          <div>
            <label className="field-label">Varsayılan Kâr (%)</label>
            <input type="number" className="field-input" value={form.defaultProfitPercent} onChange={(e) => set("defaultProfitPercent", Number(e.target.value))} />
          </div>
          <div>
            <label className="field-label">Teklif Geçerlilik (gün)</label>
            <input type="number" className="field-input" value={form.quoteValidityDays} onChange={(e) => set("quoteValidityDays", Number(e.target.value))} />
          </div>
          <div>
            <label className="field-label">Para Birimi</label>
            <input className="field-input" value={form.currency} onChange={(e) => set("currency", e.target.value)} />
          </div>
        </div>
      </div>

      <button className="btn-primary w-full" onClick={kaydet} disabled={kaydediliyor}>
        {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
      </button>

      <div className="card space-y-2">
        <h2 className="font-bold text-neutral-700">💾 Veri Yedekleme</h2>
        <p className="text-sm text-neutral-500">
          Tüm müşteri, iş, malzeme ve teklif verilerini tek bir JSON dosyası olarak indirin.
        </p>
        <a className="btn-secondary" href="/api/backup/export" download>
          ⬇️ Tüm Verileri İndir
        </a>
      </div>
    </div>
  );
}
