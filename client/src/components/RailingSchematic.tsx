import { sayi } from "../lib/format";

export interface KorkulukSemaVeri {
  toplamUzunlukMm: number;
  yukseklikMm: number;
  dikmeSayisi: number;
  araliklarSayisi: number;
  gercekAralikMm: number;
  araKayitSayisi?: number;
}

const VIEW_W = 640;
const VIEW_H = 320;
const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 70;
const RAIL_THICKNESS = 5;
const POST_WIDTH = 6;

/** Korkuluğun önden görünüşünü ölçekli, ölçüleri etiketli basit bir SVG çizim olarak gösterir. */
export default function RailingSchematic({ veri }: { veri: KorkulukSemaVeri }) {
  const { toplamUzunlukMm, yukseklikMm, dikmeSayisi, araliklarSayisi, gercekAralikMm, araKayitSayisi = 0 } = veri;

  if (!toplamUzunlukMm || !yukseklikMm || dikmeSayisi < 2) return null;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / toplamUzunlukMm, drawH / yukseklikMm);

  const scaledW = toplamUzunlukMm * scale;
  const scaledH = yukseklikMm * scale;
  const x0 = MARGIN_LEFT;
  const topY = MARGIN_TOP + (drawH - scaledH); // dikey ortalama, çizim tabana yaslı
  const groundY = topY + scaledH;

  const postXs = Array.from({ length: dikmeSayisi }, (_, i) => x0 + Math.min(i, araliklarSayisi) * gercekAralikMm * scale);

  const araKayitYlar =
    araKayitSayisi > 0
      ? Array.from({ length: araKayitSayisi }, (_, i) => {
          const oran = (i + 1) / (araKayitSayisi + 1);
          return topY + RAIL_THICKNESS + oran * (scaledH - 2 * RAIL_THICKNESS);
        })
      : [];

  const dimUzunlukY = groundY + 30;
  const dimYukseklikX = x0 - 30;

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-auto" role="img" aria-label="Korkuluk şematik çizimi">
      <defs>
        <marker id="ok" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#404040" />
        </marker>
        <marker id="ok-ters" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 Z" fill="#404040" />
        </marker>
      </defs>

      {/* Zemin çizgisi */}
      <line x1={x0 - 15} y1={groundY} x2={x0 + scaledW + 15} y2={groundY} stroke="#a3a3a3" strokeWidth={2} />

      {/* Dikmeler */}
      {postXs.map((px, i) => (
        <rect key={i} x={px - POST_WIDTH / 2} y={topY} width={POST_WIDTH} height={scaledH} fill="#404040" />
      ))}

      {/* Üst profil */}
      <rect x={x0} y={topY} width={scaledW} height={RAIL_THICKNESS} fill="#404040" />
      {/* Alt profil */}
      <rect x={x0} y={groundY - RAIL_THICKNESS} width={scaledW} height={RAIL_THICKNESS} fill="#404040" />
      {/* Ara kayıt(lar) */}
      {araKayitYlar.map((y, i) => (
        <rect key={i} x={x0} y={y - RAIL_THICKNESS / 2} width={scaledW} height={RAIL_THICKNESS} fill="#f97316" />
      ))}

      {/* Toplam uzunluk ölçüsü */}
      <line
        x1={x0}
        y1={dimUzunlukY}
        x2={x0 + scaledW}
        y2={dimUzunlukY}
        stroke="#404040"
        strokeWidth={1}
        markerStart="url(#ok-ters)"
        markerEnd="url(#ok)"
      />
      <text x={x0 + scaledW / 2} y={dimUzunlukY + 16} textAnchor="middle" fontSize={13} fill="#262626" fontWeight={600}>
        {sayi(toplamUzunlukMm)} mm
      </text>

      {/* Yükseklik ölçüsü */}
      <line
        x1={dimYukseklikX}
        y1={topY}
        x2={dimYukseklikX}
        y2={groundY}
        stroke="#404040"
        strokeWidth={1}
        markerStart="url(#ok-ters)"
        markerEnd="url(#ok)"
      />
      <text
        x={dimYukseklikX - 10}
        y={(topY + groundY) / 2}
        textAnchor="middle"
        fontSize={13}
        fill="#262626"
        fontWeight={600}
        transform={`rotate(-90 ${dimYukseklikX - 10} ${(topY + groundY) / 2})`}
      >
        {sayi(yukseklikMm)} mm
      </text>

      {/* Dikme aralığı ölçüsü (ilk iki dikme arası) */}
      {postXs.length > 1 && (
        <>
          <line
            x1={postXs[0]}
            y1={topY - 14}
            x2={postXs[1]}
            y2={topY - 14}
            stroke="#9ca3af"
            strokeWidth={1}
            markerStart="url(#ok-ters)"
            markerEnd="url(#ok)"
          />
          <text x={(postXs[0] + postXs[1]) / 2} y={topY - 18} textAnchor="middle" fontSize={11} fill="#737373">
            {sayi(gercekAralikMm)} mm
          </text>
        </>
      )}
    </svg>
  );
}
