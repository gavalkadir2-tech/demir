import { sayi } from "../lib/format";

export const KOYU = "#404040";
export const VURGU = "#f97316";
export const OK_MARKER_ID = "sema-ok";
export const OK_TERS_MARKER_ID = "sema-ok-ters";

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
