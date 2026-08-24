import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { Customer, Material, ProductTemplate, ProjectCategory, KATEGORI_ETIKET, UrunHesapSonucu } from "../api/types";
import { Spinner, HataKutusu, UyariKutusu, Badge } from "../components/ui";
import MaterialSelect from "../components/MaterialSelect";
import HesapSonucuGorunum from "../components/HesapSonucuGorunum";
import SemaGorunum from "../components/SemaGorunum";

const TEMPLATE_KATEGORI: Record<string, ProjectCategory> = {
  railing: "RAILING",
  stairs: "STAIRS",
  canopy: "CANOPY",
  door: "DOOR",
  wall: "STEEL_STRUCTURE",
  truss: "ROOF",
  custom: "OTHER",
};

export const URUN_EMOJI: Record<string, string> = {
  railing: "🚧",
  stairs: "🪜",
  canopy: "⛺",
  door: "🚪",
  wall: "🏗️",
  truss: "🔺",
  custom: "🔩",
};
const EMOJI = URUN_EMOJI;

const KATEGORILER = Object.keys(KATEGORI_ETIKET) as ProjectCategory[];

interface AiDanismanSonucu {
  degerlendirme: string;
  malzemeUygunlugu: "yeterli" | "sinirda" | "yetersiz";
  onerilenAlternatif?: string | null;
  tahminiTasimaKapasitesiKg?: number | null;
  tasimaKapasitesiAciklamasi: string;
  oneriler: string[];
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

  const [adim, setAdim] = useState<1 | 2 | 3>(1);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [templateKey, setTemplateKey] = useState<string | null>(params.get("template"));
  const [aiAlanlar, setAiAlanlar] = useState<Record<string, unknown> | null>(null);

  const [sablonlar, setSablonlar] = useState<ProductTemplate[] | null>(null);
  const [materials, setMaterials] = useState<Material[] | null>(null);

  useEffect(() => {
    api.get<ProductTemplate[]>("/product-templates").then(setSablonlar);
    api.get<Material[]>("/materials?category=PROFILE").then(setMaterials);
  }, []);

  const templateSecildi = (key: string) => {
    setTemplateKey(key);
    if (key === "custom" && projectId) {
      navigate(`/isler/${projectId}`);
      return;
    }
    setAdim(3);
  };

  if (adim === 1) {
    return (
      <IsBilgisiAdimi
        onDevam={(id) => {
          setProjectId(id);
          if (templateKey) {
            if (templateKey === "custom") navigate(`/isler/${id}`);
            else setAdim(3);
          } else {
            setAdim(2);
          }
        }}
        templateKey={templateKey}
        onAiYorumu={(yorum) => {
          setTemplateKey(yorum.templateKey);
          setAiAlanlar({ ...yorum.alanlar, bosluklar: yorum.bosluklar ?? undefined });
        }}
      />
    );
  }

