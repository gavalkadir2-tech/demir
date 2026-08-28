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

export interface PergolaSemaVeri {
  genislikMm: number;
  boyMm: number;
  yukseklikMm?: number;
  kolonSiraAdedi: number;
  lataYonu: "genislik" | "boy";
  lataSayisi: number;
  gercekLataAralikMm: number;
  kolonKesit?: KesitOlcusu;
  kirisKesit?: KesitOlcusu;
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 40;

function UstenGorunum({ veri }: { veri: PergolaSemaVeri }) {
  const { genislikMm, boyMm, kolonSiraAdedi, lataYonu, lataSayisi, gercekLataAralikMm, kolonKesit } = veri;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / genislikMm, drawH / boyMm);

  const scaledW = genislikMm * scale;
  const scaledH = boyMm * scale;
  const x0 = MARGIN_LEFT + (drawW - scaledW) / 2;
  const topY = MARGIN_TOP + (drawH - scaledH) / 2;
  const bottomY = topY + scaledH;

  const kolonR = Math.max(3, olcekliKalinlikPx(kolonKesit?.enMm ?? 100, scale, 6) / 2);
  const kolonXler = Array.from({ length: kolonSiraAdedi }, (_, i) => x0 + (i / (kolonSiraAdedi - 1)) * scaledW);

  const lataCizgileri = Array.from({ length: lataSayisi }, (_, i) => {
    if (lataYonu === "genislik") {
      const y = topY + Math.min(i, lataSayisi - 1) * gercekLataAralikMm * scale;
      return { x1: x0, y1: y, x2: x0 + scaledW, y2: y };
    }
    const x = x0 + Math.min(i, lataSayisi - 1) * gercekLataAralikMm * scale;
    return { x1: x, y1: topY, x2: x, y2: bottomY };
  });

  const lejant = [
    { renk: PALET.ana, etiket: "Kolon" },
    { renk: PALET.yatay, etiket: "Kiriş" },
    { renk: PALET.vurgu, etiket: "Lata" },
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Pergola üstten (plan) görünüş şematik çizimi">
      <OkTanimlari />
      <text x={x0} y={topY - 12} fontSize={11} fill="#a3a3a3">
        Üstten görünüş (plan)
      </text>

      <rect x={x0} y={topY} width={scaledW} height={4} fill={PALET.yatay} />
      <rect x={x0} y={bottomY - 4} width={scaledW} height={4} fill={PALET.yatay} />
      <rect x={x0} y={topY} width={4} height={scaledH} fill={PALET.yatay} opacity={0.5} />
      <rect x={x0 + scaledW - 4} y={topY} width={4} height={scaledH} fill={PALET.yatay} opacity={0.5} />

      <g stroke={PALET.vurgu} strokeWidth={2} opacity={0.7}>
        {lataCizgileri.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
        ))}
      </g>

      {kolonXler.map((cx, i) => (
        <g key={i}>
          <circle cx={cx} cy={topY} r={kolonR} fill={PALET.ana} />
          <circle cx={cx} cy={bottomY} r={kolonR} fill={PALET.ana} />
        </g>
      ))}

      <YatayOlcu x1={x0} x2={x0 + scaledW} y={bottomY + 24} etiket={mmEtiket(genislikMm)} />
      <DikeyOlcu y1={topY} y2={bottomY} x={x0 - 30} etiket={mmEtiket(boyMm)} />

      <Lejant kalemler={lejant} y={VIEW_H + 6} />
    </svg>
  );
}

