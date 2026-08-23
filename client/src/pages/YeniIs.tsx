import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { Customer, Material, ProductTemplate, ProjectCategory, KATEGORI_ETIKET, UrunHesapSonucu } from "../api/types";
import { Spinner, HataKutusu } from "../components/ui";
import MaterialSelect from "../components/MaterialSelect";
import HesapSonucuGorunum from "../components/HesapSonucuGorunum";
import SemaGorunum from "../components/SemaGorunum";

const TEMPLATE_KATEGORI: Record<string, ProjectCategory> = {
  railing: "RAILING",
  stairs: "STAIRS",
  canopy: "CANOPY",
  door: "DOOR",
  wall: "STEEL_STRUCTURE",
  custom: "OTHER",
};

export const URUN_EMOJI: Record<string, string> = {
  railing: "🚧",
  stairs: "🪜",
  canopy: "⛺",
  door: "🚪",
  wall: "🏗️",
  custom: "🔩",
};
const EMOJI = URUN_EMOJI;

const KATEGORILER = Object.keys(KATEGORI_ETIKET) as ProjectCategory[];

export default function YeniIs() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [adim, setAdim] = useState<1 | 2 | 3>(1);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [templateKey, setTemplateKey] = useState<string | null>(params.get("template"));

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
      <UrunFormu templateKey={templateKey} projectId={projectId} materials={materials} />
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

function IsBilgisiAdimi({ onDevam, templateKey }: { onDevam: (projectId: number) => void; templateKey: string | null }) {
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
}: {
  templateKey: string;
  projectId: number;
  materials: Material[];
  onSaved?: () => void;
}) {
  const navigate = useNavigate();
  const [onizleme, setOnizleme] = useState<{ sonuc: UrunHesapSonucu; malzemeler: Record<string, Material> } | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [hesaplaniyor, setHesaplaniyor] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [params, setParams] = useState<Record<string, unknown>>({});
  const [name, setName] = useState("");

  const hesapla = async () => {
    setHesaplaniyor(true);
    setHata(null);
    setOnizleme(null);
    try {
      const r = await api.post<{ sonuc: UrunHesapSonucu; malzemeler: Record<string, Material> }>(`/calc/${templateKey}`, params);
      setOnizleme(r);
    } catch (e: any) {
      setHata(e.message);
    } finally {
      setHesaplaniyor(false);
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

        {templateKey === "railing" && <KorkulukAlanlari materials={materials} onChange={setParams} />}
        {templateKey === "stairs" && <MerdivenAlanlari materials={materials} onChange={setParams} />}
        {templateKey === "canopy" && <SundurmaAlanlari materials={materials} onChange={setParams} />}
        {templateKey === "door" && <KapiAlanlari materials={materials} onChange={setParams} />}
        {templateKey === "wall" && <DuvarAlanlari materials={materials} onChange={setParams} />}

        <button className="btn-primary w-full" onClick={hesapla} disabled={hesaplaniyor}>
          {hesaplaniyor ? "Hesaplanıyor..." : "🧮 Hesapla"}
        </button>
      </div>

      {onizleme && (
        <div className="card space-y-4">
          <h2 className="font-bold text-lg">Hesap Sonucu</h2>
          <SemaGorunum templateKey={templateKey} params={params} ozetDegerler={onizleme.sonuc.ozetDegerler} />
          <HesapSonucuGorunum sonuc={onizleme.sonuc} malzemeler={onizleme.malzemeler} />
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

function KorkulukAlanlari({ materials, onChange }: { materials: Material[]; onChange: (p: Record<string, unknown>) => void }) {
  const [toplamUzunlukMm, setToplamUzunlukMm] = useState(12000);
  const [yukseklikMm, setYukseklikMm] = useState(1200);
  const [dikmeAraligiHedefMm, setDikmeAraligiHedefMm] = useState(1500);
  const [ustProfilId, setUstProfilId] = useState<number>();
  const [altProfilId, setAltProfilId] = useState<number>();
  const [dikmeProfilId, setDikmeProfilId] = useState<number>();
  const [araKayitSayisi, setAraKayitSayisi] = useState(0);
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

function MerdivenAlanlari({ materials, onChange }: { materials: Material[]; onChange: (p: Record<string, unknown>) => void }) {
  const [katYuksekligiMm, setKatYuksekligiMm] = useState(3000);
  const [genislikMm, setGenislikMm] = useState(900);
  const [basamakYuksekligiHedefMm, setBasamakYuksekligiHedefMm] = useState(180);
  const [basamakDerinligiMm, setBasamakDerinligiMm] = useState(270);
  const [tasiyiciProfilId, setTasiyiciProfilId] = useState<number>();
  const [korkulukYuksekligiMm, setKorkulukYuksekligiMm] = useState<number>();
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

function SundurmaAlanlari({ materials, onChange }: { materials: Material[]; onChange: (p: Record<string, unknown>) => void }) {
  const [genislikMm, setGenislikMm] = useState(4000);
  const [boyMm, setBoyMm] = useState(3000);
  const [yukseklikMm, setYukseklikMm] = useState(2200);
  const [egimYuzde, setEgimYuzde] = useState(10);
  const [dikmeSayisi, setDikmeSayisi] = useState(3);
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

function KapiAlanlari({ materials, onChange }: { materials: Material[]; onChange: (p: Record<string, unknown>) => void }) {
  const [genislikMm, setGenislikMm] = useState(1000);
  const [yukseklikMm, setYukseklikMm] = useState(2200);
  const [kasaProfilId, setKasaProfilId] = useState<number>();
  const [kanatProfilId, setKanatProfilId] = useState<number>();
  const [sacKalinlikMm, setSacKalinlikMm] = useState<number>(1.5);
  const [menteseAdet, setMenteseAdet] = useState(3);
  const [kilitAdet, setKilitAdet] = useState(1);
  const [kolAdet, setKolAdet] = useState(1);

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
  genislikMm: number;
  yukseklikMm: number;
}

function DuvarAlanlari({ materials, onChange }: { materials: Material[]; onChange: (p: Record<string, unknown>) => void }) {
  const [genislikMm, setGenislikMm] = useState(4000);
  const [yukseklikMm, setYukseklikMm] = useState(2500);
  const [dikmeAraligiHedefMm, setDikmeAraligiHedefMm] = useState(600);
  const [ustProfilId, setUstProfilId] = useState<number>();
  const [altProfilId, setAltProfilId] = useState<number>();
  const [dikmeProfilId, setDikmeProfilId] = useState<number>();
  const [bosluklar, setBosluklar] = useState<DuvarBoslukTaslak[]>([]);

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
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">Kapı / Pencere Boşlukları (opsiyonel)</span>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() =>
              setBosluklar((l) => [...l, { etiket: "Kapı", konumMm: 0, genislikMm: 900, yukseklikMm: 2100 }])
            }
          >
            ➕ Boşluk Ekle
          </button>
        </div>
        {bosluklar.map((b, i) => (
          <div key={i} className="grid grid-cols-5 gap-2 items-end border-t border-neutral-100 pt-3">
            <div>
              <label className="field-label">Ad</label>
              <input className="field-input" value={b.etiket} onChange={(e) => bosluklariGuncelle(i, "etiket", e.target.value)} />
            </div>
            <Sayi label="Konum (mm)" value={b.konumMm} onChange={(v) => bosluklariGuncelle(i, "konumMm", v)} />
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
