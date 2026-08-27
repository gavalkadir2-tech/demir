import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Bildirim } from "../api/types";

const YENILEME_ARALIGI_MS = 60_000;

const TUR_IKON: Record<Bildirim["tur"], string> = {
  DUSUK_STOK: "📦",
  TEKLIF_SURESI_DOLDU: "📄",
  TEKLIF_SURESI_YAKLASIYOR: "📄",
  IS_TESLIMI_GECIKTI: "⏰",
  IS_TESLIMI_YAKLASIYOR: "⏰",
};

/** Sağ üstteki bildirim zili: düşük stok, süresi dolan/dolmak üzere teklifler ve teslim tarihi
 * geçen/yaklaşan işleri periyodik olarak çekip listeler. Ayrı bir "okundu" durumu tutulmaz - liste
 * her zaman mevcut duruma göre canlı hesaplanır. */
export default function BildirimZili() {
  const [bildirimler, setBildirimler] = useState<Bildirim[]>([]);
  const [acik, setAcik] = useState(false);
  const kutuRef = useRef<HTMLDivElement>(null);

  const yukle = () => {
    api.get<Bildirim[]>("/notifications").then(setBildirimler).catch(() => {});
  };

  useEffect(() => {
    yukle();
    const id = setInterval(yukle, YENILEME_ARALIGI_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!acik) return;
    const disariTikla = (e: MouseEvent) => {
      if (kutuRef.current && !kutuRef.current.contains(e.target as Node)) setAcik(false);
    };
    document.addEventListener("mousedown", disariTikla);
    return () => document.removeEventListener("mousedown", disariTikla);
  }, [acik]);

  const kritikSayisi = bildirimler.filter((b) => b.onem === "kritik").length;

  return (
    <div className="relative" ref={kutuRef}>
      <button
        className="relative flex items-center justify-center w-10 h-10 rounded-xl hover:bg-neutral-100 text-xl"
        onClick={() => setAcik((v) => !v)}
        aria-label="Bildirimler"
      >
        🔔
        {bildirimler.length > 0 && (
          <span
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center ${
              kritikSayisi > 0 ? "bg-red-600" : "bg-amber-500"
            }`}
          >
            {bildirimler.length > 9 ? "9+" : bildirimler.length}
          </span>
        )}
      </button>

      {acik && (
        <div className="absolute right-0 md:left-0 md:right-auto mt-2 w-72 sm:w-80 max-h-96 overflow-y-auto bg-white rounded-xl border border-neutral-200 shadow-lg z-50">
          <div className="p-3 border-b border-neutral-100 font-semibold text-sm">Bildirimler</div>
          {bildirimler.length === 0 ? (
            <div className="p-4 text-sm text-neutral-500">Aktif bildirim yok.</div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {bildirimler.map((b) => (
                <Link
                  key={b.id}
                  to={b.link}
                  onClick={() => setAcik(false)}
                  className="flex items-start gap-2 p-3 text-sm hover:bg-neutral-50"
                >
                  <span className="text-lg leading-none">{TUR_IKON[b.tur]}</span>
                  <div className="min-w-0">
                    <div className={`font-semibold ${b.onem === "kritik" ? "text-red-700" : "text-amber-700"}`}>{b.baslik}</div>
                    <div className="text-neutral-600 break-words">{b.mesaj}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
