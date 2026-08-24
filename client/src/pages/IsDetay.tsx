import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import {
  Project,
  ProjectItem,
  Part,
  ProjectStatus,
  ProjectCategory,
  Material,
  Customer,
  LaborType,
  ExpenseType,
  ProductTemplate,
  ISCILIK_ETIKET,
  GIDER_ETIKET,
  DURUM_ETIKET,
  DURUM_RENK,
  KATEGORI_ETIKET,
  TEKLIF_DURUM_ETIKET,
} from "../api/types";
import { Spinner, HataKutusu, UyariKutusu, Badge, Modal, EmptyState } from "../components/ui";
import MaterialSelect from "../components/MaterialSelect";
import CuttingBarView from "../components/CuttingBarView";
import { UrunFormu, URUN_EMOJI } from "./YeniIs";
import SemaGorunum from "../components/SemaGorunum";
import { tl, mm, tarih, sayi } from "../lib/format";

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

const SEKMELER = [
  { key: "ozet", label: "Özet" },
  { key: "parcalar", label: "Parçalar" },
  { key: "kesim", label: "Kesim Listesi" },
  { key: "maliyet", label: "İşçilik & Giderler" },
  { key: "teklifler", label: "Teklifler" },
] as const;

type SekmeKey = (typeof SEKMELER)[number]["key"];

