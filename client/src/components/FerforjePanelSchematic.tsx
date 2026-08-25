import { useState } from "react";
import {
  OkTanimlari,
  YatayOlcu,
  DikeyOlcu,
  mmEtiket,
  PALET,
  Lejant,
  VIEW_W,
  VIEW_H,
  LEGEND_H,
  KesitOlcusu,
  olcekliKalinlikPx,
  GorunumSekmeleri,
  SemaGorunumTipi,
  Izometrik3DSahne,
  Kiris3D,
} from "./schematicShared";

export interface FerforjePanelSemaVeri {
  genislikMm: number;
  yukseklikMm: number;
  dikeyCubukSayisi: number;
  gercekAralikMm: number;
  yatayAraKayitSayisi?: number;
  susVar?: boolean;
  cerceveKesit?: KesitOlcusu;
  cubukKesit?: KesitOlcusu;
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 40;

function OndenGorunum({ veri }: { veri: FerforjePanelSemaVeri }) {
  const { genislikMm, yukseklikMm, dikeyCubukSayisi, gercekAralikMm, yatayAraKayitSayisi = 0, susVar = false, cerceveKesit, cubukKesit } = veri;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / genislikMm, drawH / yukseklikMm);

  const scaledW = genislikMm * scale;
  const scaledH = yukseklikMm * scale;
  const x0 = MARGIN_LEFT;
  const topY = MARGIN_TOP + (drawH - scaledH) / 2;
  const bottomY = topY + scaledH;

  const cerceveKalinlik = olcekliKalinlikPx(cerceveKesit?.enMm ?? 40, scale, 3);
  const cubukGenislik = olcekliKalinlikPx(cubukKesit?.enMm ?? 16, scale, 1.5);

  const cubukXler = Array.from({ length: dikeyCubukSayisi }, (_, i) => x0 + i * gercekAralikMm * scale);
  const araKayitYler =
    yatayAraKayitSayisi > 0
      ? Array.from({ length: yatayAraKayitSayisi }, (_, i) => {
          const oran = (i + 1) / (yatayAraKayitSayisi + 1);
          return topY + oran * scaledH;
        })
      : [];

  const lejant = [
    { renk: PALET.ana, etiket: "Çerçeve" },
    { renk: PALET.yatay, etiket: "Dikey Çubuk" },
    ...(yatayAraKayitSayisi > 0 ? [{ renk: PALET.vurgu, etiket: "Ara Kayıt" }] : []),
    ...(susVar ? [{ renk: PALET.ikincil, etiket: "Süsleme" }] : []),
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Ferforje panel önden görünüş şematik çizimi">
      <OkTanimlari />

      <rect x={x0} y={topY} width={scaledW} height={cerceveKalinlik} fill={PALET.ana} />
      <rect x={x0} y={bottomY - cerceveKalinlik} width={scaledW} height={cerceveKalinlik} fill={PALET.ana} />
      <rect x={x0} y={topY} width={cerceveKalinlik} height={scaledH} fill={PALET.ana} />
      <rect x={x0 + scaledW - cerceveKalinlik} y={topY} width={cerceveKalinlik} height={scaledH} fill={PALET.ana} />

      {cubukXler.map((cx, i) => (
        <rect key={i} x={cx - cubukGenislik / 2} y={topY} width={cubukGenislik} height={scaledH} fill={PALET.yatay} />
      ))}

      {araKayitYler.map((y, i) => (
        <rect key={i} x={x0} y={y - cubukGenislik / 2} width={scaledW} height={cubukGenislik} fill={PALET.vurgu} />
      ))}

      {susVar && (
        <circle cx={x0 + scaledW / 2} cy={topY + scaledH / 2} r={Math.min(scaledW, scaledH) * 0.18} fill="none" stroke={PALET.ikincil} strokeWidth={3} />
      )}

      <YatayOlcu x1={x0} x2={x0 + scaledW} y={bottomY + 24} etiket={mmEtiket(genislikMm)} />
      <DikeyOlcu y1={topY} y2={bottomY} x={x0 - 30} etiket={mmEtiket(yukseklikMm)} />
      {cubukXler.length > 1 && (
        <YatayOlcu x1={cubukXler[0]} x2={cubukXler[1]} y={topY - 12} etiket={mmEtiket(gercekAralikMm)} etiketAltta={false} fontSize={10} kalin={false} />
      )}

      <Lejant kalemler={lejant} y={VIEW_H + 6} />
    </svg>
  );
}

