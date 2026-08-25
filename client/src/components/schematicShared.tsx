import { sayi } from "../lib/format";
import { Material } from "../api/types";

const KOYU = "#404040";
export const OK_MARKER_ID = "sema-ok";
export const OK_TERS_MARKER_ID = "sema-ok-ters";

/** Parça tipine göre tutarlı renk paleti - tüm şema çizimlerinde aynı anlamda kullanılır. */
export const PALET = {
  ana: "#404040", // ana taşıyıcı / dikme / kasa - koyu gri
  yatay: "#2563eb", // yatay ray / profil / başlık - mavi
  vurgu: "#f97316", // ikincil / ara eleman (ara kayıt, lento, eşik) - turuncu
  destek: "#16a34a", // çapraz / destek elemanı - yeşil
  ikincil: "#7c3aed", // özel eleman (kral kirişi, kanat, aşık) - mor
  stabilite: "#dc2626", // stabilite/rüzgar-deprem çaprazı - kırmızı
} as const;

export interface LejantKalemi {
  renk: string;
  etiket: string;
}

export const LEGEND_H = 32;

/** Şema altında, kullanılan renklerin ne anlama geldiğini gösteren küçük bir lejant. */
export function Lejant({ kalemler, y }: { kalemler: LejantKalemi[]; y: number }) {
  if (kalemler.length === 0) return null;
  const itemW = Math.min(170, (VIEW_W - 20) / kalemler.length);
  const startX = (VIEW_W - itemW * kalemler.length) / 2;
  return (
    <g>
      {kalemler.map((k, i) => (
        <g key={i} transform={`translate(${startX + i * itemW}, ${y})`}>
          <rect x={0} y={0} width={12} height={12} rx={2} fill={k.renk} />
          <text x={18} y={10} fontSize={11} fill="#525252">
            {k.etiket}
          </text>
        </g>
      ))}
    </g>
  );
}

/** Ölçü çizgilerinde kullanılan ok başı tanımları. Her şema SVG'sinde bir kez <defs> içine konur. */
export function OkTanimlari() {
  return (
    <defs>
      <marker id={OK_MARKER_ID} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill={KOYU} />
      </marker>
      <marker id={OK_TERS_MARKER_ID} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
        <path d="M0,0 L8,4 L0,8 Z" fill={KOYU} />
      </marker>
    </defs>
  );
}

const okProps = { markerStart: `url(#${OK_TERS_MARKER_ID})`, markerEnd: `url(#${OK_MARKER_ID})` };

/** Yatay ölçü çizgisi: x1'den x2'ye, y yüksekliğinde, altında/üstünde etiketli. */
export function YatayOlcu({
  x1,
  x2,
  y,
  etiket,
  etiketAltta = true,
  fontSize = 13,
  kalin = true,
}: {
  x1: number;
  x2: number;
  y: number;
  etiket: string;
  etiketAltta?: boolean;
  fontSize?: number;
  kalin?: boolean;
}) {
  return (
    <>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={KOYU} strokeWidth={1} {...okProps} />
      <text
        x={(x1 + x2) / 2}
        y={etiketAltta ? y + fontSize + 3 : y - 6}
        textAnchor="middle"
        fontSize={fontSize}
        fill="#262626"
        fontWeight={kalin ? 600 : 400}
      >
        {etiket}
      </text>
    </>
  );
}

/** Dikey ölçü çizgisi: y1'den y2'ye, x konumunda, sola doğru döndürülmüş etiketli. */
export function DikeyOlcu({
  y1,
  y2,
  x,
  etiket,
  fontSize = 13,
}: {
  y1: number;
  y2: number;
  x: number;
  etiket: string;
  fontSize?: number;
}) {
  const midY = (y1 + y2) / 2;
  return (
    <>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={KOYU} strokeWidth={1} {...okProps} />
      <text
        x={x - 10}
        y={midY}
        textAnchor="middle"
        fontSize={fontSize}
        fill="#262626"
        fontWeight={600}
        transform={`rotate(-90 ${x - 10} ${midY})`}
      >
        {etiket}
      </text>
    </>
  );
}

