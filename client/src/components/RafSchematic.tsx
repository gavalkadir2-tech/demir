import { OkTanimlari, YatayOlcu, DikeyOlcu, mmEtiket, PALET, Lejant, VIEW_W, VIEW_H, LEGEND_H } from "./schematicShared";

export interface RafSemaVeri {
  genislikMm: number;
  derinlikMm: number;
  yukseklikMm: number;
  rafSayisi: number;
  rafAraligiMm?: number;
  sacVar?: boolean;
  caprazVar?: boolean;
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 60;
const AYAK_GENISLIK = 6;
const RAF_KALINLIK = 5;

/** Rafın önden görünüşünü (ayaklar + raf seviyeleri) ölçekli, ölçüleri etiketli SVG olarak gösterir. */
export default function RafSchematic({ veri }: { veri: RafSemaVeri }) {
  const { genislikMm, yukseklikMm, rafSayisi, sacVar = false, caprazVar = false } = veri;
  if (!genislikMm || !yukseklikMm || rafSayisi < 2) return null;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / genislikMm, drawH / yukseklikMm);

  const scaledW = genislikMm * scale;
  const scaledH = yukseklikMm * scale;
  const x0 = MARGIN_LEFT;
  const topY = MARGIN_TOP + (drawH - scaledH);
  const groundY = topY + scaledH;

  const rafYlar = Array.from({ length: rafSayisi }, (_, i) => groundY - (i / (rafSayisi - 1)) * scaledH);

  const dimGenislikY = groundY + 30;
  const dimYukseklikX = x0 - 30;

  const lejant = [
    { renk: PALET.ana, etiket: "Ayak" },
    { renk: PALET.yatay, etiket: "Raf Çerçevesi" },
    ...(sacVar ? [{ renk: PALET.vurgu, etiket: "Raf Plakası" }] : []),
    ...(caprazVar ? [{ renk: PALET.stabilite, etiket: "Stabilite Çaprazı" }] : []),
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Raf şematik çizimi">
      <OkTanimlari />

      <line x1={x0 - 15} y1={groundY} x2={x0 + scaledW + 15} y2={groundY} stroke="#a3a3a3" strokeWidth={2} />

      {caprazVar && (
        <g stroke={PALET.stabilite} strokeWidth={2}>
          <line x1={x0} y1={groundY} x2={x0 + scaledW} y2={topY} />
          <line x1={x0} y1={topY} x2={x0 + scaledW} y2={groundY} />
        </g>
      )}

      {/* Ayaklar (önden görünüşte sol + sağ) */}
      <rect x={x0 - AYAK_GENISLIK / 2} y={topY} width={AYAK_GENISLIK} height={scaledH} fill={PALET.ana} />
      <rect x={x0 + scaledW - AYAK_GENISLIK / 2} y={topY} width={AYAK_GENISLIK} height={scaledH} fill={PALET.ana} />

      {/* Raf seviyeleri */}
      {rafYlar.map((y, i) => (
        <g key={i}>
          {sacVar && <rect x={x0} y={y - RAF_KALINLIK} width={scaledW} height={RAF_KALINLIK} fill={PALET.vurgu} opacity={0.6} />}
          <rect x={x0} y={y - RAF_KALINLIK / 2} width={scaledW} height={RAF_KALINLIK} fill={PALET.yatay} />
        </g>
      ))}

      <YatayOlcu x1={x0} x2={x0 + scaledW} y={dimGenislikY} etiket={mmEtiket(genislikMm)} />
      <DikeyOlcu y1={topY} y2={groundY} x={dimYukseklikX} etiket={mmEtiket(yukseklikMm)} />

      <text x={x0 + scaledW + 10} y={rafYlar[0]} textAnchor="start" fontSize={10} fill="#a3a3a3">
        {rafSayisi} raf seviyesi
      </text>

      <Lejant kalemler={lejant} y={VIEW_H + 6} />
    </svg>
  );
}
