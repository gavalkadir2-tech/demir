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
  Yuzey3D,
} from "./schematicShared";

export interface RafSemaVeri {
  genislikMm: number;
  derinlikMm: number;
  yukseklikMm: number;
  rafSayisi: number;
  rafAraligiMm?: number;
  sacVar?: boolean;
  caprazVar?: boolean;
  ayakKesit?: KesitOlcusu;
  rafCercevesiKesit?: KesitOlcusu;
  sacKalinlikMm?: number;
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 60;

function OndenGorunum({ veri }: { veri: RafSemaVeri }) {
  const { genislikMm, yukseklikMm, rafSayisi, sacVar = false, caprazVar = false, ayakKesit, rafCercevesiKesit } = veri;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / genislikMm, drawH / yukseklikMm);

  const scaledW = genislikMm * scale;
  const scaledH = yukseklikMm * scale;
  const x0 = MARGIN_LEFT;
  const topY = MARGIN_TOP + (drawH - scaledH);
  const groundY = topY + scaledH;

  const ayakGenislik = olcekliKalinlikPx(ayakKesit?.enMm ?? 30, scale, 2);
  const rafKalinlik = olcekliKalinlikPx(rafCercevesiKesit?.kalinlikMm ?? 25, scale, 2);

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
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Raf önden görünüş şematik çizimi">
      <OkTanimlari />

      <line x1={x0 - 15} y1={groundY} x2={x0 + scaledW + 15} y2={groundY} stroke="#a3a3a3" strokeWidth={2} />

      {caprazVar && (
        <g stroke={PALET.stabilite} strokeWidth={2}>
          <line x1={x0} y1={groundY} x2={x0 + scaledW} y2={topY} />
          <line x1={x0} y1={topY} x2={x0 + scaledW} y2={groundY} />
        </g>
      )}

      <rect x={x0 - ayakGenislik / 2} y={topY} width={ayakGenislik} height={scaledH} fill={PALET.ana} />
      <rect x={x0 + scaledW - ayakGenislik / 2} y={topY} width={ayakGenislik} height={scaledH} fill={PALET.ana} />

      {rafYlar.map((y, i) => (
        <g key={i}>
          {sacVar && <rect x={x0} y={y - rafKalinlik} width={scaledW} height={rafKalinlik} fill={PALET.vurgu} opacity={0.6} />}
          <rect x={x0} y={y - rafKalinlik / 2} width={scaledW} height={rafKalinlik} fill={PALET.yatay} />
        </g>
      ))}

      <YatayOlcu x1={x0} x2={x0 + scaledW} y={dimGenislikY} etiket={mmEtiket(genislikMm)} />
      <DikeyOlcu y1={topY} y2={groundY} x={dimYukseklikX} etiket={mmEtiket(yukseklikMm)} />

      {veri.rafAraligiMm && (
        <text x={x0 + scaledW + 10} y={rafYlar[0]} textAnchor="start" fontSize={10} fill="#a3a3a3">
          {rafSayisi} raf, {mmEtiket(veri.rafAraligiMm)} aralık
        </text>
      )}

      <Lejant kalemler={lejant} y={VIEW_H + 6} />
    </svg>
  );
}

function YandanGorunum({ veri }: { veri: RafSemaVeri }) {
  const { derinlikMm, yukseklikMm, rafSayisi, sacVar = false, ayakKesit, rafCercevesiKesit } = veri;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / derinlikMm, drawH / yukseklikMm);

  const scaledW = derinlikMm * scale;
  const scaledH = yukseklikMm * scale;
  const x0 = MARGIN_LEFT;
  const topY = MARGIN_TOP + (drawH - scaledH);
  const groundY = topY + scaledH;

  const ayakGenislik = olcekliKalinlikPx(ayakKesit?.kalinlikMm ?? 30, scale, 2);
  const rafKalinlik = olcekliKalinlikPx(rafCercevesiKesit?.kalinlikMm ?? 25, scale, 2);
  const rafYlar = Array.from({ length: rafSayisi }, (_, i) => groundY - (i / (rafSayisi - 1)) * scaledH);

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Raf yandan görünüş şematik çizimi">
      <OkTanimlari />
      <text x={x0} y={MARGIN_TOP - 8} fontSize={11} fill="#a3a3a3">
        Yandan görünüş (derinlik)
      </text>
      <line x1={x0 - 15} y1={groundY} x2={x0 + scaledW + 15} y2={groundY} stroke="#a3a3a3" strokeWidth={2} />
      <rect x={x0 - ayakGenislik / 2} y={topY} width={ayakGenislik} height={scaledH} fill={PALET.ana} />
      <rect x={x0 + scaledW - ayakGenislik / 2} y={topY} width={ayakGenislik} height={scaledH} fill={PALET.ana} />
      {rafYlar.map((y, i) => (
        <g key={i}>
          {sacVar && <rect x={x0} y={y - rafKalinlik} width={scaledW} height={rafKalinlik} fill={PALET.vurgu} opacity={0.6} />}
          <rect x={x0} y={y - rafKalinlik / 2} width={scaledW} height={rafKalinlik} fill={PALET.yatay} />
        </g>
      ))}
      <YatayOlcu x1={x0} x2={x0 + scaledW} y={groundY + 30} etiket={mmEtiket(derinlikMm)} />
      <DikeyOlcu y1={topY} y2={groundY} x={x0 - 30} etiket={mmEtiket(yukseklikMm)} />
      <Lejant kalemler={[{ renk: PALET.ana, etiket: "Ayak" }, { renk: PALET.yatay, etiket: "Raf Çerçevesi" }]} y={VIEW_H + 6} />
    </svg>
  );
}

