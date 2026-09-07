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
  GorunumSekmeleri,
  SemaGorunumTipi,
} from "./schematicShared";

export interface KonteynerBoslukVeri {
  etiket: string;
  tipi: "pencere" | "kapi";
  katNo: 1 | 2;
  konumMm: number;
  genislikMm: number;
  yukseklikMm: number;
  tabanYuksekligiMm?: number;
}

export interface KonteynerSemaVeri {
  genislikMm: number;
  uzunlukMm: number;
  katYuksekligiMm: number;
  katSayisi: 1 | 2;
  bosluklarMm?: KonteynerBoslukVeri[];
  merdivenVar?: boolean;
  merdivenDerinlikMm?: number;
  platformKorkulukVar?: boolean;
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 40;

function OndenGorunum({ veri }: { veri: KonteynerSemaVeri }) {
  const { uzunlukMm, katYuksekligiMm, katSayisi, bosluklarMm = [], merdivenVar, merdivenDerinlikMm } = veri;
  const toplamYukseklikMm = katYuksekligiMm * katSayisi;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / uzunlukMm, drawH / toplamYukseklikMm);

  const scaledW = uzunlukMm * scale;
  const scaledH = toplamYukseklikMm * scale;
  const x0 = MARGIN_LEFT;
  const topY = MARGIN_TOP + (drawH - scaledH);
  const groundY = topY + scaledH;
  const katSiniriY = groundY - katYuksekligiMm * scale;

  const lejant = [
    { renk: PALET.ana, etiket: "Konteyner Gövdesi" },
    { renk: PALET.yatay, etiket: "Pencere" },
    { renk: PALET.vurgu, etiket: "Kapı" },
    ...(merdivenVar ? [{ renk: PALET.destek, etiket: "Merdiven (yaklaşık)" }] : []),
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Konteyner önden görünüş şematik çizimi">
      <OkTanimlari />

      <rect x={x0} y={topY} width={scaledW} height={scaledH} fill="#e5e5e5" stroke={PALET.ana} strokeWidth={3} />
      {katSayisi === 2 && (
        <line x1={x0} y1={katSiniriY} x2={x0 + scaledW} y2={katSiniriY} stroke={PALET.ana} strokeWidth={2} strokeDasharray="6 3" />
      )}

      {bosluklarMm.map((b, i) => {
        const tabanY = Math.max(0, b.tabanYuksekligiMm ?? 0);
        const katTabanY = groundY - (b.katNo - 1) * katYuksekligiMm * scale;
        const bx = x0 + b.konumMm * scale;
        const by = katTabanY - (tabanY + b.yukseklikMm) * scale;
        const bw = b.genislikMm * scale;
        const bh = b.yukseklikMm * scale;
        const renk = b.tipi === "kapi" ? PALET.vurgu : PALET.yatay;
        return (
          <g key={i}>
            <rect x={bx} y={by} width={bw} height={bh} fill="white" stroke={renk} strokeWidth={2} />
            <text x={bx + bw / 2} y={by + bh / 2 + 4} textAnchor="middle" fontSize={9} fill={renk}>
              {b.etiket}
            </text>
          </g>
        );
      })}

      {merdivenVar && merdivenDerinlikMm && (
        <g>
          <line
            x1={x0 + scaledW - merdivenDerinlikMm * scale}
            y1={groundY}
            x2={x0 + scaledW}
            y2={katSayisi === 2 ? katSiniriY : topY}
            stroke={PALET.destek}
            strokeWidth={2.5}
            strokeDasharray="4 2"
          />
          <text x={x0 + scaledW - (merdivenDerinlikMm * scale) / 2} y={groundY + 14} textAnchor="middle" fontSize={9} fill={PALET.destek}>
            merdiven
          </text>
        </g>
      )}

      <line x1={x0 - 15} y1={groundY} x2={x0 + scaledW + 15} y2={groundY} stroke="#a3a3a3" strokeWidth={2} />
      <YatayOlcu x1={x0} x2={x0 + scaledW} y={groundY + 26} etiket={mmEtiket(uzunlukMm)} />
      <DikeyOlcu y1={topY} y2={groundY} x={x0 - 30} etiket={mmEtiket(toplamYukseklikMm)} />
      {katSayisi === 2 && (
        <text x={x0 - 10} y={(katSiniriY + groundY) / 2} textAnchor="end" fontSize={9} fill="#737373">
          {mmEtiket(katYuksekligiMm)}
        </text>
      )}

      <Lejant kalemler={lejant} y={VIEW_H + 6} />
    </svg>
  );
}

