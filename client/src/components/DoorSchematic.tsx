import { OkTanimlari, YatayOlcu, DikeyOlcu, mmEtiket, PALET, Lejant, VIEW_W, VIEW_H, LEGEND_H } from "./schematicShared";

export interface KapiSemaVeri {
  genislikMm: number;
  yukseklikMm: number;
  kanatGenislikMm: number;
  kanatYukseklikMm: number;
  araKayitSayisi?: number;
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 60;
const KASA_KALINLIK = 6;

/** Kapının önden görünüşünü (kasa + kanat) ölçekli, ölçüleri etiketli SVG olarak gösterir. */
export default function DoorSchematic({ veri }: { veri: KapiSemaVeri }) {
  const { genislikMm, yukseklikMm, kanatGenislikMm, kanatYukseklikMm, araKayitSayisi = 0 } = veri;
  if (!genislikMm || !yukseklikMm) return null;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / genislikMm, drawH / yukseklikMm);

  const scaledW = genislikMm * scale;
  const scaledH = yukseklikMm * scale;
  const x0 = MARGIN_LEFT;
  const topY = MARGIN_TOP + (drawH - scaledH);
  const groundY = topY + scaledH;

  const offsetX = ((genislikMm - kanatGenislikMm) / 2) * scale;
  const offsetY = ((yukseklikMm - kanatYukseklikMm) / 2) * scale;
  const kanatX = x0 + offsetX;
  const kanatY = topY + offsetY;
  const kanatW = kanatGenislikMm * scale;
  const kanatH = kanatYukseklikMm * scale;

  const araKayitYlar =
    araKayitSayisi > 0
      ? Array.from({ length: araKayitSayisi }, (_, i) => kanatY + ((i + 1) / (araKayitSayisi + 1)) * kanatH)
      : [];

  const dimGenislikY = groundY + 30;
  const dimYukseklikX = x0 - 30;

  const lejant = [
    { renk: PALET.ana, etiket: "Kasa" },
    { renk: PALET.yatay, etiket: "Kanat" },
    ...(araKayitSayisi > 0 ? [{ renk: PALET.vurgu, etiket: "Ara Kayıt" }] : []),
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Kapı şematik çizimi">
      <OkTanimlari />

      {/* Kasa (dış çerçeve) */}
      <rect x={x0} y={topY} width={scaledW} height={scaledH} fill="none" stroke={PALET.ana} strokeWidth={KASA_KALINLIK} />
      {/* Kanat (kapı kanadı) */}
      <rect x={kanatX} y={kanatY} width={kanatW} height={kanatH} fill="#f5f5f5" stroke={PALET.yatay} strokeWidth={3} />
      {/* Ara kayıt(lar) */}
      {araKayitYlar.map((y, i) => (
        <line key={i} x1={kanatX} y1={y} x2={kanatX + kanatW} y2={y} stroke={PALET.vurgu} strokeWidth={3} />
      ))}
      {/* Kol/kilit göstergesi */}
      <circle cx={kanatX + kanatW - 20} cy={kanatY + kanatH / 2} r={4} fill={PALET.ana} />

      <YatayOlcu x1={x0} x2={x0 + scaledW} y={dimGenislikY} etiket={mmEtiket(genislikMm)} />
      <DikeyOlcu y1={topY} y2={groundY} x={dimYukseklikX} etiket={mmEtiket(yukseklikMm)} />

      <text x={kanatX + kanatW / 2} y={kanatY + kanatH / 2 - 10} textAnchor="middle" fontSize={11} fill="#737373">
        kanat: {mmEtiket(kanatGenislikMm)} × {mmEtiket(kanatYukseklikMm)}
      </text>

      <Lejant kalemler={lejant} y={VIEW_H + 6} />
    </svg>
  );
}