function YandanGorunum({ veri }: { veri: FerforjePanelSemaVeri }) {
  const { yukseklikMm, cerceveKesit } = veri;
  const derinlikMm = cerceveKesit?.kalinlikMm ?? 20;

  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = drawH / yukseklikMm;
  const x0 = MARGIN_LEFT + 60;
  const topY = MARGIN_TOP;
  const groundY = topY + yukseklikMm * scale;
  const derinlikPx = Math.max(6, derinlikMm * scale);

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Ferforje panel yandan görünüş (kesit) şematik çizimi">
      <OkTanimlari />
      <text x={x0 - 40} y={MARGIN_TOP - 8} fontSize={11} fill="#a3a3a3">
        Yandan görünüş (panel derinliği)
      </text>
      <rect x={x0} y={topY} width={derinlikPx} height={groundY - topY} fill={PALET.yatay} opacity={0.8} />
      <DikeyOlcu y1={topY} y2={groundY} x={x0 - 20} etiket={mmEtiket(yukseklikMm)} />
      <text x={x0 + derinlikPx / 2} y={groundY + 20} textAnchor="middle" fontSize={10} fill="#525252">
        {mmEtiket(derinlikMm)}
      </text>
      <Lejant kalemler={[{ renk: PALET.yatay, etiket: "Panel derinliği (çerçeve profili)" }]} y={VIEW_H + 6} />
    </svg>
  );
}

function Gorunum3D({ veri }: { veri: FerforjePanelSemaVeri }) {
  const { genislikMm, yukseklikMm, dikeyCubukSayisi, gercekAralikMm, cerceveKesit, cubukKesit } = veri;
  const cubukXler = Array.from({ length: dikeyCubukSayisi }, (_, i) => i * gercekAralikMm);

  const kirisler: Kiris3D[] = [
    { a: [0, 0, 0], b: [0, yukseklikMm, 0], enMm: cerceveKesit?.enMm ?? 40, renk: PALET.ana, etiket: mmEtiket(yukseklikMm) },
    { a: [genislikMm, 0, 0], b: [genislikMm, yukseklikMm, 0], enMm: cerceveKesit?.enMm ?? 40, renk: PALET.ana },
    { a: [0, yukseklikMm, 0], b: [genislikMm, yukseklikMm, 0], enMm: cerceveKesit?.enMm ?? 40, renk: PALET.ana, etiket: mmEtiket(genislikMm) },
    { a: [0, 0, 0], b: [genislikMm, 0, 0], enMm: cerceveKesit?.enMm ?? 40, renk: PALET.ana },
  ];
  cubukXler.forEach((x) => {
    kirisler.push({ a: [x, 0, 0], b: [x, yukseklikMm, 0], enMm: cubukKesit?.enMm ?? 16, renk: PALET.yatay });
  });

  const lejant = [
    { renk: PALET.ana, etiket: "Çerçeve" },
    { renk: PALET.yatay, etiket: "Dikey Çubuk" },
  ];

  return <Izometrik3DSahne kirisler={kirisler} lejant={lejant} ariaLabel="Ferforje panel 3D izometrik görünüm" />;
}

/** Ferforje panelin önden/yandan/3D görünüşlerini, seçilen çerçeve/çubuk profilinin gerçek
 * ölçüsüyle tutarlı, ölçekli bir çizim olarak gösterir. */
export default function FerforjePanelSchematic({ veri }: { veri: FerforjePanelSemaVeri }) {
  const [gorunum, setGorunum] = useState<SemaGorunumTipi>("on");
  const { genislikMm, yukseklikMm, dikeyCubukSayisi } = veri;
  if (!genislikMm || !yukseklikMm || dikeyCubukSayisi < 2) return null;

  return (
    <div>
      <GorunumSekmeleri aktif={gorunum} onSec={setGorunum} secenekler={["on", "yan", "3d"]} />
      {gorunum === "on" && <OndenGorunum veri={veri} />}
      {gorunum === "yan" && <YandanGorunum veri={veri} />}
      {gorunum === "3d" && <Gorunum3D veri={veri} />}
    </div>
  );
}
