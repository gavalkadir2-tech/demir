import { OkTanimlari, YatayOlcu, DikeyOlcu, mmEtiket, KOYU, VURGU, VIEW_W, VIEW_H } from "./schematicShared";

export interface KorkulukSemaVeri {
  toplamUzunlukMm: number;
  yukseklikMm: number;
  dikmeSayisi: number;
  araliklarSayisi: number;
  gercekAralikMm: number;
  araKayitSayisi?: number;
}

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
      <OkTanimlari />

      {/* Zemin çizgisi */}
      <line x1={x0 - 15} y1={groundY} x2={x0 + scaledW + 15} y2={groundY} stroke="#a3a3a3" strokeWidth={2} />

      {/* Dikmeler */}
      {postXs.map((px, i) => (
        <rect key={i} x={px - POST_WIDTH / 2} y={topY} width={POST_WIDTH} height={scaledH} fill={KOYU} />
      ))}

      {/* Üst profil */}
      <rect x={x0} y={topY} width={scaledW} height={RAIL_THICKNESS} fill={KOYU} />
      {/* Alt profil */}
      <rect x={x0} y={groundY - RAIL_THICKNESS} width={scaledW} height={RAIL_THICKNESS} fill={KOYU} />
      {/* Ara kayıt(lar) */}
      {araKayitYlar.map((y, i) => (
        <rect key={i} x={x0} y={y - RAIL_THICKNESS / 2} width={scaledW} height={RAIL_THICKNESS} fill={VURGU} />
      ))}

      <YatayOlcu x1={x0} x2={x0 + scaledW} y={dimUzunlukY} etiket={mmEtiket(toplamUzunlukMm)} />
      <DikeyOlcu y1={topY} y2={groundY} x={dimYukseklikX} etiket={mmEtiket(yukseklikMm)} />

      {/* Dikme aralığı ölçüsü (ilk iki dikme arası) */}
      {postXs.length > 1 && (
        <YatayOlcu
          x1={postXs[0]}
          x2={postXs[1]}
          y={topY - 14}
          etiket={mmEtiket(gercekAralikMm)}
          etiketAltta={false}
          fontSize={11}
          kalin={false}
        />
      )}
    </svg>
  );
}
