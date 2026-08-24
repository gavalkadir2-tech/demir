import { OkTanimlari, YatayOlcu, DikeyOlcu, mmEtiket, PALET, Lejant, VIEW_W, VIEW_H, LEGEND_H } from "./schematicShared";

export interface MerdivenSemaVeri {
  katYuksekligiMm: number;
  basamakDerinligiMm: number;
  basamakSayisi: number;
  gercekBasamakYuksekligiMm: number;
  kosegenMm?: number;
  egimAcisiDerece?: number;
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 60;

/** Merdivenin yandan görünüşünü (basamak silueti) ölçekli, ölçüleri etiketli SVG olarak gösterir. */
export default function StairsSchematic({ veri }: { veri: MerdivenSemaVeri }) {
  const { katYuksekligiMm, basamakDerinligiMm, basamakSayisi, gercekBasamakYuksekligiMm, kosegenMm, egimAcisiDerece } = veri;

  if (!katYuksekligiMm || !basamakDerinligiMm || basamakSayisi < 1) return null;

  const toplamDerinlikMm = basamakSayisi * basamakDerinligiMm;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / toplamDerinlikMm, drawH / katYuksekligiMm);

  const scaledRun = toplamDerinlikMm * scale;
  const scaledRise = katYuksekligiMm * scale;
  const stepD = basamakDerinligiMm * scale;
  const stepH = gercekBasamakYuksekligiMm * scale;

  const x0 = MARGIN_LEFT;
  const groundY = MARGIN_TOP + drawH;
  const topY = groundY - scaledRise;

  let x = x0;
  let y = groundY;
  const noktalar: string[] = [`${x0},${groundY}`];
  for (let i = 0; i < basamakSayisi; i++) {
    y -= stepH;
    noktalar.push(`${x},${y}`);
    x += stepD;
    noktalar.push(`${x},${y}`);
  }
  noktalar.push(`${x},${groundY}`); // sağ alt köşeye in
  const cizgiNoktalari = noktalar.slice(0, -1).join(" ");
  const doluAlan = [...noktalar, `${x0},${groundY}`].join(" ");

  const dimDerinlikY = groundY + 30;
  const dimYukseklikX = x0 - 30;

  const lejant = [
    { renk: PALET.ana, etiket: "Basamak" },
    { renk: PALET.destek, etiket: "Taşıyıcı (kiriş)" },
  ];

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`}
      className="w-full h-auto"
      role="img"
      aria-label="Merdiven şematik çizimi"
    >
      <OkTanimlari />

      <line x1={x0 - 15} y1={groundY} x2={x + 15} y2={groundY} stroke="#a3a3a3" strokeWidth={2} />

      {/* Basamak silueti */}
      <polygon points={doluAlan} fill="#e5e5e5" stroke="none" />
      <polyline points={cizgiNoktalari} fill="none" stroke={PALET.ana} strokeWidth={2.5} />
      {/* Taşıyıcı diyagonal (yaklaşık) */}
      <line x1={x0} y1={groundY} x2={x} y2={topY} stroke={PALET.destek} strokeWidth={2} strokeDasharray="4 3" />

      <YatayOlcu x1={x0} x2={x} y={dimDerinlikY} etiket={mmEtiket(toplamDerinlikMm)} />
      <DikeyOlcu y1={topY} y2={groundY} x={dimYukseklikX} etiket={mmEtiket(katYuksekligiMm)} />

      <text x={(x0 + x) / 2} y={topY - 10} textAnchor="middle" fontSize={12} fill="#525252">
        {basamakSayisi} basamak × ({mmEtiket(basamakDerinligiMm)} × {mmEtiket(gercekBasamakYuksekligiMm)})
      </text>
      {(kosegenMm || egimAcisiDerece) && (
        <text
          x={(x0 + x) / 2 + 40}
          y={(topY + groundY) / 2 - 10}
          textAnchor="middle"
          fontSize={11}
          fill={PALET.destek}
          transform={`rotate(${-Math.atan2(groundY - topY, x - x0) * (180 / Math.PI)} ${(x0 + x) / 2 + 40} ${
            (topY + groundY) / 2 - 10
          })`}
        >
          {kosegenMm ? `kiriş: ${mmEtiket(kosegenMm)}` : ""}
          {kosegenMm && egimAcisiDerece ? " · " : ""}
          {egimAcisiDerece ? `${Math.round(egimAcisiDerece)}°` : ""}
        </text>
      )}

      <Lejant kalemler={lejant} y={VIEW_H + 6} />
    </svg>
  );
}
