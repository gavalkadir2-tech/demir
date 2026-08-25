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

export interface KapiSemaVeri {
  genislikMm: number;
  yukseklikMm: number;
  kanatGenislikMm: number;
  kanatYukseklikMm: number;
  araKayitSayisi?: number;
  sacKalinlikMm?: number;
  kasaKesit?: KesitOlcusu;
  kanatKesit?: KesitOlcusu;
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 60;

function OndenGorunum({ veri }: { veri: KapiSemaVeri }) {
  const { genislikMm, yukseklikMm, kanatGenislikMm, kanatYukseklikMm, araKayitSayisi = 0, kasaKesit, kanatKesit } = veri;

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

  const kasaKalinlik = olcekliKalinlikPx(kasaKesit?.enMm ?? 50, scale, 3);
  const kanatCerceveKalinlik = olcekliKalinlikPx(kanatKesit?.enMm ?? 30, scale, 2);

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
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Kapı önden görünüş şematik çizimi">
      <OkTanimlari />

      <rect x={x0} y={topY} width={scaledW} height={scaledH} fill="none" stroke={PALET.ana} strokeWidth={kasaKalinlik} />
      <rect x={kanatX} y={kanatY} width={kanatW} height={kanatH} fill="#f5f5f5" stroke={PALET.yatay} strokeWidth={kanatCerceveKalinlik} />
      {araKayitYlar.map((y, i) => (
        <line key={i} x1={kanatX} y1={y} x2={kanatX + kanatW} y2={y} stroke={PALET.vurgu} strokeWidth={3} />
      ))}
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

function YandanGorunum({ veri }: { veri: KapiSemaVeri }) {
  const { yukseklikMm, kasaKesit, kanatKesit, sacKalinlikMm = 1.5 } = veri;
  const kasaDerinlik = kasaKesit?.kalinlikMm ?? 50;
  const kanatDerinlik = kanatKesit?.kalinlikMm ?? 30;
  const toplamDerinlik = Math.max(kasaDerinlik, kanatDerinlik + sacKalinlikMm) + 20;

  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min((VIEW_W - MARGIN_LEFT - MARGIN_RIGHT) / (toplamDerinlik * 4), drawH / yukseklikMm);
  const x0 = MARGIN_LEFT + 60;
  const topY = MARGIN_TOP;
  const groundY = topY + yukseklikMm * scale;

  const kasaW = Math.max(6, kasaDerinlik * scale);
  const kanatW = Math.max(4, kanatDerinlik * scale);
  const sacW = Math.max(2, sacKalinlikMm * scale);

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Kapı yandan görünüş (kesit) şematik çizimi">
      <OkTanimlari />
      <text x={x0 - 40} y={MARGIN_TOP - 8} fontSize={11} fill="#a3a3a3">
        Yandan görünüş (kasa/kanat kesiti)
      </text>
      <rect x={x0} y={topY} width={kasaW} height={groundY - topY} fill={PALET.ana} />
      <rect x={x0 + kasaW + 6} y={topY + 4} width={kanatW} height={groundY - topY - 8} fill={PALET.yatay} />
      <rect x={x0 + kasaW + 6 + kanatW} y={topY + 4} width={sacW} height={groundY - topY - 8} fill={PALET.vurgu} />

      <DikeyOlcu y1={topY} y2={groundY} x={x0 - 20} etiket={mmEtiket(yukseklikMm)} />
      <text x={x0 + kasaW / 2} y={groundY + 20} textAnchor="middle" fontSize={10} fill="#525252">
        kasa {mmEtiket(kasaDerinlik)}
      </text>
      <text x={x0 + kasaW + 6 + kanatW / 2} y={groundY + 20} textAnchor="middle" fontSize={10} fill="#525252">
        kanat {mmEtiket(kanatDerinlik)}
      </text>
      <text x={x0 + kasaW + 6 + kanatW + sacW / 2 + 4} y={groundY + 20} textAnchor="middle" fontSize={10} fill="#525252">
        sac {mmEtiket(sacKalinlikMm)}
      </text>

      <Lejant
        kalemler={[
          { renk: PALET.ana, etiket: "Kasa" },
          { renk: PALET.yatay, etiket: "Kanat Çerçevesi" },
          { renk: PALET.vurgu, etiket: "Kaplama Sacı" },
        ]}
        y={VIEW_H + 6}
      />
    </svg>
  );
}

function Gorunum3D({ veri }: { veri: KapiSemaVeri }) {
  const { genislikMm, yukseklikMm, kanatGenislikMm, kanatYukseklikMm, kasaKesit, kanatKesit } = veri;
  const offsetX = (genislikMm - kanatGenislikMm) / 2;
  const offsetY = (yukseklikMm - kanatYukseklikMm) / 2;

  const kirisler: Kiris3D[] = [
    { a: [0, 0, 0], b: [0, yukseklikMm, 0], enMm: kasaKesit?.enMm ?? 50, renk: PALET.ana, etiket: mmEtiket(yukseklikMm) },
    { a: [genislikMm, 0, 0], b: [genislikMm, yukseklikMm, 0], enMm: kasaKesit?.enMm ?? 50, renk: PALET.ana },
    { a: [0, yukseklikMm, 0], b: [genislikMm, yukseklikMm, 0], enMm: kasaKesit?.enMm ?? 50, renk: PALET.ana, etiket: mmEtiket(genislikMm) },
    { a: [0, 0, 0], b: [genislikMm, 0, 0], enMm: kasaKesit?.enMm ?? 50, renk: PALET.ana },
  ];
  const yuzeyler: Yuzey3D[] = [
    {
      noktalar: [
        [offsetX, offsetY, 0.1],
        [offsetX + kanatGenislikMm, offsetY, 0.1],
        [offsetX + kanatGenislikMm, offsetY + kanatYukseklikMm, 0.1],
        [offsetX, offsetY + kanatYukseklikMm, 0.1],
      ],
      fill: PALET.yatay,
      fillOpacity: 0.5,
    },
  ];
  kirisler.push({
    a: [offsetX, offsetY, 0],
    b: [offsetX + kanatGenislikMm, offsetY, 0],
    enMm: kanatKesit?.kalinlikMm ?? 30,
    renk: PALET.yatay,
    etiket: `kanat ${mmEtiket(kanatGenislikMm)}×${mmEtiket(kanatYukseklikMm)}`,
  });

  const lejant = [
    { renk: PALET.ana, etiket: "Kasa" },
    { renk: PALET.yatay, etiket: "Kanat" },
  ];

  return <Izometrik3DSahne kirisler={kirisler} yuzeyler={yuzeyler} lejant={lejant} ariaLabel="Kapı 3D izometrik görünüm" />;
}

/** Kapının önden/yandan/3D görünüşlerini, seçilen kasa/kanat profilinin gerçek ölçüsüyle
 * tutarlı, ölçekli bir çizim olarak gösterir. */
export default function DoorSchematic({ veri }: { veri: KapiSemaVeri }) {
  const [gorunum, setGorunum] = useState<SemaGorunumTipi>("on");
  const { genislikMm, yukseklikMm } = veri;
  if (!genislikMm || !yukseklikMm) return null;

  return (
    <div>
      <GorunumSekmeleri aktif={gorunum} onSec={setGorunum} secenekler={["on", "yan", "3d"]} />
      {gorunum === "on" && <OndenGorunum veri={veri} />}
      {gorunum === "yan" && <YandanGorunum veri={veri} />}
      {gorunum === "3d" && <Gorunum3D veri={veri} />}
    </div>
  );
}
