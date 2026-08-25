import { OkTanimlari, YatayOlcu, DikeyOlcu, mmEtiket, PALET, Lejant, VIEW_W, VIEW_H, LEGEND_H } from "./schematicShared";

export interface PergolaSemaVeri {
  genislikMm: number;
  boyMm: number;
  kolonSiraAdedi: number;
  lataYonu: "genislik" | "boy";
  lataSayisi: number;
  gercekLataAralikMm: number;
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 40;
const KOLON_R = 6;

/** Pergolanın üstten (plan) görünüşünü - kolonlar, çevre kirişi ve lata dizilimi - gösterir. */
export default function PergolaSchematic({ veri }: { veri: PergolaSemaVeri }) {
  const { genislikMm, boyMm, kolonSiraAdedi, lataYonu, lataSayisi, gercekLataAralikMm } = veri;
  if (!genislikMm || !boyMm || kolonSiraAdedi < 2) return null;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / genislikMm, drawH / boyMm);

  const scaledW = genislikMm * scale;
  const scaledH = boyMm * scale;
  const x0 = MARGIN_LEFT + (drawW - scaledW) / 2;
  const topY = MARGIN_TOP + (drawH - scaledH) / 2;
  const bottomY = topY + scaledH;

  const kolonXler = Array.from({ length: kolonSiraAdedi }, (_, i) => x0 + (i / (kolonSiraAdedi - 1)) * scaledW);

  const lataCizgileri = Array.from({ length: lataSayisi }, (_, i) => {
    if (lataYonu === "genislik") {
      const y = topY + Math.min(i, lataSayisi - 1) * gercekLataAralikMm * scale;
      return { x1: x0, y1: y, x2: x0 + scaledW, y2: y };
    }
    const x = x0 + Math.min(i, lataSayisi - 1) * gercekLataAralikMm * scale;
    return { x1: x, y1: topY, x2: x, y2: bottomY };
  });

  const dimGenislikY = bottomY + 24;
  const dimBoyX = x0 - 30;

  const lejant = [
    { renk: PALET.ana, etiket: "Kolon" },
    { renk: PALET.yatay, etiket: "Kiriş" },
    { renk: PALET.vurgu, etiket: "Lata" },
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Pergola plan şematik çizimi">
      <OkTanimlari />

      {/* Çevre kirişi */}
      <rect x={x0} y={topY} width={scaledW} height={4} fill={PALET.yatay} />
      <rect x={x0} y={bottomY - 4} width={scaledW} height={4} fill={PALET.yatay} />
      <rect x={x0} y={topY} width={4} height={scaledH} fill={PALET.yatay} opacity={0.5} />
      <rect x={x0 + scaledW - 4} y={topY} width={4} height={scaledH} fill={PALET.yatay} opacity={0.5} />

      {/* Latalar */}
      <g stroke={PALET.vurgu} strokeWidth={2} opacity={0.7}>
        {lataCizgileri.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
        ))}
      </g>

      {/* Kolonlar (ön + arka sıra) */}
      {kolonXler.map((cx, i) => (
        <g key={i}>
          <circle cx={cx} cy={topY} r={KOLON_R} fill={PALET.ana} />
          <circle cx={cx} cy={bottomY} r={KOLON_R} fill={PALET.ana} />
        </g>
      ))}

      <YatayOlcu x1={x0} x2={x0 + scaledW} y={dimGenislikY} etiket={mmEtiket(genislikMm)} />
      <DikeyOlcu y1={topY} y2={bottomY} x={dimBoyX} etiket={mmEtiket(boyMm)} />

      <Lejant kalemler={lejant} y={VIEW_H + 6} />
    </svg>
  );
}
