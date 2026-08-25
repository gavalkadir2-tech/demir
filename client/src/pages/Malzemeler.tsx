import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Material, MaterialCategory, MaterialUnit, MaterialPrice, ProfilSekli, MALZEME_KATEGORI_ETIKET, PROFIL_SEKLI_ETIKET } from "../api/types";
import { Modal, Spinner, EmptyState, HataKutusu } from "../components/ui";
import { tl, sayi, tarih } from "../lib/format";

const KATEGORILER: MaterialCategory[] = ["PROFILE", "SHEET", "CONSUMABLE", "FASTENER", "OTHER"];
const BIRIMLER: MaterialUnit[] = ["M", "KG", "ADET", "M2"];
const PROFIL_SEKILLERI: ProfilSekli[] = ["BOX", "ANGLE", "CHANNEL", "ROUND_SOLID", "ROUND_PIPE", "FLAT"];

export default function Malzemeler() {
  const [malzemeler, setMalzemeler] = useState<Material[] | null>(null);
  const [kategori, setKategori] = useState<MaterialCategory | "">("");
  const [profilSekli, setProfilSekli] = useState<ProfilSekli | "">("");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<Material | "new" | null>(null);
  const [sacModal, setSacModal] = useState(false);

  const yukle = () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (kategori) params.set("category", kategori);
    if (kategori === "PROFILE" && profilSekli) params.set("profilSekli", profilSekli);
    api.get<Material[]>(`/materials?${params}`).then(setMalzemeler);
  };

  useEffect(() => {
    yukle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, kategori, profilSekli]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Malzemeler</h1>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setSacModal(true)}>
            🧮 Sac Hesaplama
          </button>
          <button className="btn-primary" onClick={() => setModal("new")}>
            ➕ Yeni Malzeme
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input className="field-input flex-1 min-w-[200px]" placeholder="Malzeme ara (ad veya kesit)..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select
          className="field-select w-auto"
          value={kategori}
          onChange={(e) => {
            setKategori(e.target.value as any);
            setProfilSekli("");
          }}
        >
          <option value="">Tüm kategoriler</option>
          {KATEGORILER.map((k) => (
            <option key={k} value={k}>
              {MALZEME_KATEGORI_ETIKET[k]}
            </option>
          ))}
        </select>
        {kategori === "PROFILE" && (
          <select className="field-select w-auto" value={profilSekli} onChange={(e) => setProfilSekli(e.target.value as any)}>
            <option value="">Tüm profil türleri</option>
            {PROFIL_SEKILLERI.map((p) => (
              <option key={p} value={p}>
                {PROFIL_SEKLI_ETIKET[p]}
              </option>
            ))}
          </select>
        )}
      </div>

      {!malzemeler ? (
        <Spinner />
      ) : malzemeler.length === 0 ? (
        <EmptyState title="Malzeme bulunamadı" />
      ) : (
        <div className="overflow-x-auto card !p-0">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-500 text-left">
              <tr>
                <th className="px-4 py-3">Ad</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Birim Fiyat</th>
                <th className="px-4 py-3">Stok</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {malzemeler.map((m) => (
                <tr key={m.id} className={m.stockQty <= m.minStockQty && m.minStockQty > 0 ? "bg-amber-50" : undefined}>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{m.name}</div>
                    {m.standardLengthM && <div className="text-xs text-neutral-500">Standart boy: {m.standardLengthM} m</div>}
                  </td>
                  <td className="px-4 py-3">
                    {MALZEME_KATEGORI_ETIKET[m.category]}
                    {m.profilSekli && <span className="text-neutral-400"> · {PROFIL_SEKLI_ETIKET[m.profilSekli]}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {tl(m.unitPrice)} / {m.unit === "M" ? "m" : m.unit === "KG" ? "kg" : m.unit === "M2" ? "m²" : "adet"}
                  </td>
                  <td className="px-4 py-3">
                    {sayi(m.stockQty)} {m.minStockQty > 0 && `(min ${sayi(m.minStockQty)})`}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="btn-secondary btn-sm" onClick={() => setModal(m)}>
                      Düzenle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && <MalzemeModal malzeme={modal === "new" ? null : modal} onClose={() => setModal(null)} onSaved={yukle} />}
      <SacHesaplamaModal open={sacModal} onClose={() => setSacModal(false)} />
    </div>
  );
}

function MalzemeModal({ malzeme, onClose, onSaved }: { malzeme: Material | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Material>>(
    malzeme ?? { category: "PROFILE", unit: "KG", unitPrice: 0, kerfMm: 3, stockQty: 0, minStockQty: 0 }
  );
  const [alternatifBoylarMetin, setAlternatifBoylarMetin] = useState(() => (malzeme?.alternatifBoylarM ?? []).join(", "));
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const set = (k: keyof Material, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const kaydet = async () => {
    if (!form.name?.trim()) {
      setHata("Malzeme adı zorunlu.");
      return;
    }
    const alternatifBoylarM = alternatifBoylarMetin
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);

    setKaydediliyor(true);
    setHata(null);
    try {
      const gövde = { ...form, alternatifBoylarM };
      if (malzeme) await api.put(`/materials/${malzeme.id}`, gövde);
      else await api.post("/materials", gövde);
      onSaved();
      onClose();
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={malzeme ? "Malzemeyi Düzenle" : "Yeni Malzeme"} wide>
      <div className="space-y-3">
        <HataKutusu mesaj={hata} />
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="field-label">Malzeme Adı *</label>
            <input className="field-input" value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className="field-label">Kesit (örn. 40x40x2)</label>
            <input className="field-input" value={form.section ?? ""} onChange={(e) => set("section", e.target.value)} />
          </div>
          <div>
            <label className="field-label">Kategori</label>
            <select className="field-select" value={form.category} onChange={(e) => set("category", e.target.value)}>
              {KATEGORILER.map((k) => (
                <option key={k} value={k}>
                  {MALZEME_KATEGORI_ETIKET[k]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Birim</label>
            <select className="field-select" value={form.unit} onChange={(e) => set("unit", e.target.value)}>
              {BIRIMLER.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Birim Fiyat (TL)</label>
            <input type="number" className="field-input" value={form.unitPrice ?? 0} onChange={(e) => set("unitPrice", Number(e.target.value))} />
          </div>
          <div>
            <label className="field-label">Kg/m Ağırlık (profil için)</label>
            <input type="number" className="field-input" value={form.unitWeightKgPerM ?? ""} onChange={(e) => set("unitWeightKgPerM", e.target.value ? Number(e.target.value) : null)} />
          </div>
          {form.category === "PROFILE" && (
            <>
              <div>
                <label className="field-label">Profil Türü</label>
                <select
                  className="field-select"
                  value={form.profilSekli ?? ""}
                  onChange={(e) => set("profilSekli", e.target.value || null)}
                >
                  <option value="">Seçilmedi</option>
                  {PROFIL_SEKILLERI.map((p) => (
                    <option key={p} value={p}>
                      {PROFIL_SEKLI_ETIKET[p]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Kesit Genişliği (mm)</label>
                <input
                  type="number"
                  className="field-input"
                  value={form.widthMm ?? ""}
                  onChange={(e) => set("widthMm", e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div>
                <label className="field-label">Kesit Yüksekliği (mm, kutu/kanal için)</label>
                <input
                  type="number"
                  className="field-input"
                  value={form.heightMm ?? ""}
                  onChange={(e) => set("heightMm", e.target.value ? Number(e.target.value) : null)}
                />
              </div>
            </>
          )}
          <div>
            <label className="field-label">Standart Boy (m)</label>
            <input type="number" className="field-input" value={form.standardLengthM ?? ""} onChange={(e) => set("standardLengthM", e.target.value ? Number(e.target.value) : null)} />
          </div>
          {form.category === "PROFILE" && (
            <div>
              <label className="field-label">Alternatif Stok Boyları (m, virgülle ayırın)</label>
              <input
                className="field-input"
                placeholder="örn. 3, 12"
                value={alternatifBoylarMetin}
                onChange={(e) => setAlternatifBoylarMetin(e.target.value)}
              />
              <p className="text-xs text-neutral-500 mt-1">
                Standart boya ek olarak stokta bu uzunluklarda da varsa (örn. 12m'lik uzun stok veya elde kalan 3m'lik
                artık), kesim optimizasyonu her çubuk için fire açısından en uygun boyu otomatik seçer.
              </p>
            </div>
          )}
          <div>
            <label className="field-label">Kesim Payı (mm)</label>
            <input type="number" className="field-input" value={form.kerfMm ?? 3} onChange={(e) => set("kerfMm", Number(e.target.value))} />
          </div>
          <div>
            <label className="field-label">Stok Miktarı</label>
            <input type="number" className="field-input" value={form.stockQty ?? 0} onChange={(e) => set("stockQty", Number(e.target.value))} />
          </div>
          <div>
            <label className="field-label">Min. Stok</label>
            <input type="number" className="field-input" value={form.minStockQty ?? 0} onChange={(e) => set("minStockQty", Number(e.target.value))} />
          </div>
          <div>
            <label className="field-label">Tedarikçi</label>
            <input className="field-input" value={form.supplier ?? ""} onChange={(e) => set("supplier", e.target.value)} />
          </div>
        </div>
        {form.category === "PROFILE" && (
          <p className="text-xs text-neutral-500">
            Profil türü ve kesit ölçüleri, malzeme listesini alt kategoriye göre filtrelemek ve yapısal (mukavemet)
            kontrollerinde kullanılır.
          </p>
        )}
        <button className="btn-primary w-full" onClick={kaydet} disabled={kaydediliyor}>
          {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
        </button>

        {malzeme && <TedarikciFiyatlariBolumu materialId={malzeme.id} />}
      </div>
    </Modal>
  );
}

function TedarikciFiyatlariBolumu({ materialId }: { materialId: number }) {
  const [fiyatlar, setFiyatlar] = useState<MaterialPrice[] | null>(null);
  const [tedarikci, setTedarikci] = useState("");
  const [fiyat, setFiyat] = useState(0);
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const yukle = () =>
    api.get<Material & { priceHistory: MaterialPrice[] }>(`/materials/${materialId}`).then((m) => setFiyatlar(m.priceHistory));

  useEffect(() => {
    yukle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId]);

  const ekle = async () => {
    if (!tedarikci.trim() || fiyat <= 0) return setHata("Tedarikçi adı ve fiyat girin.");
    setKaydediliyor(true);
    setHata(null);
    try {
      await api.post(`/materials/${materialId}/tedarikci-fiyati`, { supplier: tedarikci, price: fiyat });
      setTedarikci("");
      setFiyat(0);
      yukle();
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  const tedarikciliFiyatlar = (fiyatlar ?? []).filter((f) => f.supplier);
  const enUcuz =
    tedarikciliFiyatlar.length > 0 ? Math.min(...tedarikciliFiyatlar.map((f) => f.price)) : null;

  return (
    <div className="pt-3 border-t border-neutral-200 space-y-3">
      <h3 className="font-bold text-sm">🏷️ Tedarikçi Fiyat Karşılaştırması</h3>
      <HataKutusu mesaj={hata} />
      <div className="flex gap-2 flex-wrap items-end">
        <div className="flex-1 min-w-[140px]">
          <label className="field-label">Tedarikçi</label>
          <input className="field-input" value={tedarikci} onChange={(e) => setTedarikci(e.target.value)} />
        </div>
        <div className="w-32">
          <label className="field-label">Fiyat (TL)</label>
          <input type="number" className="field-input" value={fiyat || ""} onChange={(e) => setFiyat(Number(e.target.value))} />
        </div>
        <button className="btn-secondary btn-sm" onClick={ekle} disabled={kaydediliyor}>
          Ekle
        </button>
      </div>
      {!fiyatlar ? (
        <Spinner />
      ) : tedarikciliFiyatlar.length === 0 ? (
        <div className="text-xs text-neutral-500">Henüz tedarikçi fiyatı kaydedilmedi.</div>
      ) : (
        <div className="divide-y divide-neutral-100 text-sm">
          {tedarikciliFiyatlar.map((f) => (
            <div key={f.id} className="py-1.5 flex items-center justify-between">
              <div>
                <span className="font-medium">{f.supplier}</span>
                <span className="text-neutral-400 text-xs ml-2">{tarih(f.effectiveDate)}</span>
              </div>
              <span className={`font-bold ${f.price === enUcuz ? "text-emerald-600" : ""}`}>
                {tl(f.price)}
                {f.price === enUcuz && " ✓ en ucuz"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SacHesaplamaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [kalinlikMm, setKalinlikMm] = useState(2);
  const [enMm, setEnMm] = useState(1250);
  const [boyMm, setBoyMm] = useState(2500);
  const [adet, setAdet] = useState(1);
  const [birimFiyatKg, setBirimFiyatKg] = useState(42);
  const [sonuc, setSonuc] = useState<{ alanM2: number; agirlikKg: number; maliyet: number } | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const hesapla = async () => {
    setHata(null);
    try {
      const r = await api.post<{ alanM2: number; agirlikKg: number; maliyet: number }>("/calc/araclar/sac", {
        kalinlikMm,
        enMm,
        boyMm,
        adet,
        birimFiyatKg,
      });
      setSonuc(r);
    } catch (e: any) {
      setHata(e.message);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Sac Hesaplama">
      <div className="space-y-3">
        <HataKutusu mesaj={hata} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Kalınlık (mm)</label>
            <input type="number" className="field-input" value={kalinlikMm} onChange={(e) => setKalinlikMm(Number(e.target.value))} />
          </div>
          <div>
            <label className="field-label">Adet</label>
            <input type="number" className="field-input" value={adet} onChange={(e) => setAdet(Number(e.target.value))} />
          </div>
          <div>
            <label className="field-label">En (mm)</label>
            <input type="number" className="field-input" value={enMm} onChange={(e) => setEnMm(Number(e.target.value))} />
          </div>
          <div>
            <label className="field-label">Boy (mm)</label>
            <input type="number" className="field-input" value={boyMm} onChange={(e) => setBoyMm(Number(e.target.value))} />
          </div>
          <div className="col-span-2">
            <label className="field-label">Kg Birim Fiyatı (TL)</label>
            <input type="number" className="field-input" value={birimFiyatKg} onChange={(e) => setBirimFiyatKg(Number(e.target.value))} />
          </div>
        </div>
        <button className="btn-primary w-full" onClick={hesapla}>
          Hesapla
        </button>
        {sonuc && (
          <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 space-y-1 text-sm">
            <div>
              Toplam Alan: <strong>{sonuc.alanM2} m²</strong>
            </div>
            <div>
              Toplam Ağırlık: <strong>{sonuc.agirlikKg} kg</strong>
            </div>
            <div>
              Toplam Maliyet: <strong>{tl(sonuc.maliyet)}</strong>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
