import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import {
  Project,
  ProjectItem,
  Part,
  ProjectStatus,
  ProjectCategory,
  ProjectPriority,
  Material,
  Customer,
  Worker,
  ProductionTask,
  ProductionTaskType,
  ProjectPhoto,
  PhotoPhase,
  FAZ_ETIKET,
  LaborType,
  ExpenseType,
  ProductTemplate,
  ISCILIK_ETIKET,
  GIDER_ETIKET,
  DURUM_ETIKET,
  DURUM_RENK,
  DURUM_SIMGE,
  KATEGORI_ETIKET,
  TEKLIF_DURUM_ETIKET,
  GOREV_TURU_ETIKET,
  ONCELIK_ETIKET,
  ONCELIK_RENK,
  KesimCubugu,
  SacNestingGrubu,
} from "../api/types";
import { Spinner, HataKutusu, UyariKutusu, Badge, Modal, EmptyState } from "../components/ui";
import MaterialSelect from "../components/MaterialSelect";
import CuttingBarView from "../components/CuttingBarView";
import SacLevhaGorunumu from "../components/SacLevhaGorunumu";
import { UrunFormu, URUN_EMOJI } from "./YeniIs";
import SemaGorunum from "../components/SemaGorunum";
import { tl, mm, tarih, sayi, telefonNormallestir } from "../lib/format";

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

// Teknik 9 durumu, akış halinde takip edilebilecek 7 adıma indirger (İptal ayrı gösterilir).
const ADIM_TANIMLARI: { label: string; emoji: string; durumlar: ProjectStatus[] }[] = [
  { label: "Talep", emoji: "📥", durumlar: ["DRAFT"] },
  { label: "Hesaplandı", emoji: "🧮", durumlar: ["CALCULATED"] },
  { label: "Teklif", emoji: "📄", durumlar: ["QUOTE_READY", "QUOTE_SENT"] },
  { label: "Onaylandı", emoji: "✅", durumlar: ["APPROVED"] },
  { label: "Üretimde", emoji: "🔨", durumlar: ["IN_PRODUCTION"] },
  { label: "Montaj", emoji: "🔧", durumlar: ["INSTALLING"] },
  { label: "Tamamlandı", emoji: "🏁", durumlar: ["COMPLETED"] },
];