function Gorunum3D({ veri }: { veri: RafSemaVeri }) {
  const { genislikMm, derinlikMm, yukseklikMm, rafSayisi, sacVar = false, ayakKesit, rafCercevesiKesit } = veri;
  const koseler: [number, number][] = [
    [0, 0],
    [genislikMm, 0],
    [genislikMm, derinlikMm],
    [0, derinlikMm],
  ];

  const kirisler: Kiris3D[] = [];
  koseler.forEach(([x, z], i) => {
    kirisler.push({ a: [x, 0, z], b: [x, yukseklikMm, z], enMm: ayakKesit?.enMm ?? 30, renk: PALET.ana, etiket: i === 0 ? mmEtiket(yukseklikMm) : undefined });
  });

  const yuzeyler: Yuzey3D[] = [];
  for (let i = 0; i < rafSayisi; i++) {
    const y = (yukseklikMm * i) / (rafSayisi - 1);
    kirisler.push({ a: [0, y, 0], b: [genislikMm, y, 0], enMm: rafCercevesiKesit?.kalinlikMm ?? 25, renk: PALET.yatay, etiket: i === 0 ? mmEtiket(genislikMm) : undefined });
    kirisler.push({ a: [0, y, derinlikMm], b: [genislikMm, y, derinlikMm], enMm: rafCercevesiKesit?.kalinlikMm ?? 25, renk: PALET.yatay });
    kirisler.push({ a: [0, y, 0], b: [0, y, derinlikMm], enMm: rafCercevesiKesit?.kalinlikMm ?? 25, renk: PALET.yatay, etiket: i === 0 ? mmEtiket(derinlikMm) : undefined });
    kirisler.push({ a: [genislikMm, y, 0], b: [genislikMm, y, derinlikMm], enMm: rafCercevesiKesit?.kalinlikMm ?? 25, renk: PALET.yatay });
    if (sacVar) {
      yuzeyler.push({
        noktalar: [
          [0, y, 0],
          [genislikMm, y, 0],
          [genislikMm, y, derinlikMm],
          [0, y, derinlikMm],
        ],
        fill: PALET.vurgu,
        fillOpacity: 0.3,
      });
    }
  }

  const lejant = [
    { renk: PALET.ana, etiket: "Ayak" },
    { renk: PALET.yatay, etiket: "Raf Çerçevesi" },
    ...(sacVar ? [{ renk: PALET.vurgu, etiket: "Raf Plakası" }] : []),
  ];

  return <Izometrik3DSahne kirisler={kirisler} yuzeyler={yuzeyler} lejant={lejant} ariaLabel="Raf 3D izometrik görünüm" />;
}

/** Rafın önden/yandan/3D görünüşlerini, seçilen ayak/çerçeve profilinin gerçek ölçüsüyle
 * tutarlı, ölçekli bir çizim olarak gösterir. */
export default function RafSchematic({ veri }: { veri: RafSemaVeri }) {
  const [gorunum, setGorunum] = useState<SemaGorunumTipi>("on");
  const { genislikMm, yukseklikMm, rafSayisi } = veri;
  if (!genislikMm || !yukseklikMm || rafSayisi < 2) return null;

  return (
    <div>
      <GorunumSekmeleri aktif={gorunum} onSec={setGorunum} secenekler={["on", "yan", "3d"]} />
      {gorunum === "on" && <OndenGorunum veri={veri} />}
      {gorunum === "yan" && <YandanGorunum veri={veri} />}
      {gorunum === "3d" && <Gorunum3D veri={veri} />}
    </div>
  );
}
