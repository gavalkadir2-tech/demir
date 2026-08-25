import { YapiselKontrolSonucu } from "../api/types";

const DURUM_ETIKET: Record<string, string> = { uygun: "✅ Uygun", sinirda: "⚠️ Sınırda", yetersiz: "❌ Yetersiz" };
const DURUM_RENK: Record<string, string> = {
  uygun: "bg-green-100 text-green-700 border-green-300",
  sinirda: "bg-amber-100 text-amber-700 border-amber-300",
  yetersiz: "bg-red-100 text-red-700 border-red-300",
};

/** Basitleştirilmiş mukavemet/sehim kontrol sonuçlarını (kiriş bazında) gösterir. */
export default function YapiselKontrolGorunum({ kontrol }: { kontrol: YapiselKontrolSonucu }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="font-semibold">🏗️ Yapısal Kontrol (mukavemet / sehim)</span>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${DURUM_RENK[kontrol.genelDurum]}`}>
          {DURUM_ETIKET[kontrol.genelDurum]}
        </span>
      </div>
      <div className="space-y-3">
        {kontrol.kalemler.map((k, i) => (
          <div key={i} className={`rounded-lg border p-3 text-sm ${DURUM_RENK[k.durum]}`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="font-semibold">
                {k.eleman} — {k.profilAdi}
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/60">{DURUM_ETIKET[k.durum]}</span>
            </div>
            <div className="text-xs opacity-80 mt-0.5">{k.yukAciklamasi}</div>
            {k.tur === "kolon" ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs">
                <div>
                  <div className="opacity-70">Burkulma Yükü</div>
                  <div className="font-bold">
                    {k.eksenelYukN} / {k.izinVerilenBurkulmaYukuN} N
                  </div>
                </div>
                <div>
                  <div className="opacity-70">Akma (Ezilme) Yükü</div>
                  <div className="font-bold">
                    {k.eksenelYukN} / {k.izinVerilenAkmaYukuN} N
                  </div>
                </div>
                <div>
                  <div className="opacity-70">Güvenlik oranı</div>
                  <div className="font-bold">{k.guvenlikOrani}×</div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <div className="opacity-70">Sonuç</div>
                  <div className="font-medium">{k.aciklama}</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs">
                <div>
                  <div className="opacity-70">Sehim</div>
                  <div className="font-bold">
                    {k.maxSehimMm} / {k.izinVerilenSehimMm} mm
                  </div>
                </div>
                <div>
                  <div className="opacity-70">Gerilme</div>
                  <div className="font-bold">
                    {k.maxGerilmeMPa} / {k.izinVerilenGerilmeMPa} MPa
                  </div>
                </div>
                <div>
                  <div className="opacity-70">Güvenlik oranı</div>
                  <div className="font-bold">{k.guvenlikOrani}×</div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <div className="opacity-70">Sonuç</div>
                  <div className="font-medium">{k.aciklama}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-neutral-500">⚠️ {kontrol.uyari}</p>
    </div>
  );
}
