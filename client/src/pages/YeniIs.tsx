import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { Customer, Material, ProductTemplate, ProjectCategory, UrunHesapSonucu, YapiselKontrolSonucu } from "../api/types";
import { Spinner, HataKutusu, UyariKutusu, Badge } from "../components/ui";
import MaterialSelect from "../components/MaterialSelect";
import HesapSonucuGorunum from "../components/HesapSonucuGorunum";
import YapiselKontrolGorunum from "../components/YapiselKontrolGorunum";
import SemaGorunum from "../components/SemaGorunum";
import { DuvarYatayAraProfilVeri } from "../components/WallSchematic";

/** İki params nesnesi arasında sığ (üst seviye anahtar bazlı, JSON.stringify tabanlı) fark listesi
 * çıkarır - bir ürünü düzenlerken orijinal kayıtlı değerlerle canlı form durumunu karşılaştırmak
 * içindir. Nesne/dizi değerler tek tek alan alan karşılaştırılmaz, sadece "değişti" olarak
 * işaretlenir - amaç sahaya çıkmadan önce nelerin dokunulduğuna dair hızlı bir özet vermektir. */
interface ParamsFarki {
  alan: string;
  eskiDeger: string;
  yeniDeger: string;
}

function paramsFarkiHesapla(eski: Record<string, unknown> | undefined, yeni: Record<string, unknown>): ParamsFarki[] {
  const eskiObj = eski ?? {};
  const tumAnahtarlar = Array.from(new Set([...Object.keys(eskiObj), ...Object.keys(yeni)])).sort();
  const degerYazdir = (v: unknown): string => {
    if (v === undefined || v === null || v === "") return "(boş)";
    if (typeof v === "object") return "(değişti)";
    return String(v);
  };
  const farklar: ParamsFarki[] = [];
  for (const alan of tumAnahtarlar) {
    const e = eskiObj[alan];
    const y = yeni[alan];
    if (JSON.stringify(e) !== JSON.stringify(y)) {
      farklar.push({ alan, eskiDeger: degerYazdir(e), yeniDeger: degerYazdir(y) });
    }
  }
  return farklar;
}

/** Bir ürünü düzenlerken (yeni oluştururken değil), orijinal kayıtlı değerlerle canlı form
 * durumu arasındaki farkı gösteren katlanabilir panel. */
function ParamsFarkiPaneli({ eski, yeni }: { eski: Record<string, unknown> | undefined; yeni: Record<string, unknown> }) {
  const farklar = paramsFarkiHesapla(eski, yeni);
  if (farklar.length === 0) return null;
  return (
    <details className="rounded-xl border border-amber-200 bg-amber-50 p-3" open>
      <summary className="font-semibold cursor-pointer text-amber-800">
        ✏️ Bu düzenlemede neler değişti? ({farklar.length} alan)
      </summary>
      <div className="mt-2 space-y-1 text-sm">
        {farklar.map((f) => (
          <div key={f.alan} className="flex flex-wrap gap-1">
            <span className="font-mono text-xs text-neutral-500">{f.alan}:</span>
            <span className="text-red-600 line-through">{f.eskiDeger}</span>
            <span>→</span>
            <span className="text-emerald-700 font-medium">{f.yeniDeger}</span>
          </div>
        ))}
      </div>
    </details>
  );
}

const TEMPLATE_KATEGORI: Record<string, ProjectCategory> = {
  railing: "RAILING",
  stairs: "STAIRS",
  spiral_stairs: "STAIRS",
  canopy: "CANOPY",
  door: "DOOR",
  wall: "STEEL_STRUCTURE",
  truss: "ROOF",
  shelf: "SHELF",
  pergola: "CANOPY",
  ferforje_panel: "FORGE",
  steel_frame: "STEEL_STRUCTURE",
  container: "CONTAINER",
  custom: "OTHER",
};

export const URUN_EMOJI: Record<string, string> = {
  railing: "🚧",
  stairs: "🪜",
  spiral_stairs: "🌀",
  canopy: "⛺",
  door: "🚪",
  wall: "🏗️",
  truss: "🔺",
  shelf: "🗄️",
  pergola: "🌴",
  ferforje_panel: "🌿",
  steel_frame: "🏭",
  container: "📦",
  custom: "🔩",
};
const EMOJI = URUN_EMOJI;

// Çatı tipi - kullanıcı önce bunu seçer, diğer alanlar buna göre anlam kazanır (bkz. server
// calc/roofTruss.ts CatiTipi). "Çatı Kafesi" ürün şablonu ve Konteyner'in çatı özelliği ortak kullanır.
const CATI_TIPI_SECENEKLERI = [
  { key: "acik_besik", label: "Açık Beşik (simetrik iki eğimli)" },
  { key: "duz", label: "Yassı / Düz" },
  { key: "catikati", label: "Çatı Katı" },
  { key: "kirma", label: "Kırma (dört yönlü eğimli)" },
  { key: "sundurma", label: "Sundurma (tek eğimli)" },
];

const CATI_KAPLAMA_SECENEKLERI = [
  { key: "trapez_sac", label: "Trapez Sac" },
  { key: "sandvic_panel", label: "Sandviç Panel" },
  { key: "etermit", label: "Etermit" },
  { key: "plastik_etermit", label: "Plastik Etermit" },
  { key: "polikarbon", label: "Polikarbon" },
  { key: "yok", label: "Kaplama Yok" },
];

// Duvar dış cephesi için: çatıdan farklı olarak etermit/polikarbon gibi ışık geçirir/hafif çatı
// malzemeleri listelenmez, bunun yerine dış cephe mantolama (petopan) eklenir.
const DUVAR_DIS_KAPLAMA_SECENEKLERI = [
  { key: "trapez_sac", label: "Trapez Sac (Cephe)" },
  { key: "sandvic_panel", label: "Sandviç Panel" },
  { key: "petopan", label: "Petopan (Dış Cephe Mantolama)" },
  // İç bölme duvarlarının iki yüzü de oda içidir, ikisi de alçıpan olabilir (bkz. Dış/İç Kaplama
  // birbirinden bağımsız iki alan - konteynerin gerçek dış cephesinde kullanıcı yine trapez sac/
  // sandviç panel/petopan seçmeye devam edebilir, bu sadece seçeneği ekler, zorunlu kılmaz).
  { key: "alcipan", label: "Alçıpan" },
  { key: "yok", label: "Kaplama Yok" },
];

const DUVAR_IC_KAPLAMA_SECENEKLERI = [
  { key: "alcipan", label: "Alçıpan" },
  { key: "yok", label: "Kaplama Yok" },
];

// Taban/zemin döşemesi için: yapısal taşıyıcılık gereken bir yüzey olduğundan sadece sac/panel/rijit
// levha tipi kaplamalar listelenir (etermit/polikarbon/petopan/alçıpan taban için uygun değildir).
const KONTEYNER_TABAN_KAPLAMA_SECENEKLERI = [
  { key: "trapez_sac", label: "Trapez Sac" },
  { key: "sandvic_panel", label: "Sandviç Panel" },
  { key: "betopan", label: "Betopan" },
  { key: "yok", label: "Kaplama Yok" },
];

interface AiDanismanSonucu {
  degerlendirme: string;
  malzemeUygunlugu: "yeterli" | "sinirda" | "yetersiz";
  onerilenAlternatif?: string | null;
  tahminiTasimaKapasitesiKg?: number | null;
  tasimaKapasitesiAciklamasi: string;
  oneriler: string[];
  sarfMalzemeOnerileri: string[];
  hesaplananAgirlikKg: number;
  agirlikNotu?: string | null;
}

const UYGUNLUK_ETIKET: Record<string, string> = { yeterli: "✅ Yeterli", sinirda: "⚠️ Sınırda", yetersiz: "❌ Yetersiz" };
const UYGUNLUK_RENK: Record<string, string> = {
  yeterli: "bg-green-100 text-green-700",
  sinirda: "bg-amber-100 text-amber-700",
  yetersiz: "bg-red-100 text-red-700",
};

interface AiIsYorumu {
  templateKey: string;
  baslik: string;
  musteriAdiTahmini: string | null;
  guven: "yuksek" | "orta" | "dusuk";
  belirsizlikler: string[];
  alanlar: Record<string, number | string | null>;
  bosluklar: DuvarBoslukTaslak[] | null;
}

export default function YeniIs() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // URL'den önceden bir şablon geldiyse (örn. Ürünler sayfasından "Yeni İş" ile), 2. adım
  // (Ürün Seç) tamamen atlanır - kullanıcı zaten hangi ürünü yapacağını seçmiş demektir.
  const oncedenSablon = params.get("template");
  const [adim, setAdim] = useState<1 | 2 | 3>(1);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [templateKey, setTemplateKey] = useState<string | null>(oncedenSablon);
  const [aiAlanlar, setAiAlanlar] = useState<Record<string, unknown> | null>(null);

  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [sacMalzemeler, setSacMalzemeler] = useState<Material[]>([]);
  const [baglantiMalzemeler, setBaglantiMalzemeler] = useState<Material[]>([]);
  const [sarfMalzemeler, setSarfMalzemeler] = useState<Material[]>([]);

  useEffect(() => {
    api.get<Material[]>("/materials?category=PROFILE").then(setMaterials);
    api.get<Material[]>("/materials?category=SHEET").then(setSacMalzemeler);
    api.get<Material[]>("/materials?category=FASTENER").then(setBaglantiMalzemeler);
    api.get<Material[]>("/materials?category=CONSUMABLE").then(setSarfMalzemeler);
  }, []);

  if (adim === 1) {
    return (
      <IsBilgisiAdimi
        onDevam={async (id) => {
          setProjectId(id);
          if (templateKey) {
            if (templateKey === "custom") {
              navigate(`/isler/${id}`);
              return;
            }
            await api.put(`/projects/${id}`, { category: TEMPLATE_KATEGORI[templateKey] ?? "OTHER" }).catch(() => {});
            setAdim(3);
          } else {
            setAdim(2);
          }
        }}
      />
    );
  }

  if (adim === 2) {
    if (!projectId) return <Spinner />;
    return (
      <UrunSecAdimi
        projectId={projectId}
        onSecildi={(key, alanlar) => {
          setTemplateKey(key);
          if (alanlar) setAiAlanlar(alanlar);
          setAdim(3);
        }}
      />
    );
  }

  if (!projectId || !templateKey || !materials) return <Spinner />;

  return (
    <div className="space-y-6">
      <StepHeader adim={3} baslik="Ölçüler ve Malzeme" />
      <UrunFormu
        templateKey={templateKey}
        projectId={projectId}
        materials={materials}
        sacMalzemeler={sacMalzemeler}
        baglantiMalzemeler={baglantiMalzemeler}
        sarfMalzemeler={sarfMalzemeler}
        baslangic={aiAlanlar ?? undefined}
      />
    </div>
  );
}

function StepHeader({ adim, baslik }: { adim: number; baslik: string }) {
  return (
    <div>
      <div className="text-sm font-semibold text-brand-600">Adım {adim}/3</div>
      <h1 className="text-2xl font-bold">{baslik}</h1>
    </div>
  );
}