  if (adim === 2) {
    if (!sablonlar) return <Spinner />;
    return (
      <div className="space-y-6">
        <StepHeader adim={2} baslik="Ürün Seçin" />
        <div className="grid sm:grid-cols-2 gap-4">
          {sablonlar.map((s) => (
            <button
              key={s.key}
              onClick={() => templateSecildi(s.key)}
              className="card flex items-center gap-4 hover:shadow-md hover:border-brand-300 text-left"
            >
              <div className="text-4xl">{EMOJI[s.key] ?? "🛠️"}</div>
              <div>
                <div className="font-bold text-lg">{s.name}</div>
                {s.description && <div className="text-sm text-neutral-500">{s.description}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!projectId || !templateKey || !materials) return <Spinner />;

  return (
    <div className="space-y-6">
      <StepHeader adim={3} baslik="Ölçüler ve Malzeme" />
      <UrunFormu templateKey={templateKey} projectId={projectId} materials={materials} baslangic={aiAlanlar ?? undefined} />
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

function IsBilgisiAdimi({
  onDevam,
  templateKey,
  onAiYorumu,
}: {
  onDevam: (projectId: number) => void;
  templateKey: string | null;
  onAiYorumu: (yorum: AiIsYorumu) => void;
}) {
  const [musteriler, setMusteriler] = useState<Customer[] | null>(null);
  const [mod, setMod] = useState<"mevcut" | "yeni">("mevcut");
  const [customerId, setCustomerId] = useState<number | undefined>(undefined);
  const [yeniAd, setYeniAd] = useState("");
  const [yeniTelefon, setYeniTelefon] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ProjectCategory>(templateKey ? TEMPLATE_KATEGORI[templateKey] : "OTHER");
  const [note, setNote] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const [aiMetin, setAiMetin] = useState("");
  const [aiCalisiyor, setAiCalisiyor] = useState(false);
  const [aiSonuc, setAiSonuc] = useState<AiIsYorumu | null>(null);

  useEffect(() => {
    api.get<Customer[]>("/customers").then(setMusteriler);
  }, []);

  const aiIleDoldur = async () => {
    if (!aiMetin.trim()) return setHata("Önce yapılacak işi anlatın.");
    setAiCalisiyor(true);
    setHata(null);
    setAiSonuc(null);
    try {
      const yorum = await api.post<AiIsYorumu>("/ai/is-yorumla", { metin: aiMetin });
      setTitle(yorum.baslik);
      setCategory(TEMPLATE_KATEGORI[yorum.templateKey] ?? "OTHER");
      if (yorum.musteriAdiTahmini) {
        setMod("yeni");
        setYeniAd(yorum.musteriAdiTahmini);
      }
      setAiSonuc(yorum);
      onAiYorumu(yorum);
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setAiCalisiyor(false);
    }
  };

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
      const proje = await api.post<{ id: number }>("/projects", { customerId: cid, title, category, note });
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

      <div className="card space-y-3 border-2 border-brand-200 bg-brand-50/40">
        <label className="field-label">🤖 Yapay Zeka ile Hızlı Doldur (opsiyonel)</label>
        <p className="text-xs text-neutral-500">
          Yapılacak işi kendi cümlelerinizle anlatın, ürün tipini ve ölçüleri sizin için tahmin edip formu doldursun. Sonuçları
          mutlaka kontrol edin.
        </p>
        <textarea
          className="field-input"
          rows={2}
          placeholder="örn. Ahmet Bey için 3 metre uzunluğunda, 1 metre yüksekliğinde bahçe korkuluğu, ortasında bir ara kayıt olsun"
          value={aiMetin}
          onChange={(e) => setAiMetin(e.target.value)}
        />
        <button className="btn-secondary w-full" onClick={aiIleDoldur} disabled={aiCalisiyor}>
          {aiCalisiyor ? "Analiz ediliyor..." : "🤖 AI ile Doldur"}
        </button>
        {aiSonuc && (
          <div className="text-sm space-y-2">
            <div className="font-semibold text-brand-700">
              ✅ "{EMOJI[aiSonuc.templateKey] ?? "🛠️"} {aiSonuc.baslik}" olarak dolduruldu (güven: {aiSonuc.guven}). Aşağıdaki
              bilgileri ve bir sonraki adımdaki ölçüleri kontrol edin.
            </div>
            <UyariKutusu mesajlar={aiSonuc.belirsizlikler} />
          </div>
        )}
      </div>

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

        <div>
          <label className="field-label">İş Kategorisi</label>
          <select className="field-select" value={category} onChange={(e) => setCategory(e.target.value as ProjectCategory)}>
            {KATEGORILER.map((k) => (
              <option key={k} value={k}>
                {KATEGORI_ETIKET[k]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label">Not</label>
          <textarea className="field-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <button className="btn-primary w-full" onClick={devam} disabled={kaydediliyor}>
          {kaydediliyor ? "Kaydediliyor..." : "Devam Et →"}
        </button>
      </div>
    </div>
  );
}

export function UrunFormu({
  templateKey,
  projectId,
  materials,
  onSaved,
  baslangic,
}: {
  templateKey: string;
  projectId: number;
  materials: Material[];
  onSaved?: () => void;
  baslangic?: Record<string, unknown>;
}) {
  const navigate = useNavigate();
  const [onizleme, setOnizleme] = useState<{ sonuc: UrunHesapSonucu; malzemeler: Record<string, Material> } | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [hesaplaniyor, setHesaplaniyor] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [params, setParams] = useState<Record<string, unknown>>({});
  const [name, setName] = useState("");
  const [aiDanisman, setAiDanisman] = useState<AiDanismanSonucu | null>(null);
  const [aiDanismanYukleniyor, setAiDanismanYukleniyor] = useState(false);
  const [aiDanismanHata, setAiDanismanHata] = useState<string | null>(null);

  const hesapla = async () => {
    setHesaplaniyor(true);
    setHata(null);
    setOnizleme(null);
    setAiDanisman(null);
    setAiDanismanHata(null);
    try {
      const r = await api.post<{ sonuc: UrunHesapSonucu; malzemeler: Record<string, Material> }>(`/calc/${templateKey}`, params);
      setOnizleme(r);
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setHesaplaniyor(false);
    }
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
      await api.post(`/projects/${projectId}/items`, { templateKey, name, params });
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

        {templateKey === "railing" && <KorkulukAlanlari materials={materials} onChange={setParams} baslangic={baslangic} />}
        {templateKey === "stairs" && <MerdivenAlanlari materials={materials} onChange={setParams} baslangic={baslangic} />}
        {templateKey === "canopy" && <SundurmaAlanlari materials={materials} onChange={setParams} baslangic={baslangic} />}
        {templateKey === "door" && <KapiAlanlari materials={materials} onChange={setParams} baslangic={baslangic} />}
        {templateKey === "wall" && <DuvarAlanlari materials={materials} onChange={setParams} baslangic={baslangic} />}
        {templateKey === "truss" && <CatiKafesiAlanlari materials={materials} onChange={setParams} baslangic={baslangic} />}

        <button className="btn-primary w-full" onClick={hesapla} disabled={hesaplaniyor}>
          {hesaplaniyor ? "Hesaplanıyor..." : "🧮 Hesapla"}
        </button>
      </div>

      {onizleme && (
        <div className="card space-y-4">
          <h2 className="font-bold text-lg">Hesap Sonucu</h2>
          <SemaGorunum templateKey={templateKey} params={params} ozetDegerler={onizleme.sonuc.ozetDegerler} />
          <HesapSonucuGorunum sonuc={onizleme.sonuc} malzemeler={onizleme.malzemeler} />

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
            {kaydediliyor ? "Kaydediliyor..." : "✅ Kaydet ve İşe Git"}
          </button>
        </div>
      )}
    </div>
  );
}

function Sayi({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input type="number" className="field-input" value={value ?? ""} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function KorkulukAlanlari({
  materials,
  onChange,
  baslangic,
}: {
  materials: Material[];
  onChange: (p: Record<string, unknown>) => void;
  baslangic?: Record<string, unknown>;
}) {
  const [toplamUzunlukMm, setToplamUzunlukMm] = useState<number>(() => (baslangic?.toplamUzunlukMm as number) ?? 12000);
  const [yukseklikMm, setYukseklikMm] = useState<number>(() => (baslangic?.yukseklikMm as number) ?? 1200);
  const [dikmeAraligiHedefMm, setDikmeAraligiHedefMm] = useState<number>(() => (baslangic?.dikmeAraligiHedefMm as number) ?? 1500);
  const [ustProfilId, setUstProfilId] = useState<number>();
  const [altProfilId, setAltProfilId] = useState<number>();
  const [dikmeProfilId, setDikmeProfilId] = useState<number>();
  const [araKayitSayisi, setAraKayitSayisi] = useState<number>(() => (baslangic?.araKayitSayisi as number) ?? 0);
  const [araKayitProfilId, setAraKayitProfilId] = useState<number>();

  useEffect(() => {
    onChange({ toplamUzunlukMm, yukseklikMm, dikmeAraligiHedefMm, ustProfilId, altProfilId, dikmeProfilId, araKayitSayisi, araKayitProfilId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toplamUzunlukMm, yukseklikMm, dikmeAraligiHedefMm, ustProfilId, altProfilId, dikmeProfilId, araKayitSayisi, araKayitProfilId]);

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
        <summary className="font-semibold cursor-pointer">Gelişmiş: Ara Kayıt</summary>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Sayi label="Ara Kayıt Sayısı" value={araKayitSayisi} onChange={setAraKayitSayisi} />
          <MaterialSelect label="Ara Kayıt Profili" materials={materials} value={araKayitProfilId} onChange={setAraKayitProfilId} allowEmpty />
        </div>
      </details>
    </div>
  );
}

function MerdivenAlanlari({
  materials,
  onChange,
  baslangic,
}: {
  materials: Material[];
  onChange: (p: Record<string, unknown>) => void;
  baslangic?: Record<string, unknown>;
}) {
  const [katYuksekligiMm, setKatYuksekligiMm] = useState<number>(() => (baslangic?.katYuksekligiMm as number) ?? 3000);
  const [genislikMm, setGenislikMm] = useState<number>(() => (baslangic?.genislikMm as number) ?? 900);
  const [basamakYuksekligiHedefMm, setBasamakYuksekligiHedefMm] = useState<number>(
    () => (baslangic?.basamakYuksekligiHedefMm as number) ?? 180
  );
  const [basamakDerinligiMm, setBasamakDerinligiMm] = useState<number>(() => (baslangic?.basamakDerinligiMm as number) ?? 270);
  const [tasiyiciProfilId, setTasiyiciProfilId] = useState<number>();
  const [korkulukYuksekligiMm, setKorkulukYuksekligiMm] = useState<number | undefined>(
    () => (baslangic?.korkulukYuksekligiMm as number | undefined) ?? undefined
  );
  const [korkulukDikmeProfilId, setKorkulukDikmeProfilId] = useState<number>();
  const [korkulukUstProfilId, setKorkulukUstProfilId] = useState<number>();

  useEffect(() => {
    onChange({
      katYuksekligiMm,
      genislikMm,
      basamakYuksekligiHedefMm,
      basamakDerinligiMm,
      tasiyiciProfilId,
      korkulukYuksekligiMm: korkulukYuksekligiMm || undefined,
      korkulukDikmeProfilId,
      korkulukUstProfilId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [katYuksekligiMm, genislikMm, basamakYuksekligiHedefMm, basamakDerinligiMm, tasiyiciProfilId, korkulukYuksekligiMm, korkulukDikmeProfilId, korkulukUstProfilId]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Sayi label="Kat Yüksekliği (mm)" value={katYuksekligiMm} onChange={setKatYuksekligiMm} />
        <Sayi label="Merdiven Genişliği (mm)" value={genislikMm} onChange={setGenislikMm} />
        <Sayi label="Hedef Basamak Yüksekliği (mm)" value={basamakYuksekligiHedefMm} onChange={setBasamakYuksekligiHedefMm} />
        <Sayi label="Basamak Derinliği (mm)" value={basamakDerinligiMm} onChange={setBasamakDerinligiMm} />
      </div>
      <MaterialSelect label="Taşıyıcı (Kiriş) Profili" materials={materials} value={tasiyiciProfilId} onChange={setTasiyiciProfilId} />
      <details className="rounded-xl border border-neutral-200 p-3">
        <summary className="font-semibold cursor-pointer">Gelişmiş: Merdiven Korkuluğu</summary>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <Sayi label="Korkuluk Yüksekliği (mm)" value={korkulukYuksekligiMm} onChange={setKorkulukYuksekligiMm} />
          <MaterialSelect label="Korkuluk Dikmesi" materials={materials} value={korkulukDikmeProfilId} onChange={setKorkulukDikmeProfilId} allowEmpty />
          <MaterialSelect label="Korkuluk Üst Profili" materials={materials} value={korkulukUstProfilId} onChange={setKorkulukUstProfilId} allowEmpty />
        </div>
      </details>
    </div>
  );
}

function SundurmaAlanlari({
  materials,
  onChange,
  baslangic,
}: {
  materials: Material[];
  onChange: (p: Record<string, unknown>) => void;
  baslangic?: Record<string, unknown>;
}) {
  const [genislikMm, setGenislikMm] = useState<number>(() => (baslangic?.genislikMm as number) ?? 4000);
  const [boyMm, setBoyMm] = useState<number>(() => (baslangic?.boyMm as number) ?? 3000);
  const [yukseklikMm, setYukseklikMm] = useState<number>(() => (baslangic?.yukseklikMm as number) ?? 2200);
  const [egimYuzde, setEgimYuzde] = useState<number>(() => (baslangic?.egimYuzde as number) ?? 10);
  const [dikmeSayisi, setDikmeSayisi] = useState<number>(() => (baslangic?.dikmeSayisi as number) ?? 3);
  const [anaTasiyiciProfilId, setAnaTasiyiciProfilId] = useState<number>();
  const [araTasiyiciProfilId, setAraTasiyiciProfilId] = useState<number>();
  const [dikmeProfilId, setDikmeProfilId] = useState<number>();
  const [caprazProfilId, setCaprazProfilId] = useState<number>();

  useEffect(() => {
    onChange({ genislikMm, boyMm, yukseklikMm, egimYuzde, dikmeSayisi, anaTasiyiciProfilId, araTasiyiciProfilId, dikmeProfilId, caprazProfilId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genislikMm, boyMm, yukseklikMm, egimYuzde, dikmeSayisi, anaTasiyiciProfilId, araTasiyiciProfilId, dikmeProfilId, caprazProfilId]);

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
    </div>
  );
}

function KapiAlanlari({
  materials,
  onChange,
  baslangic,
}: {
  materials: Material[];
  onChange: (p: Record<string, unknown>) => void;
  baslangic?: Record<string, unknown>;
}) {
  const [genislikMm, setGenislikMm] = useState<number>(() => (baslangic?.genislikMm as number) ?? 1000);
  const [yukseklikMm, setYukseklikMm] = useState<number>(() => (baslangic?.yukseklikMm as number) ?? 2200);
  const [kasaProfilId, setKasaProfilId] = useState<number>();
  const [kanatProfilId, setKanatProfilId] = useState<number>();
  const [sacKalinlikMm, setSacKalinlikMm] = useState<number>(() => (baslangic?.sacKalinlikMm as number) ?? 1.5);
  const [menteseAdet, setMenteseAdet] = useState<number>(() => (baslangic?.menteseAdet as number) ?? 3);
  const [kilitAdet, setKilitAdet] = useState<number>(() => (baslangic?.kilitAdet as number) ?? 1);
  const [kolAdet, setKolAdet] = useState<number>(() => (baslangic?.kolAdet as number) ?? 1);

  useEffect(() => {
    onChange({ genislikMm, yukseklikMm, kasaProfilId, kanatProfilId, sacKalinlikMm, menteseAdet, kilitAdet, kolAdet });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genislikMm, yukseklikMm, kasaProfilId, kanatProfilId, sacKalinlikMm, menteseAdet, kilitAdet, kolAdet]);

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
          <Sayi label="Menteşe Adedi" value={menteseAdet} onChange={setMenteseAdet} />
          <Sayi label="Kilit Adedi" value={kilitAdet} onChange={setKilitAdet} />
          <Sayi label="Kol Adedi" value={kolAdet} onChange={setKolAdet} />
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
  onChange,
  baslangic,
}: {
  materials: Material[];
  onChange: (p: Record<string, unknown>) => void;
  baslangic?: Record<string, unknown>;
}) {
  const [genislikMm, setGenislikMm] = useState<number>(() => (baslangic?.genislikMm as number) ?? 4000);
  const [yukseklikMm, setYukseklikMm] = useState<number>(() => (baslangic?.yukseklikMm as number) ?? 2500);
  const [dikmeAraligiHedefMm, setDikmeAraligiHedefMm] = useState<number>(() => (baslangic?.dikmeAraligiHedefMm as number) ?? 600);
  const [ustProfilId, setUstProfilId] = useState<number>();
  const [altProfilId, setAltProfilId] = useState<number>();
  const [dikmeProfilId, setDikmeProfilId] = useState<number>();
  const [bosluklar, setBosluklar] = useState<DuvarBoslukTaslak[]>(
    () => (baslangic?.bosluklar as DuvarBoslukTaslak[] | undefined) ?? []
  );

  useEffect(() => {
    onChange({ genislikMm, yukseklikMm, dikmeAraligiHedefMm, ustProfilId, altProfilId, dikmeProfilId, bosluklar });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genislikMm, yukseklikMm, dikmeAraligiHedefMm, ustProfilId, altProfilId, dikmeProfilId, bosluklar]);

  const bosluklariGuncelle = (i: number, alan: keyof DuvarBoslukTaslak, deger: string | number) => {
    setBosluklar((liste) => liste.map((b, idx) => (idx === i ? { ...b, [alan]: deger } : b)));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <Sayi label="Duvar Genişliği (mm)" value={genislikMm} onChange={setGenislikMm} />
        <Sayi label="Duvar Yüksekliği (mm)" value={yukseklikMm} onChange={setYukseklikMm} />
        <Sayi label="Dikme Aralığı (mm)" value={dikmeAraligiHedefMm} onChange={setDikmeAraligiHedefMm} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <MaterialSelect label="Üst Ray" materials={materials} value={ustProfilId} onChange={setUstProfilId} />
        <MaterialSelect label="Alt Ray" materials={materials} value={altProfilId} onChange={setAltProfilId} />
        <MaterialSelect label="Dikme Profili" materials={materials} value={dikmeProfilId} onChange={setDikmeProfilId} />
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
  onChange,
  baslangic,
}: {
  materials: Material[];
  onChange: (p: Record<string, unknown>) => void;
  baslangic?: Record<string, unknown>;
}) {
  const [acikligMm, setAcikligMm] = useState<number>(() => (baslangic?.acikligMm as number) ?? 6000);
  const [egimYuzde, setEgimYuzde] = useState<number>(() => (baslangic?.egimYuzde as number) ?? 30);
  const [catiUzunluguMm, setCatiUzunluguMm] = useState<number>(() => (baslangic?.catiUzunluguMm as number) ?? 9000);
  const [kafesAraligiHedefMm, setKafesAraligiHedefMm] = useState<number>(
    () => (baslangic?.kafesAraligiHedefMm as number) ?? 900
  );
  const [ustBaslikProfilId, setUstBaslikProfilId] = useState<number>();
  const [altBaslikProfilId, setAltBaslikProfilId] = useState<number>();
  const [kralKirisiProfilId, setKralKirisiProfilId] = useState<number>();
  const [diyagonalProfilId, setDiyagonalProfilId] = useState<number>();
  const [diyagonalSayisi, setDiyagonalSayisi] = useState<number>(() => (baslangic?.diyagonalSayisi as number) ?? 0);
  const [asikProfilId, setAsikProfilId] = useState<number>();
  const [asikAraligiHedefMm, setAsikAraligiHedefMm] = useState<number>(() => (baslangic?.asikAraligiHedefMm as number) ?? 1000);

  useEffect(() => {
    onChange({
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
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
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
  ]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Sayi label="Açıklık (mm)" value={acikligMm} onChange={setAcikligMm} />
        <Sayi label="Eğim (%)" value={egimYuzde} onChange={setEgimYuzde} />
        <Sayi label="Çatı Uzunluğu (mm)" value={catiUzunluguMm} onChange={setCatiUzunluguMm} />
        <Sayi label="Kafesler Arası Aralık (mm)" value={kafesAraligiHedefMm} onChange={setKafesAraligiHedefMm} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MaterialSelect label="Üst Başlık Profili" materials={materials} value={ustBaslikProfilId} onChange={setUstBaslikProfilId} />
        <MaterialSelect label="Alt Başlık Profili" materials={materials} value={altBaslikProfilId} onChange={setAltBaslikProfilId} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MaterialSelect label="Aşık Profili (opsiyonel)" materials={materials} value={asikProfilId} onChange={setAsikProfilId} allowEmpty />
        <Sayi label="Aşık Aralığı (mm)" value={asikAraligiHedefMm} onChange={setAsikAraligiHedefMm} />
      </div>
      <details className="rounded-xl border border-neutral-200 p-3">
        <summary className="font-semibold cursor-pointer">Gelişmiş: Kral Kirişi ve Çapraz Destek</summary>
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
      </details>
    </div>
  );
}
