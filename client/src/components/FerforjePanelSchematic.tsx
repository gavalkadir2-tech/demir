import { OkTanimlari, YatayOlcu, DikeyOlcu, mmEtiket, PALET, Lejant, VIEW_W, VIEW_H, LEGEND_H } from "./schematicShared";

export interface FerforjePanelSemaVeri {
  genislikMm: number;
  yukseklikMm: number;
  dikeyCubukSayisi: number;
  gercekAralikMm: number;
  yatayAraKayitSayisi?: number;
  susVar?: boolean;
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 40;
const CERCEVE_KALINLIK = 6;
const CUBUK_GENISLIK = 3;

/** Ferforje panelin önden görünüşünü (çerçeve + dikey çubuklar + opsiyonel ara kayıt) gösterir. */
export default function FerforjePanelSchematic({ veri }: { veri: FerforjePanelSemaVeri }) {
  const { genislikMm, yukseklikMm, dikeyCubukSayisi, gercekAralikMm, yatayAraKayitSayisi = 0, susVar = false } = veri;
  if (!genislikMm || !yukseklikMm || dikeyCubukSayisi < 2) return null;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / genislikMm, drawH / yukseklikMm);

  const scaledW = genislikMm * scale;
  const scaledH = yukseklikMm * scale;
  const x0 = MARGIN_LEFT;
  const topY = MARGIN_TOP + (drawH - scaledH) / 2;
  const bottomY = topY + scaledH;

  const cubukXler = Array.from({ length: dikeyCubukSayisi }, (_, i) => x0 + i * gercekAralikMm * scale);
  const araKayitYler =
    yatayAraKayitSayisi > 0
      ? Array.from({ length: yatayAraKayitSayisi }, (_, i) => {
          const oran = (i + 1) / (yatayAraKayitSayisi + 1);
          return topY + oran * scaledH;
        })
      : [];

  const dimGenislikY = bottomY + 24;
  const dimYukseklikX = x0 - 30;

  const lejant = [
    { renk: PALET.ana, etiket: "Çerçeve" },
    { renk: PALET.yatay, etiket: "Dikey Çubuk" },
    ...(yatayAraKayitSayisi > 0 ? [{ renk: PALET.vurgu, etiket: "Ara Kayıt" }] : []),
    ...(susVar ? [{ renk: PALET.ikincil, etiket: "Süsleme" }] : []),
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Ferforje panel şematik çizimi">
      <OkTanimlari />

      {/* Çerçeve */}
      <rect x={x0} y={topY} width={scaledW} height={CERCEVE_KALINLIK} fill={PALET.ana} />
      <rect x={x0} y={bottomY - CERCEVE_KALINLIK} width={scaledW} height={CERCEVE_KALINLIK} fill={PALET.ana} />
      <rect x={x0} y={topY} width={CERCEVE_KALINLIK} height={scaledH} fill={PALET.ana} />
      <rect x={x0 + scaledW - CERCEVE_KALINLIK} y={topY} width={CERCEVE_KALINLIK} height={scaledH} fill={PALET.ana} />

      {/* Dikey çubuklar */}
      {cubukXler.map((cx, i) => (
        <rect key={i} x={cx - CUBUK_GENISLIK / 2} y={topY} width={CUBUK_GENISLIK} height={scaledH} fill={PALET.yatay} />
      ))}

      {/* Yatay ara kayıt(lar) */}
      {araKayitYler.map((y, i) => (
        <rect key={i} x={x0} y={y - CUBUK_GENISLIK / 2} width={scaledW} height={CUBUK_GENISLIK} fill={PALET.vurgu} />
      ))}

      {susVar && (
        <circle
          cx={x0 + scaledW / 2}
          cy={topY + scaledH / 2}
          r={Math.min(scaledW, scaledH) * 0.18}
          fill="none"
          stroke={PALET.ikincil}
          strokeWidth={3}
        />
      )}

      <YatayOlcu x1={x0} x2={x0 + scaledW} y={dimGenislikY} etiket={mmEtiket(genislikMm)} />
      <DikeyOlcu y1={topY} y2={bottomY} x={dimYukseklikX} etiket={mmEtiket(yukseklikMm)} />

      <Lejant kalemler={lejant} y={VIEW_H + 6} />
    </svg>
  );
}