function DurumAdimlari({ status }: { status: ProjectStatus }) {
  if (status === "CANCELLED") {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold px-4 py-3 text-sm">
        🔴 Bu iş iptal edildi.
      </div>
    );
  }

  const aktifIndex = ADIM_TANIMLARI.findIndex((a) => a.durumlar.includes(status));

  return (
    <div className="flex items-center overflow-x-auto pb-1">
      {ADIM_TANIMLARI.map((adim, i) => {
        const tamam = i < aktifIndex;
        const aktif = i === aktifIndex;
        return (
          <div key={adim.label} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center gap-1 w-20">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  aktif
                    ? "bg-brand-600 text-white"
                    : tamam
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-neutral-100 text-neutral-400"
                }`}
              >
                {tamam ? "✓" : adim.emoji}
              </div>
              <div className={`text-[11px] text-center leading-tight ${aktif ? "font-bold text-brand-700" : "text-neutral-500"}`}>
                {adim.label}
              </div>
            </div>
            {i < ADIM_TANIMLARI.length - 1 && (
              <div className={`h-0.5 w-6 -mt-4 ${i < aktifIndex ? "bg-emerald-300" : "bg-neutral-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const SEKMELER = [
  { key: "ozet", label: "Özet" },
  { key: "uretim", label: "Üretim" },
  { key: "parcalar", label: "Parçalar" },
  { key: "kesim", label: "Kesim Listesi" },
  { key: "maliyet", label: "Maliyet & Tahsilat" },
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
            <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap">
              {proje.title}
              <Badge className={ONCELIK_RENK[proje.priority]}>{ONCELIK_ETIKET[proje.priority]}</Badge>
            </h1>
            <div className="text-neutral-500">
              {proje.customer?.name} • {KATEGORI_ETIKET[proje.category]} • {tarih(proje.createdAt)}
              {proje.dueDate && ` • Teslim: ${tarih(proje.dueDate)}`}
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
                  {DURUM_SIMGE[d]} {DURUM_ETIKET[d]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-neutral-100">
          <DurumAdimlari status={proje.status} />
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
      {tab === "uretim" && <UretimTab proje={proje} onChanged={yukle} />}
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
  const [dueDate, setDueDate] = useState(proje.dueDate ? proje.dueDate.slice(0, 10) : "");
  const [priority, setPriority] = useState<ProjectPriority>(proje.priority);
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
      await api.put(`/projects/${proje.id}`, {
        title,
        customerId,
        category,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Teslim Tarihi</label>
            <input type="date" className="field-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Öncelik</label>
            <select className="field-select" value={priority} onChange={(e) => setPriority(e.target.value as ProjectPriority)}>
              {(Object.keys(ONCELIK_ETIKET) as ProjectPriority[]).map((p) => (
                <option key={p} value={p}>
                  {ONCELIK_ETIKET[p]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button className="btn-primary w-full" onClick={kaydet} disabled={kaydediliyor}>
          {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </Modal>
  );
}

function UretimTab({ proje, onChanged }: { proje: Project; onChanged: () => void }) {
  return (
    <div className="space-y-6">
      <GorevlerBolumu proje={proje} onChanged={onChanged} />
      <FotograflarBolumu proje={proje} onChanged={onChanged} />
    </div>
  );
}

const GOREV_TURLERI = Object.keys(GOREV_TURU_ETIKET) as ProductionTaskType[];

function GorevlerBolumu({ proje, onChanged }: { proje: Project; onChanged: () => void }) {
  const [isciler, setIsciler] = useState<Worker[] | null>(null);
  const [olusturuluyor, setOlusturuluyor] = useState(false);
  const [ekleAcik, setEkleAcik] = useState(false);
  const [yeniEtiket, setYeniEtiket] = useState("");
  const [yeniTur, setYeniTur] = useState<ProductionTaskType>("OTHER");

  useEffect(() => {
    api.get<Worker[]>("/workers?active=true").then(setIsciler);
  }, []);

  const gorevler = proje.tasks ?? [];

  const varsayilanOlustur = async () => {
    setOlusturuluyor(true);
    try {
      await api.post(`/projects/${proje.id}/tasks/varsayilan-olustur`);
      onChanged();
    } finally {
      setOlusturuluyor(false);
    }
  };

  const toggleDone = async (task: ProductionTask) => {
    await api.put(`/projects/${proje.id}/tasks/${task.id}`, { done: !task.done });
    onChanged();
  };

  const isciAta = async (task: ProductionTask, workerId: string) => {
    await api.put(`/projects/${proje.id}/tasks/${task.id}`, { workerId: workerId ? Number(workerId) : null });
    onChanged();
  };

  const sil = async (taskId: number) => {
    await api.del(`/projects/${proje.id}/tasks/${taskId}`);
    onChanged();
  };

  const gorevEkle = async () => {
    if (!yeniEtiket.trim()) return;
    await api.post(`/projects/${proje.id}/tasks`, { label: yeniEtiket, type: yeniTur });
    setYeniEtiket("");
    setEkleAcik(false);
    onChanged();
  };

  const tamamlanan = gorevler.filter((g) => g.done).length;

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-bold">🛠️ Üretim Aşamaları (Checklist)</h2>
        {gorevler.length > 0 && (
          <span className="text-sm text-neutral-500">
            {tamamlanan}/{gorevler.length} tamamlandı
          </span>
        )}
      </div>

      {gorevler.length === 0 ? (
        <div className="space-y-2">
          <div className="text-sm text-neutral-500">Henüz üretim aşaması eklenmedi.</div>
          <button className="btn-secondary btn-sm" onClick={varsayilanOlustur} disabled={olusturuluyor}>
            {olusturuluyor ? "Oluşturuluyor..." : "➕ Varsayılan Aşamaları Oluştur (Kesim/Kaynak/Boya/Montaj)"}
          </button>
        </div>
      ) : (
        <div className="divide-y divide-neutral-100">
          {gorevler.map((g) => (
            <div key={g.id} className="py-2.5 flex items-center gap-3 flex-wrap">
              <input type="checkbox" checked={g.done} onChange={() => toggleDone(g)} className="w-5 h-5" />
              <div className="flex-1 min-w-[140px]">
                <div className={`font-medium ${g.done ? "line-through text-neutral-400" : ""}`}>{g.label}</div>
                <div className="text-xs text-neutral-400">{GOREV_TURU_ETIKET[g.type]}</div>
              </div>
              <select
                className="field-select w-auto text-sm"
                value={g.workerId ?? ""}
                onChange={(e) => isciAta(g, e.target.value)}
              >
                <option value="">İşçi ata...</option>
                {isciler?.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
              <button className="text-red-600 text-xs font-semibold" onClick={() => sil(g.id)}>
                Sil
              </button>
            </div>
          ))}
        </div>
      )}

      {ekleAcik ? (
        <div className="flex gap-2 flex-wrap items-end pt-2 border-t border-neutral-100">
          <div className="flex-1 min-w-[160px]">
            <label className="field-label">Aşama Adı</label>
            <input className="field-input" value={yeniEtiket} onChange={(e) => setYeniEtiket(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Tür</label>
            <select className="field-select" value={yeniTur} onChange={(e) => setYeniTur(e.target.value as ProductionTaskType)}>
              {GOREV_TURLERI.map((t) => (
                <option key={t} value={t}>
                  {GOREV_TURU_ETIKET[t]}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-primary btn-sm" onClick={gorevEkle}>
            Ekle
          </button>
          <button className="btn-secondary btn-sm" onClick={() => setEkleAcik(false)}>
            Vazgeç
          </button>
        </div>
      ) : (
        <button className="btn-secondary btn-sm" onClick={() => setEkleAcik(true)}>
          ➕ Özel Aşama Ekle
        </button>
      )}
    </div>
  );
}

const FAZLAR = Object.keys(FAZ_ETIKET) as PhotoPhase[];

function FotograflarBolumu({ proje, onChanged }: { proje: Project; onChanged: () => void }) {
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [yuklemeFazi, setYuklemeFazi] = useState<PhotoPhase>("URETIM");
  const fotograflar = proje.photos ?? [];

  const dosyaSec = (dosya: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      setYukleniyor(true);
      setHata(null);
      try {
        await api.post(`/projects/${proje.id}/photos`, {
          imageBase64: dataUrl.slice(dataUrl.indexOf(",") + 1),
          mimeType: dosya.type,
          phase: yuklemeFazi,
        });
        onChanged();
      } catch (e: any) {
        setHata(e.message);
      } finally {
        setYukleniyor(false);
      }
    };
    reader.readAsDataURL(dosya);
  };

  const sil = async (photoId: number) => {
    if (!confirm("Bu fotoğrafı silmek istediğinize emin misiniz?")) return;
    await api.del(`/projects/${proje.id}/photos/${photoId}`);
    onChanged();
  };

  const fazaGoreGrupla = FAZLAR.map((f) => ({ faz: f, fotolar: fotograflar.filter((p) => p.phase === f) })).filter(
    (g) => g.fotolar.length > 0
  );

  return (
    <div className="card space-y-3">
      <h2 className="font-bold">📷 İş Fotoğrafları</h2>
      <HataKutusu mesaj={hata} />
      <div className="flex gap-2 flex-wrap items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="field-label">Aşama</label>
          <select className="field-select" value={yuklemeFazi} onChange={(e) => setYuklemeFazi(e.target.value as PhotoPhase)}>
            {FAZLAR.map((f) => (
              <option key={f} value={f}>
                {FAZ_ETIKET[f]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-[2] min-w-[200px]">
          <label className="field-label">Fotoğraf Ekle</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="field-input"
            disabled={yukleniyor}
            onChange={(e) => {
              const dosya = e.target.files?.[0];
              if (dosya) dosyaSec(dosya);
            }}
          />
        </div>
      </div>
      {yukleniyor && <div className="text-sm text-neutral-500">Yükleniyor...</div>}
      {fotograflar.length === 0 ? (
        <div className="text-sm text-neutral-500">Henüz fotoğraf eklenmedi.</div>
      ) : (
        <div className="space-y-4">
          {fazaGoreGrupla.map((g) => (
            <div key={g.faz}>
              <div className="text-sm font-semibold text-neutral-600 mb-2">
                {FAZ_ETIKET[g.faz]} <span className="text-neutral-400 font-normal">({g.fotolar.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {g.fotolar.map((f) => (
                  <div key={f.id} className="relative group">
                    <img
                      src={`data:${f.mimeType};base64,${f.dataBase64}`}
                      alt={f.caption ?? "İş fotoğrafı"}
                      className="w-full aspect-square object-cover rounded-lg border border-neutral-200"
                    />
                    <button
                      className="absolute top-1 right-1 bg-white/90 rounded-full w-6 h-6 text-red-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition"
                      onClick={() => sil(f.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function terminDurumu(dueDate: string | null | undefined): { metin: string; renk: string } | null {
  if (!dueDate) return null;
  const kalanGun = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (kalanGun < 0) return { metin: `${Math.abs(kalanGun)} gün gecikti`, renk: "text-red-600" };
  if (kalanGun === 0) return { metin: "Bugün teslim", renk: "text-amber-600" };
  if (kalanGun <= 3) return { metin: `${kalanGun} gün kaldı`, renk: "text-amber-600" };
  return { metin: `${kalanGun} gün kaldı`, renk: "text-neutral-600" };
}

function OzetKarti({ proje }: { proje: Project }) {
  const gorevler = proje.tasks ?? [];
  const tamamlanan = gorevler.filter((g) => g.done).length;
  const termin = terminDurumu(proje.dueDate);
  const fotoSayisi = (proje.photos ?? []).length;

  const takipLinki = `${window.location.origin}/takip/${proje.publicToken}`;
  const telefon = telefonNormallestir(proje.customer?.phone);
  const mesaj = `Merhaba ${proje.customer?.name ?? ""}, "${proje.title}" işinizin güncel durumunu buradan takip edebilirsiniz: ${takipLinki}`;
  const whatsappLinki = telefon
    ? `https://wa.me/${telefon}?text=${encodeURIComponent(mesaj)}`
    : `https://wa.me/?text=${encodeURIComponent(mesaj)}`;

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-bold">📋 İş Özeti</h2>
        <a className="btn-secondary btn-sm" href={whatsappLinki} target="_blank" rel="noreferrer">
          📱 Takip Linkini Gönder
        </a>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className={`text-lg font-bold ${termin?.renk ?? "text-neutral-400"}`}>{termin?.metin ?? "Termin yok"}</div>
          <div className="text-xs text-neutral-500">📅 Termin</div>
        </div>
        <div>
          <div className="text-lg font-bold">{gorevler.length > 0 ? `${tamamlanan}/${gorevler.length}` : "-"}</div>
          <div className="text-xs text-neutral-500">🛠️ Üretim Aşaması</div>
        </div>
        <div>
          <div className="text-lg font-bold">{fotoSayisi}</div>
          <div className="text-xs text-neutral-500">📷 Fotoğraf</div>
        </div>
      </div>
    </div>
  );
}

function NotlarBolumu({ proje, onChanged }: { proje: Project; onChanged: () => void }) {
  const [note, setNote] = useState(proje.note ?? "");
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const kaydet = async () => {
    setKaydediliyor(true);
    setHata(null);
    try {
      await api.put(`/projects/${proje.id}`, { note });
      onChanged();
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <div className="card space-y-3">
      <h2 className="font-bold">📝 Notlar</h2>
      <HataKutusu mesaj={hata} />
      <textarea
        className="field-input"
        rows={3}
        placeholder="Keşif ölçüleri, müşteri talepleri, hatırlatmalar..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button className="btn-secondary btn-sm" onClick={kaydet} disabled={kaydediliyor || note === (proje.note ?? "")}>
        {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </div>
  );
}

function OzetTab({ proje, onChanged }: { proje: Project; onChanged: () => void }) {
  const [form, setForm] = useState({
    overheadPercent: proje.overheadPercent,
    profitMode: proje.profitMode,
    profitValue: proje.profitValue,
    vatPercent: proje.vatPercent,
    validityDays: proje.validityDays,
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

      <OzetKarti proje={proje} />
      <NotlarBolumu proje={proje} onChanged={onChanged} />

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

  const malzemeSozlugu = useMemo(() => {
    const d: Record<string, Material> = {};
    for (const p of proje.parts ?? []) d[String(p.materialId)] = p.material;
    return d;
  }, [proje.parts]);

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
            <SemaGorunum
              templateKey={item.template.key}
              params={item.paramsJson}
              ozetDegerler={item.resultJson.ozetDegerler}
              malzemeler={malzemeSozlugu}
            />
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
  const [sacMalzemeler, setSacMalzemeler] = useState<Material[]>([]);
  const [baglantiMalzemeler, setBaglantiMalzemeler] = useState<Material[]>([]);
  const [secilenTemplate, setSecilenTemplate] = useState<string | null>(duzenleItem?.template.key ?? null);

  useEffect(() => {
    api.get<ProductTemplate[]>("/product-templates").then((t) => setSablonlar(t.filter((s) => s.key !== "custom")));
    api.get<Material[]>("/materials?category=PROFILE").then(setMaterials);
    api.get<Material[]>("/materials?category=SHEET").then(setSacMalzemeler);
    api.get<Material[]>("/materials?category=FASTENER").then(setBaglantiMalzemeler);
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
          sacMalzemeler={sacMalzemeler}
          baglantiMalzemeler={baglantiMalzemeler}
          onSaved={onSaved}
          baslangic={duzenleItem?.paramsJson}
          baslangicAd={duzenleItem?.name}
          duzenlemeItemId={duzenleItem?.id}
        />
      )}
    </Modal>
  );
}

/** Bir kesim listesinde kullanılan farklı stok boylarını "6 m × 4, 3 m × 2" şeklinde özetler. */
function stokBoyuOzeti(bars: KesimCubugu[]): string {
  const sayac = new Map<number, number>();
  for (const b of bars) sayac.set(b.stockLengthMm, (sayac.get(b.stockLengthMm) ?? 0) + 1);
  return Array.from(sayac.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([boyMm, adet]) => `${boyMm / 1000} m × ${adet}`)
    .join(", ");
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
                Kullanılan stok: {stokBoyuOzeti(cl.barsJson)} • Kesim payı: {cl.kerfMm} mm
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
                <CuttingBarView key={i} bar={bar} index={i} />
              ))}
            </div>
          </div>
        ))
      )}

      <SacKesimPlaniBolumu projectId={proje.id} />
    </div>
  );
}

function SacKesimPlaniBolumu({ projectId }: { projectId: number }) {
  const [sheetWidthMm, setSheetWidthMm] = useState(1250);
  const [sheetHeightMm, setSheetHeightMm] = useState(2500);
  const [kerfMm, setKerfMm] = useState(3);
  const [gruplar, setGruplar] = useState<SacNestingGrubu[] | null>(null);
  const [uyarilar, setUyarilar] = useState<string[]>([]);
  const [hesaplaniyor, setHesaplaniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const hesapla = async () => {
    setHesaplaniyor(true);
    setHata(null);
    try {
      const r = await api.get<{ gruplar: SacNestingGrubu[]; uyarilar: string[] }>(
        `/projects/${projectId}/cutting/sac?sheetWidthMm=${sheetWidthMm}&sheetHeightMm=${sheetHeightMm}&kerfMm=${kerfMm}`
      );
      setGruplar(r.gruplar);
      setUyarilar(r.uyarilar);
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setHesaplaniyor(false);
    }
  };

  return (
    <div className="card space-y-3">
      <h2 className="font-bold text-lg">🗋 Sac Kesim Planı (2D Yerleşim)</h2>
      <p className="text-xs text-neutral-500">
        İşteki tüm ürünlerin sac kalemleri (kaplama, taban plakası, basamak plakası vb.) kalınlığa göre gruplanıp seçtiğiniz
        levha boyutuna yerleştirilir. Basitleştirme: parçalar döndürülmez, farklı malzeme/kaplama türleri sadece kalınlığa
        göre gruplanır - kalıcı bir kayıt oluşturmaz, her seferinde yeniden hesaplanır.
      </p>
      <HataKutusu mesaj={hata} />
      <UyariKutusu mesajlar={uyarilar} />
      <div className="flex gap-3 flex-wrap items-end">
        <div className="w-32">
          <label className="field-label">Levha Eni (mm)</label>
          <input type="number" className="field-input" value={sheetWidthMm} onChange={(e) => setSheetWidthMm(Number(e.target.value))} />
        </div>
        <div className="w-32">
          <label className="field-label">Levha Boyu (mm)</label>
          <input type="number" className="field-input" value={sheetHeightMm} onChange={(e) => setSheetHeightMm(Number(e.target.value))} />
        </div>
        <div className="w-28">
          <label className="field-label">Kesim Payı (mm)</label>
          <input type="number" className="field-input" value={kerfMm} onChange={(e) => setKerfMm(Number(e.target.value))} />
        </div>
        <button className="btn-primary" onClick={hesapla} disabled={hesaplaniyor}>
          {hesaplaniyor ? "Hesaplanıyor..." : "🗋 Sac Planını Hesapla"}
        </button>
      </div>

      {gruplar && gruplar.length === 0 && <EmptyState title="Bu işte sac kalemi bulunamadı" />}

      {gruplar &&
        gruplar.map((g) => (
          <div key={g.kalinlikMm} className="rounded-xl border border-neutral-200 p-3 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold">{g.kalinlikMm} mm kalınlık</h3>
              <div className="text-sm text-neutral-500">
                {g.toplamLevha} levha • {g.toplamParca} parça • Fire: %{sayi(g.fireYuzde, 1)}
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              {g.levhalar.map((levha, i) => (
                <SacLevhaGorunumu key={i} levha={levha} sheetWidthMm={g.sheetWidthMm} sheetHeightMm={g.sheetHeightMm} index={i} />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

function MaliyetTab({ proje, onChanged }: { proje: Project; onChanged: () => void }) {
  return (
    <div className="space-y-6">
      <ParaOzetiKarti proje={proje} />
      <SarfTahminiKarti proje={proje} />
      <IscilikBolumu proje={proje} onChanged={onChanged} />
      <GiderBolumu proje={proje} onChanged={onChanged} />
      <TahsilatBolumu proje={proje} onChanged={onChanged} />
    </div>
  );
}

/** Kâr ve tahsilat/alacak özetini gösterir. Kâr, kabul edilen teklifin satış tutarı ile o
 * teklif oluşturulurken hesaplanan gerçek maliyeti üzerinden bulunur (tahsil edilip
 * edilmediğinden bağımsız - tahakkuk esaslı); Alacak ise satıştan tahsilatın düşülmesiyle,
 * yani nakit akışı olarak ayrıca gösterilir. */
function ParaOzetiKarti({ proje }: { proje: Project }) {
  const kabulEdilenTeklif = (proje.quotes ?? []).find((q) => q.status === "ACCEPTED");
  const tahsilat = (proje.payments ?? []).reduce((s, p) => s + p.amount, 0);

  if (!kabulEdilenTeklif) {
    return (
      <div className="card space-y-2">
        <h2 className="font-bold">💰 Para</h2>
        <p className="text-sm text-neutral-500">
          Kâr ve alacak hesaplanabilmesi için önce "Teklifler" sekmesinden bir teklif oluşturup kabul edilmiş olarak
          işaretleyin.
        </p>
        {tahsilat > 0 && (
          <div className="text-sm">
            Bu güne kadar tahsil edilen: <span className="font-bold">{tl(tahsilat)}</span>
          </div>
        )}
      </div>
    );
  }

  const satis = kabulEdilenTeklif.total;
  const kar = kabulEdilenTeklif.profitAmount;
  const alacak = satis - tahsilat;

  return (
    <div className="card space-y-3">
      <h2 className="font-bold">💰 Para</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="rounded-xl bg-neutral-50 p-3">
          <div className="text-lg font-bold">{tl(satis)}</div>
          <div className="text-xs text-neutral-500">Satış</div>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3">
          <div className="text-lg font-bold text-emerald-700">{tl(kar)}</div>
          <div className="text-xs text-neutral-500">Kâr</div>
        </div>
        <div className="rounded-xl bg-blue-50 p-3">
          <div className="text-lg font-bold text-blue-700">{tl(tahsilat)}</div>
          <div className="text-xs text-neutral-500">Tahsil Edilen</div>
        </div>
        <div className={`rounded-xl p-3 ${alacak > 0 ? "bg-amber-50" : "bg-neutral-50"}`}>
          <div className={`text-lg font-bold ${alacak > 0 ? "text-amber-700" : "text-neutral-500"}`}>{tl(alacak)}</div>
          <div className="text-xs text-neutral-500">Alacak</div>
        </div>
      </div>
    </div>
  );
}

function TahsilatBolumu({ proje, onChanged }: { proje: Project; onChanged: () => void }) {
  const [modal, setModal] = useState(false);
  const sil = async (id: number) => {
    if (!confirm("Bu tahsilat kaydını silmek istediğinize emin misiniz?")) return;
    await api.del(`/projects/${proje.id}/payments/${id}`);
    onChanged();
  };
  const odemeler = proje.payments ?? [];
  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">🧾 Tahsilat</h2>
        <button className="btn-secondary btn-sm" onClick={() => setModal(true)}>
          ➕ Ödeme Kaydet
        </button>
      </div>
      {odemeler.length === 0 ? (
        <div className="text-sm text-neutral-500">Henüz tahsilat kaydı yok.</div>
      ) : (
        <div className="divide-y divide-neutral-100">
          {odemeler.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <span className="text-neutral-500">{tarih(p.date)}</span>
                {p.note && ` — ${p.note}`}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-emerald-700">{tl(p.amount)}</span>
                <button className="text-red-600 text-xs font-semibold" onClick={() => sil(p.id)}>
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && (
        <TahsilatModal
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

function TahsilatModal({ projectId, onClose, onSaved }: { projectId: number; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const kaydet = async () => {
    if (!amount || amount <= 0) return setHata("Tutar girin.");
    setKaydediliyor(true);
    setHata(null);
    try {
      await api.post(`/projects/${projectId}/payments`, { amount, date: new Date(date).toISOString(), note: note || undefined });
      onSaved();
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Ödeme Kaydet">
      <div className="space-y-3">
        <HataKutusu mesaj={hata} />
        <div>
          <label className="field-label">Tutar (TL)</label>
          <input type="number" className="field-input" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>
        <div>
          <label className="field-label">Tarih</label>
          <input type="date" className="field-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Not (opsiyonel)</label>
          <input className="field-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Örn. kapora, ara ödeme..." />
        </div>
        <button className="btn-primary w-full" onClick={kaydet} disabled={kaydediliyor}>
          {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </Modal>
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
