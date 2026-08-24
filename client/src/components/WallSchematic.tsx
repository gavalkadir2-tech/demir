import { OkTanimlari, YatayOlcu, DikeyOlcu, mmEtiket, PALET, Lejant, VIEW_W, VIEW_H, LEGEND_H } from "./schematicShared";

export interface DuvarBoslukVeri {
  etiket: string;
  konumMm: number;
  genislikMm: number;
  yukseklikMm: number;
  /** Tabandan boşluğun altına kadar mesafe (mm). 0/boş = kapı gibi tabana kadar iner. */
  tabanYuksekligiMm?: number;
}

export interface DuvarPaneliSemaVeri {
  genislikMm: number;
  yukseklikMm: number;
  dikmeAraligiHedefMm: number;
  bosluklar?: DuvarBoslukVeri[];
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 70;
const RAY_KALINLIK = 5;
const DIKME_GENISLIK = 6;
const EPSILON = 1;

/** Duvar panelinin önden görünüşünü (dikme/ray/boşluk) ölçekli, ölçüleri etiketli SVG olarak gösterir. */
export default function WallSchematic({ veri }: { veri: DuvarPaneliSemaVeri }) {
  const { genislikMm, yukseklikMm, dikmeAraligiHedefMm, bosluklar = [] } = veri;
  if (!genislikMm || !yukseklikMm || !dikmeAraligiHedefMm) return null;

  const gecerliBosluklar = bosluklar
    .map((b) => ({ ...b, tabanYuksekligiMm: Math.max(0, b.tabanYuksekligiMm ?? 0) }))
    .filter(
      (b) =>
        b.genislikMm > 0 &&
        b.yukseklikMm > 0 &&
        b.konumMm >= 0 &&
        b.konumMm + b.genislikMm <= genislikMm &&
        b.tabanYuksekligiMm + b.yukseklikMm <= yukseklikMm
    )
    .sort((a, b) => a.konumMm - b.konumMm);

  const araliklarSayisi = Math.max(1, Math.ceil(genislikMm / dikmeAraligiHedefMm));
  const gercekAralikMm = genislikMm / araliklarSayisi;
  const temelPozisyonlar = Array.from({ length: araliklarSayisi + 1 }, (_, i) => Math.round(i * gercekAralikMm));

  let dikmePozisyonlari = temelPozisyonlar.filter(
    (x) => !gecerliBosluklar.some((b) => x > b.konumMm + EPSILON && x < b.konumMm + b.genislikMm - EPSILON)
  );
  for (const b of gecerliBosluklar) {
    for (const kenar of [b.konumMm, b.konumMm + b.genislikMm]) {
      if (!dikmePozisyonlari.some((x) => Math.abs(x - kenar) < EPSILON)) dikmePozisyonlari.push(Math.round(kenar));
    }
  }
  dikmePozisyonlari.sort((a, b) => a - b);

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / genislikMm, drawH / yukseklikMm);

  const scaledW = genislikMm * scale;
  const scaledH = yukseklikMm * scale;
  const x0 = MARGIN_LEFT;
  const topY = MARGIN_TOP + (drawH - scaledH);
  const groundY = topY + scaledH;

  // Alt ray segmentleri: sadece tabana inen (kapı gibi) boşluklar keser.
  const tabanaInenler = gecerliBosluklar.filter((b) => b.tabanYuksekligiMm <= EPSILON);
  const altRaySegmentleri: { x1: number; x2: number }[] = [];
  let imlec = 0;
  for (const b of tabanaInenler) {
    if (b.konumMm > imlec) altRaySegmentleri.push({ x1: imlec, x2: b.konumMm });
    imlec = Math.max(imlec, b.konumMm + b.genislikMm);
  }
  if (imlec < genislikMm) altRaySegmentleri.push({ x1: imlec, x2: genislikMm });

  const dimGenislikY = groundY + 30;
  const dimYukseklikX = x0 - 30;

  const lejant = [
    { renk: PALET.ana, etiket: "Dikme" },
    { renk: PALET.yatay, etiket: "Üst/Alt Ray" },
    ...(gecerliBosluklar.length > 0 ? [{ renk: PALET.vurgu, etiket: "Lento/Eşik" }] : []),
  ];

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`}
      className="w-full h-auto"
      role="img"
      aria-label="Duvar paneli şematik çizimi"
    >
      <OkTanimlari />

      <line x1={x0 - 15} y1={groundY} x2={x0 + scaledW + 15} y2={groundY} stroke="#a3a3a3" strokeWidth={2} />

      {/* Boşluk kesim alanları */}
      {gecerliBosluklar.map((b, i) => {
        const bosAltY = groundY - b.tabanYuksekligiMm * scale;
        const bosUstY = bosAltY - b.yukseklikMm * scale;
        return (
          <g key={i}>
            <rect
              x={x0 + b.konumMm * scale}
              y={bosUstY}
              width={b.genislikMm * scale}
              height={b.yukseklikMm * scale}
              fill="#ffffff"
              stroke="#d4d4d4"
              strokeDasharray="3 2"
            />
            {/* Lento (üst) */}
            <rect
              x={x0 + b.konumMm * scale}
              y={bosUstY - RAY_KALINLIK}
              width={b.genislikMm * scale}
              height={RAY_KALINLIK}
              fill={PALET.vurgu}
            />
            {/* Eşik (alt) - tabana inmeyen boşluklarda */}
            {b.tabanYuksekligiMm > EPSILON && (
              <rect x={x0 + b.konumMm * scale} y={bosAltY} width={b.genislikMm * scale} height={RAY_KALINLIK} fill={PALET.vurgu} />
            )}
            <text x={x0 + (b.konumMm + b.genislikMm / 2) * scale} y={bosUstY + 14} textAnchor="middle" fontSize={10} fill="#a3a3a3">
              {b.etiket} ({mmEtiket(b.genislikMm)})
            </text>
          </g>
        );
      })}

      {/* Dikmeler */}
      {dikmePozisyonlari.map((px, i) => (
        <rect key={i} x={x0 + px * scale - DIKME_GENISLIK / 2} y={topY} width={DIKME_GENISLIK} height={scaledH} fill={PALET.ana} />
      ))}

      {/* Üst ray (kesintisiz) */}
      <rect x={x0} y={topY} width={scaledW} height={RAY_KALINLIK} fill={PALET.yatay} />
      {/* Alt ray segmentleri */}
      {altRaySegmentleri.map((s, i) => (
        <rect
          key={i}
          x={x0 + s.x1 * scale}
          y={groundY - RAY_KALINLIK}
          width={(s.x2 - s.x1) * scale}
          height={RAY_KALINLIK}
          fill={PALET.yatay}
        />
      ))}

      <YatayOlcu x1={x0} x2={x0 + scaledW} y={dimGenislikY} etiket={mmEtiket(genislikMm)} />
      <DikeyOlcu y1={topY} y2={groundY} x={dimYukseklikX} etiket={mmEtiket(yukseklikMm)} />

      <Lejant kalemler={lejant} y={VIEW_H + 6} />
    </svg>
  );
}