function OndenGorunum({
  veri,
  duzenlenebilir,
  onKolonSiraAdediDegisti,
}: {
  veri: PergolaSemaVeri;
  duzenlenebilir?: boolean;
  onKolonSiraAdediDegisti?: (yeniSiraAdedi: number) => void;
}) {
  const { genislikMm, yukseklikMm = 2400, kolonSiraAdedi, kolonKesit, kirisKesit } = veri;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / genislikMm, drawH / yukseklikMm);

  const scaledW = genislikMm * scale;
  const scaledH = yukseklikMm * scale;
  const x0 = MARGIN_LEFT;
  const topY = MARGIN_TOP + (drawH - scaledH);
  const groundY = topY + scaledH;

  const kolonGenislik = olcekliKalinlikPx(kolonKesit?.enMm ?? 100, scale, 3);
  const kirisKalinlik = olcekliKalinlikPx(kirisKesit?.kalinlikMm ?? 80, scale, 3);
  const kolonXler = Array.from({ length: kolonSiraAdedi }, (_, i) => x0 + (i / (kolonSiraAdedi - 1)) * scaledW);
  const tiklanabilir = Boolean(duzenlenebilir && onKolonSiraAdediDegisti);

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Pergola önden görünüş şematik çizimi">
      <OkTanimlari />
      <text x={x0} y={MARGIN_TOP - 8} fontSize={11} fill="#a3a3a3">
        Önden görünüş
      </text>
      <line x1={x0 - 15} y1={groundY} x2={x0 + scaledW + 15} y2={groundY} stroke="#a3a3a3" strokeWidth={2} />

      {tiklanabilir && (
        <rect
          x={x0}
          y={topY}
          width={scaledW}
          height={scaledH}
          fill="transparent"
          style={{ cursor: "copy" }}
          onClick={() => onKolonSiraAdediDegisti!(kolonSiraAdedi + 1)}
        >
          <title>Yeni kolon eklemek için tıkla</title>
        </rect>
      )}

      {kolonXler.map((cx, i) => (
        <g key={i}>
          <rect
            x={cx - kolonGenislik / 2}
            y={topY}
            width={kolonGenislik}
            height={scaledH}
            fill={hoverIndex === i && tiklanabilir ? "#dc2626" : PALET.ana}
            style={{ pointerEvents: "none" }}
          />
          {tiklanabilir && kolonSiraAdedi > 2 && (
            <rect
              x={cx - Math.max(kolonGenislik, 14) / 2}
              y={topY}
              width={Math.max(kolonGenislik, 14)}
              height={scaledH}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              onClick={(e) => {
                e.stopPropagation();
                onKolonSiraAdediDegisti!(kolonSiraAdedi - 1);
                setHoverIndex(null);
              }}
            >
              <title>Bu kolonu (ön+arka çiftiyle) kaldırmak için tıkla</title>
            </rect>
          )}
        </g>
      ))}
      <rect x={x0} y={topY} width={scaledW} height={kirisKalinlik} fill={PALET.yatay} />
      <YatayOlcu x1={x0} x2={x0 + scaledW} y={groundY + 30} etiket={mmEtiket(genislikMm)} />
      <DikeyOlcu y1={topY} y2={groundY} x={x0 - 30} etiket={mmEtiket(yukseklikMm)} />
      <Lejant kalemler={[{ renk: PALET.ana, etiket: "Kolon" }, { renk: PALET.yatay, etiket: "Kiriş" }]} y={VIEW_H + 6} />
    </svg>
  );
}

