import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { Spinner } from "../components/ui";
import { DURUM_ETIKET, ProjectStatus } from "../api/types";
import { tarih } from "../lib/format";

interface KamuGorev {
  label: string;
  done: boolean;
}

interface KamuProje {
  title: string;
  status: ProjectStatus;
  dueDate?: string | null;
  musteriAdi: string;
  gorevler: KamuGorev[];
  sonHaliFotograflari: { dataBase64: string; mimeType: string }[];
}

const ADIM_TANIMLARI: { label: string; emoji: string; durumlar: ProjectStatus[] }[] = [
  { label: "Talep", emoji: "📥", durumlar: ["DRAFT"] },
  { label: "Hesaplandı", emoji: "🧮", durumlar: ["CALCULATED"] },
  { label: "Teklif", emoji: "📄", durumlar: ["QUOTE_READY", "QUOTE_SENT"] },
  { label: "Onaylandı", emoji: "✅", durumlar: ["APPROVED"] },
  { label: "Üretimde", emoji: "🔨", durumlar: ["IN_PRODUCTION"] },
  { label: "Montaj", emoji: "🔧", durumlar: ["INSTALLING"] },
  { label: "Tamamlandı", emoji: "🏁", durumlar: ["COMPLETED"] },
];

/** Müşterinin girişsiz eriştiği iş takip sayfası - fiyat/maliyet bilgisi içermez, sadece
 * süreç durumu, üretim aşamaları ve son hali fotoğrafları gösterilir. */
export default function IsTakip() {
  const { token } = useParams();
  const [proje, setProje] = useState<KamuProje | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<KamuProje>(`/public/projects/${token}`)
      .then(setProje)
      .catch((e) => setHata(e.message));
  }, [token]);

  if (hata) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
        <div className="card max-w-sm text-center text-neutral-600">{hata}</div>
      </div>
    );
  }
  if (!proje) return <Spinner />;

  const iptal = proje.status === "CANCELLED";
  const aktifIndex = ADIM_TANIMLARI.findIndex((a) => a.durumlar.includes(proje.status));
  const tamamlanan = proje.gorevler.filter((g) => g.done).length;

  return (
    <div className="min-h-screen bg-neutral-100 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="text-lg font-bold text-brand-700">🔧 İş Takip</div>
          <div className="text-neutral-500 text-sm">Sayın {proje.musteriAdi}</div>
        </div>

        <div className="card space-y-3">
          <div>
            <div className="font-bold text-xl">{proje.title}</div>
            {proje.dueDate && <div className="text-sm text-neutral-500">Planlanan Teslim: {tarih(proje.dueDate)}</div>}
          </div>

          {iptal ? (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold px-4 py-3 text-sm">
              🔴 Bu iş iptal edildi.
            </div>
          ) : (
            <div className="flex items-center overflow-x-auto pb-1">
              {ADIM_TANIMLARI.map((adim, i) => {
                const tamam = i < aktifIndex;
                const aktif = i === aktifIndex;
                return (
                  <div key={adim.label} className="flex items-center flex-shrink-0">
                    <div className="flex flex-col items-center gap-1 w-20">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          aktif ? "bg-brand-600 text-white" : tamam ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-400"
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
          )}
        </div>

        {proje.gorevler.length > 0 && (
          <div className="card space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">🛠️ Üretim Aşamaları</h2>
              <span className="text-sm text-neutral-500">
                {tamamlanan}/{proje.gorevler.length}
              </span>
            </div>
            <div className="divide-y divide-neutral-100">
              {proje.gorevler.map((g, i) => (
                <div key={i} className="py-2 flex items-center gap-2 text-sm">
                  <span>{g.done ? "✅" : "⬜"}</span>
                  <span className={g.done ? "line-through text-neutral-400" : ""}>{g.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {proje.sonHaliFotograflari.length > 0 && (
          <div className="card space-y-2">
            <h2 className="font-bold">✅ Son Hali</h2>
            <div className="grid grid-cols-2 gap-3">
              {proje.sonHaliFotograflari.map((f, i) => (
                <img
                  key={i}
                  src={`data:${f.mimeType};base64,${f.dataBase64}`}
                  alt="İşin son hali"
                  className="w-full aspect-square object-cover rounded-lg border border-neutral-200"
                />
              ))}
            </div>
          </div>
        )}

        <div className="text-center text-xs text-neutral-400">Durum: {DURUM_ETIKET[proje.status]}</div>
      </div>
    </div>
  );
}
