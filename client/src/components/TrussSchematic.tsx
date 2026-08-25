import { useState } from "react";
import {
  OkTanimlari,
  YatayOlcu,
  DikeyOlcu,
  mmEtiket,
  PALET,
  Lejant,
  VIEW_W,
  KesitOlcusu,
  olcekliKalinlikPx,
  GorunumSekmeleri,
  SemaGorunumTipi,
} from "./schematicShared";
import TrussIsometricView from "./TrussIsometricView";

export interface CatiKafesiSemaVeri {
  acikligMm: number;
  egimYuzde: number;
  catiUzunluguMm: number;
  asikVar?: boolean;
  asikAraligiHedefMm?: number;
  diyagonalVar?: boolean;
  diyagonalPanelSayisi?: number;
  kafesSayisi?: number;
  gercekAralikMm?: number;
  stabiliteVar?: boolean;
  direkSayisi?: number;
  ustBaslikKesit?: KesitOlcusu;
  kralKirisiKesit?: KesitOlcusu;
  asikKesit?: KesitOlcusu;
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 30;
const PANEL_A_TOP = 20;
const PANEL_A_H = 220;
const PANEL_A_DIM_H = 40;
const PANEL_A_BOTTOM = PANEL_A_TOP + PANEL_A_H + PANEL_A_DIM_H;
const PANEL_A_LEGEND_Y = PANEL_A_BOTTOM + 8;
const PANEL_A_TOTAL_H = PANEL_A_LEGEND_Y + 32;

const PANEL_B_TOP = 40;
const PANEL_B_H = 180;
const PANEL_B_DIM_H = 40;
const PANEL_B_BOTTOM = PANEL_B_TOP + PANEL_B_H + PANEL_B_DIM_H;
const PANEL_B_LEGEND_Y = PANEL_B_BOTTOM + 8;
const PANEL_B_TOTAL_H = PANEL_B_LEGEND_Y + 32;

/** Kesit (bir kafes) görünüşü - üçgen profil, diyagonal/direk detayları. */
function KesitGorunumu({ veri }: { veri: CatiKafesiSemaVeri }) {
  const {
    acikligMm,
    egimYuzde,
    asikVar = false,
    asikAraligiHedefMm = 1000,
    diyagonalVar = false,
    diyagonalPanelSayisi = 0,
    stabiliteVar = false,
    direkSayisi = 0,
    ustBaslikKesit,
    kralKirisiKesit,
    asikKesit,
  } = veri;

  const yariAciklikMm = acikligMm / 2;
  const mahyaYuksekligiMm = yariAciklikMm * (egimYuzde / 100);
  const ustBaslikUzunlukMm = Math.sqrt(yariAciklikMm ** 2 + mahyaYuksekligiMm ** 2);
  const asikSatirSayisiPerSide = asikVar ? Math.max(2, Math.ceil(ustBaslikUzunlukMm / asikAraligiHedefMm) + 1) : 0;
  const M = diyagonalVar ? diyagonalPanelSayisi : 0;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const scale = Math.min(drawW / acikligMm, PANEL_A_H / Math.max(mahyaYuksekligiMm, acikligMm / 6));

  const scaledAciklik = acikligMm * scale;
  const scaledMahya = mahyaYuksekligiMm * scale;

  const x0 = MARGIN_LEFT;
  const groundY = PANEL_A_TOP + PANEL_A_H;
  const xOrta = x0 + scaledAciklik / 2;
  const tepeY = groundY - scaledMahya;

  const gövde = `${x0},${groundY} ${xOrta},${tepeY} ${x0 + scaledAciklik},${groundY}`;
  const baslikKalinlik = olcekliKalinlikPx(ustBaslikKesit?.kalinlikMm ?? 40, scale, 2.5);
  const kralKirisiKalinlik = olcekliKalinlikPx(kralKirisiKesit?.kalinlikMm ?? 30, scale, 2);

  const zigzagSegmentleri = (xA: number, xB: number, yAlt: number, yUst: number, panelSayisi: number) => {
    const alt = (k: number) => ({ x: xA + (k / panelSayisi) * (xB - xA), y: yAlt });
    const ust = (k: number) => ({ x: xA + (k / panelSayisi) * (xB - xA), y: yAlt + (k / panelSayisi) * (yUst - yAlt) });
    const segs: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let k = 0; k < panelSayisi; k++) {
      const b0 = alt(k),
        t1 = ust(k + 1),
        t0 = ust(k),
        b1 = alt(k + 1);
      segs.push({ x1: b0.x, y1: b0.y, x2: t1.x, y2: t1.y });
      segs.push({ x1: t0.x, y1: t0.y, x2: b1.x, y2: b1.y });
    }
    return segs;
  };
  const caprazCizgileri =
    M > 0
      ? [...zigzagSegmentleri(x0, xOrta, groundY, tepeY, M), ...zigzagSegmentleri(x0 + scaledAciklik, xOrta, groundY, tepeY, M)]
      : [];