export default function IsDetay() {
  const { id } = useParams();
  const projectId = Number(id);
  const [proje, setProje] = useState<Project | null>(null);
  const [tab, setTab] = useState<SekmeKey>("ozet");
  const [duzenleModal, setDuzenleModal] = useState(false);

  const yukle = () => api.get<Project>(`/projects/${projectId}`).then(setProje);

  useEffect(() => {
    yukle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (!proje) return <Spinner />;

  return (
    <div className="space-y-6">
      <Link to="/isler" className="text-sm text-brand-700 font-semibold">
        ← İşler
      </Link>

      <div className="card">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{proje.title}</h1>
            <div className="text-neutral-500">
              {proje.customer?.name} • {KATEGORI_ETIKET[proje.category]} • {tarih(proje.createdAt)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary btn-sm" onClick={() => setDuzenleModal(true)}>
              ✏️ Düzenle
            </button>
            <select
              className="field-select w-auto"
              value={proje.status}
              onChange={async (e) => {
                await api.put(`/projects/${projectId}`, { status: e.target.value });
                yukle();
              }}
            >
              {DURUMLAR.map((d) => (
                <option key={d} value={d}>
                  {DURUM_ETIKET[d]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {duzenleModal && (
        <IsDuzenleModal
          proje={proje}
          onClose={() => setDuzenleModal(false)}
          onSaved={() => {
            setDuzenleModal(false);
            yukle();
          }}
        />
      )}

      <div className="flex gap-1 overflow-x-auto border-b border-neutral-200">
        {SEKMELER.map((s) => (
          <button
            key={s.key}
            onClick={() => setTab(s.key)}
            className={`px-4 py-3 font-semibold whitespace-nowrap border-b-2 -mb-px ${
              tab === s.key ? "border-brand-600 text-brand-700" : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {tab === "ozet" && <OzetTab proje={proje} onChanged={yukle} />}
      {tab === "parcalar" && <ParcalarTab proje={proje} onChanged={yukle} />}
      {tab === "kesim" && <KesimTab proje={proje} onChanged={yukle} />}
      {tab === "maliyet" && <MaliyetTab proje={proje} onChanged={yukle} />}
      {tab === "teklifler" && <TekliflerTab proje={proje} onChanged={yukle} />}
    </div>
  );
}

const KATEGORILER = Object.keys(KATEGORI_ETIKET) as ProjectCategory[];

function IsDuzenleModal({ proje, onClose, onSaved }: { proje: Project; onClose: () => void; onSaved: () => void }) {
  const [musteriler, setMusteriler] = useState<Customer[] | null>(null);
  const [title, setTitle] = useState(proje.title);
  const [customerId, setCustomerId] = useState(proje.customerId);
  const [category, setCategory] = useState<ProjectCategory>(proje.category);
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  useEffect(() => {
    api.get<Customer[]>("/customers").then(setMusteriler);
  }, []);

  const kaydet = async () => {
    if (!title.trim()) return setHata("İş adı zorunlu.");
    setKaydediliyor(true);
    setHata(null);
    try {
      await api.put(`/projects/${proje.id}`, { title, customerId, category });
      onSaved();
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="İşi Düzenle">
      <div className="space-y-3">
        <HataKutusu mesaj={hata} />
        <div>
          <label className="field-label">İş Adı</label>
          <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Müşteri</label>
          {!musteriler ? (
            <Spinner />
          ) : (
            <select className="field-select" value={customerId} onChange={(e) => setCustomerId(Number(e.target.value))}>
              {musteriler.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="field-label">Kategori</label>
          <select className="field-select" value={category} onChange={(e) => setCategory(e.target.value as ProjectCategory)}>
            {KATEGORILER.map((k) => (
              <option key={k} value={k}>
                {KATEGORI_ETIKET[k]}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-primary w-full" onClick={kaydet} disabled={kaydediliyor}>
          {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </Modal>
  );
}

function OzetTab({ proje, onChanged }: { proje: Project; onChanged: () => void }) {
  const [form, setForm] = useState({
    overheadPercent: proje.overheadPercent,
    profitMode: proje.profitMode,
    profitValue: proje.profitValue,
    vatPercent: proje.vatPercent,
    validityDays: proje.validityDays,
    note: proje.note ?? "",
  });
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [dusuluyor, setDusuluyor] = useState(false);
  const [stokUyari, setStokUyari] = useState<string[]>([]);

  const kaydet = async () => {
    setKaydediliyor(true);
    setHata(null);
    try {
      await api.put(`/projects/${proje.id}`, form);
      onChanged();
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  const stoktanDus = async () => {
    setDusuluyor(true);
    setHata(null);
    try {
      const r = await api.post<{ uyarilar: string[] }>(`/projects/${proje.id}/stock/deduct`);
      setStokUyari(r.uyarilar);
      onChanged();
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setDusuluyor(false);
    }
  };

  return (
    <div className="space-y-4">
      <HataKutusu mesaj={hata} />
      <UyariKutusu mesajlar={stokUyari} />

      <div className="card space-y-3">
        <h2 className="font-bold">Müşteri</h2>
        <div className="text-sm text-neutral-600">
          {proje.customer?.phone && <div>📞 {proje.customer.phone}</div>}
          {proje.customer?.address && <div>📍 {proje.customer.address}</div>}
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-bold">Maliyet Ayarları</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Genel Gider (%)</label>
            <input type="number" className="field-input" value={form.overheadPercent} onChange={(e) => setForm({ ...form, overheadPercent: Number(e.target.value) })} />
          </div>
          <div>
            <label className="field-label">KDV (%)</label>
            <input type="number" className="field-input" value={form.vatPercent} onChange={(e) => setForm({ ...form, vatPercent: Number(e.target.value) })} />
          </div>
          <div>
            <label className="field-label">Kâr Modu</label>
            <select className="field-select" value={form.profitMode} onChange={(e) => setForm({ ...form, profitMode: e.target.value as "PERCENT" | "FIXED" })}>
              <option value="PERCENT">Yüzde (%)</option>
              <option value="FIXED">Sabit TL</option>
            </select>
          </div>
          <div>
            <label className="field-label">Kâr {form.profitMode === "PERCENT" ? "(%)" : "(TL)"}</label>
            <input type="number" className="field-input" value={form.profitValue} onChange={(e) => setForm({ ...form, profitValue: Number(e.target.value) })} />
          </div>
          <div>
            <label className="field-label">Teklif Geçerlilik (gün)</label>
            <input type="number" className="field-input" value={form.validityDays} onChange={(e) => setForm({ ...form, validityDays: Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <label className="field-label">Not</label>
          <textarea className="field-input" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
        <button className="btn-primary" onClick={kaydet} disabled={kaydediliyor}>
          {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>

      <div className="card space-y-3">
        <h2 className="font-bold">Stok</h2>
        {proje.stockDeducted ? (
          <div className="text-emerald-700 font-semibold">✅ Bu iş için malzeme stoktan düşüldü.</div>
        ) : (
          <>
            <p className="text-sm text-neutral-500">
              İş onaylandığında, kesim planına göre gereken çubuk adetleri stoktan düşülür. Önce "Kesim Listesi" sekmesinden planı oluşturun.
            </p>
            <button className="btn-secondary" onClick={stoktanDus} disabled={dusuluyor}>
              {dusuluyor ? "Düşülüyor..." : "📦 Stoktan Düş"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ParcalarTab({ proje, onChanged }: { proje: Project; onChanged: () => void }) {
  const [manuelModal, setManuelModal] = useState(false);
  const [urunModal, setUrunModal] = useState(false);
  const [duzenleItem, setDuzenleItem] = useState<ProjectItem | null>(null);
  const [duzenleParca, setDuzenleParca] = useState<Part | null>(null);

  const itemSil = async (itemId: number) => {
    if (!confirm("Bu ürünü ve ilgili parçalarını silmek istediğinize emin misiniz?")) return;
    await api.del(`/projects/${proje.id}/items/${itemId}`);
    onChanged();
  };

  const parcaSil = async (partId: number) => {
    if (!confirm("Bu parçayı silmek istediğinize emin misiniz?")) return;
    await api.del(`/projects/${proje.id}/parts/${partId}`);
    onChanged();
  };

  const manuelParcalar = (proje.parts ?? []).filter((p) => !p.projectItemId);

  return (
    <div className="space-y-6">
      {proje.agirlikOzeti && (
        <div className="card flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-sm text-neutral-500">Tahmini toplam iş ağırlığı</div>
            <div className="text-2xl font-bold">{sayi(proje.agirlikOzeti.toplamAgirlikKg, 1)} kg</div>
          </div>
          {proje.agirlikOzeti.eksikAgirlikVerisi && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-w-sm">
              ⚠️ Bazı malzemelerin kg/m ağırlığı tanımlı değil; toplam eksik hesaplanmış olabilir. Malzemeler
              sayfasından ağırlık girin.
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button className="btn-primary" onClick={() => setUrunModal(true)}>
          ➕ Ürün Şablonundan Ekle
        </button>
        <button className="btn-secondary" onClick={() => setManuelModal(true)}>
          ➕ Manuel Parça Ekle
        </button>
      </div>

      {(proje.items ?? []).map((item) => (
        <div key={item.id} className="card">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-bold">{item.name}</div>
              <div className="text-sm text-neutral-500">{item.template.name}</div>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary btn-sm" onClick={() => setDuzenleItem(item)}>
                ✏️ Düzenle
              </button>
              <button className="btn-danger btn-sm" onClick={() => itemSil(item.id)}>
                Sil
              </button>
            </div>
          </div>
          <div className="mb-3">
            <SemaGorunum templateKey={item.template.key} params={item.paramsJson} ozetDegerler={item.resultJson.ozetDegerler} />
          </div>
          <PartTable
            parcalar={(proje.parts ?? []).filter((p) => p.projectItemId === item.id)}
            onDelete={parcaSil}
            onEdit={setDuzenleParca}
          />
        </div>
      ))}

      <div className="card">
        <h2 className="font-bold mb-2">Manuel Eklenen Parçalar</h2>
        {manuelParcalar.length === 0 ? (
          <div className="text-sm text-neutral-500">Manuel eklenen parça yok.</div>
        ) : (
          <PartTable parcalar={manuelParcalar} onDelete={parcaSil} onEdit={setDuzenleParca} />
        )}
      </div>

      {(proje.items ?? []).length === 0 && manuelParcalar.length === 0 && (
        <EmptyState title="Henüz parça eklenmedi" description="Bir ürün şablonu seçin veya manuel parça ekleyin." />
      )}

      {manuelModal && (
        <ManuelParcaModal
          projectId={proje.id}
          onClose={() => setManuelModal(false)}
          onSaved={() => {
            setManuelModal(false);
            onChanged();
          }}
        />
      )}
      {duzenleParca && (
        <ManuelParcaModal
          projectId={proje.id}
          duzenleParca={duzenleParca}
          onClose={() => setDuzenleParca(null)}
          onSaved={() => {
            setDuzenleParca(null);
            onChanged();
          }}
        />
      )}
      {urunModal && (
        <UrunSablonuModal
          projectId={proje.id}
          onClose={() => setUrunModal(false)}
          onSaved={() => {
            setUrunModal(false);
            onChanged();
          }}
        />
      )}
      {duzenleItem && (
        <UrunSablonuModal
          projectId={proje.id}
          duzenleItem={duzenleItem}
          onClose={() => setDuzenleItem(null)}
          onSaved={() => {
            setDuzenleItem(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function parcaAgirlikKg(p: Part): number | null {
  if (!p.material.unitWeightKgPerM) return null;
  return (p.lengthMm / 1000) * p.qty * p.material.unitWeightKgPerM;
}

function PartTable({
  parcalar,
  onDelete,
  onEdit,
}: {
  parcalar: Project["parts"];
  onDelete: (id: number) => void;
  onEdit?: (p: Part) => void;
}) {
  if (!parcalar || parcalar.length === 0) return null;
  const toplamAgirlik = parcalar.reduce((acc, p) => acc + (parcaAgirlikKg(p) ?? 0), 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-neutral-500 text-left">
          <tr>
            <th className="px-3 py-2">Parça</th>
            <th className="px-3 py-2">Malzeme</th>
            <th className="px-3 py-2">Uzunluk</th>
            <th className="px-3 py-2">Adet</th>
            <th className="px-3 py-2">Ağırlık</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {parcalar.map((p) => {
            const agirlik = parcaAgirlikKg(p);
            return (
              <tr key={p.id}>
                <td className="px-3 py-2 font-medium">{p.label || "-"}</td>
                <td className="px-3 py-2">{p.material.name}</td>
                <td className="px-3 py-2">{mm(p.lengthMm)}</td>
                <td className="px-3 py-2">{p.qty}</td>
                <td className="px-3 py-2 text-neutral-600">{agirlik != null ? `${sayi(agirlik, 1)} kg` : "-"}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {onEdit && (
                    <button className="text-brand-700 text-xs font-semibold mr-3" onClick={() => onEdit(p)}>
                      Düzenle
                    </button>
                  )}
                  <button className="text-red-600 text-xs font-semibold" onClick={() => onDelete(p.id)}>
                    Sil
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-neutral-200 font-semibold">
            <td className="px-3 py-2" colSpan={4}>
              Toplam
            </td>
            <td className="px-3 py-2">{sayi(toplamAgirlik, 1)} kg</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ManuelParcaModal({
  projectId,
  duzenleParca,
  onClose,
  onSaved,
}: {
  projectId: number;
  duzenleParca?: Part;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [materialId, setMaterialId] = useState<number | undefined>(duzenleParca?.materialId);
  const [label, setLabel] = useState(duzenleParca?.label ?? "");
  const [lengthMm, setLengthMm] = useState(duzenleParca?.lengthMm ?? 1000);
  const [qty, setQty] = useState(duzenleParca?.qty ?? 1);
  const [note, setNote] = useState(duzenleParca?.note ?? "");
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  useEffect(() => {
    api.get<Material[]>("/materials").then(setMaterials);
  }, []);

  const kaydet = async () => {
    if (!materialId) return setHata("Malzeme seçin.");
    setKaydediliyor(true);
    setHata(null);
    try {
      if (duzenleParca) {
        await api.put(`/projects/${projectId}/parts/${duzenleParca.id}`, { materialId, label, lengthMm, qty, note });
      } else {
        await api.post(`/projects/${projectId}/parts`, { materialId, label, lengthMm, qty, note });
      }
      onSaved();
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={duzenleParca ? "Parçayı Düzenle" : "Manuel Parça Ekle"}>
      <div className="space-y-3">
        <HataKutusu mesaj={hata} />
        {duzenleParca?.projectItemId && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠️ Bu parça bir ürün şablonundan otomatik üretildi. Elle değiştirirseniz, ürünü tekrar düzenleyip
            yeniden hesapladığınızda bu değişiklik kaybolur.
          </div>
        )}
        {!materials ? (
          <Spinner />
        ) : (
          <MaterialSelect label="Malzeme / Profil" materials={materials} value={materialId} onChange={setMaterialId} />
        )}
        <div>
          <label className="field-label">Parça Adı (örn. Dikme, Kiriş)</label>
          <input className="field-input" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Uzunluk (mm)</label>
            <input type="number" className="field-input" value={lengthMm} onChange={(e) => setLengthMm(Number(e.target.value))} />
          </div>
          <div>
            <label className="field-label">Adet</label>
            <input type="number" className="field-input" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
          </div>
        </div>
        <div>
          <label className="field-label">Açıklama</label>
          <input className="field-input" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button className="btn-primary w-full" onClick={kaydet} disabled={kaydediliyor}>
          {kaydediliyor ? "Kaydediliyor..." : duzenleParca ? "Kaydet" : "Ekle"}
        </button>
      </div>
    </Modal>
  );
}

function UrunSablonuModal({
  projectId,
  duzenleItem,
  onClose,
  onSaved,
}: {
  projectId: number;
  duzenleItem?: ProjectItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [sablonlar, setSablonlar] = useState<ProductTemplate[] | null>(null);
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [secilenTemplate, setSecilenTemplate] = useState<string | null>(duzenleItem?.template.key ?? null);

  useEffect(() => {
    api.get<ProductTemplate[]>("/product-templates").then((t) => setSablonlar(t.filter((s) => s.key !== "custom")));
    api.get<Material[]>("/materials?category=PROFILE").then(setMaterials);
  }, []);

  return (
    <Modal open onClose={onClose} title={duzenleItem ? `"${duzenleItem.name}" Ürününü Düzenle` : "Ürün Şablonundan Ekle"} wide>
      {!secilenTemplate ? (
        !sablonlar ? (
          <Spinner />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {sablonlar.map((s) => (
              <button key={s.key} className="card flex items-center gap-3 hover:shadow-md text-left" onClick={() => setSecilenTemplate(s.key)}>
                <div className="text-3xl">{URUN_EMOJI[s.key] ?? "🛠️"}</div>
                <div className="font-bold">{s.name}</div>
              </button>
            ))}
          </div>
        )
      ) : !materials ? (
        <Spinner />
      ) : (
        <UrunFormu
          templateKey={secilenTemplate}
          projectId={projectId}
          materials={materials}
          onSaved={onSaved}
          baslangic={duzenleItem?.paramsJson}
          baslangicAd={duzenleItem?.name}
          duzenlemeItemId={duzenleItem?.id}
        />
      )}
    </Modal>
  );
}

function KesimTab({ proje, onChanged }: { proje: Project; onChanged: () => void }) {
  const [uretiliyor, setUretiliyor] = useState(false);
  const [uyarilar, setUyarilar] = useState<string[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [mod, setMod] = useState<"malzeme" | "parca">("malzeme");

  const uret = async () => {
    setUretiliyor(true);
    setHata(null);
    try {
      const r = await api.post<{ uyarilar: string[] }>(`/projects/${proje.id}/cutting/generate`, { mod });
      setUyarilar(r.uyarilar);
      onChanged();
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setUretiliyor(false);
    }
  };

  return (
    <div className="space-y-6">
      <HataKutusu mesaj={hata} />
      <UyariKutusu mesajlar={uyarilar} />
      <div className="card space-y-3">
        <div>
          <label className="field-label">Kesim listesi nasıl gruplansın?</label>
          <div className="flex gap-2">
            <button
              className={mod === "malzeme" ? "btn-primary btn-sm flex-1" : "btn-secondary btn-sm flex-1"}
              onClick={() => setMod("malzeme")}
            >
              Malzeme türüne göre (en verimli)
            </button>
            <button
              className={mod === "parca" ? "btn-primary btn-sm flex-1" : "btn-secondary btn-sm flex-1"}
              onClick={() => setMod("parca")}
            >
              Parça başına (takibi kolay)
            </button>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            {mod === "malzeme"
              ? "Aynı malzemedeki tüm parçalar (etiketten bağımsız) tek havuzda en az fire ile nestelenir."
              : "Her parça türü (Dikme, Üst ray vb.) kendi çubuklarında ayrı hesaplanır; sahada takibi kolaydır ama fire biraz daha fazla olabilir."}
          </p>
        </div>
        <button className="btn-primary" onClick={uret} disabled={uretiliyor}>
          {uretiliyor ? "Hesaplanıyor..." : "✂️ Kesim Planını Oluştur / Güncelle"}
        </button>
      </div>

      {(proje.cuttingLists ?? []).length === 0 ? (
        <EmptyState title="Henüz kesim planı yok" description="Parçalar eklendikten sonra kesim planını oluşturun." />
      ) : (
        (proje.cuttingLists ?? []).map((cl) => (
          <div key={cl.id} className="card space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-bold text-lg">
                {cl.material.name}
                {cl.groupLabel && <span className="text-neutral-500 font-normal"> — {cl.groupLabel}</span>}
              </h2>
              <div className="text-sm text-neutral-500">
                Standart boy: {cl.standardLengthMm / 1000} m • Kesim payı: {cl.kerfMm} mm
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl bg-neutral-50 p-3 text-center">
                <div className="text-2xl font-bold">{cl.totalBars}</div>
                <div className="text-neutral-500">Toplam Çubuk</div>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3 text-center">
                <div className="text-2xl font-bold">{mm(cl.totalWasteMm)}</div>
                <div className="text-neutral-500">Toplam Fire</div>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3 text-center">
                <div className="text-2xl font-bold">%{sayi(cl.wastePercent, 1)}</div>
                <div className="text-neutral-500">Fire Oranı</div>
              </div>
            </div>
            <div className="space-y-2">
              {cl.barsJson.map((bar, i) => (
                <CuttingBarView key={i} bar={bar} standardLengthMm={cl.standardLengthMm} index={i} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function MaliyetTab({ proje, onChanged }: { proje: Project; onChanged: () => void }) {
  return (
    <div className="space-y-6">
      <SarfTahminiKarti proje={proje} />
      <IscilikBolumu proje={proje} onChanged={onChanged} />
      <GiderBolumu proje={proje} onChanged={onChanged} />
    </div>
  );
}

function SarfTahminiKarti({ proje }: { proje: Project }) {
  const t = proje.sarfTahmini;
  if (!t || (t.yuzeyAlaniM2 === 0 && t.kaynakTeliTahminiKg === 0)) return null;
  return (
    <div className="card space-y-2">
      <h2 className="font-bold">🔩 Tahmini Sarf Malzeme İhtiyacı</h2>
      <p className="text-xs text-neutral-500">
        Toplam profil ağırlığı ve kesit yüzey alanından hesaplanan kaba bir tahmindir; atölyenize/kaynak yöntemine göre
        gerçek tüketim farklılık gösterebilir. Aşağıdaki "Sarf Malzeme"/"Boya" gider kalemlerini eklerken referans olarak
        kullanabilirsiniz.
      </p>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-neutral-50 p-3">
          <div className="text-xl font-bold">{sayi(t.kaynakTeliTahminiKg, 1)} kg</div>
          <div className="text-xs text-neutral-500">Kaynak Teli/Elektrot</div>
        </div>
        <div className="rounded-xl bg-neutral-50 p-3">
          <div className="text-xl font-bold">{sayi(t.boyaTahminiKg, 1)} kg</div>
          <div className="text-xs text-neutral-500">Boya (astar + son kat)</div>
        </div>
        <div className="rounded-xl bg-neutral-50 p-3">
          <div className="text-xl font-bold">{sayi(t.yuzeyAlaniM2, 1)} m²</div>
          <div className="text-xs text-neutral-500">Boyanacak Yüzey Alanı</div>
        </div>
      </div>
      {t.yuzeyAlaniEksikVeri && (
        <p className="text-xs text-amber-700">
          ⚠️ Bazı parçaların kesit tipi/boyutu tanımlı değil; yüzey alanı ve dolayısıyla boya tahmini eksik olabilir.
        </p>
      )}
    </div>
  );
}

function IscilikBolumu({ proje, onChanged }: { proje: Project; onChanged: () => void }) {
  const [modal, setModal] = useState(false);
  const sil = async (id: number) => {
    await api.del(`/projects/${proje.id}/labor/${id}`);
    onChanged();
  };
  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">İşçilik</h2>
        <button className="btn-secondary btn-sm" onClick={() => setModal(true)}>
          ➕ Ekle
        </button>
      </div>
      {(proje.laborItems ?? []).length === 0 ? (
        <div className="text-sm text-neutral-500">İşçilik kalemi yok.</div>
      ) : (
        <div className="divide-y divide-neutral-100">
          {proje.laborItems!.map((l) => (
            <div key={l.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <span className="font-semibold">{ISCILIK_ETIKET[l.type]}</span>
                {l.description && ` - ${l.description}`}
                {l.hours != null && <span className="text-neutral-500"> ({l.hours} saat × {tl(l.rate ?? 0)})</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold">{tl(l.amount)}</span>
                <button className="text-red-600 text-xs font-semibold" onClick={() => sil(l.id)}>
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <IscilikModal
          projectId={proje.id}
          onClose={() => setModal(false)}
          onSaved={() => {
            setModal(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function IscilikModal({ projectId, onClose, onSaved }: { projectId: number; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<LaborType>("WELDING");
  const [description, setDescription] = useState("");
  const [mod, setMod] = useState<"saat" | "sabit">("saat");
  const [hours, setHours] = useState(1);
  const [rate, setRate] = useState(250);
  const [fixedAmount, setFixedAmount] = useState(1000);
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const kaydet = async () => {
    setKaydediliyor(true);
    setHata(null);
    try {
      const gövde = mod === "saat" ? { type, description, hours, rate } : { type, description, fixedAmount };
      await api.post(`/projects/${projectId}/labor`, gövde);
      onSaved();
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="İşçilik Ekle">
      <div className="space-y-3">
        <HataKutusu mesaj={hata} />
        <div>
          <label className="field-label">Tür</label>
          <select className="field-select" value={type} onChange={(e) => setType(e.target.value as LaborType)}>
            {Object.entries(ISCILIK_ETIKET).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Açıklama</label>
          <input className="field-input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button className={mod === "saat" ? "btn-primary btn-sm flex-1" : "btn-secondary btn-sm flex-1"} onClick={() => setMod("saat")}>
            Saat × Ücret
          </button>
          <button className={mod === "sabit" ? "btn-primary btn-sm flex-1" : "btn-secondary btn-sm flex-1"} onClick={() => setMod("sabit")}>
            Sabit Tutar
          </button>
        </div>
        {mod === "saat" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Saat</label>
              <input type="number" className="field-input" value={hours} onChange={(e) => setHours(Number(e.target.value))} />
            </div>
            <div>
              <label className="field-label">Saatlik Ücret (TL)</label>
              <input type="number" className="field-input" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
            </div>
          </div>
        ) : (
          <div>
            <label className="field-label">Tutar (TL)</label>
            <input type="number" className="field-input" value={fixedAmount} onChange={(e) => setFixedAmount(Number(e.target.value))} />
          </div>
        )}
        <button className="btn-primary w-full" onClick={kaydet} disabled={kaydediliyor}>
          {kaydediliyor ? "Kaydediliyor..." : "Ekle"}
        </button>
      </div>
    </Modal>
  );
}

function GiderBolumu({ proje, onChanged }: { proje: Project; onChanged: () => void }) {
  const [modal, setModal] = useState(false);
  const sil = async (id: number) => {
    await api.del(`/projects/${proje.id}/expenses/${id}`);
    onChanged();
  };
  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Giderler (Boya, Nakliye, Montaj, Sarf Malzeme...)</h2>
        <button className="btn-secondary btn-sm" onClick={() => setModal(true)}>
          ➕ Ekle
        </button>
      </div>
      {(proje.expenses ?? []).length === 0 ? (
        <div className="text-sm text-neutral-500">Gider kalemi yok.</div>
      ) : (
        <div className="divide-y divide-neutral-100">
          {proje.expenses!.map((g) => (
            <div key={g.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <span className="font-semibold">{GIDER_ETIKET[g.type]}</span> - {g.name}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold">{tl(g.amount)}</span>
                <button className="text-red-600 text-xs font-semibold" onClick={() => sil(g.id)}>
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <GiderModal
          projectId={proje.id}
          onClose={() => setModal(false)}
          onSaved={() => {
            setModal(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function GiderModal({ projectId, onClose, onSaved }: { projectId: number; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<ExpenseType>("TRANSPORT");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(0);
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const kaydet = async () => {
    if (!name.trim()) return setHata("Açıklama girin.");
    setKaydediliyor(true);
    setHata(null);
    try {
      await api.post(`/projects/${projectId}/expenses`, { type, name, amount });
      onSaved();
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Gider Ekle">
      <div className="space-y-3">
        <HataKutusu mesaj={hata} />
        <div>
          <label className="field-label">Tür</label>
          <select className="field-select" value={type} onChange={(e) => setType(e.target.value as ExpenseType)}>
            {Object.entries(GIDER_ETIKET).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Açıklama</label>
          <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Tutar (TL)</label>
          <input type="number" className="field-input" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>
        <button className="btn-primary w-full" onClick={kaydet} disabled={kaydediliyor}>
          {kaydediliyor ? "Kaydediliyor..." : "Ekle"}
        </button>
      </div>
    </Modal>
  );
}

function TekliflerTab({ proje, onChanged }: { proje: Project; onChanged: () => void }) {
  const [uretiliyor, setUretiliyor] = useState(false);
  const [uyarilar, setUyarilar] = useState<string[]>([]);
  const [hata, setHata] = useState<string | null>(null);

  const uret = async () => {
    setUretiliyor(true);
    setHata(null);
    try {
      const r = await api.post<{ uyarilar: string[] }>(`/projects/${proje.id}/quotes/generate`);
      setUyarilar(r.uyarilar);
      onChanged();
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setUretiliyor(false);
    }
  };

  return (
    <div className="space-y-6">
      <HataKutusu mesaj={hata} />
      <UyariKutusu mesajlar={uyarilar} />
      <button className="btn-primary" onClick={uret} disabled={uretiliyor}>
        {uretiliyor ? "Oluşturuluyor..." : "📄 Teklif Oluştur"}
      </button>

      {(proje.quotes ?? []).length === 0 ? (
        <EmptyState title="Henüz teklif oluşturulmadı" />
      ) : (
        <div className="grid gap-3">
          {proje.quotes!.map((q) => (
            <Link to={`/teklifler/${q.id}`} key={q.id} className="card flex items-center justify-between hover:shadow-md">
              <div>
                <div className="font-bold">{q.quoteNumber}</div>
                <div className="text-sm text-neutral-500">{tarih(q.date)}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg">{tl(q.total)}</span>
                <Badge>{TEKLIF_DURUM_ETIKET[q.status]}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
