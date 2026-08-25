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

export interface MerdivenSemaVeri {
  katYuksekligiMm: number;
  genislikMm?: number;
  basamakDerinligiMm: number;
  basamakSayisi: number;
  gercekBasamakYuksekligiMm: number;
  kosegenMm?: number;
  egimAcisiDerece?: number;
  tasiyiciAdet?: number;
  basamakKalinlikMm?: number;
  tasiyiciKesit?: KesitOlcusu;
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 60;

function YandanGorunum({ veri }: { veri: MerdivenSemaVeri }) {
  const { katYuksekligiMm, basamakDerinligiMm, basamakSayisi, gercekBasamakYuksekligiMm, kosegenMm, egimAcisiDerece, tasiyiciKesit } = veri;
  const toplamDerinlikMm = basamakSayisi * basamakDerinligiMm;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / toplamDerinlikMm, drawH / katYuksekligiMm);

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
  noktalar.push(`${x},${groundY}`);
  const cizgiNoktalari = noktalar.slice(0, -1).join(" ");
  const doluAlan = [...noktalar, `${x0},${groundY}`].join(" ");

  const stringerWidth = olcekliKalinlikPx(tasiyiciKesit?.kalinlikMm ?? 40, scale, 2);

  const dimDerinlikY = groundY + 30;
  const dimYukseklikX = x0 - 30;

  const lejant = [
    { renk: PALET.ana, etiket: "Basamak" },
    { renk: PALET.destek, etiket: "Taşıyıcı (kiriş)" },
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Merdiven yandan görünüş şematik çizimi">
      <OkTanimlari />

      <line x1={x0 - 15} y1={groundY} x2={x + 15} y2={groundY} stroke="#a3a3a3" strokeWidth={2} />

      <polygon points={doluAlan} fill="#e5e5e5" stroke="none" />
      <polyline points={cizgiNoktalari} fill="none" stroke={PALET.ana} strokeWidth={2.5} />
      <line x1={x0} y1={groundY} x2={x} y2={topY} stroke={PALET.destek} strokeWidth={stringerWidth} strokeDasharray="4 3" />

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

function UstenGorunum({ veri }: { veri: MerdivenSemaVeri }) {
  const { basamakDerinligiMm, basamakSayisi, genislikMm = 900, tasiyiciAdet = 2 } = veri;
  const toplamDerinlikMm = basamakSayisi * basamakDerinligiMm;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / toplamDerinlikMm, drawH / genislikMm);

  const x0 = MARGIN_LEFT;
  const y0 = MARGIN_TOP;
  const scaledW = toplamDerinlikMm * scale;
  const scaledH = genislikMm * scale;

  const tasiyiciYs =
    tasiyiciAdet <= 1
      ? [y0 + scaledH / 2]
      : Array.from({ length: tasiyiciAdet }, (_, i) => y0 + (i / (tasiyiciAdet - 1)) * scaledH);

  const basamakCizgileri = Array.from({ length: basamakSayisi + 1 }, (_, i) => x0 + i * basamakDerinligiMm * scale);

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Merdiven üstten (plan) görünüş şematik çizimi">
      <OkTanimlari />
      <text x={x0} y={y0 - 12} fontSize={11} fill="#a3a3a3">
        Üstten görünüş (plan)
      </text>
      <rect x={x0} y={y0} width={scaledW} height={scaledH} fill="#f5f5f5" stroke="#d4d4d4" />
      {basamakCizgileri.map((x, i) => (
        <line key={i} x1={x} y1={y0} x2={x} y2={y0 + scaledH} stroke="#d4d4d4" />
      ))}
      {tasiyiciYs.map((y, i) => (
        <line key={i} x1={x0} y1={y} x2={x0 + scaledW} y2={y} stroke={PALET.destek} strokeWidth={3} />
      ))}

      <YatayOlcu x1={x0} x2={x0 + scaledW} y={y0 + scaledH + 30} etiket={mmEtiket(toplamDerinlikMm)} />
      <DikeyOlcu y1={y0} y2={y0 + scaledH} x={x0 - 30} etiket={mmEtiket(genislikMm)} />

      <Lejant
        kalemler={[
          { renk: PALET.ana, etiket: "Basamak sınırı" },
          { renk: PALET.destek, etiket: `Taşıyıcı (${tasiyiciAdet} adet)` },
        ]}
        y={VIEW_H + 6}
      />
    </svg>
  );
}