  const direkCizgileri = (xA: number, xB: number, yAlt: number, yUst: number, sayisi: number, panelSayisi: number) => {
    if (sayisi <= 0 || panelSayisi <= 0) return [];
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let k = 1; k <= sayisi; k++) {
      const x = xA + (k / panelSayisi) * (xB - xA);
      const yTop = yAlt + (k / panelSayisi) * (yUst - yAlt);
      lines.push({ x1: x, y1: yAlt, x2: x, y2: yTop });
    }
    return lines;
  };
  const direkPanelSayisi = direkSayisi > 0 ? direkSayisi + 1 : M;
  const direkCizgileriListesi =
    direkSayisi > 0
      ? [
          ...direkCizgileri(x0, xOrta, groundY, tepeY, direkSayisi, direkPanelSayisi),
          ...direkCizgileri(x0 + scaledAciklik, xOrta, groundY, tepeY, direkSayisi, direkPanelSayisi),
        ]
      : [];

  const dimAciklikY = groundY + 30;
  const dimYukseklikX = x0 - 30;

  const lejant = [
    { renk: PALET.ana, etiket: "Üst/Alt Başlık" },
    { renk: PALET.ikincil, etiket: "Kral Kirişi" },
    ...(direkSayisi > 0 ? [{ renk: PALET.yatay, etiket: "Direk" }] : []),
    ...(M > 0 ? [{ renk: PALET.destek, etiket: "Çapraz Destek" }] : []),
    ...(asikVar ? [{ renk: PALET.vurgu, etiket: "Aşık" }] : []),
    ...(stabiliteVar ? [{ renk: PALET.stabilite, etiket: "Stabilite Bağlantısı" }] : []),
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${PANEL_A_TOTAL_H}`} className="w-full h-auto" role="img" aria-label="Çatı kafesi kesit görünüşü şematik çizimi">
      <OkTanimlari />
      <text x={x0} y={PANEL_A_TOP - 6} fontSize={11} fill="#a3a3a3">
        Kesit görünüşü (bir kafes)
      </text>
      <line x1={x0 - 15} y1={groundY} x2={x0 + scaledAciklik + 15} y2={groundY} stroke="#a3a3a3" strokeWidth={2} />

      <polygon points={gövde} fill="#e5e5e5" stroke="none" />
      <line x1={x0} y1={groundY} x2={x0 + scaledAciklik} y2={groundY} stroke={PALET.ana} strokeWidth={baslikKalinlik} />
      <line x1={x0} y1={groundY} x2={xOrta} y2={tepeY} stroke={PALET.ana} strokeWidth={baslikKalinlik} />
      <line x1={x0 + scaledAciklik} y1={groundY} x2={xOrta} y2={tepeY} stroke={PALET.ana} strokeWidth={baslikKalinlik} />
      <line x1={xOrta} y1={groundY} x2={xOrta} y2={tepeY} stroke={PALET.ikincil} strokeWidth={kralKirisiKalinlik} strokeDasharray="5 3" />
      {direkCizgileriListesi.map((c, i) => (
        <line key={i} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke={PALET.yatay} strokeWidth={2.5} />
      ))}
      {caprazCizgileri.map((c, i) => (
        <line key={i} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke={PALET.destek} strokeWidth={2} />
      ))}
      {asikVar &&
        Array.from({ length: asikSatirSayisiPerSide }, (_, i) => i / (asikSatirSayisiPerSide - 1)).map((oran, i) => (
          <g key={i}>
            <circle cx={x0 + oran * (xOrta - x0)} cy={groundY + oran * (tepeY - groundY)} r={Math.max(2, olcekliKalinlikPx(asikKesit?.enMm ?? 30, scale) / 2)} fill={PALET.vurgu} />
            <circle
              cx={x0 + scaledAciklik - oran * (x0 + scaledAciklik - xOrta)}
              cy={groundY + oran * (tepeY - groundY)}
              r={Math.max(2, olcekliKalinlikPx(asikKesit?.enMm ?? 30, scale) / 2)}
              fill={PALET.vurgu}
            />
          </g>
        ))}

      <YatayOlcu x1={x0} x2={x0 + scaledAciklik} y={dimAciklikY} etiket={mmEtiket(acikligMm)} />
      <DikeyOlcu y1={tepeY} y2={groundY} x={dimYukseklikX} etiket={mmEtiket(mahyaYuksekligiMm)} />
      <text x={xOrta} y={tepeY - 10} textAnchor="middle" fontSize={12} fill="#525252">
        eğim %{egimYuzde} · başlık {mmEtiket(ustBaslikUzunlukMm)}
      </text>

      <Lejant kalemler={lejant} y={PANEL_A_LEGEND_Y} />
    </svg>
  );
}

/** Aşık yerleşim planı (bir yamaç, açılmış görünüş - üstten bakış). */
function AsikPlaniGorunumu({ veri }: { veri: CatiKafesiSemaVeri }) {
  const { acikligMm, egimYuzde, catiUzunluguMm, asikVar = false, asikAraligiHedefMm = 1000, kafesSayisi = 2, gercekAralikMm = catiUzunluguMm, stabiliteVar = false } = veri;

  const yariAciklikMm = acikligMm / 2;
  const mahyaYuksekligiMm = yariAciklikMm * (egimYuzde / 100);
  const ustBaslikUzunlukMm = Math.sqrt(yariAciklikMm ** 2 + mahyaYuksekligiMm ** 2);
  const asikSatirSayisiPerSide = asikVar ? Math.max(2, Math.ceil(ustBaslikUzunlukMm / asikAraligiHedefMm) + 1) : 0;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const scaleBx = drawW / catiUzunluguMm;
  const scaleBy = PANEL_B_H / ustBaslikUzunlukMm;
  const bx0 = MARGIN_LEFT;
  const by0 = PANEL_B_TOP;
  const scaledUzunluk = catiUzunluguMm * scaleBx;
  const scaledRafter = ustBaslikUzunlukMm * scaleBy;

  const kafesXPozisyonlari = Array.from({ length: kafesSayisi }, (_, i) => bx0 + Math.min(i * gercekAralikMm, catiUzunluguMm) * scaleBx);
  const asikYPozisyonlari = asikVar
    ? Array.from({ length: asikSatirSayisiPerSide }, (_, i) => by0 + (i / (asikSatirSayisiPerSide - 1)) * scaledRafter)
    : [];
  const stabiliteCizilecek = stabiliteVar && kafesSayisi >= 2;

  const lejant = [
    { renk: PALET.ana, etiket: "Kafes" },
    ...(asikVar ? [{ renk: PALET.vurgu, etiket: "Aşık" }] : []),
    ...(stabiliteCizilecek ? [{ renk: PALET.stabilite, etiket: "Stabilite Bağlantısı" }] : []),
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${PANEL_B_TOTAL_H}`} className="w-full h-auto" role="img" aria-label="Çatı kafesi aşık yerleşim planı şematik çizimi">
      <OkTanimlari />
      <text x={bx0} y={by0 - 12} fontSize={11} fill="#a3a3a3">
        Üstten görünüş (bir yamaç, açılmış plan)
      </text>
      <rect x={bx0} y={by0} width={scaledUzunluk} height={scaledRafter} fill="#f5f5f5" stroke="#d4d4d4" />
      {kafesXPozisyonlari.map((px, i) => (
        <line key={i} x1={px} y1={by0} x2={px} y2={by0 + scaledRafter} stroke={PALET.ana} strokeWidth={2.5} />
      ))}
      {asikYPozisyonlari.map((py, i) => (
        <line key={i} x1={bx0} y1={py} x2={bx0 + scaledUzunluk} y2={py} stroke={PALET.vurgu} strokeWidth={2} />
      ))}
      {stabiliteCizilecek && (
        <g>
          <line x1={kafesXPozisyonlari[0]} y1={by0} x2={kafesXPozisyonlari[1]} y2={by0 + scaledRafter} stroke={PALET.stabilite} strokeWidth={2.5} />
          <line x1={kafesXPozisyonlari[0]} y1={by0 + scaledRafter} x2={kafesXPozisyonlari[1]} y2={by0} stroke={PALET.stabilite} strokeWidth={2.5} />
        </g>
      )}

      <YatayOlcu x1={bx0} x2={bx0 + scaledUzunluk} y={by0 + scaledRafter + 30} etiket={mmEtiket(catiUzunluguMm)} />
      <DikeyOlcu y1={by0} y2={by0 + scaledRafter} x={bx0 - 30} etiket={mmEtiket(ustBaslikUzunlukMm)} />
      {kafesXPozisyonlari.length > 1 && (
        <YatayOlcu x1={kafesXPozisyonlari[0]} x2={kafesXPozisyonlari[1]} y={by0 - 12} etiket={mmEtiket(gercekAralikMm)} etiketAltta={false} fontSize={10} kalin={false} />
      )}

      <Lejant kalemler={lejant} y={PANEL_B_LEGEND_Y} />
    </svg>
  );
}

