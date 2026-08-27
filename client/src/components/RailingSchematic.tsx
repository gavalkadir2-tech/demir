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

export interface KorkulukSemaVeri {
  toplamUzunlukMm: number;
  yukseklikMm: number;
  dikmeSayisi: number;
  araliklarSayisi: number;
  gercekAralikMm: number;
  araKayitSayisi?: number;
  dikmeKesit?: KesitOlcusu;
  ustProfilKesit?: KesitOlcusu;
  altProfilKesit?: KesitOlcusu;
  araKayitKesit?: KesitOlcusu;
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 70;

function OndenGorunum({ veri }: { veri: Required<Pick<KorkulukSemaVeri, "toplamUzunlukMm" | "yukseklikMm" | "dikmeSayisi" | "araliklarSayisi" | "gercekAralikMm">> & KorkulukSemaVeri }) {
  const { toplamUzunlukMm, yukseklikMm, dikmeSayisi, araliklarSayisi, gercekAralikMm, araKayitSayisi = 0, dikmeKesit, ustProfilKesit, altProfilKesit, araKayitKesit } = veri;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / toplamUzunlukMm, drawH / yukseklikMm);

  const scaledW = toplamUzunlukMm * scale;
  const scaledH = yukseklikMm * scale;
  const x0 = MARGIN_LEFT;
  const topY = MARGIN_TOP + (drawH - scaledH);
  const groundY = topY + scaledH;

  const postWidth = olcekliKalinlikPx(dikmeKesit?.enMm ?? 40, scale, 2);
  const railThickness = olcekliKalinlikPx(ustProfilKesit?.kalinlikMm ?? 40, scale, 2);
  const altThickness = olcekliKalinlikPx(altProfilKesit?.kalinlikMm ?? 40, scale, 2);
  const araThickness = olcekliKalinlikPx(araKayitKesit?.kalinlikMm ?? 30, scale, 1.5);

  const postXs = Array.from({ length: dikmeSayisi }, (_, i) => x0 + Math.min(i, araliklarSayisi) * gercekAralikMm * scale);

  const araKayitYlar =
    araKayitSayisi > 0
      ? Array.from({ length: araKayitSayisi }, (_, i) => {
          const oran = (i + 1) / (araKayitSayisi + 1);
          return topY + railThickness + oran * (scaledH - railThickness - altThickness);
        })
      : [];

  const dimUzunlukY = groundY + 30;
  const dimYukseklikX = x0 - 30;

  const lejant = [
    { renk: PALET.ana, etiket: "Dikme" },
    { renk: PALET.yatay, etiket: "Üst/Alt Profil" },
    ...(araKayitSayisi > 0 ? [{ renk: PALET.vurgu, etiket: "Ara Kayıt" }] : []),
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Korkuluk önden görünüş şematik çizimi">
      <OkTanimlari />

      <line x1={x0 - 15} y1={groundY} x2={x0 + scaledW + 15} y2={groundY} stroke="#a3a3a3" strokeWidth={2} />

      {postXs.map((px, i) => (
        <rect key={i} x={px - postWidth / 2} y={topY} width={postWidth} height={scaledH} fill={PALET.ana} />
      ))}

      <rect x={x0} y={topY} width={scaledW} height={railThickness} fill={PALET.yatay} />
      <rect x={x0} y={groundY - altThickness} width={scaledW} height={altThickness} fill={PALET.yatay} />
      {araKayitYlar.map((y, i) => (
        <rect key={i} x={x0} y={y - araThickness / 2} width={scaledW} height={araThickness} fill={PALET.vurgu} />
      ))}

      <YatayOlcu x1={x0} x2={x0 + scaledW} y={dimUzunlukY} etiket={mmEtiket(toplamUzunlukMm)} />
      <DikeyOlcu y1={topY} y2={groundY} x={dimYukseklikX} etiket={mmEtiket(yukseklikMm)} />

      {postXs.length > 1 && (
        <YatayOlcu x1={postXs[0]} x2={postXs[1]} y={topY - 14} etiket={mmEtiket(gercekAralikMm)} etiketAltta={false} fontSize={11} kalin={false} />
      )}
      {dikmeKesit && (
        <text x={postXs[0]} y={topY + 22} textAnchor="middle" fontSize={9} fill="#737373" transform={`rotate(-90 ${postXs[0]} ${topY + 22})`}>
          {mmEtiket(dikmeKesit.enMm)}
        </text>
      )}

      <Lejant kalemler={lejant} y={VIEW_H + 6} />
    </svg>
  );
}