function Gorunum3D({ veri }: { veri: PergolaSemaVeri }) {
  const { genislikMm, boyMm, yukseklikMm = 2400, kolonSiraAdedi, lataYonu, lataSayisi, gercekLataAralikMm, kolonKesit, kirisKesit } = veri;
  const kolonXler = Array.from({ length: kolonSiraAdedi }, (_, i) => (i / (kolonSiraAdedi - 1)) * genislikMm);

  const kirisler: Kiris3D[] = [];
  kolonXler.forEach((x, i) => {
    kirisler.push({ a: [x, 0, 0], b: [x, yukseklikMm, 0], enMm: kolonKesit?.enMm ?? 100, renk: PALET.ana, etiket: i === 0 ? mmEtiket(yukseklikMm) : undefined });
    kirisler.push({ a: [x, 0, boyMm], b: [x, yukseklikMm, boyMm], enMm: kolonKesit?.enMm ?? 100, renk: PALET.ana });
  });
  kirisler.push({ a: [0, yukseklikMm, 0], b: [genislikMm, yukseklikMm, 0], enMm: kirisKesit?.kalinlikMm ?? 80, renk: PALET.yatay, etiket: mmEtiket(genislikMm) });
  kirisler.push({ a: [0, yukseklikMm, boyMm], b: [genislikMm, yukseklikMm, boyMm], enMm: kirisKesit?.kalinlikMm ?? 80, renk: PALET.yatay });
  kirisler.push({ a: [0, yukseklikMm, 0], b: [0, yukseklikMm, boyMm], enMm: kirisKesit?.kalinlikMm ?? 80, renk: PALET.yatay, etiket: mmEtiket(boyMm) });
  kirisler.push({ a: [genislikMm, yukseklikMm, 0], b: [genislikMm, yukseklikMm, boyMm], enMm: kirisKesit?.kalinlikMm ?? 80, renk: PALET.yatay });

  const gosterilecekLata = Math.min(lataSayisi, 8);
  for (let i = 0; i < gosterilecekLata; i++) {
    if (lataYonu === "genislik") {
      const z = Math.min(i, lataSayisi - 1) * gercekLataAralikMm;
      kirisler.push({ a: [0, yukseklikMm, z], b: [genislikMm, yukseklikMm, z], enMm: 30, renk: PALET.vurgu });
    } else {
      const x = Math.min(i, lataSayisi - 1) * gercekLataAralikMm;
      kirisler.push({ a: [x, yukseklikMm, 0], b: [x, yukseklikMm, boyMm], enMm: 30, renk: PALET.vurgu });
    }
  }

  const lejant = [
    { renk: PALET.ana, etiket: "Kolon" },
    { renk: PALET.yatay, etiket: "Kiriş" },
    { renk: PALET.vurgu, etiket: "Lata" },
  ];

  return <Izometrik3DSahne kirisler={kirisler} lejant={lejant} ariaLabel="Pergola 3D izometrik görünüm" />;
}

/** Pergolanın üstten/önden/3D görünüşlerini, seçilen kolon/kiriş profilinin gerçek ölçüsüyle
 * tutarlı, ölçekli bir çizim olarak gösterir. `duzenlenebilir` verilirse önden görünüşte bir
 * kolona tıklayarak o kolon sırasını (ön+arka çifti) kaldırabilir / boş alana tıklayarak yeni
 * bir sıra ekleyebilirsiniz (pozisyonlar eşit aralıklı kalır, sadece sayı değişir). */
export default function PergolaSchematic({
  veri,
  duzenlenebilir,
  onKolonSiraAdediDegisti,
}: {
  veri: PergolaSemaVeri;
  duzenlenebilir?: boolean;
  onKolonSiraAdediDegisti?: (yeniSiraAdedi: number) => void;
}) {
  const [gorunum, setGorunum] = useState<SemaGorunumTipi>("ust");
  const { genislikMm, boyMm, kolonSiraAdedi } = veri;
  if (!genislikMm || !boyMm || kolonSiraAdedi < 2) return null;

  const editable = Boolean(duzenlenebilir && onKolonSiraAdediDegisti);

  return (
    <div>
      <GorunumSekmeleri aktif={gorunum} onSec={setGorunum} secenekler={["ust", "on", "3d"]} />
      {editable && gorunum === "on" && (
        <div className="mb-2 text-xs text-neutral-500">
          💡 Boş alana tıklayarak kolon sırası ekleyebilir, bir kolona tıklayarak kaldırabilirsiniz.
        </div>
      )}
      {gorunum === "ust" && <UstenGorunum veri={veri} />}
      {gorunum === "on" && <OndenGorunum veri={veri} duzenlenebilir={editable} onKolonSiraAdediDegisti={onKolonSiraAdediDegisti} />}
      {gorunum === "3d" && <Gorunum3D veri={veri} />}
    </div>
  );
}
