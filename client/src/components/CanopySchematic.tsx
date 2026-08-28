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

export interface SundurmaSemaVeri {
  yukseklikMm: number;
  boyMm: number;
  genislikMm?: number;
  egimYuzde: number;
  dikmeSayisi?: number;
  kirisUzunlukMm?: number;
  egimDerece?: number;
  dikmeKesit?: KesitOlcusu;
  anaTasiyiciKesit?: KesitOlcusu;
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 30;
const MARGIN_TOP = 40;
const MARGIN_BOTTOM = 60;

function YandanGorunum({ veri }: { veri: SundurmaSemaVeri }) {
  const { yukseklikMm, boyMm, egimYuzde, kirisUzunlukMm, egimDerece, dikmeKesit, anaTasiyiciKesit } = veri;
  const yukselisMm = boyMm * (egimYuzde / 100);
  const arkaYukseklikMm = yukseklikMm + yukselisMm;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / boyMm, drawH / arkaYukseklikMm);

  const scaledBoy = boyMm * scale;
  const x0 = MARGIN_LEFT;
  const groundY = MARGIN_TOP + drawH;
  const onTopY = groundY - yukseklikMm * scale;
  const arkaX = x0 + scaledBoy;
  const arkaTopY = groundY - arkaYukseklikMm * scale;

  const gövde = `${x0},${groundY} ${x0},${onTopY} ${arkaX},${arkaTopY} ${arkaX},${groundY}`;
  const dikmeKalinlik = olcekliKalinlikPx(dikmeKesit?.enMm ?? 60, scale, 2.5);
  const kirisKalinlik = olcekliKalinlikPx(anaTasiyiciKesit?.kalinlikMm ?? 60, scale, 2.5);

  const dimBoyY = groundY + 30;
  const dimYukseklikX = x0 - 30;

  const lejant = [
    { renk: PALET.ana, etiket: "Ön Dikme" },
    { renk: PALET.yatay, etiket: "Ana Kiriş" },
    { renk: PALET.ikincil, etiket: "Arka Destek/Duvar" },
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Sundurma yandan görünüş şematik çizimi">
      <OkTanimlari />
      <text x={x0} y={MARGIN_TOP - 15} fontSize={11} fill="#a3a3a3">
        Yandan görünüş (kesit)
      </text>

      <line x1={x0 - 15} y1={groundY} x2={arkaX + 15} y2={groundY} stroke="#a3a3a3" strokeWidth={2} />

      <polygon points={gövde} fill="#e5e5e5" stroke="none" />
      <line x1={x0} y1={groundY} x2={x0} y2={onTopY} stroke={PALET.ana} strokeWidth={dikmeKalinlik} />
      <line x1={x0} y1={onTopY} x2={arkaX} y2={arkaTopY} stroke={PALET.yatay} strokeWidth={kirisKalinlik} />
      <line x1={arkaX} y1={arkaTopY} x2={arkaX} y2={groundY} stroke={PALET.ikincil} strokeWidth={3} strokeDasharray="5 3" />

      <YatayOlcu x1={x0} x2={arkaX} y={dimBoyY} etiket={mmEtiket(boyMm)} />
      <DikeyOlcu y1={onTopY} y2={groundY} x={dimYukseklikX} etiket={mmEtiket(yukseklikMm)} />

      <text x={(x0 + arkaX) / 2} y={(onTopY + arkaTopY) / 2 - 8} textAnchor="middle" fontSize={12} fill="#525252">
        eğim %{egimYuzde}
      </text>
      {kirisUzunlukMm && (
        <text
          x={(x0 + arkaX) / 2}
          y={(onTopY + arkaTopY) / 2 + 16}
          textAnchor="middle"
          fontSize={11}
          fill={PALET.yatay}
          transform={`rotate(${-Math.atan2(onTopY - arkaTopY, arkaX - x0) * (180 / Math.PI)} ${(x0 + arkaX) / 2} ${
            (onTopY + arkaTopY) / 2 + 16
          })`}
        >
          kiriş: {mmEtiket(kirisUzunlukMm)}
          {egimDerece ? ` · ${Math.round(egimDerece)}°` : ""}
        </text>
      )}

      <Lejant kalemler={lejant} y={VIEW_H + 6} />
    </svg>
  );
}

