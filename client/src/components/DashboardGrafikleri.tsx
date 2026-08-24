import { AylikTrendVeri, KategoriKarliligiVeri, EnCokKullanilanMalzeme, KATEGORI_ETIKET } from "../api/types";
import { tl, sayi } from "../lib/format";

const RENK_CIRO = "#ea580c"; // marka rengi (brand-600)
const RENK_KAR = "#16a34a"; // yeşil - kâr

/** Aylık ciro/kâr trendini gruplu çubuk grafik olarak gösterir (tek eksen, iki seri). */
export function AylikTrendGrafik({ veri }: { veri: AylikTrendVeri[] }) {
  const maks = Math.max(1, ...veri.map((v) => Math.max(v.ciro, v.kar)));
  const W = 640;
  const H = 220;
  const marginBottom = 30;
  const marginTop = 10;
  const plotH = H - marginBottom - marginTop;
  const grupGenislik = W / veri.length;
  const barGenislik = Math.min(28, grupGenislik / 3.2);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Aylık ciro ve kâr trendi">
        <line x1={0} y1={H - marginBottom} x2={W} y2={H - marginBottom} stroke="#e5e5e5" strokeWidth={1} />
        {veri.map((v, i) => {
          const cx = i * grupGenislik + grupGenislik / 2;
          const ciroH = (v.ciro / maks) * plotH;
          const karH = (v.kar / maks) * plotH;
          return (
            <g key={i}>
              <rect
                x={cx - barGenislik - 2}
                y={H - marginBottom - ciroH}
                width={barGenislik}
                height={ciroH}
                rx={2}
                fill={RENK_CIRO}
              >
                <title>
                  {v.ay}: Ciro {tl(v.ciro)}
                </title>
              </rect>
              <rect x={cx + 2} y={H - marginBottom - karH} width={barGenislik} height={karH} rx={2} fill={RENK_KAR}>
                <title>
                  {v.ay}: Kâr {tl(v.kar)}
                </title>
              </rect>
              <text x={cx} y={H - marginBottom + 16} textAnchor="middle" fontSize={11} fill="#737373">
                {v.ay}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex gap-4 justify-center mt-2 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: RENK_CIRO }} /> Ciro
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: RENK_KAR }} /> Kâr
        </span>
      </div>
    </div>
  );
}

/** Tek seri, yatay çubuk grafik - kategori/malzeme kıyaslamaları için. */
export function YatayBarGrafik({
  kalemler,
  renk = "#2563eb",
  birim = "",
}: {
  kalemler: { etiket: string; deger: number; altEtiket?: string }[];
  renk?: string;
  birim?: string;
}) {
  if (kalemler.length === 0) return <div className="text-sm text-neutral-500">Henüz veri yok.</div>;
  const maks = Math.max(...kalemler.map((k) => k.deger), 1);
  return (
    <div className="space-y-2.5">
      {kalemler.map((k, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="font-medium text-neutral-700">{k.etiket}</span>
            <span className="font-semibold text-neutral-600">
              {sayi(k.deger)} {birim}
            </span>
          </div>
          <div className="h-3 rounded-full bg-neutral-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(4, (k.deger / maks) * 100)}%`, background: renk }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function kategoriKarliligiKalemleri(veri: KategoriKarliligiVeri[]) {
  return veri.map((v) => ({ etiket: KATEGORI_ETIKET[v.kategori], deger: v.ciro }));
}

export function enCokKullanilanKalemleri(veri: EnCokKullanilanMalzeme[]) {
  return veri.map((v) => ({ etiket: v.name, deger: v.toplamMetre }));
}