export const mmEtiket = (n: number): string => `${sayi(n)} mm`;

export const VIEW_W = 640;
export const VIEW_H = 320;

// --- Malzeme ölçüsüne dayalı, ölçekli çizim yardımcıları ---------------------------------------
// Amaç: şema çizimlerindeki profil/kesit kalınlıklarının, önceden olduğu gibi sabit piksel
// değerleri yerine kullanıcının gerçekten seçtiği malzemenin gerçek en/kalınlık ölçüsünü,
// çizimin genel ölçeğiyle tutarlı biçimde yansıtması.

export interface KesitOlcusu {
  /** Görünen (geniş) yüz ölçüsü, mm */
  enMm: number;
  /** Derinlik / et kalınlığı yönü, mm */
  kalinlikMm: number;
}

const VARSAYILAN_KESIT: KesitOlcusu = { enMm: 40, kalinlikMm: 40 };

/** Bir Material kaydından şematik çizim için kesit ölçüsü çıkarır. Malzeme seçilmemişse veya
 * ölçü verisi eksikse makul bir varsayılana düşer (eski sabit piksel değerlerinin yerini alır). */
export function kesitOlcusu(material?: Material | null, varsayilan: KesitOlcusu = VARSAYILAN_KESIT): KesitOlcusu {
  if (!material) return varsayilan;
  const en = material.widthMm ?? varsayilan.enMm;
  const kalinlik = material.heightMm ?? material.thicknessMm ?? en;
  return { enMm: en, kalinlikMm: kalinlik };
}

/** Gerçek mm ölçüsünü verilen çizim ölçeğinde piksele çevirir; çok ince profillerin görünmez
 * olmaması için en az minPx genişlikte tutar. */
export function olcekliKalinlikPx(gercekMm: number, scale: number, minPx = 1.5): number {
  return Math.max(minPx, gercekMm * scale);
}

// --- Çoklu açı görünüm sekmesi ----------------------------------------------------------------

export type SemaGorunumTipi = "on" | "yan" | "ust" | "3d";

export const GORUNUM_ETIKET: Record<SemaGorunumTipi, string> = {
  on: "Önden",
  yan: "Yandan",
  ust: "Üstten",
  "3d": "3D",
};

/** Şema çizimlerinin üstünde, "Önden / Yandan / Üstten / 3D" gibi görünüm açısı seçimi yapılan
 * küçük bir sekme çubuğu. Tek seçenek varsa hiçbir şey render etmez. */
