import { OkTanimlari, YatayOlcu, DikeyOlcu, mmEtiket, PALET, Lejant, VIEW_W, VIEW_H, LEGEND_H } from "./schematicShared";

export interface KolonKirisSemaVeri {
  acikligMm: number;
  yukseklikMm: number;
  acikSayisi: number;
  cerceveSayisi: number;
  gercekAralikMm: number;
  baglantiKirisiVar?: boolean;
  stabiliteVar?: boolean;
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 60;
const KOLON_GENISLIK = 6;
const KIRIS_KALINLIK = 6;

/** Tek bir kolon-kiriş çerçevesinin önden görünüşünü gösterir; toplam çerçeve sayısı metin olarak belirtilir. */
export default function SteelFrameSchematic({ veri }: { veri: KolonKirisSemaVeri }) {
  const { acikligMm, yukseklikMm, acikSayisi, cerceveSayisi, gercekAralikMm, baglantiKirisiVar = false, stabiliteVar = false } = veri;
  const toplamGenislikMm = acikligMm * acikSayisi;
  if (!toplamGenislikMm || !yukseklikMm || acikSayisi < 1) return null;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / toplamGenislikMm, drawH / yukseklikMm);

  const scaledW = toplamGenislikMm * scale;
  const scaledH = yukseklikMm * scale;
  const x0 = MARGIN_LEFT;
  const topY = MARGIN_TOP + (drawH - scaledH);
  const groundY = topY + scaledH;

  const kolonXler = Array.from({ length: acikSayisi + 1 }, (_, i) => x0 + i * acikligMm * scale);

  const dimGenislikY = groundY + 26;
  const dimYukseklikX = x0 - 30;

  const lejant = [
    { renk: PALET.ana, etiket: "Kolon" },
    { renk: PALET.yatay, etiket: "Kiriş" },
    ...(baglantiKirisiVar ? [{ renk: PALET.destek, etiket: "Bağlantı Kirişi" }] : []),
    ...(stabiliteVar ? [{ renk: PALET.stabilite, etiket: "Stabilite Çaprazı" }] : []),
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Kolon-kiriş iskelet şematik çizimi">
      <OkTanimlari />

      <line x1={x0 - 15} y1={groundY} x2={x0 + scaledW + 15} y2={groundY} stroke="#a3a3a3" strokeWidth={2} />

      {stabiliteVar && kolonXler.length > 1 && (
        <g stroke={PALET.stabilite} strokeWidth={2}>
          <line x1={kolonXler[0]} y1={groundY} x2={kolonXler[1]} y2={topY} />
          <line x1={kolonXler[0]} y1={topY} x2={kolonXler[1]} y2={groundY} />
        </g>
      )}

      {/* Kolonlar */}
      {kolonXler.map((cx, i) => (
        <rect key={i} x={cx - KOLON_GENISLIK / 2} y={topY} width={KOLON_GENISLIK} height={scaledH} fill={PALET.ana} />
      ))}

      {/* Kirişler (her açıklıkta) */}
      <rect x={x0} y={topY} width={scaledW} height={KIRIS_KALINLIK} fill={PALET.yatay} />

      {baglantiKirisiVar && (
        <g>
          {kolonXler.map((cx, i) => (
            <circle key={i} cx={cx} cy={topY - 10} r={3} fill={PALET.destek} />
          ))}
          <text x={x0 + scaledW / 2} y={topY - 16} textAnchor="middle" fontSize={10} fill={PALET.destek}>
            boy yönünde bağlantı kirişi (her kolon hizasında)
          </text>
        </g>
      )}

      <YatayOlcu x1={x0} x2={x0 + scaledW} y={dimGenislikY} etiket={mmEtiket(toplamGenislikMm)} />
      <DikeyOlcu y1={topY} y2={groundY} x={dimYukseklikX} etiket={mmEtiket(yukseklikMm)} />

      <text x={x0 + scaledW / 2} y={dimGenislikY + 20} textAnchor="middle" fontSize={11} fill="#a3a3a3">
        {cerceveSayisi} çerçeve, {mmEtiket(gercekAralikMm)} aralıkla (boy yönünde) dizilmiştir
      </text>

      <Lejant kalemler={lejant} y={VIEW_H + 6} />
    </svg>
  );
}
