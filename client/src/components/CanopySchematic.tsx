import { OkTanimlari, YatayOlcu, DikeyOlcu, mmEtiket, PALET, Lejant, VIEW_W, VIEW_H, LEGEND_H } from "./schematicShared";

export interface SundurmaSemaVeri {
  yukseklikMm: number;
  boyMm: number;
  egimYuzde: number;
  kirisUzunlukMm?: number;
  egimDerece?: number;
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 30;
const MARGIN_TOP = 40;
const MARGIN_BOTTOM = 60;

/** Sundurmanın yandan (kesit) görünüşünü ölçekli, ölçüleri etiketli SVG olarak gösterir. */
export default function CanopySchematic({ veri }: { veri: SundurmaSemaVeri }) {
  const { yukseklikMm, boyMm, egimYuzde, kirisUzunlukMm, egimDerece } = veri;
  if (!yukseklikMm || !boyMm) return null;

  const yukselisMm = boyMm * (egimYuzde / 100);
  const arkaYukseklikMm = yukseklikMm + yukselisMm;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / boyMm, drawH / arkaYukseklikMm);

  const scaledBoy = boyMm * scale;
  const x0 = MARGIN_LEFT;
  const groundY = MARGIN_TOP + drawH;
  const onTopY = groundY - yukseklikMm * scale;
  const arkaX = x0 + scaledBoy;
  const arkaTopY = groundY - arkaYukseklikMm * scale;

  const gövde = `${x0},${groundY} ${x0},${onTopY} ${arkaX},${arkaTopY} ${arkaX},${groundY}`;

  const dimBoyY = groundY + 30;
  const dimYukseklikX = x0 - 30;

  const lejant = [
    { renk: PALET.ana, etiket: "Ön Dikme" },
    { renk: PALET.yatay, etiket: "Ana Kiriş" },
    { renk: PALET.ikincil, etiket: "Arka Destek/Duvar" },
  ];

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`}
      className="w-full h-auto"
      role="img"
      aria-label="Sundurma şematik çizimi"
    >
      <OkTanimlari />
      <text x={x0} y={MARGIN_TOP - 15} fontSize={11} fill="#a3a3a3">
        Yandan görünüş
      </text>

      <line x1={x0 - 15} y1={groundY} x2={arkaX + 15} y2={groundY} stroke="#a3a3a3" strokeWidth={2} />

      <polygon points={gövde} fill="#e5e5e5" stroke="none" />
      <line x1={x0} y1={groundY} x2={x0} y2={onTopY} stroke={PALET.ana} strokeWidth={3} />
      <line x1={x0} y1={onTopY} x2={arkaX} y2={arkaTopY} stroke={PALET.yatay} strokeWidth={3} />
      <line x1={arkaX} y1={arkaTopY} x2={arkaX} y2={groundY} stroke={PALET.ikincil} strokeWidth={3} strokeDasharray="5 3" />

      <YatayOlcu x1={x0} x2={arkaX} y={dimBoyY} etiket={mmEtiket(boyMm)} />
      <DikeyOlcu y1={onTopY} y2={groundY} x={dimYukseklikX} etiket={mmEtiket(yukseklikMm)} />

      <text x={(x0 + arkaX) / 2} y={(onTopY + arkaTopY) / 2 - 8} textAnchor="middle" fontSize={12} fill="#525252">
        eğim %{egimYuzde}
      </text>
      {kirisUzunlukMm && (
        <text
          x={(x0 + arkaX) / 2}
          y={(onTopY + arkaTopY) / 2 + 16}
          textAnchor="middle"
          fontSize={11}
          fill={PALET.yatay}
          transform={`rotate(${-Math.atan2(onTopY - arkaTopY, arkaX - x0) * (180 / Math.PI)} ${(x0 + arkaX) / 2} ${
            (onTopY + arkaTopY) / 2 + 16
          })`}
        >
          kiriş: {mmEtiket(kirisUzunlukMm)}
          {egimDerece ? ` · ${Math.round(egimDerece)}°` : ""}
        </text>
      )}

      <Lejant kalemler={lejant} y={VIEW_H + 6} />
    </svg>
  );
}
