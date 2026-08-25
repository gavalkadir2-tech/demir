import { SacLevhasi } from "../api/types";
import { sayi } from "../lib/format";

const RENKLER = ["#ea580c", "#2563eb", "#16a34a", "#7c3aed", "#db2777", "#d97706", "#0d9488"];
const MAX_GENISLIK_PX = 320;

/** Bir sac levhanın 2D yerleşim planını (nesting) ölçekli SVG olarak gösterir. */
export default function SacLevhaGorunumu({
  levha,
  sheetWidthMm,
  sheetHeightMm,
  index,
}: {
  levha: SacLevhasi;
  sheetWidthMm: number;
  sheetHeightMm: number;
  index: number;
}) {
  const scale = MAX_GENISLIK_PX / sheetWidthMm;
  const pxW = sheetWidthMm * scale;
  const pxH = sheetHeightMm * scale;

  return (
    <div className="space-y-1">
      <div className="text-sm font-semibold text-neutral-600">
        Levha #{index + 1}{" "}
        <span className="text-neutral-400 font-normal">
          ({sheetWidthMm / 1000}×{sheetHeightMm / 1000} m, {levha.parcalar.length} parça)
        </span>
      </div>
      <svg
        viewBox={`0 0 ${pxW} ${pxH}`}
        width={pxW}
        height={pxH}
        className="border border-neutral-300 rounded-lg bg-neutral-50"
        role="img"
        aria-label={`Levha ${index + 1} yerleşim planı`}
      >
        {levha.parcalar.map((p, i) => (
          <g key={i}>
            <rect
              x={p.xMm * scale}
              y={p.yMm * scale}
              width={p.enMm * scale}
              height={p.boyMm * scale}
              fill={RENKLER[i % RENKLER.length]}
              fillOpacity={0.75}
              stroke="#ffffff"
              strokeWidth={1}
              strokeDasharray={p.donduruldu ? "4 2" : undefined}
            >
              <title>
                {p.label ?? "Parça"}: {sayi(p.enMm)}×{sayi(p.boyMm)} mm
                {p.donduruldu ? " (90° döndürülmüş)" : ""}
              </title>
            </rect>
            {p.enMm * scale > 30 && p.boyMm * scale > 14 && (
              <text
                x={p.xMm * scale + (p.enMm * scale) / 2}
                y={p.yMm * scale + (p.boyMm * scale) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={9}
                fill="#ffffff"
                fontWeight={600}
              >
                {p.donduruldu ? "↻ " : ""}
                {sayi(p.enMm)}×{sayi(p.boyMm)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