function UstenGorunum({
  veri,
  duzenlenebilir,
  onDikmeSayisiDegisti,
}: {
  veri: SundurmaSemaVeri;
  duzenlenebilir?: boolean;
  onDikmeSayisiDegisti?: (yeniSayi: number) => void;
}) {
  const { boyMm, genislikMm = 3000, dikmeSayisi = 2 } = veri;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / genislikMm, drawH / boyMm);

  const x0 = MARGIN_LEFT;
  const y0 = MARGIN_TOP;
  const scaledW = genislikMm * scale;
  const scaledH = boyMm * scale;

  const dikmeXs = Array.from({ length: dikmeSayisi }, (_, i) => x0 + (i / (dikmeSayisi - 1)) * scaledW);
  const tiklanabilir = Boolean(duzenlenebilir && onDikmeSayisiDegisti);

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Sundurma üstten (plan) görünüş şematik çizimi">
      <OkTanimlari />
      <text x={x0} y={y0 - 12} fontSize={11} fill="#a3a3a3">
        Üstten görünüş (çatı izdüşümü)
      </text>
      <rect x={x0} y={y0} width={scaledW} height={scaledH} fill="#93c5fd" fillOpacity={0.2} stroke="#d4d4d4" />

      {tiklanabilir && (
        <rect
          x={x0}
          y={y0 + scaledH - 14}
          width={scaledW}
          height={28}
          fill="transparent"
          style={{ cursor: "copy" }}
          onClick={() => onDikmeSayisiDegisti!(dikmeSayisi + 1)}
        >
          <title>Yeni dikme eklemek için tıkla</title>
        </rect>
      )}

      {dikmeXs.map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={y0 + scaledH} r={5} fill={hoverIndex === i && tiklanabilir ? "#dc2626" : PALET.ana} style={{ pointerEvents: "none" }} />
          {tiklanabilir && dikmeSayisi > 2 && (
            <circle
              cx={x}
              cy={y0 + scaledH}
              r={12}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              onClick={(e) => {
                e.stopPropagation();
                onDikmeSayisiDegisti!(dikmeSayisi - 1);
                setHoverIndex(null);
              }}
            >
              <title>Bu dikmeyi kaldırmak için tıkla</title>
            </circle>
          )}
        </g>
      ))}
      <line x1={x0} y1={y0} x2={x0 + scaledW} y2={y0} stroke={PALET.ikincil} strokeWidth={3} strokeDasharray="5 3" />

      <YatayOlcu x1={x0} x2={x0 + scaledW} y={y0 + scaledH + 30} etiket={mmEtiket(genislikMm)} />
      <DikeyOlcu y1={y0} y2={y0 + scaledH} x={x0 - 30} etiket={mmEtiket(boyMm)} />

      <Lejant
        kalemler={[
          { renk: PALET.ana, etiket: `Dikme (${dikmeSayisi} adet)` },
          { renk: PALET.ikincil, etiket: "Duvara montaj kenarı" },
        ]}
        y={VIEW_H + 6}
      />
    </svg>
  );
}

function Gorunum3D({ veri }: { veri: SundurmaSemaVeri }) {
  const { yukseklikMm, boyMm, genislikMm = 3000, egimYuzde, dikmeSayisi = 2, dikmeKesit, anaTasiyiciKesit } = veri;
  const arkaYukseklikMm = yukseklikMm + boyMm * (egimYuzde / 100);
  const dikmeXs = Array.from({ length: dikmeSayisi }, (_, i) => (i / (dikmeSayisi - 1)) * genislikMm);

  const kirisler: Kiris3D[] = [];
  dikmeXs.forEach((x, i) => {
    kirisler.push({ a: [x, 0, 0], b: [x, yukseklikMm, 0], enMm: dikmeKesit?.enMm ?? 60, renk: PALET.ana, etiket: i === 0 ? mmEtiket(yukseklikMm) : undefined });
    kirisler.push({ a: [x, yukseklikMm, 0], b: [x, arkaYukseklikMm, boyMm], enMm: anaTasiyiciKesit?.kalinlikMm ?? 60, renk: PALET.yatay, etiket: i === 0 ? `kiriş: ${mmEtiket(veri.kirisUzunlukMm ?? boyMm)}` : undefined });
    kirisler.push({ a: [x, arkaYukseklikMm, boyMm], b: [x, 0, boyMm], enMm: 40, renk: PALET.ikincil, kesikli: true });
  });
  kirisler.push({ a: [0, yukseklikMm, 0], b: [genislikMm, yukseklikMm, 0], enMm: dikmeKesit?.enMm ?? 60, renk: PALET.ana });

  const yuzeyler: Yuzey3D[] = [
    { noktalar: [[0, yukseklikMm, 0], [genislikMm, yukseklikMm, 0], [genislikMm, arkaYukseklikMm, boyMm], [0, arkaYukseklikMm, boyMm]], fill: "#93c5fd", fillOpacity: 0.3 },
  ];

  const lejant = [
    { renk: PALET.ana, etiket: "Ön Dikme" },
    { renk: PALET.yatay, etiket: "Ana Kiriş" },
    { renk: PALET.ikincil, etiket: "Arka Destek/Duvar" },
  ];

  return <Izometrik3DSahne kirisler={kirisler} yuzeyler={yuzeyler} lejant={lejant} ariaLabel="Sundurma 3D izometrik görünüm" />;
}

/** Sundurmanın yandan/üstten/3D görünüşlerini, seçilen dikme/kiriş profilinin gerçek
 * ölçüsüyle tutarlı, ölçekli bir çizim olarak gösterir. `duzenlenebilir` verilirse üstten
 * görünüşte dikme sayısı, dikme işaretine tıklayarak azaltılabilir / boş alana tıklayarak
 * artırılabilir (pozisyonlar her zaman eşit aralıklı kalır, sadece sayı değişir). */
export default function CanopySchematic({
  veri,
  duzenlenebilir,
  onDikmeSayisiDegisti,
}: {
  veri: SundurmaSemaVeri;
  duzenlenebilir?: boolean;
  onDikmeSayisiDegisti?: (yeniSayi: number) => void;
}) {
  const [gorunum, setGorunum] = useState<SemaGorunumTipi>("yan");
  const { yukseklikMm, boyMm } = veri;
  if (!yukseklikMm || !boyMm) return null;

  const editable = Boolean(duzenlenebilir && onDikmeSayisiDegisti);

  return (
    <div>
      <GorunumSekmeleri aktif={gorunum} onSec={setGorunum} secenekler={["yan", "ust", "3d"]} />
      {editable && gorunum === "ust" && (
        <div className="mb-2 text-xs text-neutral-500">
          💡 Boş alana tıklayarak dikme ekleyebilir, bir dikmeye tıklayarak kaldırabilirsiniz.
        </div>
      )}
      {gorunum === "yan" && <YandanGorunum veri={veri} />}
      {gorunum === "ust" && <UstenGorunum veri={veri} duzenlenebilir={editable} onDikmeSayisiDegisti={onDikmeSayisiDegisti} />}
      {gorunum === "3d" && <Gorunum3D veri={veri} />}
    </div>
  );
}