function Gorunum3D({ veri }: { veri: MerdivenSemaVeri }) {
  const { katYuksekligiMm, basamakDerinligiMm, basamakSayisi, gercekBasamakYuksekligiMm, genislikMm = 900, tasiyiciAdet = 2, tasiyiciKesit } = veri;

  const kirisler: Kiris3D[] = [];
  const yuzeyler: Yuzey3D[] = [];

  // Taşıyıcılar (diyagonal, kat yüksekliği boyunca)
  for (let i = 0; i < tasiyiciAdet; i++) {
    const z = tasiyiciAdet <= 1 ? genislikMm / 2 : (genislikMm * i) / (tasiyiciAdet - 1);
    kirisler.push({
      a: [0, 0, z],
      b: [basamakSayisi * basamakDerinligiMm, katYuksekligiMm, z],
      enMm: tasiyiciKesit?.kalinlikMm ?? 40,
      renk: PALET.destek,
      kesikli: true,
    });
  }

  // Basamaklar: her basamağın yatay tablası (tread) + önündeki düşey rıht (riser) yüzeyi.
  for (let i = 0; i < basamakSayisi; i++) {
    const xArka = i * basamakDerinligiMm; // rıhtın konumu (bir önceki basamağın bittiği yer)
    const xOn = xArka + basamakDerinligiMm; // tablanın açık (burun) kenarı
    const yUst = (i + 1) * gercekBasamakYuksekligiMm;
    const yAlt = i * gercekBasamakYuksekligiMm;

    yuzeyler.push({
      noktalar: [
        [xArka, yAlt, 0],
        [xArka, yUst, 0],
        [xArka, yUst, genislikMm],
        [xArka, yAlt, genislikMm],
      ],
      fill: PALET.destek,
      fillOpacity: 0.25,
    });
    yuzeyler.push({
      noktalar: [
        [xArka, yUst, 0],
        [xOn, yUst, 0],
        [xOn, yUst, genislikMm],
        [xArka, yUst, genislikMm],
      ],
      fill: PALET.ana,
      fillOpacity: 0.4,
    });

    kirisler.push({ a: [xArka, yUst, 0], b: [xOn, yUst, 0], enMm: 25, renk: PALET.ana, etiket: i === basamakSayisi - 1 ? mmEtiket(basamakDerinligiMm) : undefined });
    kirisler.push({ a: [xOn, yUst, 0], b: [xOn, yUst, genislikMm], enMm: 25, renk: PALET.ana });
    kirisler.push({ a: [xArka, yAlt, 0], b: [xArka, yUst, 0], enMm: 25, renk: PALET.ana, etiket: i === 0 ? mmEtiket(gercekBasamakYuksekligiMm) : undefined });
  }

  const lejant = [
    { renk: PALET.ana, etiket: "Basamak" },
    { renk: PALET.destek, etiket: "Taşıyıcı (kiriş)" },
  ];

  return <Izometrik3DSahne kirisler={kirisler} yuzeyler={yuzeyler} lejant={lejant} ariaLabel="Merdiven 3D izometrik görünüm" viewH={360} />;
}

/** Merdivenin yandan/üstten/3D görünüşlerini, seçilen taşıyıcı profilin gerçek ölçüsüyle
 * tutarlı, ölçekli bir çizim olarak gösterir. */
export default function StairsSchematic({ veri }: { veri: MerdivenSemaVeri }) {
  const [gorunum, setGorunum] = useState<SemaGorunumTipi>("yan");
  const { katYuksekligiMm, basamakDerinligiMm, basamakSayisi } = veri;
  if (!katYuksekligiMm || !basamakDerinligiMm || basamakSayisi < 1) return null;

  return (
    <div>
      <GorunumSekmeleri aktif={gorunum} onSec={setGorunum} secenekler={["yan", "ust", "3d"]} />
      {gorunum === "yan" && <YandanGorunum veri={veri} />}
      {gorunum === "ust" && <UstenGorunum veri={veri} />}
      {gorunum === "3d" && <Gorunum3D veri={veri} />}
    </div>
  );
}