/** Çatı kafesinin kesit/aşık planı/3D görünüşlerini, seçilen başlık/aşık profilinin gerçek
 * ölçüsüyle tutarlı, ölçekli bir çizim olarak gösterir. */
export default function TrussSchematic({ veri }: { veri: CatiKafesiSemaVeri }) {
  const [gorunum, setGorunum] = useState<SemaGorunumTipi>("on");
  const { acikligMm, catiUzunluguMm, kafesSayisi = 2, gercekAralikMm } = veri;
  if (!acikligMm) return null;

  return (
    <div>
      <GorunumSekmeleri aktif={gorunum} onSec={setGorunum} secenekler={["on", "ust", "3d"]} />
      {gorunum === "on" && <KesitGorunumu veri={veri} />}
      {gorunum === "ust" && <AsikPlaniGorunumu veri={veri} />}
      {gorunum === "3d" && catiUzunluguMm > 0 && (
        <TrussIsometricView
          veri={{
            acikligMm,
            egimYuzde: veri.egimYuzde,
            catiUzunluguMm,
            kafesSayisi,
            gercekAralikMm: gercekAralikMm ?? catiUzunluguMm,
            asikVar: veri.asikVar,
            asikAraligiHedefMm: veri.asikAraligiHedefMm,
            stabiliteVar: veri.stabiliteVar,
            kaplamaGoster: true,
          }}
        />
      )}
    </div>
  );
}