function IsBilgisiAdimi({ onDevam }: { onDevam: (projectId: number) => void }) {
  const [musteriler, setMusteriler] = useState<Customer[] | null>(null);
  const [mod, setMod] = useState<"mevcut" | "yeni">("mevcut");
  const [customerId, setCustomerId] = useState<number | undefined>(undefined);
  const [yeniAd, setYeniAd] = useState("");
  const [yeniTelefon, setYeniTelefon] = useState("");
  const [title, setTitle] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  useEffect(() => {
    api.get<Customer[]>("/customers").then(setMusteriler);
  }, []);

  const devam = async () => {
    if (!title.trim()) return setHata("İş adı zorunlu.");
    if (mod === "mevcut" && !customerId) return setHata("Müşteri seçin.");
    if (mod === "yeni" && !yeniAd.trim()) return setHata("Yeni müşteri adı girin.");

    setKaydediliyor(true);
    setHata(null);
    try {
      let cid = customerId;
      if (mod === "yeni") {
        const musteri = await api.post<Customer>("/customers", { name: yeniAd, phone: yeniTelefon });
        cid = musteri.id;
      }
      // Kategori burada sorulmuyor; bir sonraki adımda seçilen/tanınan ürün türünden otomatik
      // belirlenip projeye işlenecek. Teslim tarihi/öncelik de artık iş oluşturmada sorulmuyor -
      // gerekirse iş detayından "✏️ Düzenle" ile sonradan girilebilir.
      const proje = await api.post<{ id: number }>("/projects", { customerId: cid, title });
      onDevam(proje.id);
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <StepHeader adim={1} baslik="İş Bilgisi" />

      <div className="card space-y-4">
        <HataKutusu mesaj={hata} />
        <div>
          <label className="field-label">Müşteri</label>
          <div className="flex gap-2 mb-2">
            <button className={mod === "mevcut" ? "btn-primary btn-sm flex-1" : "btn-secondary btn-sm flex-1"} onClick={() => setMod("mevcut")}>
              Mevcut Müşteri
            </button>
            <button className={mod === "yeni" ? "btn-primary btn-sm flex-1" : "btn-secondary btn-sm flex-1"} onClick={() => setMod("yeni")}>
              Yeni Müşteri
            </button>
          </div>
          {mod === "mevcut" ? (
            !musteriler ? (
              <Spinner />
            ) : (
              <select className="field-select" value={customerId ?? ""} onChange={(e) => setCustomerId(Number(e.target.value))}>
                <option value="">Seçiniz...</option>
                {musteriler.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )
          ) : (
            <div className="space-y-2">
              <input className="field-input" placeholder="Ad Soyad" value={yeniAd} onChange={(e) => setYeniAd(e.target.value)} />
              <input className="field-input" placeholder="Telefon" value={yeniTelefon} onChange={(e) => setYeniTelefon(e.target.value)} />
            </div>
          )}
        </div>

        <div>
          <label className="field-label">İş Adı *</label>
          <input className="field-input" placeholder="örn. Bahçe korkuluğu" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <button className="btn-primary w-full" onClick={devam} disabled={kaydediliyor}>
          {kaydediliyor ? "Kaydediliyor..." : "Devam Et →"}
        </button>
      </div>
    </div>
  );
}

function UrunSecAdimi({
  projectId,
  onSecildi,
}: {
  projectId: number;
  onSecildi: (templateKey: string, aiAlanlar?: Record<string, unknown>) => void;
}) {
  const navigate = useNavigate();
  const [sablonlar, setSablonlar] = useState<ProductTemplate[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const [aiMetin, setAiMetin] = useState("");
  const [aiCalisiyor, setAiCalisiyor] = useState(false);
  const [aiSonuc, setAiSonuc] = useState<AiIsYorumu | null>(null);

  const [fotoOnizlemeUrl, setFotoOnizlemeUrl] = useState<string | null>(null);
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [fotoMimeType, setFotoMimeType] = useState<string | null>(null);
  const [fotoCalisiyor, setFotoCalisiyor] = useState(false);
  const [devamEdiliyor, setDevamEdiliyor] = useState(false);

  useEffect(() => {
    api.get<ProductTemplate[]>("/product-templates").then(setSablonlar);
  }, []);

  const projeyiGuncelle = async (data: Record<string, unknown>) => {
    try {
      await api.put(`/projects/${projectId}`, data);
    } catch {
      // Kategori/başlık güncellemesi başarısız olsa bile akışı durdurmaya değmez; proje zaten var.
    }
  };

  const aiSonucuUygula = async (yorum: AiIsYorumu) => {
    setAiSonuc(yorum);
    setDevamEdiliyor(true);
    await projeyiGuncelle({ title: yorum.baslik, category: TEMPLATE_KATEGORI[yorum.templateKey] ?? "OTHER" });
    onSecildi(yorum.templateKey, { ...yorum.alanlar, bosluklar: yorum.bosluklar ?? undefined });
  };

  const aiIleDoldur = async () => {
    if (!aiMetin.trim()) return setHata("Önce yapılacak işi anlatın.");
    setAiCalisiyor(true);
    setHata(null);
    setAiSonuc(null);
    try {
      const yorum = await api.post<AiIsYorumu>("/ai/is-yorumla", { metin: aiMetin });
      await aiSonucuUygula(yorum);
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setAiCalisiyor(false);
    }
  };

  const fotoSec = (dosya: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setFotoOnizlemeUrl(dataUrl);
      setFotoBase64(dataUrl.slice(dataUrl.indexOf(",") + 1));
      setFotoMimeType(dosya.type);
    };
    reader.readAsDataURL(dosya);
  };

  const fotoIleDoldur = async () => {
    if (!fotoBase64 || !fotoMimeType) return setHata("Önce bir fotoğraf seçin.");
    setFotoCalisiyor(true);
    setHata(null);
    setAiSonuc(null);
    try {
      const yorum = await api.post<AiIsYorumu>("/ai/plan-yorumla", {
        imageBase64: fotoBase64,
        mimeType: fotoMimeType,
        not: aiMetin.trim() || undefined,
      });
      await aiSonucuUygula(yorum);
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setFotoCalisiyor(false);
    }
  };

  const urunTiklandi = async (key: string) => {
    setDevamEdiliyor(true);
    await projeyiGuncelle({ category: TEMPLATE_KATEGORI[key] ?? "OTHER" });
    if (key === "custom") {
      navigate(`/isler/${projectId}`);
      return;
    }
    onSecildi(key);
  };

  return (
    <div className="space-y-6">
      <StepHeader adim={2} baslik="Ürün Seçin" />
      <HataKutusu mesaj={hata} />

      <div className="card space-y-3 border-2 border-brand-200 bg-brand-50/40">
        <label className="field-label">🤖 Yapay Zeka ile Hızlı Doldur (opsiyonel)</label>
        <p className="text-xs text-neutral-500">
          Yapılacak işi kendi cümlelerinizle anlatın, ürün tipini ve ölçüleri sizin için tahmin edip formu doldursun. Sonuçları
          mutlaka kontrol edin.
        </p>
        <textarea
          className="field-input"
          rows={2}
          placeholder="örn. 3 metre uzunluğunda, 1 metre yüksekliğinde bahçe korkuluğu, ortasında bir ara kayıt olsun"
          value={aiMetin}
          onChange={(e) => setAiMetin(e.target.value)}
        />
        <button className="btn-secondary w-full" onClick={aiIleDoldur} disabled={aiCalisiyor || devamEdiliyor}>
          {aiCalisiyor ? "Analiz ediliyor..." : "🤖 AI ile Doldur"}
        </button>

        <div className="border-t border-brand-200 pt-3 space-y-2">
          <label className="field-label">📷 Ya da elle çizilmiş bir plan/kroki fotoğrafı yükleyin</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="field-input"
            onChange={(e) => {
              const dosya = e.target.files?.[0];
              if (dosya) fotoSec(dosya);
            }}
          />
          {fotoOnizlemeUrl && (
            <div className="flex items-center gap-3">
              <img src={fotoOnizlemeUrl} alt="Yüklenen plan önizlemesi" className="h-20 w-20 object-cover rounded-lg border border-neutral-200" />
              <button className="btn-secondary btn-sm flex-1" onClick={fotoIleDoldur} disabled={fotoCalisiyor || devamEdiliyor}>
                {fotoCalisiyor ? "Fotoğraf okunuyor..." : "🤖 Fotoğraftan Doldur"}
              </button>
            </div>
          )}
          <p className="text-xs text-neutral-500">
            Bu gerçek bir lazer ölçüm değildir — sadece fotoğraftaki yazılı ölçüleri/şekli okumaya çalışır. Net olmayan
            fotoğraflarda sonuç düşük güvenilirlikte olabilir, mutlaka kontrol edin.
          </p>
        </div>

        {aiSonuc && (
          <div className="text-sm space-y-2">
            <div className="font-semibold text-brand-700">
              ✅ "{EMOJI[aiSonuc.templateKey] ?? "🛠️"} {aiSonuc.baslik}" olarak dolduruldu (güven: {aiSonuc.guven}). Aşağıdaki
              adımdaki ölçüleri kontrol edin.
            </div>
            <UyariKutusu mesajlar={aiSonuc.belirsizlikler} />
          </div>
        )}
      </div>

      <div className="text-center text-sm text-neutral-400">— ya da bir ürün seçin —</div>

      {!sablonlar ? (
        <Spinner />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {sablonlar.map((s) => (
            <button
              key={s.key}
              onClick={() => urunTiklandi(s.key)}
              disabled={devamEdiliyor}
              className="card flex items-center gap-4 hover:shadow-md hover:border-brand-300 text-left disabled:opacity-50"
            >
              <div className="text-4xl">{EMOJI[s.key] ?? "🛠️"}</div>
              <div>
                <div className="font-bold text-lg">{s.name}</div>
                {s.description && <div className="text-sm text-neutral-500">{s.description}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function UrunFormu({
  templateKey,
  projectId,
  materials,
  sacMalzemeler,
  baglantiMalzemeler,
  sarfMalzemeler,
  onSaved,
  baslangic,
  duzenlemeItemId,
  baslangicAd,
}: {
  templateKey: string;
  projectId: number;
  materials: Material[];
  /** Sac (levha) kategorisindeki malzemeler - taban plakası/basamak plakası/raf plakası vb. için
   * opsiyonel malzeme bağlama alanlarında kullanılır. Verilmezse (eski çağrılarla uyum için) boş liste. */
  sacMalzemeler?: Material[];
  /** Bağlantı elemanı (FASTENER) kategorisindeki malzemeler - ankraj/menteşe/kilit/kol vb. için
   * opsiyonel malzeme bağlama alanlarında kullanılır. Verilmezse boş liste. */
  baglantiMalzemeler?: Material[];
  /** Sarf malzeme (CONSUMABLE) kategorisindeki malzemeler - yalıtım vb. için opsiyonel malzeme
   * bağlama alanlarında kullanılır. Verilmezse boş liste. */
  sarfMalzemeler?: Material[];
  onSaved?: () => void;
  baslangic?: Record<string, unknown>;
  /** Verilirse form düzenleme modunda çalışır: kaydet POST yerine bu id'ye PUT yapar. */
  duzenlemeItemId?: number;
  baslangicAd?: string;
}) {
  const navigate = useNavigate();
  const [onizleme, setOnizleme] = useState<{
    sonuc: UrunHesapSonucu;
    malzemeler: Record<string, Material>;
    yapiselKontrol?: YapiselKontrolSonucu;
  } | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [hesaplaniyor, setHesaplaniyor] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  // baslangic ile başlatılır ki, ör. duvar panelinin daha önce şematik üzerinden elle düzenlenmiş
  // dikmePozisyonlariMm'i gibi -template Alanları bileşenlerinin kendi state'inde takip etmediği
  // alanlar da bir işi düzenlerken korunsun.
  const [params, setParams] = useState<Record<string, unknown>>(() => baslangic ?? {});
  const [name, setName] = useState(baslangicAd ?? "");
  const [aiDanisman, setAiDanisman] = useState<AiDanismanSonucu | null>(null);
  const [aiDanismanYukleniyor, setAiDanismanYukleniyor] = useState(false);
  const [aiDanismanHata, setAiDanismanHata] = useState<string | null>(null);
  // Sundurma/Pergola/Kolon-Kiriş şematiklerinde tıklayarak sayı alanı değiştirildiğinde, ilgili
  // Alanları bileşenini (kendi iç state'i güncel params'tan habersiz kalmasın diye) yeniden
  // mount etmek için kullanılan sayaç - artınca key değişir, baslangic olarak güncel params okunur.
  const [semaSayiSurumu, setSemaSayiSurumu] = useState(0);
  // Şematik üzerinden yapılan dikme/yatay-ara-profil düzenlemelerinin geri/ileri alınabilmesi için
  // tam params anlık görüntüleri (snapshot) tutan yığınlar - her biri o ana kadarki TÜM formun
  // durumunu taşır, sadece tek bir alanı değil (standart "undo" davranışı).
  const [gecmisYigini, setGecmisYigini] = useState<Record<string, unknown>[]>([]);
  const [gelecekYigini, setGelecekYigini] = useState<Record<string, unknown>[]>([]);

  const hesapla = async (paramsOverride?: Record<string, unknown>) => {
    const gonderilecek = paramsOverride ?? params;
    setHesaplaniyor(true);
    setHata(null);
    setAiDanisman(null);
    setAiDanismanHata(null);
    try {
      const r = await api.post<{ sonuc: UrunHesapSonucu; malzemeler: Record<string, Material>; yapiselKontrol?: YapiselKontrolSonucu }>(
        `/calc/${templateKey}`,
        gonderilecek
      );
      setOnizleme(r);
      if (paramsOverride) setParams(paramsOverride);
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setHesaplaniyor(false);
    }
  };

  /** Şematik üzerinden yapılan dikme/yatay-ara-profil düzenlemelerinin (wall, railing, konteyner
   * dış/iç duvarları) ortak sarmalayıcısı: hesaplamadan önce o ana kadarki TAM params durumunu
   * geri-alma yığınına ekler (ve ileri-alma yığınını temizler - yeni bir dal açıldı), ardından
   * yeni durumu hesaplar ve gerekiyorsa ilgili Alanları bileşenini (semaSayiSurumu ile) yeniden
   * mount eder ki kendi iç state'i de güncel params'ı yansıtsın. */
  const semaDegisikligiUygula = async (yeniParams: Record<string, unknown>) => {
    setGecmisYigini((g) => [...g, params]);
    setGelecekYigini([]);
    await hesapla(yeniParams);
    setSemaSayiSurumu((v) => v + 1);
  };

  /** Şematikteki son dikme/yatay-ara-profil düzenlemesini geri alır. */
  const semaGeriAl = async () => {
    if (gecmisYigini.length === 0) return;
    const onceki = gecmisYigini[gecmisYigini.length - 1];
    setGecmisYigini((g) => g.slice(0, -1));
    setGelecekYigini((g) => [params, ...g]);
    await hesapla(onceki);
    setSemaSayiSurumu((v) => v + 1);
  };

  /** Geri alınmış bir dikme/yatay-ara-profil düzenlemesini yeniden ileri alır. */
  const semaIleriAl = async () => {
    if (gelecekYigini.length === 0) return;
    const sonraki = gelecekYigini[0];
    setGelecekYigini((g) => g.slice(1));
    setGecmisYigini((g) => [...g, params]);
    await hesapla(sonraki);
    setSemaSayiSurumu((v) => v + 1);
  };

  /** Duvar veya korkuluk şematiğinde bir dikmeye tıklayarak kaldırma / boş alana tıklayarak ekleme
   * yapıldığında çağrılır: yeni pozisyon listesiyle hemen yeniden hesaplar (null = otomatik yerleşime
   * dön). Her iki şablon da aynı dikmePozisyonlariMm alanını kullandığından ortak kullanılabilir. */
  const dikmePozisyonlariGuncelle = (yeniListe: number[] | null) => {
    const yeniParams = { ...params };
    if (yeniListe) yeniParams.dikmePozisyonlariMm = yeniListe;
    else delete yeniParams.dikmePozisyonlariMm;
    semaDegisikligiUygula(yeniParams);
  };

  /** Yatay ara profil eklendiğinde/kaldırıldığında/düzenlendiğinde çağrılır. */
  const yatayAraProfilleriGuncelle = (yeniListe: DuvarYatayAraProfilVeri[]) => {
    semaDegisikligiUygula({ ...params, yatayAraProfilleri: yeniListe });
  };

  /** DuvarAlanlari'nın onChange'i kendi izlediği alanlarla params'ı baştan kurar; şematik
   * üzerinden elle ayarlanmış dikmePozisyonlariMm/yatayAraProfilleri bu nesnede hiç yer almaz.
   * Genişlik/dikme aralığı/boşluklar hâlâ önceki haliyle aynıysa (yani kullanıcı sadece profil/
   * kaplama gibi yerleşimi etkilemeyen bir alanı değiştirdiyse) dikme yerleşimi korunur; yükseklik
   * de değişmediyse yatay ara profiller de korunur (onların y konumu yüksekliğe bağlı). Genişlik/
   * aralık/boşluk/yükseklikten biri değiştiyse eski yerleşim artık geçersiz olabileceğinden
   * otomatik hesaba dönülür. */
  const duvarParamsGuncelle = (yeni: Record<string, unknown>) => {
    setParams((onceki) => {
      const genislikSabit = yeni.genislikMm === onceki.genislikMm && yeni.dikmeAraligiHedefMm === onceki.dikmeAraligiHedefMm &&
        JSON.stringify(yeni.bosluklar) === JSON.stringify(onceki.bosluklar);
      const dikmeKorunabilir = onceki.dikmePozisyonlariMm && genislikSabit;
      const yatayKorunabilir = onceki.yatayAraProfilleri && genislikSabit && yeni.yukseklikMm === onceki.yukseklikMm;
      return {
        ...yeni,
        ...(dikmeKorunabilir ? { dikmePozisyonlariMm: onceki.dikmePozisyonlariMm } : {}),
        ...(yatayKorunabilir ? { yatayAraProfilleri: onceki.yatayAraProfilleri } : {}),
      };
    });
  };

  /** KorkulukAlanlari'nın onChange'i params'ı baştan kurar; toplam uzunluk değişmediyse (elle
   * ayarlanmış dikme pozisyonlarının hâlâ geçerli sınırlar içinde olduğu anlamına gelir) mevcut
   * dikmePozisyonlariMm korunur, değiştiyse otomatik yerleşime dönülür. */
  const korkulukParamsGuncelle = (yeni: Record<string, unknown>) => {
    setParams((onceki) => {
      const uzunlukSabit = yeni.toplamUzunlukMm === onceki.toplamUzunlukMm;
      const dikmeKorunabilir = onceki.dikmePozisyonlariMm && uzunlukSabit;
      return {
        ...yeni,
        ...(dikmeKorunabilir ? { dikmePozisyonlariMm: onceki.dikmePozisyonlariMm } : {}),
      };
    });
  };

  /** Sundurma şematiğinde dikme sayısına tıklanarak artırma/azaltma yapıldığında çağrılır.
   * dikmeSayisi zaten düz bir alan olduğundan (pozisyonun parça hesabına etkisi yok), sadece bu
   * alanı güncelleyip yeniden hesaplıyoruz; SundurmaAlanlari'nın kendi sayı kutusuyla senkron
   * kalması için bileşeni semaSayiSurumu ile yeniden mount ediyoruz - hesapla()'nın setParams'ı
   * gerçekten uygulamasını (await) bekledikten sonra mount ediyoruz, aksi halde yeni mount hâlâ
   * eski params'ı okur ve sayı kutusu şemadan geride kalır. */
  const dikmeSayisiGuncelle = async (yeniSayi: number) => {
    if (yeniSayi < 2) return;
    const yeniParams = { ...params, dikmeSayisi: yeniSayi };
    await hesapla(yeniParams);
    setSemaSayiSurumu((v) => v + 1);
  };

  /** Pergola şematiğinde bir kolon sırasına (ön+arka çifti) tıklanarak artırma/azaltma yapıldığında
   * çağrılır; kolonSayisi = kolonSiraAdedi * 2 (backend çift sayı şartı korunur). */
  const kolonSiraAdediGuncelle = async (yeniSiraAdedi: number) => {
    if (yeniSiraAdedi < 2) return;
    const yeniParams = { ...params, kolonSayisi: yeniSiraAdedi * 2 };
    await hesapla(yeniParams);
    setSemaSayiSurumu((v) => v + 1);
  };

  /** Kolon-Kiriş şematiğinde bir kolona tıklanarak bitişik açıklığın eklenip/kaldırılması. */
  const acikSayisiGuncelle = async (yeniAcikSayisi: number) => {
    if (yeniAcikSayisi < 1) return;
    const yeniParams = { ...params, acikSayisi: yeniAcikSayisi };
    await hesapla(yeniParams);
    setSemaSayiSurumu((v) => v + 1);
  };

  /** Raf şematiğinde bir rafa tıklanarak artırma/azaltma yapıldığında çağrılır. */
  const rafSayisiGuncelle = async (yeniSayi: number) => {
    if (yeniSayi < 2) return;
    const yeniParams = { ...params, rafSayisi: yeniSayi };
    await hesapla(yeniParams);
    setSemaSayiSurumu((v) => v + 1);
  };

  /** Çatı kafesi şematiğinde bir kafese tıklanarak artırma/azaltma yapıldığında çağrılır;
   * kafesSayisiOverride backend'de kafesAraligiHedefMm'den otomatik hesabın yerine geçer. */
  const kafesSayisiGuncelle = async (yeniSayi: number) => {
    if (yeniSayi < 2) return;
    const yeniParams = { ...params, kafesSayisiOverride: yeniSayi };
    await hesapla(yeniParams);
    setSemaSayiSurumu((v) => v + 1);
  };

  /** Ferforje panel şematiğinde bir dikey çubuğa tıklanarak artırma/azaltma yapıldığında çağrılır;
   * dikeyCubukSayisiOverride backend'de dikeyCubukAraligiHedefMm'den otomatik hesabın yerine geçer. */
  const dikeyCubukSayisiGuncelle = async (yeniSayi: number) => {
    if (yeniSayi < 2) return;
    const yeniParams = { ...params, dikeyCubukSayisiOverride: yeniSayi };
    await hesapla(yeniParams);
    setSemaSayiSurumu((v) => v + 1);
  };

  /** Konteyner şematiğinde aktif kat+yön duvarına tıklanarak dikme pozisyonu düzenlendiğinde
   * çağrılır. 2. kat henüz 1. kattan ayrılmamışsa (duvarlar2 yok), düzenlenen kat 2 ise burada
   * 1. kat duvarları kopyalanarak duvarlar2 "çatallanır" - böylece düzenleme sadece o katı etkiler.
   * duvarlar/duvarlar2 zaten KonteynerAlanlari'nın tek parça izlediği state olduğundan (ayrı
   * dikmePozisyonlariMm alanı değil, duvar nesnesinin bir parçası), ayrı bir "korunabilir" sarmalayıcı
   * gerekmez - şematik tıklamasının tetiklediği yeniden-mount (semaSayiSurumu) yeterlidir. */
  const konteynerDuvarDikmeGuncelle = async (kat: 1 | 2, yon: "on" | "arka" | "sol" | "sag", yeniListe: number[] | null) => {
    const hedefAlan = kat === 2 ? "duvarlar2" : "duvarlar";
    const temelSet = (params[hedefAlan] as Record<string, Record<string, unknown>> | undefined) ?? (params.duvarlar as Record<string, Record<string, unknown>>);
    const yeniDuvar = { ...(temelSet?.[yon] ?? {}) };
    if (yeniListe) yeniDuvar.dikmePozisyonlariMm = yeniListe;
    else delete yeniDuvar.dikmePozisyonlariMm;
    const yeniSet = { ...temelSet, [yon]: yeniDuvar };
    await semaDegisikligiUygula({ ...params, [hedefAlan]: yeniSet });
  };

  /** Konteyner şematiğinde aktif kat+yön duvarına yatay ara profil eklenip/kaldırıldığında çağrılır. */
  const konteynerDuvarYatayGuncelle = async (
    kat: 1 | 2,
    yon: "on" | "arka" | "sol" | "sag",
    yeniListe: DuvarYatayAraProfilVeri[]
  ) => {
    const hedefAlan = kat === 2 ? "duvarlar2" : "duvarlar";
    const temelSet = (params[hedefAlan] as Record<string, Record<string, unknown>> | undefined) ?? (params.duvarlar as Record<string, Record<string, unknown>>);
    const yeniSet = { ...temelSet, [yon]: { ...(temelSet?.[yon] ?? {}), yatayAraProfilleri: yeniListe } };
    await semaDegisikligiUygula({ ...params, [hedefAlan]: yeniSet });
  };

  /** Konteyner şematiğinin "İç Duvarlar" sekmesinde aktif iç bölme duvarına tıklanarak dikme
   * pozisyonu düzenlendiğinde çağrılır. icDuvarlar, duvarlar/duvarlar2 gibi KonteynerAlanlari'nın
   * tek parça izlediği bir liste olduğundan, ayrı bir "korunabilir" sarmalayıcı gerekmez. */
  const konteynerIcDuvarDikmeGuncelle = async (index: number, yeniListe: number[] | null) => {
    const mevcutListe = (params.icDuvarlar as Record<string, unknown>[] | undefined) ?? [];
    const yeniDuvar = { ...(mevcutListe[index] ?? {}) };
    if (yeniListe) yeniDuvar.dikmePozisyonlariMm = yeniListe;
    else delete yeniDuvar.dikmePozisyonlariMm;
    const yeniListeler = mevcutListe.map((d, i) => (i === index ? yeniDuvar : d));
    await semaDegisikligiUygula({ ...params, icDuvarlar: yeniListeler });
  };

  /** Konteyner şematiğinin "İç Duvarlar" sekmesinde aktif iç bölme duvarına yatay ara profil
   * eklenip/kaldırıldığında çağrılır. */
  const konteynerIcDuvarYatayGuncelle = async (index: number, yeniListe: DuvarYatayAraProfilVeri[]) => {
    const mevcutListe = (params.icDuvarlar as Record<string, unknown>[] | undefined) ?? [];
    const yeniListeler = mevcutListe.map((d, i) => (i === index ? { ...d, yatayAraProfilleri: yeniListe } : d));
    await semaDegisikligiUygula({ ...params, icDuvarlar: yeniListeler });
  };

  /** Konteyner şematiğinin "Çatı" sekmesinde bir kafese tıklanarak artırma/azaltma yapıldığında
   * çağrılır; kafesSayisiOverride params.cati içine yazılır. */
  const konteynerCatiKafesSayisiGuncelle = async (yeniSayi: number) => {
    if (yeniSayi < 2) return;
    const mevcutCati = (params.cati as Record<string, unknown> | undefined) ?? {};
    const yeniCati = { ...mevcutCati, kafesSayisiOverride: yeniSayi };
    await hesapla({ ...params, cati: yeniCati });
    setSemaSayiSurumu((v) => v + 1);
  };

  /** CatiKafesiAlanlari'nın onChange'i kendi izlediği alanlarla params'ı baştan kurar ve
   * kafesSayisiOverride'ı hiç içermez; çatı uzunluğu değişmediyse (override'ın hâlâ geçerli
   * olduğu anlamına gelir) mevcut override korunur - bu hem sonraki alan değişikliklerinde hem de
   * şematik tıklamasının kendi tetiklediği yeniden-mount'ta (semaSayiSurumu) override'ın silinmesini
   * önler. */
  const catiKafesiParamsGuncelle = (yeni: Record<string, unknown>) => {
    setParams((onceki) => {
      const uzunlukSabit = yeni.catiUzunluguMm === onceki.catiUzunluguMm;
      const korunabilir = onceki.kafesSayisiOverride && uzunlukSabit;
      return { ...yeni, ...(korunabilir ? { kafesSayisiOverride: onceki.kafesSayisiOverride } : {}) };
    });
  };

  /** FerforjePanelAlanlari'nın onChange'i için aynı koruma; genişlik değişmediyse
   * dikeyCubukSayisiOverride korunur. */
  const ferforjeParamsGuncelle = (yeni: Record<string, unknown>) => {
    setParams((onceki) => {
      const genislikSabit = yeni.genislikMm === onceki.genislikMm;
      const korunabilir = onceki.dikeyCubukSayisiOverride && genislikSabit;
      return { ...yeni, ...(korunabilir ? { dikeyCubukSayisiOverride: onceki.dikeyCubukSayisiOverride } : {}) };
    });
  };

  const aiDegerlendir = async () => {
    setAiDanismanYukleniyor(true);
    setAiDanismanHata(null);
    try {
      const r = await api.post<AiDanismanSonucu>("/ai/malzeme-danismani", { templateKey, params });
      setAiDanisman(r);
    } catch (e: any) {
      setAiDanismanHata(e.message);
    } finally {
      setAiDanismanYukleniyor(false);
    }
  };

  const kaydet = async () => {
    if (!name.trim()) return setHata("Ürün için bir ad girin (örn. Bahçe Korkuluğu).");
    setKaydediliyor(true);
    setHata(null);
    try {
      if (duzenlemeItemId) {
        await api.put(`/projects/${projectId}/items/${duzenlemeItemId}`, { name, params });
      } else {
        await api.post(`/projects/${projectId}/items`, { templateKey, name, params });
      }
      if (onSaved) onSaved();
      else navigate(`/isler/${projectId}`);
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <HataKutusu mesaj={hata} />
        <div>
          <label className="field-label">Ürün Adı *</label>
          <input className="field-input" placeholder="örn. Bahçe Korkuluğu" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {templateKey === "railing" && (
          <KorkulukAlanlari
            materials={materials}
            sacMalzemeler={sacMalzemeler ?? []}
            baglantiMalzemeler={baglantiMalzemeler ?? []}
            onChange={korkulukParamsGuncelle}
            baslangic={baslangic}
          />
        )}
        {templateKey === "stairs" && (
          <MerdivenAlanlari
            materials={materials}
            sacMalzemeler={sacMalzemeler ?? []}
            baglantiMalzemeler={baglantiMalzemeler ?? []}
            onChange={setParams}
            baslangic={baslangic}
          />
        )}
        {templateKey === "spiral_stairs" && (
          <DonerMerdivenAlanlari
            materials={materials}
            sacMalzemeler={sacMalzemeler ?? []}
            baglantiMalzemeler={baglantiMalzemeler ?? []}
            onChange={setParams}
            baslangic={baslangic}
          />
        )}
        {templateKey === "canopy" && (
          <SundurmaAlanlari
            key={`sundurma-${semaSayiSurumu}`}
            materials={materials}
            sacMalzemeler={sacMalzemeler ?? []}
            baglantiMalzemeler={baglantiMalzemeler ?? []}
            onChange={setParams}
            baslangic={semaSayiSurumu > 0 ? params : baslangic}
          />
        )}
        {templateKey === "door" && (
          <KapiAlanlari
            materials={materials}
            sacMalzemeler={sacMalzemeler ?? []}
            baglantiMalzemeler={baglantiMalzemeler ?? []}
            onChange={setParams}
            baslangic={baslangic}
          />
        )}
        {templateKey === "wall" && (
          <DuvarAlanlari
            materials={materials}
            sacMalzemeler={sacMalzemeler ?? []}
            baglantiMalzemeler={baglantiMalzemeler ?? []}
            sarfMalzemeler={sarfMalzemeler ?? []}
            onChange={duvarParamsGuncelle}
            baslangic={baslangic}
          />
        )}
        {templateKey === "truss" && (
          <CatiKafesiAlanlari
            key={`truss-${semaSayiSurumu}`}
            materials={materials}
            sacMalzemeler={sacMalzemeler ?? []}
            baglantiMalzemeler={baglantiMalzemeler ?? []}
            onChange={catiKafesiParamsGuncelle}
            baslangic={semaSayiSurumu > 0 ? params : baslangic}
          />
        )}
        {templateKey === "shelf" && (
          <RafAlanlari
            key={`raf-${semaSayiSurumu}`}
            materials={materials}
            sacMalzemeler={sacMalzemeler ?? []}
            onChange={setParams}
            baslangic={semaSayiSurumu > 0 ? params : baslangic}
          />
        )}
        {templateKey === "pergola" && (
          <PergolaAlanlari
            key={`pergola-${semaSayiSurumu}`}
            materials={materials}
            sacMalzemeler={sacMalzemeler ?? []}
            baglantiMalzemeler={baglantiMalzemeler ?? []}
            onChange={setParams}
            baslangic={semaSayiSurumu > 0 ? params : baslangic}
          />
        )}
        {templateKey === "ferforje_panel" && (
          <FerforjePanelAlanlari
            key={`ferforje-${semaSayiSurumu}`}
            materials={materials}
            onChange={ferforjeParamsGuncelle}
            baslangic={semaSayiSurumu > 0 ? params : baslangic}
          />
        )}
        {templateKey === "steel_frame" && (
          <KolonKirisAlanlari
            key={`steel-frame-${semaSayiSurumu}`}
            materials={materials}
            sacMalzemeler={sacMalzemeler ?? []}
            baglantiMalzemeler={baglantiMalzemeler ?? []}
            onChange={setParams}
            baslangic={semaSayiSurumu > 0 ? params : baslangic}
          />
        )}
        {templateKey === "container" && (
          <KonteynerAlanlari
            key={`konteyner-${semaSayiSurumu}`}
            materials={materials}
            sacMalzemeler={sacMalzemeler ?? []}
            baglantiMalzemeler={baglantiMalzemeler ?? []}
            sarfMalzemeler={sarfMalzemeler ?? []}
            onChange={setParams}
            baslangic={semaSayiSurumu > 0 ? params : baslangic}
          />
        )}

        <button className="btn-primary w-full" onClick={() => hesapla()} disabled={hesaplaniyor}>
          {hesaplaniyor ? "Hesaplanıyor..." : "🧮 Hesapla"}
        </button>
      </div>

      {onizleme && (
        <div className="card space-y-4">
          <h2 className="font-bold text-lg">Hesap Sonucu</h2>
          {(templateKey === "wall" || templateKey === "railing" || templateKey === "container") && (
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary btn-sm"
                disabled={gecmisYigini.length === 0}
                onClick={semaGeriAl}
                title="Şematikteki son dikme/yatay profil düzenlemesini geri al"
              >
                ↩️ Geri Al
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                disabled={gelecekYigini.length === 0}
                onClick={semaIleriAl}
                title="Geri alınan düzenlemeyi yeniden ileri al"
              >
                ↪️ İleri Al
              </button>
            </div>
          )}
          <SemaGorunum
            templateKey={templateKey}
            params={params}
            ozetDegerler={onizleme.sonuc.ozetDegerler}
            malzemeler={onizleme.malzemeler}
            duzenlenebilir={
              templateKey === "wall" ||
              templateKey === "railing" ||
              templateKey === "canopy" ||
              templateKey === "pergola" ||
              templateKey === "steel_frame" ||
              templateKey === "shelf" ||
              templateKey === "truss" ||
              templateKey === "ferforje_panel" ||
              templateKey === "container"
            }
            onDikmePozisyonlariDegisti={
              templateKey === "wall" || templateKey === "railing" ? dikmePozisyonlariGuncelle : undefined
            }
            onYatayAraProfilleriDegisti={templateKey === "wall" ? yatayAraProfilleriGuncelle : undefined}
            onDikmeSayisiDegisti={templateKey === "canopy" ? dikmeSayisiGuncelle : undefined}
            onKolonSiraAdediDegisti={templateKey === "pergola" ? kolonSiraAdediGuncelle : undefined}
            onAcikSayisiDegisti={templateKey === "steel_frame" ? acikSayisiGuncelle : undefined}
            onRafSayisiDegisti={templateKey === "shelf" ? rafSayisiGuncelle : undefined}
            onKafesSayisiDegisti={templateKey === "truss" ? kafesSayisiGuncelle : undefined}
            onDikeyCubukSayisiDegisti={templateKey === "ferforje_panel" ? dikeyCubukSayisiGuncelle : undefined}
            onKonteynerDuvarDikmeDegisti={templateKey === "container" ? konteynerDuvarDikmeGuncelle : undefined}
            onKonteynerDuvarYatayDegisti={templateKey === "container" ? konteynerDuvarYatayGuncelle : undefined}
            onKonteynerIcDuvarDikmeDegisti={templateKey === "container" ? konteynerIcDuvarDikmeGuncelle : undefined}
            onKonteynerIcDuvarYatayDegisti={templateKey === "container" ? konteynerIcDuvarYatayGuncelle : undefined}
            onKonteynerCatiKafesSayisiDegisti={templateKey === "container" ? konteynerCatiKafesSayisiGuncelle : undefined}
          />

          <HesapSonucuGorunum sonuc={onizleme.sonuc} malzemeler={onizleme.malzemeler} />

          {onizleme.yapiselKontrol && <YapiselKontrolGorunum kontrol={onizleme.yapiselKontrol} />}

          {duzenlemeItemId && <ParamsFarkiPaneli eski={baslangic} yeni={params} />}

          <div className="rounded-xl border border-neutral-200 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-semibold">🤖 AI Malzeme Danışmanı (opsiyonel)</span>
              <button className="btn-secondary btn-sm" onClick={aiDegerlendir} disabled={aiDanismanYukleniyor}>
                {aiDanismanYukleniyor ? "Değerlendiriliyor..." : aiDanisman ? "Yeniden Değerlendir" : "Değerlendirme Al"}
              </button>
            </div>
            <HataKutusu mesaj={aiDanismanHata} />
            {aiDanisman && (
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={UYGUNLUK_RENK[aiDanisman.malzemeUygunlugu]}>
                    {UYGUNLUK_ETIKET[aiDanisman.malzemeUygunlugu] ?? aiDanisman.malzemeUygunlugu}
                  </Badge>
                  <span className="text-neutral-600">
                    Tahmini toplam ağırlık: <b>{aiDanisman.hesaplananAgirlikKg} kg</b>
                  </span>
                </div>
                <p>{aiDanisman.degerlendirme}</p>
                {aiDanisman.onerilenAlternatif && (
                  <p className="font-medium">Önerilen alternatif: {aiDanisman.onerilenAlternatif}</p>
                )}
                {aiDanisman.agirlikNotu && <p className="text-xs text-neutral-500">{aiDanisman.agirlikNotu}</p>}
                {aiDanisman.oneriler.length > 0 && (
                  <ul className="list-disc list-inside space-y-1">
                    {aiDanisman.oneriler.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                )}
                {aiDanisman.sarfMalzemeOnerileri.length > 0 && (
                  <div>
                    <div className="font-medium text-neutral-700 mb-1">🔩 Önerilen sarf malzemeleri</div>
                    <ul className="list-disc list-inside space-y-1">
                      {aiDanisman.sarfMalzemeOnerileri.map((o, i) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiDanisman.tahminiTasimaKapasitesiKg != null && (
                  <div className="rounded-lg bg-amber-50 border border-amber-300 text-amber-900 px-3 py-2">
                    <div className="font-semibold">
                      ⚠️ Kaba taşıma kapasitesi tahmini: ~{aiDanisman.tahminiTasimaKapasitesiKg} kg
                    </div>
                    <div className="text-xs mt-1">{aiDanisman.tasimaKapasitesiAciklamasi}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <button className="btn-primary w-full" onClick={kaydet} disabled={kaydediliyor}>
            {kaydediliyor ? "Kaydediliyor..." : duzenlemeItemId ? "✅ Değişiklikleri Kaydet" : "✅ Kaydet ve İşe Git"}
          </button>
        </div>
      )}
    </div>
  );
}

function Sayi({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input
        type="number"
        className="field-input"
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
      />
    </div>
  );
}

function KorkulukAlanlari({
  materials,
  sacMalzemeler,
  baglantiMalzemeler,
  onChange,
  baslangic,
}: {
  materials: Material[];
  sacMalzemeler: Material[];
  baglantiMalzemeler: Material[];
  onChange: (p: Record<string, unknown>) => void;
  baslangic?: Record<string, unknown>;
}) {
  const [toplamUzunlukMm, setToplamUzunlukMm] = useState<number>(() => (baslangic?.toplamUzunlukMm as number) ?? 12000);
  const [yukseklikMm, setYukseklikMm] = useState<number>(() => (baslangic?.yukseklikMm as number) ?? 1200);
  const [dikmeAraligiHedefMm, setDikmeAraligiHedefMm] = useState<number>(() => (baslangic?.dikmeAraligiHedefMm as number) ?? 1500);
  const [ustProfilId, setUstProfilId] = useState<number | undefined>(() => baslangic?.ustProfilId as number | undefined);
  const [altProfilId, setAltProfilId] = useState<number | undefined>(() => baslangic?.altProfilId as number | undefined);
  const [dikmeProfilId, setDikmeProfilId] = useState<number | undefined>(() => baslangic?.dikmeProfilId as number | undefined);
  const [araKayitSayisi, setAraKayitSayisi] = useState<number>(() => (baslangic?.araKayitSayisi as number) ?? 0);
  const [araKayitProfilId, setAraKayitProfilId] = useState<number | undefined>(
    () => baslangic?.araKayitProfilId as number | undefined
  );
  const [plakaMalzemeId, setPlakaMalzemeId] = useState<number | undefined>(() => baslangic?.plakaMalzemeId as number | undefined);
  const [ankrajMalzemeId, setAnkrajMalzemeId] = useState<number | undefined>(() => baslangic?.ankrajMalzemeId as number | undefined);

  useEffect(() => {
    onChange({
      toplamUzunlukMm,
      yukseklikMm,
      dikmeAraligiHedefMm,
      ustProfilId,
      altProfilId,
      dikmeProfilId,
      araKayitSayisi,
      araKayitProfilId,
      plakaMalzemeId,
      ankrajMalzemeId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    toplamUzunlukMm,
    yukseklikMm,
    dikmeAraligiHedefMm,
    ustProfilId,
    altProfilId,
    dikmeProfilId,
    araKayitSayisi,
    araKayitProfilId,
    plakaMalzemeId,
    ankrajMalzemeId,
  ]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Sayi label="Toplam Uzunluk (mm)" value={toplamUzunlukMm} onChange={setToplamUzunlukMm} />
        <Sayi label="Yükseklik (mm)" value={yukseklikMm} onChange={setYukseklikMm} />
        <Sayi label="Dikme Aralığı (mm)" value={dikmeAraligiHedefMm} onChange={setDikmeAraligiHedefMm} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <MaterialSelect label="Üst Profil" materials={materials} value={ustProfilId} onChange={setUstProfilId} />
        <MaterialSelect label="Alt Profil" materials={materials} value={altProfilId} onChange={setAltProfilId} />
        <MaterialSelect label="Dikme Profili" materials={materials} value={dikmeProfilId} onChange={setDikmeProfilId} />
      </div>
      <details className="rounded-xl border border-neutral-200 p-3">
        <summary className="font-semibold cursor-pointer">Gelişmiş: Ara Kayıt ve Taban Plakası</summary>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Sayi label="Ara Kayıt Sayısı" value={araKayitSayisi} onChange={setAraKayitSayisi} />
          <MaterialSelect label="Ara Kayıt Profili" materials={materials} value={araKayitProfilId} onChange={setAraKayitProfilId} allowEmpty />
          <MaterialSelect
            label="Taban Plakası Sac Malzemesi (opsiyonel, stok/maliyet için)"
            materials={sacMalzemeler}
            value={plakaMalzemeId}
            onChange={setPlakaMalzemeId}
            allowEmpty
          />
          <MaterialSelect
            label="Ankraj Malzemesi (opsiyonel, stok/maliyet için)"
            materials={baglantiMalzemeler}
            value={ankrajMalzemeId}
            onChange={setAnkrajMalzemeId}
            allowEmpty
          />
        </div>
      </details>
    </div>
  );
}

function MerdivenAlanlari({
  materials,
  sacMalzemeler,
  baglantiMalzemeler,
  onChange,
  baslangic,
}: {
  materials: Material[];
  sacMalzemeler: Material[];
  baglantiMalzemeler: Material[];
  onChange: (p: Record<string, unknown>) => void;
  baslangic?: Record<string, unknown>;
}) {
  const [katYuksekligiMm, setKatYuksekligiMm] = useState<number>(() => (baslangic?.katYuksekligiMm as number) ?? 3000);
  const [genislikMm, setGenislikMm] = useState<number>(() => (baslangic?.genislikMm as number) ?? 900);
  const [basamakYuksekligiHedefMm, setBasamakYuksekligiHedefMm] = useState<number>(
    () => (baslangic?.basamakYuksekligiHedefMm as number) ?? 180
  );
  const [toplamDerinlikMm, setToplamDerinlikMm] = useState<number>(() => (baslangic?.toplamDerinlikMm as number) ?? 4590);
  const [tasiyiciProfilId, setTasiyiciProfilId] = useState<number | undefined>(
    () => baslangic?.tasiyiciProfilId as number | undefined
  );
  const [korkulukYuksekligiMm, setKorkulukYuksekligiMm] = useState<number | undefined>(
    () => (baslangic?.korkulukYuksekligiMm as number | undefined) ?? undefined
  );
  const [korkulukDikmeProfilId, setKorkulukDikmeProfilId] = useState<number | undefined>(
    () => baslangic?.korkulukDikmeProfilId as number | undefined
  );
  const [korkulukUstProfilId, setKorkulukUstProfilId] = useState<number | undefined>(
    () => baslangic?.korkulukUstProfilId as number | undefined
  );
  const [basamakSacMalzemeId, setBasamakSacMalzemeId] = useState<number | undefined>(
    () => baslangic?.basamakSacMalzemeId as number | undefined
  );
  const [korkulukBaglantiMalzemeId, setKorkulukBaglantiMalzemeId] = useState<number | undefined>(
    () => baslangic?.korkulukBaglantiMalzemeId as number | undefined
  );

  useEffect(() => {
    onChange({
      katYuksekligiMm,
      genislikMm,
      basamakYuksekligiHedefMm,
      toplamDerinlikMm,
      tasiyiciProfilId,
      korkulukYuksekligiMm: korkulukYuksekligiMm || undefined,
      korkulukDikmeProfilId,
      korkulukUstProfilId,
      basamakSacMalzemeId,
      korkulukBaglantiMalzemeId: korkulukYuksekligiMm ? korkulukBaglantiMalzemeId : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    katYuksekligiMm,
    genislikMm,
    basamakYuksekligiHedefMm,
    toplamDerinlikMm,
    tasiyiciProfilId,
    korkulukYuksekligiMm,
    korkulukDikmeProfilId,
    korkulukUstProfilId,
    basamakSacMalzemeId,
    korkulukBaglantiMalzemeId,
  ]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Sayi label="Kat Yüksekliği (mm)" value={katYuksekligiMm} onChange={setKatYuksekligiMm} />
        <Sayi label="Merdiven Genişliği (mm)" value={genislikMm} onChange={setGenislikMm} />
        <Sayi label="Hedef Basamak Yüksekliği (mm)" value={basamakYuksekligiHedefMm} onChange={setBasamakYuksekligiHedefMm} />
        <Sayi label="Toplam Yatay Uzunluk / Merdiven Boşluğu (mm)" value={toplamDerinlikMm} onChange={setToplamDerinlikMm} />
      </div>
      <p className="text-xs text-neutral-500 -mt-1">
        Basamak derinliği, kiriş (hipotenüs) uzunluğu ve eğim açısı bu iki ölçüden otomatik hesaplanır.
      </p>
      <MaterialSelect label="Taşıyıcı (Kiriş) Profili" materials={materials} value={tasiyiciProfilId} onChange={setTasiyiciProfilId} />
      <MaterialSelect
        label="Basamak Plakası Sac Malzemesi (opsiyonel, stok/maliyet için)"
        materials={sacMalzemeler}
        value={basamakSacMalzemeId}
        onChange={setBasamakSacMalzemeId}
        allowEmpty
      />
      <details className="rounded-xl border border-neutral-200 p-3">
        <summary className="font-semibold cursor-pointer">Gelişmiş: Merdiven Korkuluğu</summary>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <Sayi label="Korkuluk Yüksekliği (mm)" value={korkulukYuksekligiMm} onChange={setKorkulukYuksekligiMm} />
          <MaterialSelect label="Korkuluk Dikmesi" materials={materials} value={korkulukDikmeProfilId} onChange={setKorkulukDikmeProfilId} allowEmpty />
          <MaterialSelect label="Korkuluk Üst Profili" materials={materials} value={korkulukUstProfilId} onChange={setKorkulukUstProfilId} allowEmpty />
          <MaterialSelect
            label="Korkuluk Bağlantı Plakası Malzemesi (opsiyonel)"
            materials={baglantiMalzemeler}
            value={korkulukBaglantiMalzemeId}
            onChange={setKorkulukBaglantiMalzemeId}
            allowEmpty
          />
        </div>
      </details>
    </div>
  );
}

function DonerMerdivenAlanlari({
  materials,
  sacMalzemeler,
  baglantiMalzemeler,
  onChange,
  baslangic,
}: {
  materials: Material[];
  sacMalzemeler: Material[];
  baglantiMalzemeler: Material[];
  onChange: (p: Record<string, unknown>) => void;
  baslangic?: Record<string, unknown>;
}) {
  const [katYuksekligiMm, setKatYuksekligiMm] = useState<number>(() => (baslangic?.katYuksekligiMm as number) ?? 2800);
  const [icCapMm, setIcCapMm] = useState<number>(() => (baslangic?.icCapMm as number) ?? 200);
  const [disCapMm, setDisCapMm] = useState<number>(() => (baslangic?.disCapMm as number) ?? 1400);
  const [toplamDonusDerecesi, setToplamDonusDerecesi] = useState<number>(
    () => (baslangic?.toplamDonusDerecesi as number) ?? 360
  );
  const [basamakYuksekligiHedefMm, setBasamakYuksekligiHedefMm] = useState<number>(
    () => (baslangic?.basamakYuksekligiHedefMm as number) ?? 200
  );
  const [merkezKolonProfilId, setMerkezKolonProfilId] = useState<number | undefined>(
    () => baslangic?.merkezKolonProfilId as number | undefined
  );
  const [basamakDestekProfilId, setBasamakDestekProfilId] = useState<number | undefined>(
    () => baslangic?.basamakDestekProfilId as number | undefined
  );
  const [basamakKalinlikMm, setBasamakKalinlikMm] = useState<number>(() => (baslangic?.basamakKalinlikMm as number) ?? 3);
  const [korkulukVar, setKorkulukVar] = useState<boolean>(() => (baslangic?.korkulukVar as boolean) ?? false);
  const [korkulukYuksekligiMm, setKorkulukYuksekligiMm] = useState<number>(
    () => (baslangic?.korkulukYuksekligiMm as number) ?? 900
  );
  const [korkulukDikmeProfilId, setKorkulukDikmeProfilId] = useState<number | undefined>(
    () => baslangic?.korkulukDikmeProfilId as number | undefined
  );
  const [korkulukUstProfilId, setKorkulukUstProfilId] = useState<number | undefined>(
    () => baslangic?.korkulukUstProfilId as number | undefined
  );
  const [basamakSacMalzemeId, setBasamakSacMalzemeId] = useState<number | undefined>(
    () => baslangic?.basamakSacMalzemeId as number | undefined
  );
  const [korkulukBaglantiMalzemeId, setKorkulukBaglantiMalzemeId] = useState<number | undefined>(
    () => baslangic?.korkulukBaglantiMalzemeId as number | undefined
  );

  useEffect(() => {
    onChange({
      katYuksekligiMm,
      icCapMm,
      disCapMm,
      toplamDonusDerecesi,
      basamakYuksekligiHedefMm,
      merkezKolonProfilId,
      basamakDestekProfilId,
      basamakKalinlikMm,
      basamakSacMalzemeId,
      korkulukVar,
      korkulukYuksekligiMm: korkulukVar ? korkulukYuksekligiMm : undefined,
      korkulukDikmeProfilId: korkulukVar ? korkulukDikmeProfilId : undefined,
      korkulukUstProfilId: korkulukVar ? korkulukUstProfilId : undefined,
      korkulukBaglantiMalzemeId: korkulukVar ? korkulukBaglantiMalzemeId : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    katYuksekligiMm,
    icCapMm,
    disCapMm,
    toplamDonusDerecesi,
    basamakYuksekligiHedefMm,
    merkezKolonProfilId,
    basamakDestekProfilId,
    basamakKalinlikMm,
    basamakSacMalzemeId,
    korkulukVar,
    korkulukYuksekligiMm,
    korkulukDikmeProfilId,
    korkulukUstProfilId,
    korkulukBaglantiMalzemeId,
  ]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Sayi label="Kat Yüksekliği (mm)" value={katYuksekligiMm} onChange={setKatYuksekligiMm} />
        <Sayi label="Hedef Basamak Yüksekliği (mm)" value={basamakYuksekligiHedefMm} onChange={setBasamakYuksekligiHedefMm} />
        <Sayi label="İç Çap (mm)" value={icCapMm} onChange={setIcCapMm} />
        <Sayi label="Dış Çap (mm)" value={disCapMm} onChange={setDisCapMm} />
        <Sayi label="Toplam Dönüş Açısı (derece)" value={toplamDonusDerecesi} onChange={setToplamDonusDerecesi} />
        <Sayi label="Basamak Kalınlığı (mm)" value={basamakKalinlikMm} onChange={setBasamakKalinlikMm} />
      </div>
      <p className="text-xs text-neutral-500 -mt-1">
        Basamak sayısı ve açısı kat yüksekliği / hedef basamak yüksekliği ve toplam dönüş açısından otomatik hesaplanır.
        Basamak plakası pasta dilimi şeklindedir; sac kesimi şablonla yapılmalıdır.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <MaterialSelect
          label="Merkez Kolon Profili (genelde boru)"
          materials={materials}
          value={merkezKolonProfilId}
          onChange={setMerkezKolonProfilId}
        />
        <MaterialSelect
          label="Basamak Desteği (Konsol) Profili"
          materials={materials}
          value={basamakDestekProfilId}
          onChange={setBasamakDestekProfilId}
        />
        <MaterialSelect
          label="Basamak Plakası Sac Malzemesi (opsiyonel, stok/maliyet için)"
          materials={sacMalzemeler}
          value={basamakSacMalzemeId}
          onChange={setBasamakSacMalzemeId}
          allowEmpty
        />
      </div>
      <div className="mt-1 space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={korkulukVar} onChange={(e) => setKorkulukVar(e.target.checked)} />
          Korkuluk ekle
        </label>
        {korkulukVar && (
          <div className="grid grid-cols-3 gap-3">
            <Sayi label="Korkuluk Yüksekliği (mm)" value={korkulukYuksekligiMm} onChange={setKorkulukYuksekligiMm} />
            <MaterialSelect
              label="Korkuluk Dikmesi"
              materials={materials}
              value={korkulukDikmeProfilId}
              onChange={setKorkulukDikmeProfilId}
            />
            <MaterialSelect
              label="Korkuluk Üst Profili"
              materials={materials}
              value={korkulukUstProfilId}
              onChange={setKorkulukUstProfilId}
            />
            <MaterialSelect
              label="Korkuluk Bağlantı Plakası Malzemesi (opsiyonel)"
              materials={baglantiMalzemeler}
              value={korkulukBaglantiMalzemeId}
              onChange={setKorkulukBaglantiMalzemeId}
              allowEmpty
            />
          </div>
        )}
        {korkulukVar && (
          <p className="text-xs text-neutral-500">
            Üst profil düz uzunluk olarak hesaplanır; gerçek montaj helis (spiral) şeklindedir, sahada bükülmesi gerekir.
          </p>
        )}
      </div>
    </div>
  );
}

function SundurmaAlanlari({
  materials,
  sacMalzemeler,
  baglantiMalzemeler,
  onChange,
  baslangic,
}: {
  materials: Material[];
  sacMalzemeler: Material[];
  baglantiMalzemeler: Material[];
  onChange: (p: Record<string, unknown>) => void;
  baslangic?: Record<string, unknown>;
}) {
  const [genislikMm, setGenislikMm] = useState<number>(() => (baslangic?.genislikMm as number) ?? 4000);
  const [boyMm, setBoyMm] = useState<number>(() => (baslangic?.boyMm as number) ?? 3000);
  const [yukseklikMm, setYukseklikMm] = useState<number>(() => (baslangic?.yukseklikMm as number) ?? 2200);
  const [egimYuzde, setEgimYuzde] = useState<number>(() => (baslangic?.egimYuzde as number) ?? 10);
  const [dikmeSayisi, setDikmeSayisi] = useState<number>(() => (baslangic?.dikmeSayisi as number) ?? 3);
  const [anaTasiyiciProfilId, setAnaTasiyiciProfilId] = useState<number | undefined>(
    () => baslangic?.anaTasiyiciProfilId as number | undefined
  );
  const [araTasiyiciProfilId, setAraTasiyiciProfilId] = useState<number | undefined>(
    () => baslangic?.araTasiyiciProfilId as number | undefined
  );
  const [dikmeProfilId, setDikmeProfilId] = useState<number | undefined>(() => baslangic?.dikmeProfilId as number | undefined);
  const [caprazProfilId, setCaprazProfilId] = useState<number | undefined>(
    () => baslangic?.caprazProfilId as number | undefined
  );
  const [kaplamaTuru, setKaplamaTuru] = useState<string>(() => (baslangic?.kaplamaTuru as string) ?? "trapez_sac");
  const [kaplamaMalzemeId, setKaplamaMalzemeId] = useState<number | undefined>(
    () => baslangic?.kaplamaMalzemeId as number | undefined
  );
  const [plakaMalzemeId, setPlakaMalzemeId] = useState<number | undefined>(() => baslangic?.plakaMalzemeId as number | undefined);
  const [ankrajMalzemeId, setAnkrajMalzemeId] = useState<number | undefined>(() => baslangic?.ankrajMalzemeId as number | undefined);

  useEffect(() => {
    onChange({
      genislikMm,
      boyMm,
      yukseklikMm,
      egimYuzde,
      dikmeSayisi,
      anaTasiyiciProfilId,
      araTasiyiciProfilId,
      dikmeProfilId,
      caprazProfilId,
      kaplamaTuru,
      kaplamaMalzemeId: kaplamaTuru !== "yok" ? kaplamaMalzemeId : undefined,
      plakaMalzemeId,
      ankrajMalzemeId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    genislikMm,
    boyMm,
    yukseklikMm,
    egimYuzde,
    dikmeSayisi,
    anaTasiyiciProfilId,
    araTasiyiciProfilId,
    dikmeProfilId,
    caprazProfilId,
    kaplamaTuru,
    kaplamaMalzemeId,
    plakaMalzemeId,
    ankrajMalzemeId,
  ]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Sayi label="En (mm)" value={genislikMm} onChange={setGenislikMm} />
        <Sayi label="Boy / Çıkma (mm)" value={boyMm} onChange={setBoyMm} />
        <Sayi label="Yükseklik (mm)" value={yukseklikMm} onChange={setYukseklikMm} />
        <Sayi label="Eğim (%)" value={egimYuzde} onChange={setEgimYuzde} />
        <Sayi label="Dikme Sayısı" value={dikmeSayisi} onChange={setDikmeSayisi} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MaterialSelect label="Ana Taşıyıcı (Kiriş)" materials={materials} value={anaTasiyiciProfilId} onChange={setAnaTasiyiciProfilId} />
        <MaterialSelect label="Ara Taşıyıcı (Aşık)" materials={materials} value={araTasiyiciProfilId} onChange={setAraTasiyiciProfilId} />
        <MaterialSelect label="Dikme Profili" materials={materials} value={dikmeProfilId} onChange={setDikmeProfilId} />
        <MaterialSelect label="Çapraz Profili (opsiyonel)" materials={materials} value={caprazProfilId} onChange={setCaprazProfilId} allowEmpty />
      </div>
      <div>
        <label className="field-label">Çatı Kaplaması</label>
        <select className="field-select" value={kaplamaTuru} onChange={(e) => setKaplamaTuru(e.target.value)}>
          {CATI_KAPLAMA_SECENEKLERI.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {kaplamaTuru !== "yok" && (
        <MaterialSelect
          label="Kaplama Sac Malzemesi (opsiyonel, stok/maliyet için)"
          materials={sacMalzemeler}
          value={kaplamaMalzemeId}
          onChange={setKaplamaMalzemeId}
          allowEmpty
        />
      )}
      <MaterialSelect
        label="Taban Plakası Sac Malzemesi (opsiyonel, stok/maliyet için)"
        materials={sacMalzemeler}
        value={plakaMalzemeId}
        onChange={setPlakaMalzemeId}
        allowEmpty
      />
      <MaterialSelect
        label="Ankraj Malzemesi (opsiyonel, stok/maliyet için)"
        materials={baglantiMalzemeler}
        value={ankrajMalzemeId}
        onChange={setAnkrajMalzemeId}
        allowEmpty
      />
    </div>
  );
}

function KapiAlanlari({
  materials,
  sacMalzemeler,
  baglantiMalzemeler,
  onChange,
  baslangic,
}: {
  materials: Material[];
  sacMalzemeler: Material[];
  baglantiMalzemeler: Material[];
  onChange: (p: Record<string, unknown>) => void;
  baslangic?: Record<string, unknown>;
}) {
  const [genislikMm, setGenislikMm] = useState<number>(() => (baslangic?.genislikMm as number) ?? 1000);
  const [yukseklikMm, setYukseklikMm] = useState<number>(() => (baslangic?.yukseklikMm as number) ?? 2200);
  const [kasaProfilId, setKasaProfilId] = useState<number | undefined>(() => baslangic?.kasaProfilId as number | undefined);
  const [kanatProfilId, setKanatProfilId] = useState<number | undefined>(() => baslangic?.kanatProfilId as number | undefined);
  const [sacKalinlikMm, setSacKalinlikMm] = useState<number>(() => (baslangic?.sacKalinlikMm as number) ?? 1.5);
  const [sacMalzemeId, setSacMalzemeId] = useState<number | undefined>(() => baslangic?.sacMalzemeId as number | undefined);
  const [menteseAdet, setMenteseAdet] = useState<number>(() => (baslangic?.menteseAdet as number) ?? 3);
  const [kilitAdet, setKilitAdet] = useState<number>(() => (baslangic?.kilitAdet as number) ?? 1);
  const [kolAdet, setKolAdet] = useState<number>(() => (baslangic?.kolAdet as number) ?? 1);
  const [menteseMalzemeId, setMenteseMalzemeId] = useState<number | undefined>(() => baslangic?.menteseMalzemeId as number | undefined);
  const [kilitMalzemeId, setKilitMalzemeId] = useState<number | undefined>(() => baslangic?.kilitMalzemeId as number | undefined);
  const [kolMalzemeId, setKolMalzemeId] = useState<number | undefined>(() => baslangic?.kolMalzemeId as number | undefined);

  useEffect(() => {
    onChange({
      genislikMm,
      yukseklikMm,
      kasaProfilId,
      kanatProfilId,
      sacKalinlikMm,
      sacMalzemeId,
      menteseAdet,
      kilitAdet,
      kolAdet,
      menteseMalzemeId,
      kilitMalzemeId,
      kolMalzemeId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    genislikMm,
    yukseklikMm,
    kasaProfilId,
    kanatProfilId,
    sacKalinlikMm,
    sacMalzemeId,
    menteseAdet,
    kilitAdet,
    kolAdet,
    menteseMalzemeId,
    kilitMalzemeId,
    kolMalzemeId,
  ]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Sayi label="Genişlik (mm)" value={genislikMm} onChange={setGenislikMm} />
        <Sayi label="Yükseklik (mm)" value={yukseklikMm} onChange={setYukseklikMm} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MaterialSelect label="Kasa Profili" materials={materials} value={kasaProfilId} onChange={setKasaProfilId} />
        <MaterialSelect label="Kanat Profili" materials={materials} value={kanatProfilId} onChange={setKanatProfilId} />
      </div>
      <details className="rounded-xl border border-neutral-200 p-3">
        <summary className="font-semibold cursor-pointer">Gelişmiş: Sac ve Aksesuar</summary>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Sayi label="Sac Kalınlığı (mm)" value={sacKalinlikMm} onChange={setSacKalinlikMm} />
          <MaterialSelect
            label="Kaplama Sac Malzemesi (opsiyonel, stok/maliyet için)"
            materials={sacMalzemeler}
            value={sacMalzemeId}
            onChange={setSacMalzemeId}
            allowEmpty
          />
          <Sayi label="Menteşe Adedi" value={menteseAdet} onChange={setMenteseAdet} />
          <MaterialSelect
            label="Menteşe Malzemesi (opsiyonel, stok/maliyet için)"
            materials={baglantiMalzemeler}
            value={menteseMalzemeId}
            onChange={setMenteseMalzemeId}
            allowEmpty
          />
          <Sayi label="Kilit Adedi" value={kilitAdet} onChange={setKilitAdet} />
          <MaterialSelect
            label="Kilit Malzemesi (opsiyonel, stok/maliyet için)"
            materials={baglantiMalzemeler}
            value={kilitMalzemeId}
            onChange={setKilitMalzemeId}
            allowEmpty
          />
          <Sayi label="Kol Adedi" value={kolAdet} onChange={setKolAdet} />
          <MaterialSelect
            label="Kol Malzemesi (opsiyonel, stok/maliyet için)"
            materials={baglantiMalzemeler}
            value={kolMalzemeId}
            onChange={setKolMalzemeId}
            allowEmpty
          />
        </div>
      </details>
    </div>
  );
}

interface DuvarBoslukTaslak {
  etiket: string;
  konumMm: number;
  tabanYuksekligiMm: number;
  genislikMm: number;
  yukseklikMm: number;
}

function DuvarAlanlari({
  materials,
  sacMalzemeler,
  baglantiMalzemeler,
  sarfMalzemeler,
  onChange,
  baslangic,
}: {
  materials: Material[];
  sacMalzemeler: Material[];
  baglantiMalzemeler: Material[];
  sarfMalzemeler: Material[];
  onChange: (p: Record<string, unknown>) => void;
  baslangic?: Record<string, unknown>;
}) {
  const [genislikMm, setGenislikMm] = useState<number>(() => (baslangic?.genislikMm as number) ?? 4000);
  const [yukseklikMm, setYukseklikMm] = useState<number>(() => (baslangic?.yukseklikMm as number) ?? 2500);
  const [dikmeAraligiHedefMm, setDikmeAraligiHedefMm] = useState<number>(() => (baslangic?.dikmeAraligiHedefMm as number) ?? 600);
  const [dikmeVar, setDikmeVar] = useState<boolean>(() => (baslangic?.dikmeVar as boolean) ?? true);
  const [ustProfilId, setUstProfilId] = useState<number | undefined>(() => baslangic?.ustProfilId as number | undefined);
  const [altProfilId, setAltProfilId] = useState<number | undefined>(() => baslangic?.altProfilId as number | undefined);
  const [dikmeProfilId, setDikmeProfilId] = useState<number | undefined>(() => baslangic?.dikmeProfilId as number | undefined);
  const [bosluklar, setBosluklar] = useState<DuvarBoslukTaslak[]>(
    () => (baslangic?.bosluklar as DuvarBoslukTaslak[] | undefined) ?? []
  );
  const [disKaplamaTuru, setDisKaplamaTuru] = useState<string>(() => (baslangic?.disKaplamaTuru as string) ?? "yok");
  const [disKaplamaMalzemeId, setDisKaplamaMalzemeId] = useState<number | undefined>(
    () => baslangic?.disKaplamaMalzemeId as number | undefined
  );
  const [icKaplamaTuru, setIcKaplamaTuru] = useState<string>(() => (baslangic?.icKaplamaTuru as string) ?? "yok");
  const [icKaplamaMalzemeId, setIcKaplamaMalzemeId] = useState<number | undefined>(
    () => baslangic?.icKaplamaMalzemeId as number | undefined
  );
  const [dubelMalzemeId, setDubelMalzemeId] = useState<number | undefined>(() => baslangic?.dubelMalzemeId as number | undefined);
  const [yalitimVar, setYalitimVar] = useState<boolean>(() => (baslangic?.yalitimVar as boolean) ?? false);
  const [yalitimKalinlikMm, setYalitimKalinlikMm] = useState<number>(() => (baslangic?.yalitimKalinlikMm as number) ?? 50);
  const [yalitimMalzemeId, setYalitimMalzemeId] = useState<number | undefined>(() => baslangic?.yalitimMalzemeId as number | undefined);

  useEffect(() => {
    onChange({
      genislikMm,
      yukseklikMm,
      dikmeAraligiHedefMm,
      dikmeVar,
      ustProfilId,
      altProfilId,
      dikmeProfilId,
      bosluklar,
      disKaplamaTuru: disKaplamaTuru === "yok" ? undefined : disKaplamaTuru,
      disKaplamaMalzemeId: disKaplamaTuru !== "yok" ? disKaplamaMalzemeId : undefined,
      icKaplamaTuru: icKaplamaTuru === "yok" ? undefined : icKaplamaTuru,
      icKaplamaMalzemeId: icKaplamaTuru !== "yok" ? icKaplamaMalzemeId : undefined,
      dubelMalzemeId,
      yalitimVar,
      yalitimKalinlikMm: yalitimVar ? yalitimKalinlikMm : undefined,
      yalitimMalzemeId: yalitimVar ? yalitimMalzemeId : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    genislikMm,
    yukseklikMm,
    dikmeAraligiHedefMm,
    dikmeVar,
    ustProfilId,
    altProfilId,
    dikmeProfilId,
    bosluklar,
    disKaplamaTuru,
    disKaplamaMalzemeId,
    icKaplamaTuru,
    icKaplamaMalzemeId,
    dubelMalzemeId,
    yalitimVar,
    yalitimKalinlikMm,
    yalitimMalzemeId,
  ]);

  const bosluklariGuncelle = (i: number, alan: keyof DuvarBoslukTaslak, deger: string | number) => {
    setBosluklar((liste) => liste.map((b, idx) => (idx === i ? { ...b, [alan]: deger } : b)));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Sayi label="Duvar Genişliği (mm)" value={genislikMm} onChange={setGenislikMm} />
        <Sayi label="Duvar Yüksekliği (mm)" value={yukseklikMm} onChange={setYukseklikMm} />
        <Sayi label="Dikme Aralığı (mm)" value={dikmeAraligiHedefMm} onChange={setDikmeAraligiHedefMm} disabled={!dikmeVar} />
      </div>
      <label className="flex items-center gap-2 text-xs font-semibold -mt-1">
        <input type="checkbox" checked={!dikmeVar} onChange={(e) => setDikmeVar(!e.target.checked)} />
        Dikme yok (bu duvarda dikme hesaplanmasın)
      </label>
      <div className="grid grid-cols-3 gap-3">
        <MaterialSelect label="Üst Ray" materials={materials} value={ustProfilId} onChange={setUstProfilId} />
        <MaterialSelect label="Alt Ray" materials={materials} value={altProfilId} onChange={setAltProfilId} />
        <MaterialSelect label="Dikme Profili" materials={materials} value={dikmeProfilId} onChange={setDikmeProfilId} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Dış Cephe Kaplaması (prefabrik ev vb.)</label>
          <select className="field-select" value={disKaplamaTuru} onChange={(e) => setDisKaplamaTuru(e.target.value)}>
            {DUVAR_DIS_KAPLAMA_SECENEKLERI.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">İç Cephe Kaplaması (opsiyonel)</label>
          <select className="field-select" value={icKaplamaTuru} onChange={(e) => setIcKaplamaTuru(e.target.value)}>
            {DUVAR_IC_KAPLAMA_SECENEKLERI.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        {disKaplamaTuru !== "yok" && (
          <MaterialSelect
            label="Dış Kaplama Sac Malzemesi (opsiyonel, stok/maliyet için)"
            materials={sacMalzemeler}
            value={disKaplamaMalzemeId}
            onChange={setDisKaplamaMalzemeId}
            allowEmpty
          />
        )}
        {icKaplamaTuru !== "yok" && (
          <MaterialSelect
            label="İç Kaplama Sac Malzemesi (opsiyonel, stok/maliyet için)"
            materials={sacMalzemeler}
            value={icKaplamaMalzemeId}
            onChange={setIcKaplamaMalzemeId}
            allowEmpty
          />
        )}
        <MaterialSelect
          label="Ray Dübeli Malzemesi (opsiyonel, stok/maliyet için)"
          materials={baglantiMalzemeler}
          value={dubelMalzemeId}
          onChange={setDubelMalzemeId}
          allowEmpty
        />
      </div>
      <p className="text-xs text-neutral-500 -mt-1">
        Dış ve iç kaplama birbirinden bağımsızdır, ikisi birden seçilebilir (örn. içeriden alçıpan + dışarıdan petopan). Her
        biri için panel/levha miktarı, m² sipariş alanı ve fire ayrı hesaplanır. Kapı/pencere boşlukları panelden sahada
        kesilir, ayrıca düşülmez.
      </p>

      <div className="rounded-xl border border-neutral-200 p-3 space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={yalitimVar} onChange={(e) => setYalitimVar(e.target.checked)} />
          İç/dış kaplama arasına yalıtım ekle (taş yünü, strafor vb.)
        </label>
        {yalitimVar && (
          <div className="grid grid-cols-2 gap-3">
            <Sayi label="Yalıtım Kalınlığı (mm)" value={yalitimKalinlikMm} onChange={setYalitimKalinlikMm} />
            <MaterialSelect
              label="Yalıtım Malzemesi (opsiyonel, stok/maliyet için)"
              materials={sarfMalzemeler}
              value={yalitimMalzemeId}
              onChange={setYalitimMalzemeId}
              allowEmpty
            />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-neutral-200 p-3 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="font-semibold text-sm">Kapı / Pencere Boşlukları (opsiyonel)</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() =>
                setBosluklar((l) => [
                  ...l,
                  { etiket: "Kapı", konumMm: 0, tabanYuksekligiMm: 0, genislikMm: 900, yukseklikMm: 2100 },
                ])
              }
            >
              ➕ Kapı Ekle
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() =>
                setBosluklar((l) => [
                  ...l,
                  { etiket: "Pencere", konumMm: 0, tabanYuksekligiMm: 900, genislikMm: 1200, yukseklikMm: 1200 },
                ])
              }
            >
              ➕ Pencere Ekle
            </button>
          </div>
        </div>
        <p className="text-xs text-neutral-500">
          Konum: duvarın sol kenarından. Taban yüksekliği: kapı için 0 (yerden başlar), pencere için yerden yüksekliği (örn. 900mm).
        </p>
        {bosluklar.map((b, i) => (
          <div key={i} className="grid grid-cols-6 gap-2 items-end border-t border-neutral-100 pt-3">
            <div>
              <label className="field-label">Ad</label>
              <input className="field-input" value={b.etiket} onChange={(e) => bosluklariGuncelle(i, "etiket", e.target.value)} />
            </div>
            <Sayi label="Konum (mm)" value={b.konumMm} onChange={(v) => bosluklariGuncelle(i, "konumMm", v)} />
            <Sayi
              label="Taban Yük. (mm)"
              value={b.tabanYuksekligiMm}
              onChange={(v) => bosluklariGuncelle(i, "tabanYuksekligiMm", v)}
            />
            <Sayi label="Genişlik (mm)" value={b.genislikMm} onChange={(v) => bosluklariGuncelle(i, "genislikMm", v)} />
            <Sayi label="Yükseklik (mm)" value={b.yukseklikMm} onChange={(v) => bosluklariGuncelle(i, "yukseklikMm", v)} />
            <button
              type="button"
              className="btn-danger btn-sm"
              onClick={() => setBosluklar((l) => l.filter((_, idx) => idx !== i))}
            >
              Sil
            </button>
          </div>
        ))}
        {bosluklar.length === 0 && <div className="text-sm text-neutral-500">Boşluk eklenmedi, duvar tam dolu hesaplanacak.</div>}
      </div>
    </div>
  );
}

function CatiKafesiAlanlari({
  materials,
  sacMalzemeler,
  baglantiMalzemeler,
  onChange,
  baslangic,
}: {
  materials: Material[];
  sacMalzemeler: Material[];
  baglantiMalzemeler: Material[];
  onChange: (p: Record<string, unknown>) => void;
  baslangic?: Record<string, unknown>;
}) {
  const [catiTipi, setCatiTipi] = useState<string>(() => (baslangic?.catiTipi as string) ?? "acik_besik");
  const [acikligMm, setAcikligMm] = useState<number>(() => (baslangic?.acikligMm as number) ?? 6000);
  const [egimYuzde, setEgimYuzde] = useState<number>(() => (baslangic?.egimYuzde as number) ?? 30);
  const [catiUzunluguMm, setCatiUzunluguMm] = useState<number>(() => (baslangic?.catiUzunluguMm as number) ?? 9000);
  const [dikmeYuksekligiMm, setDikmeYuksekligiMm] = useState<number>(() => (baslangic?.dikmeYuksekligiMm as number) ?? 900);
  const [dikmeDuvarProfilId, setDikmeDuvarProfilId] = useState<number | undefined>(
    () => baslangic?.dikmeDuvarProfilId as number | undefined
  );
  const [kirmaMahyaKirisiProfilId, setKirmaMahyaKirisiProfilId] = useState<number | undefined>(
    () => baslangic?.kirmaMahyaKirisiProfilId as number | undefined
  );
  const [kafesAraligiHedefMm, setKafesAraligiHedefMm] = useState<number>(
    () => (baslangic?.kafesAraligiHedefMm as number) ?? 900
  );
  const [ustBaslikProfilId, setUstBaslikProfilId] = useState<number | undefined>(
    () => baslangic?.ustBaslikProfilId as number | undefined
  );
  const [altBaslikProfilId, setAltBaslikProfilId] = useState<number | undefined>(
    () => baslangic?.altBaslikProfilId as number | undefined
  );
  const [kralKirisiProfilId, setKralKirisiProfilId] = useState<number | undefined>(
    () => baslangic?.kralKirisiProfilId as number | undefined
  );
  const [diyagonalProfilId, setDiyagonalProfilId] = useState<number | undefined>(
    () => baslangic?.diyagonalProfilId as number | undefined
  );
  const [diyagonalSayisi, setDiyagonalSayisi] = useState<number>(() => (baslangic?.diyagonalSayisi as number) ?? 0);
  const [asikProfilId, setAsikProfilId] = useState<number | undefined>(() => baslangic?.asikProfilId as number | undefined);
  const [asikAraligiHedefMm, setAsikAraligiHedefMm] = useState<number>(() => (baslangic?.asikAraligiHedefMm as number) ?? 1000);
  const [kaplamaTuru, setKaplamaTuru] = useState<string>(() => (baslangic?.kaplamaTuru as string) ?? "trapez_sac");
  const [kaplamaMalzemeId, setKaplamaMalzemeId] = useState<number | undefined>(
    () => baslangic?.kaplamaMalzemeId as number | undefined
  );
  const [stabiliteBaglantisiVar, setStabiliteBaglantisiVar] = useState(
    () => (baslangic?.stabiliteBaglantisiVar as boolean) ?? false
  );
  const [stabiliteProfilId, setStabiliteProfilId] = useState<number | undefined>(
    () => baslangic?.stabiliteProfilId as number | undefined
  );
  const [olukluMu, setOlukluMu] = useState<boolean>(() => (baslangic?.olukluMu as boolean) ?? false);
  const [olukMesafesiMm, setOlukMesafesiMm] = useState<number>(() => (baslangic?.olukMesafesiMm as number) ?? 150);
  const [cikmaPayiMm, setCikmaPayiMm] = useState<number>(() => (baslangic?.cikmaPayiMm as number) ?? 300);
  const [direkSayisi, setDirekSayisi] = useState<number>(() => (baslangic?.direkSayisi as number) ?? 0);
  const [direkProfilId, setDirekProfilId] = useState<number | undefined>(() => baslangic?.direkProfilId as number | undefined);
  const [plakaMalzemeId, setPlakaMalzemeId] = useState<number | undefined>(() => baslangic?.plakaMalzemeId as number | undefined);
  const [ankrajMalzemeId, setAnkrajMalzemeId] = useState<number | undefined>(() => baslangic?.ankrajMalzemeId as number | undefined);

  useEffect(() => {
    onChange({
      catiTipi,
      acikligMm,
      egimYuzde,
      catiUzunluguMm,
      kafesAraligiHedefMm,
      ustBaslikProfilId,
      altBaslikProfilId,
      kralKirisiProfilId,
      diyagonalProfilId,
      diyagonalSayisi,
      asikProfilId,
      asikAraligiHedefMm,
      kaplamaTuru,
      kaplamaMalzemeId: kaplamaTuru !== "yok" ? kaplamaMalzemeId : undefined,
      stabiliteBaglantisiVar,
      stabiliteProfilId: stabiliteBaglantisiVar ? stabiliteProfilId : undefined,
      olukluMu,
      olukMesafesiMm: olukluMu ? olukMesafesiMm : undefined,
      cikmaPayiMm: olukluMu ? undefined : cikmaPayiMm,
      direkSayisi,
      direkProfilId: direkSayisi > 0 ? direkProfilId : undefined,
      dikmeYuksekligiMm: catiTipi === "catikati" ? dikmeYuksekligiMm : undefined,
      dikmeDuvarProfilId: catiTipi === "catikati" ? dikmeDuvarProfilId : undefined,
      kirmaMahyaKirisiProfilId: catiTipi === "kirma" ? kirmaMahyaKirisiProfilId : undefined,
      plakaMalzemeId,
      ankrajMalzemeId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    catiTipi,
    acikligMm,
    egimYuzde,
    catiUzunluguMm,
    kafesAraligiHedefMm,
    ustBaslikProfilId,
    altBaslikProfilId,
    kralKirisiProfilId,
    diyagonalProfilId,
    diyagonalSayisi,
    asikProfilId,
    asikAraligiHedefMm,
    kaplamaTuru,
    kaplamaMalzemeId,
    stabiliteBaglantisiVar,
    stabiliteProfilId,
    olukluMu,
    olukMesafesiMm,
    cikmaPayiMm,
    direkSayisi,
    direkProfilId,
    dikmeYuksekligiMm,
    dikmeDuvarProfilId,
    kirmaMahyaKirisiProfilId,
    plakaMalzemeId,
    ankrajMalzemeId,
  ]);

  return (
    <div className="space-y-3">
      <div>
        <label className="field-label">Çatı Tipi</label>
        <select className="field-select" value={catiTipi} onChange={(e) => setCatiTipi(e.target.value)}>
          {CATI_TIPI_SECENEKLERI.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {catiTipi === "kirma" && (
        <p className="text-xs text-neutral-500">
          Kırma çatıda köşelerde kırma kirişleri için yer bırakılması gerekir; çatı uzunluğu açıklıktan büyük olmalıdır.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Sayi label="Açıklık (mm)" value={acikligMm} onChange={setAcikligMm} />
        {catiTipi !== "duz" && <Sayi label="Eğim (%)" value={egimYuzde} onChange={setEgimYuzde} />}
        <Sayi label="Çatı Uzunluğu (mm)" value={catiUzunluguMm} onChange={setCatiUzunluguMm} />
        <Sayi label="Kafesler Arası Aralık (mm)" value={kafesAraligiHedefMm} onChange={setKafesAraligiHedefMm} />
      </div>
      {catiTipi === "catikati" && (
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-neutral-200 p-3">
          <Sayi label="Diz Duvarı (Kneewall) Yüksekliği (mm)" value={dikmeYuksekligiMm} onChange={setDikmeYuksekligiMm} />
          <MaterialSelect
            label="Diz Duvarı Dikmesi Profili"
            materials={materials}
            value={dikmeDuvarProfilId}
            onChange={setDikmeDuvarProfilId}
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <MaterialSelect label="Üst Başlık Profili" materials={materials} value={ustBaslikProfilId} onChange={setUstBaslikProfilId} />
        <MaterialSelect label="Alt Başlık Profili" materials={materials} value={altBaslikProfilId} onChange={setAltBaslikProfilId} />
      </div>
      {catiTipi === "kirma" && (
        <MaterialSelect
          label="Kırma (Pah) Kirişi Profili (opsiyonel, boşsa üst başlık profili kullanılır)"
          materials={materials}
          value={kirmaMahyaKirisiProfilId}
          onChange={setKirmaMahyaKirisiProfilId}
          allowEmpty
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <MaterialSelect label="Aşık Profili (opsiyonel)" materials={materials} value={asikProfilId} onChange={setAsikProfilId} allowEmpty />
        <Sayi label="Aşık Aralığı (mm)" value={asikAraligiHedefMm} onChange={setAsikAraligiHedefMm} />
      </div>
      <div>
        <label className="field-label">Çatı Kaplaması</label>
        <select className="field-select" value={kaplamaTuru} onChange={(e) => setKaplamaTuru(e.target.value)}>
          {CATI_KAPLAMA_SECENEKLERI.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {kaplamaTuru !== "yok" && (
        <MaterialSelect
          label="Kaplama Sac Malzemesi (opsiyonel, stok/maliyet için)"
          materials={sacMalzemeler}
          value={kaplamaMalzemeId}
          onChange={setKaplamaMalzemeId}
          allowEmpty
        />
      )}
      <MaterialSelect
        label="Mesnet Plakası Sac Malzemesi (opsiyonel, stok/maliyet için)"
        materials={sacMalzemeler}
        value={plakaMalzemeId}
        onChange={setPlakaMalzemeId}
        allowEmpty
      />
      <MaterialSelect
        label="Ankraj Malzemesi (opsiyonel, stok/maliyet için)"
        materials={baglantiMalzemeler}
        value={ankrajMalzemeId}
        onChange={setAnkrajMalzemeId}
        allowEmpty
      />
      <details className="rounded-xl border border-neutral-200 p-3">
        <summary className="font-semibold cursor-pointer">Gelişmiş: Kral Kirişi, Çapraz Destek ve Stabilite</summary>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <MaterialSelect
            label="Kral Kirişi Profili"
            materials={materials}
            value={kralKirisiProfilId}
            onChange={setKralKirisiProfilId}
            allowEmpty
          />
          <MaterialSelect
            label="Çapraz Destek Profili"
            materials={materials}
            value={diyagonalProfilId}
            onChange={setDiyagonalProfilId}
            allowEmpty
          />
          <Sayi label="Kafes Başına Çapraz Sayısı" value={diyagonalSayisi} onChange={setDiyagonalSayisi} />
        </div>
        <div className="mt-3 pt-3 border-t border-neutral-100 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={stabiliteBaglantisiVar}
              onChange={(e) => setStabiliteBaglantisiVar(e.target.checked)}
            />
            İlk açıklığa stabilite bağlantısı (rüzgar/deprem çaprazı) ekle
          </label>
          {stabiliteBaglantisiVar && (
            <MaterialSelect
              label="Stabilite Bağlantısı Profili (genelde L profil)"
              materials={materials}
              value={stabiliteProfilId}
              onChange={setStabiliteProfilId}
            />
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-neutral-100 space-y-3">
          <div>
            <label className="field-label">Saçak Ucu</label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={!olukluMu} onChange={() => setOlukluMu(false)} />
                Oluksuz (çıkma payı ile uzat)
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={olukluMu} onChange={() => setOlukluMu(true)} />
                Oluklu (oluk mesafesi kadar kısalt)
              </label>
            </div>
          </div>
          {olukluMu ? (
            <Sayi label="Oluk Mesafesi (mm)" value={olukMesafesiMm} onChange={setOlukMesafesiMm} />
          ) : (
            <Sayi label="Çıkma Payı (mm)" value={cikmaPayiMm} onChange={setCikmaPayiMm} />
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-neutral-100 space-y-3">
          <Sayi label="Direk Sayısı (makas yarısı başına, opsiyonel)" value={direkSayisi} onChange={setDirekSayisi} />
          {direkSayisi > 0 && (
            <MaterialSelect
              label="Direk Profili"
              materials={materials}
              value={direkProfilId}
              onChange={setDirekProfilId}
            />
          )}
        </div>
      </details>
    </div>
  );
}

function RafAlanlari({
  materials,
  sacMalzemeler,
  onChange,
  baslangic,
}: {
  materials: Material[];
  sacMalzemeler: Material[];
  onChange: (p: Record<string, unknown>) => void;
  baslangic?: Record<string, unknown>;
}) {
  const [genislikMm, setGenislikMm] = useState<number>(() => (baslangic?.genislikMm as number) ?? 1000);
  const [derinlikMm, setDerinlikMm] = useState<number>(() => (baslangic?.derinlikMm as number) ?? 400);
  const [yukseklikMm, setYukseklikMm] = useState<number>(() => (baslangic?.yukseklikMm as number) ?? 1800);
  const [rafSayisi, setRafSayisi] = useState<number>(() => (baslangic?.rafSayisi as number) ?? 4);
  const [ayakProfilId, setAyakProfilId] = useState<number | undefined>(() => baslangic?.ayakProfilId as number | undefined);
  const [rafCercevesiProfilId, setRafCercevesiProfilId] = useState<number | undefined>(
    () => baslangic?.rafCercevesiProfilId as number | undefined
  );
  const [rafSacKullan, setRafSacKullan] = useState<boolean>(() => (baslangic?.rafSacKullan as boolean) ?? true);
  const [sacKalinlikMm, setSacKalinlikMm] = useState<number>(() => (baslangic?.sacKalinlikMm as number) ?? 1.5);
  const [rafSacMalzemeId, setRafSacMalzemeId] = useState<number | undefined>(
    () => baslangic?.rafSacMalzemeId as number | undefined
  );
  const [caprazProfilId, setCaprazProfilId] = useState<number | undefined>(
    () => baslangic?.caprazProfilId as number | undefined
  );
  const [tasarimYukuKgM2, setTasarimYukuKgM2] = useState<number>(() => (baslangic?.tasarimYukuKgM2 as number) ?? 100);

  useEffect(() => {
    onChange({
      genislikMm,
      derinlikMm,
      yukseklikMm,
      rafSayisi,
      ayakProfilId,
      rafCercevesiProfilId,
      rafSacKullan,
      sacKalinlikMm: rafSacKullan ? sacKalinlikMm : undefined,
      rafSacMalzemeId: rafSacKullan ? rafSacMalzemeId : undefined,
      caprazProfilId,
      tasarimYukuKgM2,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    genislikMm,
    derinlikMm,
    yukseklikMm,
    rafSayisi,
    ayakProfilId,
    rafCercevesiProfilId,
    rafSacKullan,
    sacKalinlikMm,
    rafSacMalzemeId,
    caprazProfilId,
    tasarimYukuKgM2,
  ]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Sayi label="Genişlik (mm)" value={genislikMm} onChange={setGenislikMm} />
        <Sayi label="Derinlik (mm)" value={derinlikMm} onChange={setDerinlikMm} />
        <Sayi label="Yükseklik (mm)" value={yukseklikMm} onChange={setYukseklikMm} />
        <Sayi label="Raf Sayısı" value={rafSayisi} onChange={setRafSayisi} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MaterialSelect label="Ayak Profili" materials={materials} value={ayakProfilId} onChange={setAyakProfilId} />
        <MaterialSelect
          label="Raf Çerçevesi Profili"
          materials={materials}
          value={rafCercevesiProfilId}
          onChange={setRafCercevesiProfilId}
        />
      </div>
      <div className="mt-1 space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={rafSacKullan} onChange={(e) => setRafSacKullan(e.target.checked)} />
          Raf yüzeyine sac plaka ekle
        </label>
        {rafSacKullan && (
          <div className="grid grid-cols-2 gap-3">
            <Sayi label="Sac Kalınlığı (mm)" value={sacKalinlikMm} onChange={setSacKalinlikMm} />
            <MaterialSelect
              label="Raf Plakası Sac Malzemesi (opsiyonel, stok/maliyet için)"
              materials={sacMalzemeler}
              value={rafSacMalzemeId}
              onChange={setRafSacMalzemeId}
              allowEmpty
            />
          </div>
        )}
      </div>
      <details className="rounded-xl border border-neutral-200 p-3">
        <summary className="font-semibold cursor-pointer">Gelişmiş: Stabilite Çaprazı ve Yapısal Kontrol</summary>
        <div className="mt-3 space-y-3">
          <MaterialSelect
            label="Çapraz Profili (opsiyonel, arka yüz X-destek)"
            materials={materials}
            value={caprazProfilId}
            onChange={setCaprazProfilId}
            allowEmpty
          />
          <Sayi label="Tasarım Yükü (kg/m², bir raf seviyesi için)" value={tasarimYukuKgM2} onChange={setTasarimYukuKgM2} />
          <p className="text-xs text-neutral-500">
            Yapısal kontrolde raf çerçevesinin bu yükü taşıyıp taşımadığı kontrol edilir; belirtilmezse 100 kg/m² varsayılır.
          </p>
        </div>
      </details>
    </div>
  );
}

function PergolaAlanlari({
  materials,
  sacMalzemeler,
  baglantiMalzemeler,
  onChange,
  baslangic,
}: {
  materials: Material[];
  sacMalzemeler: Material[];
  baglantiMalzemeler: Material[];
  onChange: (p: Record<string, unknown>) => void;
  baslangic?: Record<string, unknown>;
}) {
  const [genislikMm, setGenislikMm] = useState<number>(() => (baslangic?.genislikMm as number) ?? 4000);
  const [boyMm, setBoyMm] = useState<number>(() => (baslangic?.boyMm as number) ?? 3000);
  const [yukseklikMm, setYukseklikMm] = useState<number>(() => (baslangic?.yukseklikMm as number) ?? 2400);
  const [kolonSayisi, setKolonSayisi] = useState<number>(() => (baslangic?.kolonSayisi as number) ?? 4);
  const [kolonProfilId, setKolonProfilId] = useState<number | undefined>(() => baslangic?.kolonProfilId as number | undefined);
  const [kirisProfilId, setKirisProfilId] = useState<number | undefined>(() => baslangic?.kirisProfilId as number | undefined);
  const [lataProfilId, setLataProfilId] = useState<number | undefined>(() => baslangic?.lataProfilId as number | undefined);
  const [lataYonu, setLataYonu] = useState<string>(() => (baslangic?.lataYonu as string) ?? "genislik");
  const [lataAraligiHedefMm, setLataAraligiHedefMm] = useState<number>(() => (baslangic?.lataAraligiHedefMm as number) ?? 200);
  const [plakaMalzemeId, setPlakaMalzemeId] = useState<number | undefined>(() => baslangic?.plakaMalzemeId as number | undefined);
  const [ankrajMalzemeId, setAnkrajMalzemeId] = useState<number | undefined>(() => baslangic?.ankrajMalzemeId as number | undefined);

  useEffect(() => {
    onChange({
      genislikMm,
      boyMm,
      yukseklikMm,
      kolonSayisi,
      kolonProfilId,
      kirisProfilId,
      lataProfilId,
      lataYonu,
      lataAraligiHedefMm,
      plakaMalzemeId,
      ankrajMalzemeId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    genislikMm,
    boyMm,
    yukseklikMm,
    kolonSayisi,
    kolonProfilId,
    kirisProfilId,
    lataProfilId,
    lataYonu,
    lataAraligiHedefMm,
    plakaMalzemeId,
    ankrajMalzemeId,
  ]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Sayi label="En (mm)" value={genislikMm} onChange={setGenislikMm} />
        <Sayi label="Boy (mm)" value={boyMm} onChange={setBoyMm} />
        <Sayi label="Kolon Yüksekliği (mm)" value={yukseklikMm} onChange={setYukseklikMm} />
        <Sayi label="Toplam Kolon Sayısı (çift)" value={kolonSayisi} onChange={setKolonSayisi} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <MaterialSelect label="Kolon Profili" materials={materials} value={kolonProfilId} onChange={setKolonProfilId} />
        <MaterialSelect label="Kiriş Profili" materials={materials} value={kirisProfilId} onChange={setKirisProfilId} />
        <MaterialSelect label="Lata Profili" materials={materials} value={lataProfilId} onChange={setLataProfilId} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="field-label">Lata Yönü</label>
          <select className="field-select" value={lataYonu} onChange={(e) => setLataYonu(e.target.value)}>
            <option value="genislik">En yönünde (boy ekseninde dizilir)</option>
            <option value="boy">Boy yönünde (en ekseninde dizilir)</option>
          </select>
        </div>
        <Sayi label="Lata Aralığı (mm)" value={lataAraligiHedefMm} onChange={setLataAraligiHedefMm} />
      </div>
      <p className="text-xs text-neutral-500 -mt-1">
        4 kolonlu basit pergolada kolon sayısı 4; geniş açıklıklarda 6/8 gibi çift sayı seçilirse ara kolonlar eşit
        dağıtılır.
      </p>
      <MaterialSelect
        label="Taban Plakası Sac Malzemesi (opsiyonel, stok/maliyet için)"
        materials={sacMalzemeler}
        value={plakaMalzemeId}
        onChange={setPlakaMalzemeId}
        allowEmpty
      />
      <MaterialSelect
        label="Ankraj Malzemesi (opsiyonel, stok/maliyet için)"
        materials={baglantiMalzemeler}
        value={ankrajMalzemeId}
        onChange={setAnkrajMalzemeId}
        allowEmpty
      />
    </div>
  );
}

function FerforjePanelAlanlari({
  materials,
  onChange,
  baslangic,
}: {
  materials: Material[];
  onChange: (p: Record<string, unknown>) => void;
  baslangic?: Record<string, unknown>;
}) {
  const [genislikMm, setGenislikMm] = useState<number>(() => (baslangic?.genislikMm as number) ?? 1200);
  const [yukseklikMm, setYukseklikMm] = useState<number>(() => (baslangic?.yukseklikMm as number) ?? 1500);
  const [cerceveProfilId, setCerceveProfilId] = useState<number | undefined>(
    () => baslangic?.cerceveProfilId as number | undefined
  );
  const [dikeyCubukProfilId, setDikeyCubukProfilId] = useState<number | undefined>(
    () => baslangic?.dikeyCubukProfilId as number | undefined
  );
  const [dikeyCubukAraligiHedefMm, setDikeyCubukAraligiHedefMm] = useState<number>(
    () => (baslangic?.dikeyCubukAraligiHedefMm as number) ?? 120
  );
  const [yatayAraKayitSayisi, setYatayAraKayitSayisi] = useState<number>(() => (baslangic?.yatayAraKayitSayisi as number) ?? 0);
  const [yatayAraKayitProfilId, setYatayAraKayitProfilId] = useState<number | undefined>(
    () => baslangic?.yatayAraKayitProfilId as number | undefined
  );
  const [susVar, setSusVar] = useState<boolean>(() => (baslangic?.susVar as boolean) ?? false);
  const [susProfilId, setSusProfilId] = useState<number | undefined>(() => baslangic?.susProfilId as number | undefined);
  const [susSayisi, setSusSayisi] = useState<number>(() => (baslangic?.susSayisi as number) ?? 4);
  const [susBirimUzunlukMm, setSusBirimUzunlukMm] = useState<number>(() => (baslangic?.susBirimUzunlukMm as number) ?? 300);

  useEffect(() => {
    onChange({
      genislikMm,
      yukseklikMm,
      cerceveProfilId,
      dikeyCubukProfilId,
      dikeyCubukAraligiHedefMm,
      yatayAraKayitSayisi: yatayAraKayitSayisi || undefined,
      yatayAraKayitProfilId: yatayAraKayitSayisi > 0 ? yatayAraKayitProfilId : undefined,
      susVar,
      susProfilId: susVar ? susProfilId : undefined,
      susSayisi: susVar ? susSayisi : undefined,
      susBirimUzunlukMm: susVar ? susBirimUzunlukMm : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    genislikMm,
    yukseklikMm,
    cerceveProfilId,
    dikeyCubukProfilId,
    dikeyCubukAraligiHedefMm,
    yatayAraKayitSayisi,
    yatayAraKayitProfilId,
    susVar,
    susProfilId,
    susSayisi,
    susBirimUzunlukMm,
  ]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Sayi label="Genişlik (mm)" value={genislikMm} onChange={setGenislikMm} />
        <Sayi label="Yükseklik (mm)" value={yukseklikMm} onChange={setYukseklikMm} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MaterialSelect label="Çerçeve Profili" materials={materials} value={cerceveProfilId} onChange={setCerceveProfilId} />
        <MaterialSelect
          label="Dikey Çubuk Profili"
          materials={materials}
          value={dikeyCubukProfilId}
          onChange={setDikeyCubukProfilId}
        />
      </div>
      <Sayi label="Dikey Çubuk Aralığı (mm)" value={dikeyCubukAraligiHedefMm} onChange={setDikeyCubukAraligiHedefMm} />
      <p className="text-xs text-neutral-500 -mt-1">
        Çocuk güvenliği için pencere korkuluğunda aralığın 120 mm'yi aşmaması önerilir.
      </p>
      <details className="rounded-xl border border-neutral-200 p-3">
        <summary className="font-semibold cursor-pointer">Gelişmiş: Yatay Ara Kayıt ve Süsleme</summary>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Sayi label="Yatay Ara Kayıt Sayısı" value={yatayAraKayitSayisi} onChange={setYatayAraKayitSayisi} />
            {yatayAraKayitSayisi > 0 && (
              <MaterialSelect
                label="Yatay Ara Kayıt Profili"
                materials={materials}
                value={yatayAraKayitProfilId}
                onChange={setYatayAraKayitProfilId}
              />
            )}
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={susVar} onChange={(e) => setSusVar(e.target.checked)} />
            Dekoratif süsleme (kıvrım/motif) ekle
          </label>
          {susVar && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <MaterialSelect label="Süsleme Profili (genelde yuvarlak)" materials={materials} value={susProfilId} onChange={setSusProfilId} />
                <Sayi label="Süsleme Sayısı" value={susSayisi} onChange={setSusSayisi} />
                <Sayi label="Motif Başına Uzunluk (mm)" value={susBirimUzunlukMm} onChange={setSusBirimUzunlukMm} />
              </div>
              <p className="text-xs text-neutral-500">
                Bu kaba bir malzeme tahminidir; gerçek motif şekli/deseni sahada elle işlenir.
              </p>
            </>
          )}
        </div>
      </details>
    </div>
  );
}

function KolonKirisAlanlari({
  materials,
  sacMalzemeler,
  baglantiMalzemeler,
  onChange,
  baslangic,
}: {
  materials: Material[];
  sacMalzemeler: Material[];
  baglantiMalzemeler: Material[];
  onChange: (p: Record<string, unknown>) => void;
  baslangic?: Record<string, unknown>;
}) {
  const [acikligMm, setAcikligMm] = useState<number>(() => (baslangic?.acikligMm as number) ?? 6000);
  const [uzunlukMm, setUzunlukMm] = useState<number>(() => (baslangic?.uzunlukMm as number) ?? 9000);
  const [yukseklikMm, setYukseklikMm] = useState<number>(() => (baslangic?.yukseklikMm as number) ?? 3000);
  const [acikSayisi, setAcikSayisi] = useState<number>(() => (baslangic?.acikSayisi as number) ?? 1);
  const [kolonProfilId, setKolonProfilId] = useState<number | undefined>(() => baslangic?.kolonProfilId as number | undefined);
  const [kirisProfilId, setKirisProfilId] = useState<number | undefined>(() => baslangic?.kirisProfilId as number | undefined);
  const [cerceveAraligiHedefMm, setCerceveAraligiHedefMm] = useState<number>(
    () => (baslangic?.cerceveAraligiHedefMm as number) ?? 3000
  );
  const [baglantiKirisiProfilId, setBaglantiKirisiProfilId] = useState<number | undefined>(
    () => baslangic?.baglantiKirisiProfilId as number | undefined
  );
  const [stabiliteBaglantisiVar, setStabiliteBaglantisiVar] = useState<boolean>(
    () => (baslangic?.stabiliteBaglantisiVar as boolean) ?? false
  );
  const [stabiliteProfilId, setStabiliteProfilId] = useState<number | undefined>(
    () => baslangic?.stabiliteProfilId as number | undefined
  );
  const [plakaMalzemeId, setPlakaMalzemeId] = useState<number | undefined>(() => baslangic?.plakaMalzemeId as number | undefined);
  const [ankrajMalzemeId, setAnkrajMalzemeId] = useState<number | undefined>(() => baslangic?.ankrajMalzemeId as number | undefined);

  useEffect(() => {
    onChange({
      acikligMm,
      uzunlukMm,
      yukseklikMm,
      acikSayisi,
      kolonProfilId,
      kirisProfilId,
      cerceveAraligiHedefMm,
      baglantiKirisiProfilId,
      stabiliteBaglantisiVar,
      stabiliteProfilId: stabiliteBaglantisiVar ? stabiliteProfilId : undefined,
      plakaMalzemeId,
      ankrajMalzemeId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    acikligMm,
    uzunlukMm,
    yukseklikMm,
    acikSayisi,
    kolonProfilId,
    kirisProfilId,
    cerceveAraligiHedefMm,
    baglantiKirisiProfilId,
    stabiliteBaglantisiVar,
    stabiliteProfilId,
    plakaMalzemeId,
    ankrajMalzemeId,
  ]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Sayi label="Açıklık (mm)" value={acikligMm} onChange={setAcikligMm} />
        <Sayi label="Uzunluk / Derinlik (mm)" value={uzunlukMm} onChange={setUzunlukMm} />
        <Sayi label="Kolon Yüksekliği (mm)" value={yukseklikMm} onChange={setYukseklikMm} />
        <Sayi label="Açıklık (Bay) Sayısı" value={acikSayisi} onChange={setAcikSayisi} />
      </div>
      <p className="text-xs text-neutral-500 -mt-1">
        Çerçeve sayısı, uzunluk / çerçeve aralığından otomatik hesaplanır. Bu bir çıplak iskelettir; üzerine ayrıca duvar
        paneli ve/veya çatı kafesi eklenmesi gerekir.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <MaterialSelect label="Kolon Profili" materials={materials} value={kolonProfilId} onChange={setKolonProfilId} />
        <MaterialSelect label="Kiriş Profili" materials={materials} value={kirisProfilId} onChange={setKirisProfilId} />
      </div>
      <Sayi label="Çerçeve Aralığı (mm)" value={cerceveAraligiHedefMm} onChange={setCerceveAraligiHedefMm} />
      <MaterialSelect
        label="Taban Plakası Sac Malzemesi (opsiyonel, stok/maliyet için)"
        materials={sacMalzemeler}
        value={plakaMalzemeId}
        onChange={setPlakaMalzemeId}
        allowEmpty
      />
      <MaterialSelect
        label="Ankraj Malzemesi (opsiyonel, stok/maliyet için)"
        materials={baglantiMalzemeler}
        value={ankrajMalzemeId}
        onChange={setAnkrajMalzemeId}
        allowEmpty
      />
      <details className="rounded-xl border border-neutral-200 p-3">
        <summary className="font-semibold cursor-pointer">Gelişmiş: Bağlantı Kirişi ve Stabilite</summary>
        <div className="mt-3 space-y-3">
          <MaterialSelect
            label="Bağlantı Kirişi Profili (boy yönü, opsiyonel)"
            materials={materials}
            value={baglantiKirisiProfilId}
            onChange={setBaglantiKirisiProfilId}
            allowEmpty
          />
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={stabiliteBaglantisiVar}
              onChange={(e) => setStabiliteBaglantisiVar(e.target.checked)}
            />
            İlk açıklığa stabilite çaprazı (rüzgar/deprem) ekle
          </label>
          {stabiliteBaglantisiVar && (
            <MaterialSelect
              label="Stabilite Çaprazı Profili (genelde L profil)"
              materials={materials}
              value={stabiliteProfilId}
              onChange={setStabiliteProfilId}
            />
          )}
        </div>
      </details>
    </div>
  );
}

type KonteynerYon = "on" | "arka" | "sol" | "sag";

const KONTEYNER_YON_ETIKET: Record<KonteynerYon, string> = {
  on: "Ön Duvar",
  arka: "Arka Duvar",
  sol: "Sol Duvar",
  sag: "Sağ Duvar",
};
const KONTEYNER_YON_SIRASI: KonteynerYon[] = ["on", "arka", "sol", "sag"];

/** Hazır taban ölçüsü seçenekleri (mm) - hızlı seçim için. Üçü de 40x40x2 profille otomatik doldurulur
 * (bkz. MaterialSelect - zorunlu profil alanları zaten bu ölçüyü varsayılan seçer). */
const KONTEYNER_BOYUT_PRESETLERI: { etiket: string; genislikMm: number; uzunlukMm: number; katYuksekligiMm: number }[] = [
  { etiket: "15 m² (3×5 m)", genislikMm: 3000, uzunlukMm: 5000, katYuksekligiMm: 2591 },
  { etiket: "21 m² (3×7 m)", genislikMm: 3000, uzunlukMm: 7000, katYuksekligiMm: 2591 },
  { etiket: "32 m² (4×8 m)", genislikMm: 4000, uzunlukMm: 8000, katYuksekligiMm: 2591 },
];

interface KonteynerDuvarDegerleri {
  dikmeAraligiHedefMm: number;
  /** Belirtilmezse (undefined) true kabul edilir - dikme hesaplanır. false ise bu duvarda hiç
   * dikme oluşturulmaz (kullanıcı "Dikme yok" seçtiğinde). */
  dikmeVar?: boolean;
  ustProfilId?: number;
  altProfilId?: number;
  dikmeProfilId?: number;
  lentoProfilId?: number;
  bosluklar: DuvarBoslukTaslak[];
  disKaplamaTuru: string;
  disKaplamaMalzemeId?: number;
  icKaplamaTuru: string;
  icKaplamaMalzemeId?: number;
  dubelMalzemeId?: number;
  yalitimVar?: boolean;
  yalitimKalinlikMm?: number;
  yalitimMalzemeId?: number;
  dikmePozisyonlariMm?: number[];
  yatayAraProfilleri?: DuvarYatayAraProfilVeri[];
}

function konteynerDuvarVarsayilan(): KonteynerDuvarDegerleri {
  return { dikmeAraligiHedefMm: 600, bosluklar: [], disKaplamaTuru: "yok", icKaplamaTuru: "yok" };
}

/** Konteyner içini odalara ayıran bir iç bölme duvarının ayarları - dış duvarların tüm alanlarına
 * ek olarak kendi uzunluğunu (genislikMm) taşır; konteynerin dış ölçüsüne bağlı değildir. */
interface KonteynerIcDuvarDegerleri extends KonteynerDuvarDegerleri {
  genislikMm: number;
}

function konteynerIcDuvarVarsayilan(): KonteynerIcDuvarDegerleri {
  return { ...konteynerDuvarVarsayilan(), genislikMm: 2000 };
}

function konteynerDuvarSetiVarsayilan(): Record<KonteynerYon, KonteynerDuvarDegerleri> {
  return {
    on: konteynerDuvarVarsayilan(),
    arka: konteynerDuvarVarsayilan(),
    sol: konteynerDuvarVarsayilan(),
    sag: konteynerDuvarVarsayilan(),
  };
}

interface KonteynerCatiDegerleri {
  catiTipi?: string;
  egimYuzde: number;
  kafesAraligiHedefMm: number;
  ustBaslikProfilId?: number;
  altBaslikProfilId?: number;
  kralKirisiProfilId?: number;
  diyagonalProfilId?: number;
  diyagonalSayisi?: number;
  asikProfilId?: number;
  asikAraligiHedefMm?: number;
  kaplamaTuru: string;
  kaplamaMalzemeId?: number;
  stabiliteBaglantisiVar?: boolean;
  stabiliteProfilId?: number;
  olukluMu?: boolean;
  olukMesafesiMm?: number;
  cikmaPayiMm?: number;
  direkSayisi?: number;
  direkProfilId?: number;
  dikmeYuksekligiMm?: number;
  dikmeDuvarProfilId?: number;
  kirmaMahyaKirisiProfilId?: number;
  plakaMalzemeId?: number;
  ankrajMalzemeId?: number;
  kafesSayisiOverride?: number;
}

function konteynerCatiVarsayilan(): KonteynerCatiDegerleri {
  return { catiTipi: "acik_besik", egimYuzde: 20, kafesAraligiHedefMm: 900, kaplamaTuru: "trapez_sac" };
}

/** Konteynerin bir duvarının ayarları - Çelik Duvar Paneli'ndeki (DuvarAlanlari) genişlik/yükseklik
 * dışındaki tüm alanlar (bunlar konteynerin genel ölçülerinden otomatik atanır, 4 duvarın bir kutu
 * oluşturması için). Tam kontrollü bileşendir (kendi state'i yok) - şematik üzerinden yapılan
 * dikme/yatay-ara-profil düzenlemeleri de aynı `deger` nesnesi üzerinden akar. */
/** KonteynerDuvarFormu ve KonteynerIcDuvarFormu arasında paylaşılan gövde - dikme/profil/kaplama/
 * yalıtım/boşluk alanlarının tamamı. Genişlik/uzunluk alanı çağıran bileşene bırakılmıştır (dış
 * duvarlarda otomatik, iç bölme duvarlarında elle girilir). */
function KonteynerDuvarGovdesi<T extends KonteynerDuvarDegerleri>({
  materials,
  sacMalzemeler,
  sarfMalzemeler,
  deger,
  onDegis,
}: {
  materials: Material[];
  sacMalzemeler: Material[];
  sarfMalzemeler: Material[];
  deger: T;
  /** Sadece değişen alan(lar)ı içeren bir "patch" alır (tam nesne değil) - birden fazla
   * MaterialSelect aynı anda (örn. bileşen mount olurken otomatik varsayılan profil ataması,
   * bkz. MaterialSelect.tsx) kendi alanını ayarlamaya çalıştığında, her biri son render'daki
   * (stale olabilecek) `deger`'i spread edip tam nesne göndermek yerine sadece kendi alanını
   * bildirir; birleştirme en üstteki state güncelleyicide (örn. duvarGuncelle) en güncel state
   * üzerinden yapılır - böylece eşzamanlı ayarlamalar birbirini ezmez. */
  onDegis: (patch: Partial<T>) => void;
}) {
  const bosluklariGuncelle = (i: number, alan: keyof DuvarBoslukTaslak, v: string | number) => {
    onDegis({ bosluklar: deger.bosluklar.map((b, idx) => (idx === i ? { ...b, [alan]: v } : b)) } as Partial<T>);
  };

  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
          <Sayi
            label="Dikme Aralığı (mm)"
            value={deger.dikmeAraligiHedefMm}
            onChange={(v) => onDegis({ dikmeAraligiHedefMm: v } as Partial<T>)}
            disabled={deger.dikmeVar === false}
          />
          <MaterialSelect label="Dikme Profili" materials={materials} value={deger.dikmeProfilId} onChange={(v) => onDegis({ dikmeProfilId: v } as Partial<T>)} />
          <MaterialSelect label="Üst Ray" materials={materials} value={deger.ustProfilId} onChange={(v) => onDegis({ ustProfilId: v } as Partial<T>)} />
          <MaterialSelect label="Alt Ray" materials={materials} value={deger.altProfilId} onChange={(v) => onDegis({ altProfilId: v } as Partial<T>)} />
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold">
          <input
            type="checkbox"
            checked={deger.dikmeVar === false}
            onChange={(e) => onDegis({ dikmeVar: !e.target.checked } as Partial<T>)}
          />
          Dikme yok (bu duvarda dikme hesaplanmasın)
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Dış Cephe Kaplaması</label>
            <select className="field-select" value={deger.disKaplamaTuru} onChange={(e) => onDegis({ disKaplamaTuru: e.target.value } as Partial<T>)}>
              {DUVAR_DIS_KAPLAMA_SECENEKLERI.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">İç Cephe Kaplaması</label>
            <select className="field-select" value={deger.icKaplamaTuru} onChange={(e) => onDegis({ icKaplamaTuru: e.target.value } as Partial<T>)}>
              {DUVAR_IC_KAPLAMA_SECENEKLERI.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          {deger.disKaplamaTuru !== "yok" && (
            <MaterialSelect
              label="Dış Kaplama Sac Malzemesi (opsiyonel)"
              materials={sacMalzemeler}
              value={deger.disKaplamaMalzemeId}
              onChange={(v) => onDegis({ disKaplamaMalzemeId: v } as Partial<T>)}
              allowEmpty
            />
          )}
          {deger.icKaplamaTuru !== "yok" && (
            <MaterialSelect
              label="İç Kaplama Sac Malzemesi (opsiyonel)"
              materials={sacMalzemeler}
              value={deger.icKaplamaMalzemeId}
              onChange={(v) => onDegis({ icKaplamaMalzemeId: v } as Partial<T>)}
              allowEmpty
            />
          )}
        </div>
        <div className="rounded-xl border border-neutral-100 p-3 space-y-2">
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={deger.yalitimVar ?? false}
              onChange={(e) => onDegis({ yalitimVar: e.target.checked } as Partial<T>)}
            />
            İç/dış kaplama arasına yalıtım ekle
          </label>
          {deger.yalitimVar && (
            <div className="grid grid-cols-2 gap-3">
              <Sayi
                label="Yalıtım Kalınlığı (mm)"
                value={deger.yalitimKalinlikMm ?? 50}
                onChange={(v) => onDegis({ yalitimKalinlikMm: v } as Partial<T>)}
              />
              <MaterialSelect
                label="Yalıtım Malzemesi (opsiyonel)"
                materials={sarfMalzemeler}
                value={deger.yalitimMalzemeId}
                onChange={(v) => onDegis({ yalitimMalzemeId: v } as Partial<T>)}
                allowEmpty
              />
            </div>
          )}
        </div>
        <div className="rounded-xl border border-neutral-100 p-3 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-semibold">Kapı / Pencere Boşlukları</span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() =>
                  onDegis({ bosluklar: [...deger.bosluklar, { etiket: "Kapı", konumMm: 0, tabanYuksekligiMm: 0, genislikMm: 900, yukseklikMm: 2100 }] } as Partial<T>)
                }
              >
                ➕ Kapı
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() =>
                  onDegis({ bosluklar: [...deger.bosluklar, { etiket: "Pencere", konumMm: 0, tabanYuksekligiMm: 900, genislikMm: 1200, yukseklikMm: 1200 }] } as Partial<T>)
                }
              >
                ➕ Pencere
              </button>
            </div>
          </div>
          {deger.bosluklar.map((b, i) => (
            <div key={i} className="grid grid-cols-3 md:grid-cols-6 gap-2 items-end border-t border-neutral-100 pt-2">
              <div className="col-span-2">
                <label className="field-label">Ad</label>
                <input className="field-input" value={b.etiket} onChange={(e) => bosluklariGuncelle(i, "etiket", e.target.value)} />
              </div>
              <Sayi label="Konum (mm)" value={b.konumMm} onChange={(v) => bosluklariGuncelle(i, "konumMm", v)} />
              <Sayi label="Taban Yük. (mm)" value={b.tabanYuksekligiMm} onChange={(v) => bosluklariGuncelle(i, "tabanYuksekligiMm", v)} />
              <Sayi label="Genişlik (mm)" value={b.genislikMm} onChange={(v) => bosluklariGuncelle(i, "genislikMm", v)} />
              <Sayi label="Yükseklik (mm)" value={b.yukseklikMm} onChange={(v) => bosluklariGuncelle(i, "yukseklikMm", v)} />
              <button
                type="button"
                className="btn-danger btn-sm"
                onClick={() => onDegis({ bosluklar: deger.bosluklar.filter((_, idx) => idx !== i) } as Partial<T>)}
              >
                Sil
              </button>
            </div>
          ))}
          {deger.bosluklar.length === 0 && <div className="text-xs text-neutral-500">Boşluk eklenmedi, duvar tam dolu hesaplanacak.</div>}
        </div>
      </div>
  );
}

/** Konteynerin bir dış duvarının (ön/arka/sol/sağ) ayarlarını, üstte katlanabilir bir başlıkla
 * KonteynerDuvarGovdesi üzerinden gösterir. */
function KonteynerDuvarFormu({
  baslik,
  materials,
  sacMalzemeler,
  sarfMalzemeler,
  deger,
  onDegis,
}: {
  baslik: string;
  materials: Material[];
  sacMalzemeler: Material[];
  sarfMalzemeler: Material[];
  deger: KonteynerDuvarDegerleri;
  onDegis: (patch: Partial<KonteynerDuvarDegerleri>) => void;
}) {
  return (
    <details className="rounded-xl border border-neutral-200 p-3" open>
      <summary className="font-semibold cursor-pointer">{baslik}</summary>
      <KonteynerDuvarGovdesi materials={materials} sacMalzemeler={sacMalzemeler} sarfMalzemeler={sarfMalzemeler} deger={deger} onDegis={onDegis} />
    </details>
  );
}

/** Konteyner içini odalara ayıran bir iç bölme duvarının ayarları - dış duvarlardan farklı olarak
 * kendi uzunluğunu (genislikMm) da bu formda taşır, ve listeden silinebilir. */
function KonteynerIcDuvarFormu({
  index,
  materials,
  sacMalzemeler,
  sarfMalzemeler,
  deger,
  onDegis,
  onSil,
}: {
  index: number;
  materials: Material[];
  sacMalzemeler: Material[];
  sarfMalzemeler: Material[];
  deger: KonteynerIcDuvarDegerleri;
  onDegis: (patch: Partial<KonteynerIcDuvarDegerleri>) => void;
  onSil: () => void;
}) {
  return (
    <details className="rounded-xl border border-neutral-200 p-3" open>
      <summary className="font-semibold cursor-pointer">İç Duvar {index + 1}</summary>
      <div className="mt-3 flex items-end gap-3">
        <div className="flex-1">
          <Sayi label="Duvar Uzunluğu (mm)" value={deger.genislikMm} onChange={(v) => onDegis({ genislikMm: v })} />
        </div>
        <button type="button" className="btn-danger btn-sm" onClick={onSil}>
          Duvarı Sil
        </button>
      </div>
      <KonteynerDuvarGovdesi materials={materials} sacMalzemeler={sacMalzemeler} sarfMalzemeler={sarfMalzemeler} deger={deger} onDegis={onDegis} />
    </details>
  );
}

/** Konteynerin çatısının ayarları - Çatı Kafesi'ndeki (CatiKafesiAlanlari) açıklık/çatı uzunluğu
 * dışındaki tüm alanlar (bunlar konteynerin eni/boyundan otomatik atanır). Tam kontrollü bileşendir
 * (kendi state'i yok) - şematik üzerinden yapılan kafes sayısı düzenlemesi de aynı `deger` nesnesi
 * üzerinden akar. */
function KonteynerCatiFormu({
  materials,
  sacMalzemeler,
  baglantiMalzemeler,
  deger,
  onDegis,
}: {
  materials: Material[];
  sacMalzemeler: Material[];
  baglantiMalzemeler: Material[];
  deger: KonteynerCatiDegerleri;
  /** bkz. KonteynerDuvarGovdesi'ndeki onDegis açıklaması - sadece değişen alanı içeren bir patch
   * alır, eşzamanlı otomatik profil ataması gibi durumlarda birbirini ezmeyi önler. */
  onDegis: (patch: Partial<KonteynerCatiDegerleri>) => void;
}) {
  const catiTipi = deger.catiTipi ?? "acik_besik";
  return (
    <div className="space-y-3">
      <div>
        <label className="field-label">Çatı Tipi</label>
        <select className="field-select" value={catiTipi} onChange={(e) => onDegis({ catiTipi: e.target.value })}>
          {CATI_TIPI_SECENEKLERI.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {catiTipi === "kirma" && (
        <p className="text-xs text-neutral-500">
          Kırma çatıda köşelerde kırma kirişleri için yer bırakılması gerekir; konteyner uzunluğu genişlikten büyük olmalıdır.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {catiTipi !== "duz" && <Sayi label="Eğim (%)" value={deger.egimYuzde} onChange={(v) => onDegis({ egimYuzde: v })} />}
        <Sayi label="Kafesler Arası Aralık (mm)" value={deger.kafesAraligiHedefMm} onChange={(v) => onDegis({ kafesAraligiHedefMm: v })} />
      </div>
      {catiTipi === "catikati" && (
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-neutral-200 p-3">
          <Sayi
            label="Diz Duvarı (Kneewall) Yüksekliği (mm)"
            value={deger.dikmeYuksekligiMm ?? 900}
            onChange={(v) => onDegis({ dikmeYuksekligiMm: v })}
          />
          <MaterialSelect
            label="Diz Duvarı Dikmesi Profili"
            materials={materials}
            value={deger.dikmeDuvarProfilId}
            onChange={(v) => onDegis({ dikmeDuvarProfilId: v })}
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <MaterialSelect label="Üst Başlık Profili" materials={materials} value={deger.ustBaslikProfilId} onChange={(v) => onDegis({ ustBaslikProfilId: v })} />
        <MaterialSelect label="Alt Başlık Profili" materials={materials} value={deger.altBaslikProfilId} onChange={(v) => onDegis({ altBaslikProfilId: v })} />
      </div>
      {catiTipi === "kirma" && (
        <MaterialSelect
          label="Kırma (Pah) Kirişi Profili (opsiyonel, boşsa üst başlık profili kullanılır)"
          materials={materials}
          value={deger.kirmaMahyaKirisiProfilId}
          onChange={(v) => onDegis({ kirmaMahyaKirisiProfilId: v })}
          allowEmpty
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <MaterialSelect
          label="Aşık Profili (opsiyonel)"
          materials={materials}
          value={deger.asikProfilId}
          onChange={(v) => onDegis({ asikProfilId: v })}
          allowEmpty
        />
        <Sayi
          label="Aşık Aralığı (mm)"
          value={deger.asikAraligiHedefMm ?? 1000}
          onChange={(v) => onDegis({ asikAraligiHedefMm: v })}
        />
      </div>
      <div>
        <label className="field-label">Çatı Kaplaması</label>
        <select className="field-select" value={deger.kaplamaTuru} onChange={(e) => onDegis({ kaplamaTuru: e.target.value })}>
          {CATI_KAPLAMA_SECENEKLERI.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {deger.kaplamaTuru !== "yok" && (
        <MaterialSelect
          label="Kaplama Sac Malzemesi (opsiyonel, stok/maliyet için)"
          materials={sacMalzemeler}
          value={deger.kaplamaMalzemeId}
          onChange={(v) => onDegis({ kaplamaMalzemeId: v })}
          allowEmpty
        />
      )}
      <MaterialSelect
        label="Mesnet Plakası Sac Malzemesi (opsiyonel, stok/maliyet için)"
        materials={sacMalzemeler}
        value={deger.plakaMalzemeId}
        onChange={(v) => onDegis({ plakaMalzemeId: v })}
        allowEmpty
      />
      <MaterialSelect
        label="Ankraj Malzemesi (opsiyonel, stok/maliyet için)"
        materials={baglantiMalzemeler}
        value={deger.ankrajMalzemeId}
        onChange={(v) => onDegis({ ankrajMalzemeId: v })}
        allowEmpty
      />
      <details className="rounded-xl border border-neutral-200 p-3">
        <summary className="font-semibold cursor-pointer">Gelişmiş: Kral Kirişi, Çapraz Destek ve Stabilite</summary>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <MaterialSelect
            label="Kral Kirişi Profili"
            materials={materials}
            value={deger.kralKirisiProfilId}
            onChange={(v) => onDegis({ kralKirisiProfilId: v })}
            allowEmpty
          />
          <MaterialSelect
            label="Çapraz Destek Profili"
            materials={materials}
            value={deger.diyagonalProfilId}
            onChange={(v) => onDegis({ diyagonalProfilId: v })}
            allowEmpty
          />
          <Sayi
            label="Kafes Başına Çapraz Sayısı"
            value={deger.diyagonalSayisi ?? 0}
            onChange={(v) => onDegis({ diyagonalSayisi: v })}
          />
        </div>
        <div className="mt-3 pt-3 border-t border-neutral-100 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={deger.stabiliteBaglantisiVar ?? false}
              onChange={(e) => onDegis({ stabiliteBaglantisiVar: e.target.checked })}
            />
            İlk açıklığa stabilite bağlantısı (rüzgar/deprem çaprazı) ekle
          </label>
          {deger.stabiliteBaglantisiVar && (
            <MaterialSelect
              label="Stabilite Bağlantısı Profili (genelde L profil)"
              materials={materials}
              value={deger.stabiliteProfilId}
              onChange={(v) => onDegis({ stabiliteProfilId: v })}
            />
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-neutral-100 space-y-3">
          <div>
            <label className="field-label">Saçak Ucu</label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={!deger.olukluMu} onChange={() => onDegis({ olukluMu: false })} />
                Oluksuz (çıkma payı ile uzat)
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={deger.olukluMu ?? false} onChange={() => onDegis({ olukluMu: true })} />
                Oluklu (oluk mesafesi kadar kısalt)
              </label>
            </div>
          </div>
          {deger.olukluMu ? (
            <Sayi label="Oluk Mesafesi (mm)" value={deger.olukMesafesiMm ?? 150} onChange={(v) => onDegis({ olukMesafesiMm: v })} />
          ) : (
            <Sayi label="Çıkma Payı (mm)" value={deger.cikmaPayiMm ?? 300} onChange={(v) => onDegis({ cikmaPayiMm: v })} />
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-neutral-100 space-y-3">
          <Sayi
            label="Direk Sayısı (makas yarısı başına, opsiyonel)"
            value={deger.direkSayisi ?? 0}
            onChange={(v) => onDegis({ direkSayisi: v })}
          />
          {(deger.direkSayisi ?? 0) > 0 && (
            <MaterialSelect label="Direk Profili" materials={materials} value={deger.direkProfilId} onChange={(v) => onDegis({ direkProfilId: v })} />
          )}
        </div>
      </details>
    </div>
  );
}

function KonteynerAlanlari({
  materials,
  sacMalzemeler,
  baglantiMalzemeler,
  sarfMalzemeler,
  onChange,
  baslangic,
}: {
  materials: Material[];
  sacMalzemeler: Material[];
  baglantiMalzemeler: Material[];
  sarfMalzemeler: Material[];
  onChange: (p: Record<string, unknown>) => void;
  baslangic?: Record<string, unknown>;
}) {
  const [genislikMm, setGenislikMm] = useState<number>(() => (baslangic?.genislikMm as number) ?? 2438);
  const [uzunlukMm, setUzunlukMm] = useState<number>(() => (baslangic?.uzunlukMm as number) ?? 6058);
  const [katYuksekligiMm, setKatYuksekligiMm] = useState<number>(() => (baslangic?.katYuksekligiMm as number) ?? 2591);
  const [katSayisi, setKatSayisi] = useState<1 | 2>(() => ((baslangic?.katSayisi as number) === 2 ? 2 : 1));

  const [duvarlar, setDuvarlar] = useState<Record<KonteynerYon, KonteynerDuvarDegerleri>>(
    () => (baslangic?.duvarlar as Record<KonteynerYon, KonteynerDuvarDegerleri> | undefined) ?? konteynerDuvarSetiVarsayilan()
  );
  const [kat2Farkli, setKat2Farkli] = useState<boolean>(() => Boolean(baslangic?.duvarlar2));
  const [duvarlar2, setDuvarlar2] = useState<Record<KonteynerYon, KonteynerDuvarDegerleri>>(
    () => (baslangic?.duvarlar2 as Record<KonteynerYon, KonteynerDuvarDegerleri> | undefined) ?? konteynerDuvarSetiVarsayilan()
  );

  const [modulSayisi, setModulSayisi] = useState<number>(() => (baslangic?.modulSayisi as number) ?? 1);
  const [araDuvar, setAraDuvar] = useState<KonteynerDuvarDegerleri>(
    () => (baslangic?.araDuvar as KonteynerDuvarDegerleri | undefined) ?? konteynerDuvarVarsayilan()
  );

  const [icDuvarlar, setIcDuvarlar] = useState<KonteynerIcDuvarDegerleri[]>(
    () => (baslangic?.icDuvarlar as KonteynerIcDuvarDegerleri[] | undefined) ?? []
  );

  const [tabanVar, setTabanVar] = useState<boolean>(() => (baslangic?.tabanVar as boolean) ?? false);
  const [tabanKaplamaTuru, setTabanKaplamaTuru] = useState<string>(() => (baslangic?.tabanKaplamaTuru as string) ?? "trapez_sac");
  const [tabanKaplamaKalinlikMm, setTabanKaplamaKalinlikMm] = useState<number | undefined>(
    () => baslangic?.tabanKaplamaKalinlikMm as number | undefined
  );
  const [tabanKaplamaMalzemeId, setTabanKaplamaMalzemeId] = useState<number | undefined>(
    () => baslangic?.tabanKaplamaMalzemeId as number | undefined
  );

  const [catiVar, setCatiVar] = useState<boolean>(() => (baslangic?.catiVar as boolean) ?? false);
  const [cati, setCati] = useState<KonteynerCatiDegerleri>(
    () => (baslangic?.cati as KonteynerCatiDegerleri | undefined) ?? konteynerCatiVarsayilan()
  );

  const [merdivenVar, setMerdivenVar] = useState<boolean>(() => (baslangic?.merdivenVar as boolean) ?? false);
  const [merdivenGenislikMm, setMerdivenGenislikMm] = useState<number>(() => (baslangic?.merdivenGenislikMm as number) ?? 900);
  const [merdivenBasamakYuksekligiHedefMm, setMerdivenBasamakYuksekligiHedefMm] = useState<number>(
    () => (baslangic?.merdivenBasamakYuksekligiHedefMm as number) ?? 180
  );
  const [merdivenDerinlikMm, setMerdivenDerinlikMm] = useState<number>(() => (baslangic?.merdivenDerinlikMm as number) ?? 3000);
  const [merdivenTasiyiciProfilId, setMerdivenTasiyiciProfilId] = useState<number | undefined>(
    () => baslangic?.merdivenTasiyiciProfilId as number | undefined
  );
  const [merdivenTasiyiciAdet, setMerdivenTasiyiciAdet] = useState<number>(() => (baslangic?.merdivenTasiyiciAdet as number) ?? 2);
  const [merdivenBasamakKalinlikMm, setMerdivenBasamakKalinlikMm] = useState<number>(
    () => (baslangic?.merdivenBasamakKalinlikMm as number) ?? 3
  );
  const [merdivenBasamakSacMalzemeId, setMerdivenBasamakSacMalzemeId] = useState<number | undefined>(
    () => baslangic?.merdivenBasamakSacMalzemeId as number | undefined
  );
  const [merdivenKorkulukYuksekligiMm, setMerdivenKorkulukYuksekligiMm] = useState<number | undefined>(
    () => baslangic?.merdivenKorkulukYuksekligiMm as number | undefined
  );
  const [merdivenKorkulukDikmeProfilId, setMerdivenKorkulukDikmeProfilId] = useState<number | undefined>(
    () => baslangic?.merdivenKorkulukDikmeProfilId as number | undefined
  );
  const [merdivenKorkulukUstProfilId, setMerdivenKorkulukUstProfilId] = useState<number | undefined>(
    () => baslangic?.merdivenKorkulukUstProfilId as number | undefined
  );
  const [merdivenKorkulukDikmeAraligiHedefMm, setMerdivenKorkulukDikmeAraligiHedefMm] = useState<number>(
    () => (baslangic?.merdivenKorkulukDikmeAraligiHedefMm as number) ?? 1000
  );
  const [merdivenKorkulukBaglantiMalzemeId, setMerdivenKorkulukBaglantiMalzemeId] = useState<number | undefined>(
    () => baslangic?.merdivenKorkulukBaglantiMalzemeId as number | undefined
  );

  const [platformKorkulukVar, setPlatformKorkulukVar] = useState<boolean>(() => (baslangic?.platformKorkulukVar as boolean) ?? false);
  const [platformKorkulukUzunlukMm, setPlatformKorkulukUzunlukMm] = useState<number>(
    () => (baslangic?.platformKorkulukUzunlukMm as number) ?? 6058
  );
  const [platformKorkulukYuksekligiMm, setPlatformKorkulukYuksekligiMm] = useState<number>(
    () => (baslangic?.platformKorkulukYuksekligiMm as number) ?? 1000
  );
  const [platformKorkulukDikmeAraligiHedefMm, setPlatformKorkulukDikmeAraligiHedefMm] = useState<number>(
    () => (baslangic?.platformKorkulukDikmeAraligiHedefMm as number) ?? 1200
  );
  const [platformUstProfilId, setPlatformUstProfilId] = useState<number | undefined>(() => baslangic?.platformUstProfilId as number | undefined);
  const [platformAltProfilId, setPlatformAltProfilId] = useState<number | undefined>(() => baslangic?.platformAltProfilId as number | undefined);
  const [platformDikmeProfilId, setPlatformDikmeProfilId] = useState<number | undefined>(
    () => baslangic?.platformDikmeProfilId as number | undefined
  );
  const [platformAraKayitSayisi, setPlatformAraKayitSayisi] = useState<number>(() => (baslangic?.platformAraKayitSayisi as number) ?? 0);
  const [platformAraKayitProfilId, setPlatformAraKayitProfilId] = useState<number | undefined>(
    () => baslangic?.platformAraKayitProfilId as number | undefined
  );

  const [ikinciKatIskeletVar, setIkinciKatIskeletVar] = useState<boolean>(() => (baslangic?.ikinciKatIskeletVar as boolean) ?? false);
  const [iskeletAcikSayisi, setIskeletAcikSayisi] = useState<number>(() => (baslangic?.iskeletAcikSayisi as number) ?? 1);
  const [iskeletKolonProfilId, setIskeletKolonProfilId] = useState<number | undefined>(() => baslangic?.iskeletKolonProfilId as number | undefined);
  const [iskeletKirisProfilId, setIskeletKirisProfilId] = useState<number | undefined>(() => baslangic?.iskeletKirisProfilId as number | undefined);
  const [iskeletCerceveAraligiHedefMm, setIskeletCerceveAraligiHedefMm] = useState<number>(
    () => (baslangic?.iskeletCerceveAraligiHedefMm as number) ?? 3000
  );
  const [iskeletBaglantiKirisiProfilId, setIskeletBaglantiKirisiProfilId] = useState<number | undefined>(
    () => baslangic?.iskeletBaglantiKirisiProfilId as number | undefined
  );
  const [iskeletStabiliteBaglantisiVar, setIskeletStabiliteBaglantisiVar] = useState<boolean>(
    () => (baslangic?.iskeletStabiliteBaglantisiVar as boolean) ?? false
  );
  const [iskeletStabiliteProfilId, setIskeletStabiliteProfilId] = useState<number | undefined>(
    () => baslangic?.iskeletStabiliteProfilId as number | undefined
  );

  useEffect(() => {
    onChange({
      genislikMm,
      uzunlukMm,
      katYuksekligiMm,
      katSayisi,
      duvarlar,
      duvarlar2: katSayisi === 2 && kat2Farkli ? duvarlar2 : undefined,
      modulSayisi,
      araDuvar: modulSayisi > 1 ? araDuvar : undefined,
      icDuvarlar: icDuvarlar.length > 0 ? icDuvarlar : undefined,
      tabanVar,
      tabanKaplamaTuru: tabanVar ? tabanKaplamaTuru : undefined,
      tabanKaplamaKalinlikMm: tabanVar ? tabanKaplamaKalinlikMm : undefined,
      tabanKaplamaMalzemeId: tabanVar ? tabanKaplamaMalzemeId : undefined,
      catiVar,
      cati: catiVar ? cati : undefined,
      merdivenVar: katSayisi === 2 ? merdivenVar : false,
      merdivenGenislikMm,
      merdivenBasamakYuksekligiHedefMm,
      merdivenDerinlikMm,
      merdivenTasiyiciProfilId,
      merdivenTasiyiciAdet,
      merdivenBasamakKalinlikMm,
      merdivenBasamakSacMalzemeId,
      merdivenKorkulukYuksekligiMm,
      merdivenKorkulukDikmeProfilId,
      merdivenKorkulukUstProfilId,
      merdivenKorkulukDikmeAraligiHedefMm,
      merdivenKorkulukBaglantiMalzemeId,
      platformKorkulukVar: katSayisi === 2 ? platformKorkulukVar : false,
      platformKorkulukUzunlukMm,
      platformKorkulukYuksekligiMm,
      platformKorkulukDikmeAraligiHedefMm,
      platformUstProfilId,
      platformAltProfilId,
      platformDikmeProfilId,
      platformAraKayitSayisi,
      platformAraKayitProfilId,
      ikinciKatIskeletVar: katSayisi === 2 ? ikinciKatIskeletVar : false,
      iskeletAcikSayisi,
      iskeletKolonProfilId,
      iskeletKirisProfilId,
      iskeletCerceveAraligiHedefMm,
      iskeletBaglantiKirisiProfilId,
      iskeletStabiliteBaglantisiVar,
      iskeletStabiliteProfilId: iskeletStabiliteBaglantisiVar ? iskeletStabiliteProfilId : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    genislikMm,
    uzunlukMm,
    katYuksekligiMm,
    katSayisi,
    duvarlar,
    duvarlar2,
    kat2Farkli,
    modulSayisi,
    araDuvar,
    icDuvarlar,
    tabanVar,
    tabanKaplamaTuru,
    tabanKaplamaKalinlikMm,
    tabanKaplamaMalzemeId,
    catiVar,
    cati,
    merdivenVar,
    merdivenGenislikMm,
    merdivenBasamakYuksekligiHedefMm,
    merdivenDerinlikMm,
    merdivenTasiyiciProfilId,
    merdivenTasiyiciAdet,
    merdivenBasamakKalinlikMm,
    merdivenBasamakSacMalzemeId,
    merdivenKorkulukYuksekligiMm,
    merdivenKorkulukDikmeProfilId,
    merdivenKorkulukUstProfilId,
    merdivenKorkulukDikmeAraligiHedefMm,
    merdivenKorkulukBaglantiMalzemeId,
    platformKorkulukVar,
    platformKorkulukUzunlukMm,
    platformKorkulukYuksekligiMm,
    platformKorkulukDikmeAraligiHedefMm,
    platformUstProfilId,
    platformAltProfilId,
    platformDikmeProfilId,
    platformAraKayitSayisi,
    platformAraKayitProfilId,
    ikinciKatIskeletVar,
    iskeletAcikSayisi,
    iskeletKolonProfilId,
    iskeletKirisProfilId,
    iskeletCerceveAraligiHedefMm,
    iskeletBaglantiKirisiProfilId,
    iskeletStabiliteBaglantisiVar,
    iskeletStabiliteProfilId,
  ]);

  // Patch'i (sadece değişen alanları) en güncel state'e göre birleştirir - bkz. KonteynerDuvarGovdesi'ndeki
  // onDegis açıklaması. Birden fazla MaterialSelect aynı anda kendi alanını ayarlamaya çalıştığında
  // (örn. bir duvarın Dikme/Üst Ray/Alt Ray alanları mount olurken otomatik varsayılan atarken), her
  // patch ayrı ayrı ve en güncel `s[yon]` üzerinden uygulanır; böylece birbirlerini ezmezler.
  const duvarGuncelle = (yon: KonteynerYon, patch: Partial<KonteynerDuvarDegerleri>) =>
    setDuvarlar((s) => ({ ...s, [yon]: { ...s[yon], ...patch } }));
  const duvar2Guncelle = (yon: KonteynerYon, patch: Partial<KonteynerDuvarDegerleri>) =>
    setDuvarlar2((s) => ({ ...s, [yon]: { ...s[yon], ...patch } }));
  const icDuvarEkle = () => setIcDuvarlar((liste) => [...liste, konteynerIcDuvarVarsayilan()]);
  const icDuvarGuncelle = (index: number, patch: Partial<KonteynerIcDuvarDegerleri>) =>
    setIcDuvarlar((liste) => liste.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  const icDuvarSil = (index: number) => setIcDuvarlar((liste) => liste.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      <div>
        <label className="field-label">Standart Boyut (opsiyonel hızlı seçim)</label>
        <div className="flex gap-1 flex-wrap">
          {KONTEYNER_BOYUT_PRESETLERI.map((p) => (
            <button
              key={p.etiket}
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => {
                setGenislikMm(p.genislikMm);
                setUzunlukMm(p.uzunlukMm);
                setKatYuksekligiMm(p.katYuksekligiMm);
              }}
            >
              {p.etiket}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Sayi label="Konteyner Eni (mm)" value={genislikMm} onChange={setGenislikMm} />
        <Sayi label="Konteyner Boyu (mm)" value={uzunlukMm} onChange={setUzunlukMm} />
        <Sayi label="Kat Yüksekliği (mm)" value={katYuksekligiMm} onChange={setKatYuksekligiMm} />
        <div>
          <label className="field-label">Kat Sayısı</label>
          <select className="field-select" value={katSayisi} onChange={(e) => setKatSayisi(Number(e.target.value) === 2 ? 2 : 1)}>
            <option value={1}>1 Kat</option>
            <option value={2}>2 Kat</option>
          </select>
        </div>
      </div>
      <p className="text-xs text-neutral-500 -mt-1">
        Hazır ölçüler (15/21/32 m²) taban dış ölçüsünü doldurur; profil seçimleri otomatik 40x40x2 gelir,
        isterseniz değiştirebilirsiniz. Kat yüksekliği ayrıca elle girilir (standart 2591mm / yüksek küp 2896mm).
        Konteynerin kendi gövdesi bu hesaba dahil değildir; sadece takviye/kaplama/merdiven/iskelet hesaplanır.
      </p>

      <div className="space-y-3">
        <div className="font-semibold text-sm">
          {katSayisi === 2 ? "1. Kat Duvarları (4 köşe)" : "Duvarlar (4 köşe)"}
        </div>
        <p className="text-xs text-neutral-500 -mt-2">
          Ön/arka duvar genişliği konteyner eniyle, sol/sağ duvar genişliği konteyner boyuyla otomatik eşleşir; her
          duvar tam bir Çelik Duvar Paneli gibi (dikme aralığı, boşluklar, iç/dış kaplama, dikme pozisyonlarını elle
          düzenleme) ayrı ayrı yapılandırılır. Boşluk konumu, o duvarın sol kenarından ölçülür.
        </p>
        {KONTEYNER_YON_SIRASI.map((yon) => (
          <KonteynerDuvarFormu
            key={yon}
            baslik={KONTEYNER_YON_ETIKET[yon]}
            materials={materials}
            sacMalzemeler={sacMalzemeler}
            sarfMalzemeler={sarfMalzemeler}
            deger={duvarlar[yon]}
            onDegis={(yeni) => duvarGuncelle(yon, yeni)}
          />
        ))}
      </div>

      <div className="rounded-xl border border-neutral-200 p-3 space-y-3">
        <Sayi
          label="Modül Sayısı (yan yana zincirlenen konteyner adedi)"
          value={modulSayisi}
          onChange={(v) => setModulSayisi(Math.max(1, Math.round(v)))}
        />
        <p className="text-xs text-neutral-500 -mt-2">
          1'den büyükse, konteyner uzunluk ekseni boyunca uç uca eklenir; her ek modül kendi sol/sağ duvarını tekrar
          getirir, modüller arasındaki uç duvarları ise dışarı bakmadığından tek bir paylaşımlı "ara duvar" ile
          değiştirilerek malzeme tasarrufu yansıtılır.
        </p>
        {modulSayisi > 1 && (
          <KonteynerDuvarFormu
            baslik="Ara Duvar (Modüller Arası Paylaşımlı)"
            materials={materials}
            sacMalzemeler={sacMalzemeler}
            sarfMalzemeler={sarfMalzemeler}
            deger={araDuvar}
            onDegis={(patch) => setAraDuvar((s) => ({ ...s, ...patch }))}
          />
        )}
      </div>

      {katSayisi === 2 && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={kat2Farkli} onChange={(e) => setKat2Farkli(e.target.checked)} />
            2. kat duvarları 1. kattan farklı olsun (verilmezse 1. kat duvarları 2. kat için de aynen kullanılır)
          </label>
          {kat2Farkli && (
            <div className="space-y-3">
              <div className="font-semibold text-sm">2. Kat Duvarları (4 köşe)</div>
              {KONTEYNER_YON_SIRASI.map((yon) => (
                <KonteynerDuvarFormu
                  key={yon}
                  baslik={`2. Kat ${KONTEYNER_YON_ETIKET[yon]}`}
                  materials={materials}
                  sacMalzemeler={sacMalzemeler}
                  sarfMalzemeler={sarfMalzemeler}
                  deger={duvarlar2[yon]}
                  onDegis={(yeni) => duvar2Guncelle(yon, yeni)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 p-3 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="font-semibold text-sm">İç Bölme Duvarları (opsiyonel)</span>
          <button type="button" className="btn-secondary btn-sm" onClick={icDuvarEkle}>
            ➕ İç Duvar Ekle
          </button>
        </div>
        <p className="text-xs text-neutral-500 -mt-2">
          Konteyner içini odalara ayıran bölme duvarları - her biri tam bir Çelik Duvar Paneli gibi yapılandırılır, sadece
          uzunluğu (konteynerin dış ölçüsünden bağımsız) elle girilir. 2 katlıysa aynı liste her katta tekrarlanır.
        </p>
        {icDuvarlar.map((d, i) => (
          <KonteynerIcDuvarFormu
            key={i}
            index={i}
            materials={materials}
            sacMalzemeler={sacMalzemeler}
            sarfMalzemeler={sarfMalzemeler}
            deger={d}
            onDegis={(yeni) => icDuvarGuncelle(i, yeni)}
            onSil={() => icDuvarSil(i)}
          />
        ))}
        {icDuvarlar.length === 0 && <div className="text-xs text-neutral-500">İç bölme duvarı eklenmedi.</div>}
      </div>

      <div className="rounded-xl border border-neutral-200 p-3 space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={tabanVar} onChange={(e) => setTabanVar(e.target.checked)} />
          Taban/zemin döşemesi ekle
        </label>
        <p className="text-xs text-neutral-500 -mt-2">
          Konteynerin taban alanı (eni × boyu) kadar döşeme kaplaması - kat sayısından bağımsız, sadece en alttaki taban
          içindir (kat arası döşeme değil).
        </p>
        {tabanVar && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Taban Kaplaması</label>
              <select className="field-select" value={tabanKaplamaTuru} onChange={(e) => setTabanKaplamaTuru(e.target.value)}>
                {KONTEYNER_TABAN_KAPLAMA_SECENEKLERI.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            {tabanKaplamaTuru !== "yok" && (
              <>
                <Sayi
                  label="Kaplama Kalınlığı (mm, opsiyonel)"
                  value={tabanKaplamaKalinlikMm ?? 0}
                  onChange={(v) => setTabanKaplamaKalinlikMm(v > 0 ? v : undefined)}
                />
                <MaterialSelect
                  label="Taban Kaplaması Sac Malzemesi (opsiyonel)"
                  materials={sacMalzemeler}
                  value={tabanKaplamaMalzemeId}
                  onChange={setTabanKaplamaMalzemeId}
                  allowEmpty
                />
              </>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-neutral-200 p-3 space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={catiVar} onChange={(e) => setCatiVar(e.target.checked)} />
          Çatı ekle
        </label>
        <p className="text-xs text-neutral-500 -mt-2">
          Çatının açıklığı konteyner eniyle, uzunluğu konteyner boyuyla otomatik eşleşir; kat sayısından bağımsız çalışır.
        </p>
        {catiVar && (
          <KonteynerCatiFormu
            materials={materials}
            sacMalzemeler={sacMalzemeler}
            baglantiMalzemeler={baglantiMalzemeler}
            deger={cati}
            onDegis={(patch) => setCati((s) => ({ ...s, ...patch }))}
          />
        )}
      </div>

      {katSayisi === 2 && (
        <div className="rounded-xl border border-neutral-200 p-3 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={merdivenVar} onChange={(e) => setMerdivenVar(e.target.checked)} />
            Kat arası merdiven ekle
          </label>
          {merdivenVar && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <Sayi label="Merdiven Genişliği (mm)" value={merdivenGenislikMm} onChange={setMerdivenGenislikMm} />
                <Sayi label="Basamak Yüksekliği Hedefi (mm)" value={merdivenBasamakYuksekligiHedefMm} onChange={setMerdivenBasamakYuksekligiHedefMm} />
                <Sayi label="Merdiven Derinliği (mm)" value={merdivenDerinlikMm} onChange={setMerdivenDerinlikMm} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MaterialSelect label="Taşıyıcı (Kiriş) Profili" materials={materials} value={merdivenTasiyiciProfilId} onChange={setMerdivenTasiyiciProfilId} />
                <Sayi label="Taşıyıcı Adedi" value={merdivenTasiyiciAdet} onChange={setMerdivenTasiyiciAdet} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Sayi label="Basamak Kalınlığı (mm)" value={merdivenBasamakKalinlikMm} onChange={setMerdivenBasamakKalinlikMm} />
                <MaterialSelect
                  label="Basamak Sac Malzemesi (opsiyonel, stok/maliyet için)"
                  materials={sacMalzemeler}
                  value={merdivenBasamakSacMalzemeId}
                  onChange={setMerdivenBasamakSacMalzemeId}
                  allowEmpty
                />
              </div>
              <details className="rounded-xl border border-neutral-200 p-3">
                <summary className="font-semibold cursor-pointer">Gelişmiş: Merdiven Korkuluğu (opsiyonel)</summary>
                <div className="mt-3 space-y-3">
                  <Sayi
                    label="Korkuluk Yüksekliği (mm, 0 = yok)"
                    value={merdivenKorkulukYuksekligiMm ?? 0}
                    onChange={(v) => setMerdivenKorkulukYuksekligiMm(v > 0 ? v : undefined)}
                  />
                  {merdivenKorkulukYuksekligiMm && merdivenKorkulukYuksekligiMm > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      <MaterialSelect label="Korkuluk Dikme Profili" materials={materials} value={merdivenKorkulukDikmeProfilId} onChange={setMerdivenKorkulukDikmeProfilId} />
                      <MaterialSelect label="Korkuluk Üst Profili" materials={materials} value={merdivenKorkulukUstProfilId} onChange={setMerdivenKorkulukUstProfilId} />
                      <Sayi label="Korkuluk Dikme Aralığı (mm)" value={merdivenKorkulukDikmeAraligiHedefMm} onChange={setMerdivenKorkulukDikmeAraligiHedefMm} />
                      <MaterialSelect
                        label="Dikme Bağlantı Plakası Malzemesi (opsiyonel)"
                        materials={baglantiMalzemeler}
                        value={merdivenKorkulukBaglantiMalzemeId}
                        onChange={setMerdivenKorkulukBaglantiMalzemeId}
                        allowEmpty
                      />
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}
        </div>
      )}

      {katSayisi === 2 && (
        <div className="rounded-xl border border-neutral-200 p-3 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={platformKorkulukVar} onChange={(e) => setPlatformKorkulukVar(e.target.checked)} />
            2. kat / balkon açık kenarına korkuluk ekle
          </label>
          {platformKorkulukVar && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <Sayi label="Toplam Uzunluk (mm)" value={platformKorkulukUzunlukMm} onChange={setPlatformKorkulukUzunlukMm} />
                <Sayi label="Yükseklik (mm)" value={platformKorkulukYuksekligiMm} onChange={setPlatformKorkulukYuksekligiMm} />
                <Sayi label="Dikme Aralığı (mm)" value={platformKorkulukDikmeAraligiHedefMm} onChange={setPlatformKorkulukDikmeAraligiHedefMm} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <MaterialSelect label="Üst Profil" materials={materials} value={platformUstProfilId} onChange={setPlatformUstProfilId} />
                <MaterialSelect label="Alt Profil" materials={materials} value={platformAltProfilId} onChange={setPlatformAltProfilId} />
                <MaterialSelect label="Dikme Profili" materials={materials} value={platformDikmeProfilId} onChange={setPlatformDikmeProfilId} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Sayi label="Ara Kayıt Sayısı" value={platformAraKayitSayisi} onChange={setPlatformAraKayitSayisi} />
                <MaterialSelect
                  label="Ara Kayıt Profili"
                  materials={materials}
                  value={platformAraKayitProfilId}
                  onChange={setPlatformAraKayitProfilId}
                  allowEmpty
                />
              </div>
            </div>
          )}
        </div>
      )}

      {katSayisi === 2 && (
        <div className="rounded-xl border border-neutral-200 p-3 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={ikinciKatIskeletVar} onChange={(e) => setIkinciKatIskeletVar(e.target.checked)} />
            2. katı taşıyan ek çelik iskelet ekle
          </label>
          {ikinciKatIskeletVar && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <MaterialSelect label="Kolon Profili" materials={materials} value={iskeletKolonProfilId} onChange={setIskeletKolonProfilId} />
                <MaterialSelect label="Kiriş Profili" materials={materials} value={iskeletKirisProfilId} onChange={setIskeletKirisProfilId} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Sayi label="Açıklık (Bay) Sayısı" value={iskeletAcikSayisi} onChange={setIskeletAcikSayisi} />
                <Sayi label="Çerçeve Aralığı (mm)" value={iskeletCerceveAraligiHedefMm} onChange={setIskeletCerceveAraligiHedefMm} />
              </div>
              <MaterialSelect
                label="Bağlantı Kirişi Profili (boy yönü, opsiyonel)"
                materials={materials}
                value={iskeletBaglantiKirisiProfilId}
                onChange={setIskeletBaglantiKirisiProfilId}
                allowEmpty
              />
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={iskeletStabiliteBaglantisiVar}
                  onChange={(e) => setIskeletStabiliteBaglantisiVar(e.target.checked)}
                />
                İlk açıklığa stabilite çaprazı (rüzgar/deprem) ekle
              </label>
              {iskeletStabiliteBaglantisiVar && (
                <MaterialSelect label="Stabilite Çaprazı Profili (genelde L profil)" materials={materials} value={iskeletStabiliteProfilId} onChange={setIskeletStabiliteProfilId} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