function UstenGorunum({ veri }: { veri: KorkulukSemaVeri }) {
  const { toplamUzunlukMm, dikmeSayisi, araliklarSayisi, gercekAralikMm, dikmeKesit } = veri;
  const derinlikMm = dikmeKesit?.kalinlikMm ?? 40;
  const en = dikmeKesit?.enMm ?? 40;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const scale = drawW / toplamUzunlukMm;
  const cy = VIEW_H / 2 - 10;
  const x0 = MARGIN_LEFT;
  const scaledW = toplamUzunlukMm * scale;

  const postXs = Array.from({ length: dikmeSayisi }, (_, i) => x0 + Math.min(i, araliklarSayisi) * gercekAralikMm * scale);
  const postW = olcekliKalinlikPx(en, scale, 4);
  const postD = olcekliKalinlikPx(derinlikMm, scale, 4);

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Korkuluk üstten (plan) görünüş şematik çizimi">
      <OkTanimlari />
      <text x={x0} y={cy - postD / 2 - 20} fontSize={11} fill="#a3a3a3">
        Üstten görünüş (dikme yerleşim planı)
      </text>
      <line x1={x0} y1={cy} x2={x0 + scaledW} y2={cy} stroke="#d4d4d4" strokeDasharray="4 3" />
      {postXs.map((px, i) => (
        <rect key={i} x={px - postW / 2} y={cy - postD / 2} width={postW} height={postD} fill={PALET.ana} />
      ))}
      <YatayOlcu x1={x0} x2={x0 + scaledW} y={cy + postD / 2 + 30} etiket={mmEtiket(toplamUzunlukMm)} />
      <text x={x0 + scaledW / 2} y={cy + postD / 2 + 55} textAnchor="middle" fontSize={11} fill="#525252">
        dikme kesiti: {mmEtiket(en)} × {mmEtiket(derinlikMm)}
      </text>
      <Lejant kalemler={[{ renk: PALET.ana, etiket: "Dikme (kesit izi)" }]} y={VIEW_H + 6} />
    </svg>
  );
}

function Gorunum3D({ veri }: { veri: KorkulukSemaVeri }) {
  const { toplamUzunlukMm, yukseklikMm, dikmeSayisi, araliklarSayisi, gercekAralikMm, araKayitSayisi = 0, dikmeKesit, ustProfilKesit, altProfilKesit, araKayitKesit } = veri;
  const postXs = Array.from({ length: dikmeSayisi }, (_, i) => Math.min(i, araliklarSayisi) * gercekAralikMm);

  const kirisler: Kiris3D[] = [];
  postXs.forEach((x, i) => {
    kirisler.push({ a: [x, 0, 0], b: [x, yukseklikMm, 0], enMm: dikmeKesit?.enMm ?? 40, renk: PALET.ana, etiket: i === 0 ? mmEtiket(yukseklikMm) : undefined });
  });
  kirisler.push({ a: [0, yukseklikMm, 0], b: [toplamUzunlukMm, yukseklikMm, 0], enMm: ustProfilKesit?.kalinlikMm ?? 40, renk: PALET.yatay });
  kirisler.push({ a: [0, 0, 0], b: [toplamUzunlukMm, 0, 0], enMm: altProfilKesit?.kalinlikMm ?? 40, renk: PALET.yatay, etiket: mmEtiket(toplamUzunlukMm) });
  for (let i = 1; i <= araKayitSayisi; i++) {
    const y = (yukseklikMm * i) / (araKayitSayisi + 1);
    kirisler.push({ a: [0, y, 0], b: [toplamUzunlukMm, y, 0], enMm: araKayitKesit?.kalinlikMm ?? 30, renk: PALET.vurgu });
  }

  const lejant = [
    { renk: PALET.ana, etiket: "Dikme" },
    { renk: PALET.yatay, etiket: "Üst/Alt Profil" },
    ...(araKayitSayisi > 0 ? [{ renk: PALET.vurgu, etiket: "Ara Kayıt" }] : []),
  ];

  return <Izometrik3DSahne kirisler={kirisler} lejant={lejant} ariaLabel="Korkuluk 3D izometrik görünüm" />;
}

/** Korkuluğun önden/üstten/3D görünüşlerini, seçilen malzemelerin gerçek kesit ölçüleriyle
 * tutarlı, ölçekli ve ölçülü bir çizim olarak gösterir. */
export default function RailingSchematic({ veri }: { veri: KorkulukSemaVeri }) {
  const [gorunum, setGorunum] = useState<SemaGorunumTipi>("on");
  const { toplamUzunlukMm, yukseklikMm, dikmeSayisi, araliklarSayisi, gercekAralikMm } = veri;

  if (!toplamUzunlukMm || !yukseklikMm || dikmeSayisi < 2) return null;

  return (
    <div>
      <GorunumSekmeleri aktif={gorunum} onSec={setGorunum} secenekler={["on", "ust", "3d"]} />
      {gorunum === "on" && <OndenGorunum veri={{ ...veri, toplamUzunlukMm, yukseklikMm, dikmeSayisi, araliklarSayisi, gercekAralikMm }} />}
      {gorunum === "ust" && <UstenGorunum veri={veri} />}
      {gorunum === "3d" && <Gorunum3D veri={veri} />}
    </div>
  );
}