function UstenGorunum({ veri }: { veri: KonteynerSemaVeri }) {
  const { genislikMm, uzunlukMm, merdivenVar, merdivenDerinlikMm, platformKorkulukVar } = veri;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / uzunlukMm, drawH / genislikMm);

  const scaledW = uzunlukMm * scale;
  const scaledH = genislikMm * scale;
  const x0 = MARGIN_LEFT;
  const y0 = MARGIN_TOP + (drawH - scaledH) / 2;

  const lejant = [
    { renk: PALET.ana, etiket: "Konteyner Tabanı" },
    ...(merdivenVar ? [{ renk: PALET.destek, etiket: "Merdiven Alanı" }] : []),
    ...(platformKorkulukVar ? [{ renk: PALET.stabilite, etiket: "Platform Korkuluğu" }] : []),
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Konteyner üstten (plan) görünüş şematik çizimi">
      <OkTanimlari />
      <text x={x0} y={y0 - 12} fontSize={11} fill="#a3a3a3">
        Üstten görünüş (taban izdüşümü)
      </text>
      <rect x={x0} y={y0} width={scaledW} height={scaledH} fill="#e5e5e5" stroke={PALET.ana} strokeWidth={3} />

      {merdivenVar && merdivenDerinlikMm && (
        <rect
          x={x0 + scaledW - merdivenDerinlikMm * scale}
          y={y0}
          width={merdivenDerinlikMm * scale}
          height={scaledH}
          fill={PALET.destek}
          fillOpacity={0.25}
          stroke={PALET.destek}
          strokeDasharray="4 2"
        />
      )}

      {platformKorkulukVar && (
        <line x1={x0} y1={y0} x2={x0 + scaledW} y2={y0} stroke={PALET.stabilite} strokeWidth={4} />
      )}

      <YatayOlcu x1={x0} x2={x0 + scaledW} y={y0 + scaledH + 30} etiket={mmEtiket(uzunlukMm)} />
      <DikeyOlcu y1={y0} y2={y0 + scaledH} x={x0 - 30} etiket={mmEtiket(genislikMm)} />

      <Lejant kalemler={lejant} y={VIEW_H + 6} />
    </svg>
  );
}

/** Konteynerin önden (pencere/kapı boşlukları + kat sınırı) ve üstten (taban izdüşümü) görünüşünü
 * ölçekli bir çizim olarak gösterir. Merdiven ve platform korkuluğu yaklaşık/gösterge amaçlıdır -
 * kesin ölçüler için hesap sonucu tablosuna bakın. */
export default function ContainerSchematic({ veri }: { veri: KonteynerSemaVeri }) {
  const [gorunum, setGorunum] = useState<SemaGorunumTipi>("on");
  const { genislikMm, uzunlukMm, katYuksekligiMm } = veri;
  if (!genislikMm || !uzunlukMm || !katYuksekligiMm) return null;

  return (
    <div>
      <GorunumSekmeleri aktif={gorunum} onSec={setGorunum} secenekler={["on", "ust"]} />
      {gorunum === "on" && <OndenGorunum veri={veri} />}
      {gorunum === "ust" && <UstenGorunum veri={veri} />}
    </div>
  );
}