export function GorunumSekmeleri({
  aktif,
  onSec,
  secenekler,
}: {
  aktif: SemaGorunumTipi;
  onSec: (g: SemaGorunumTipi) => void;
  secenekler: SemaGorunumTipi[];
}) {
  if (secenekler.length <= 1) return null;
  return (
    <div className="flex gap-1 mb-2 flex-wrap">
      {secenekler.map((g) => (
        <button
          key={g}
          type="button"
          onClick={() => onSec(g)}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition ${
            aktif === g
              ? "bg-neutral-800 text-white border-neutral-800"
              : "bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50"
          }`}
        >
          {GORUNUM_ETIKET[g]}
        </button>
      ))}
    </div>
  );
}

// --- Genel izometrik 3D sahne render helper'ı -------------------------------------------------
// X: uzunluk ekseni, Y: yükseklik ekseni, Z: derinlik ekseni varsayımıyla 30° izometrik
// projeksiyon. Her şablonun 3D görünümü, bu ortak render motoruna sadece bir "kiriş" (çubuk/beam)
// listesi ve opsiyonel dolgu yüzeyleri vererek kendi 3D sahnesini tanımlar.

export type Nokta3D = readonly [number, number, number];

export interface Kiris3D {
  a: Nokta3D;
  b: Nokta3D;
  /** Gerçek kesit ölçüsü (mm) - çizgi kalınlığına ölçekli olarak yansır. */
  enMm: number;
  renk: string;
  kesikli?: boolean;
  /** Segment ortasına yazılacak opsiyonel etiket (örn. uzunluk). Kalabalığı önlemek için sadece
   * temsili elemanlara verilmeli. */
  etiket?: string;
}

export interface Yuzey3D {
  noktalar: Nokta3D[];
  fill: string;
  fillOpacity?: number;
}

const IZO_COS30 = Math.cos(Math.PI / 6);
const IZO_SIN30 = Math.sin(Math.PI / 6);

export function izoProjeksiyon(x: number, y: number, z: number): { sx: number; sy: number } {
  return { sx: (x - z) * IZO_COS30, sy: (x + z) * IZO_SIN30 - y };
}

/** Bir 3D kiriş/çubuk listesini (opsiyonel dolgu yüzeylerle) otomatik ölçek/kadrajla izometrik
 * SVG sahnesi olarak render eder. Gerçek kesit kalınlıkları çizgi kalınlığına yansıtılır. */
export function Izometrik3DSahne({
  kirisler,
  yuzeyler = [],
  lejant = [],
  ariaLabel,
  viewW = VIEW_W,
  viewH = VIEW_H,
  margin = 40,
}: {
  kirisler: Kiris3D[];
  yuzeyler?: Yuzey3D[];
  lejant?: LejantKalemi[];
  ariaLabel: string;
  viewW?: number;
  viewH?: number;
  margin?: number;
}) {
  if (kirisler.length === 0) return null;

  const tumNoktalar: Nokta3D[] = [...kirisler.flatMap((k) => [k.a, k.b]), ...yuzeyler.flatMap((y) => y.noktalar)];
  const projeli = tumNoktalar.map((p) => izoProjeksiyon(p[0], p[1], p[2]));
  const minX = Math.min(...projeli.map((p) => p.sx));
  const maxX = Math.max(...projeli.map((p) => p.sx));
  const minY = Math.min(...projeli.map((p) => p.sy));
  const maxY = Math.max(...projeli.map((p) => p.sy));

  const drawW = viewW - 2 * margin;
  const drawH = viewH - 2 * margin;
  const scale = Math.min(drawW / (maxX - minX || 1), drawH / (maxY - minY || 1));
  const offX = margin - minX * scale;
  const offY = margin - minY * scale;
  const S = (p: Nokta3D) => {
    const { sx, sy } = izoProjeksiyon(p[0], p[1], p[2]);
    return { x: sx * scale + offX, y: sy * scale + offY };
  };

  return (
    <svg
      viewBox={`0 0 ${viewW} ${viewH + (lejant.length ? LEGEND_H : 0)}`}
      className="w-full h-auto"
      role="img"
      aria-label={ariaLabel}
    >
      {yuzeyler.map((y, i) => (
        <polygon
          key={i}
          points={y.noktalar
            .map((p) => {
              const s = S(p);
              return `${s.x},${s.y}`;
            })
            .join(" ")}
          fill={y.fill}
          fillOpacity={y.fillOpacity ?? 0.25}
          stroke="none"
        />
      ))}
      {kirisler.map((k, i) => {
        const a = S(k.a);
        const b = S(k.b);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const aci = Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
        return (
          <g key={i}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={k.renk}
              strokeWidth={olcekliKalinlikPx(k.enMm, scale, 1.5)}
              strokeLinecap="round"
              strokeDasharray={k.kesikli ? "5 3" : undefined}
            />
            {k.etiket && (
              <text
                x={mid.x}
                y={mid.y - 5}
                textAnchor="middle"
                fontSize={9.5}
                fill="#262626"
                fontWeight={600}
                transform={`rotate(${aci} ${mid.x} ${mid.y - 5})`}
              >
                {k.etiket}
              </text>
            )}
          </g>
        );
      })}
      {lejant.length > 0 && <Lejant kalemler={lejant} y={viewH + 6} />}
    </svg>
  );
}
