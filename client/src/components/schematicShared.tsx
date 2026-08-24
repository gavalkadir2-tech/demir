import { sayi } from "../lib/format";

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
