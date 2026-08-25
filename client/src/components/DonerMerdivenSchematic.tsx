import { useState } from "react";
import {
  OkTanimlari,
  DikeyOlcu,
  mmEtiket,
  PALET,
  Lejant,
  VIEW_W,
  VIEW_H,
  LEGEND_H,
  KesitOlcusu,
  GorunumSekmeleri,
  SemaGorunumTipi,
  Izometrik3DSahne,
  Kiris3D,
  Yuzey3D,
} from "./schematicShared";

export interface DonerMerdivenSemaVeri {
  icCapMm: number;
  disCapMm: number;
  basamakSayisi: number;
  toplamDonusDerecesi: number;
  korkulukVar?: boolean;
  katYuksekligiMm?: number;
  merkezKolonKesit?: KesitOlcusu;
}

const MARGIN = 30;

function UstenGorunum({ veri }: { veri: DonerMerdivenSemaVeri }) {
  const { icCapMm, disCapMm, basamakSayisi, toplamDonusDerecesi, korkulukVar = false } = veri;

  const cx = VIEW_W / 2;
  const cy = (VIEW_H - LEGEND_H) / 2 + 10;
  const drawSize = Math.min(VIEW_W, VIEW_H - LEGEND_H) - MARGIN * 2;
  const scale = drawSize / disCapMm;

  const rDis = (disCapMm / 2) * scale;
  const rIc = (icCapMm / 2) * scale;

  const basamakAcisiDerece = toplamDonusDerecesi / basamakSayisi;
  const acidan = (dereceIndex: number) => (-90 + dereceIndex * basamakAcisiDerece) * (Math.PI / 180);
  const nokta = (aciRad: number, r: number) => ({ x: cx + r * Math.cos(aciRad), y: cy + r * Math.sin(aciRad) });

  const dilimler = Array.from({ length: basamakSayisi }, (_, i) => {
    const a1 = acidan(i);
    const a2 = acidan(i + 1);
    const p1 = nokta(a1, rIc);
    const p2 = nokta(a1, rDis);
    const p3 = nokta(a2, rDis);
    const p4 = nokta(a2, rIc);
    const buyukYay = basamakAcisiDerece > 180 ? 1 : 0;
    const path = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} A ${rDis} ${rDis} 0 ${buyukYay} 1 ${p3.x} ${p3.y} L ${p4.x} ${p4.y} A ${rIc} ${rIc} 0 ${buyukYay} 0 ${p1.x} ${p1.y} Z`;
    return { path, key: i };
  });

  const disCemberBuyukYay = toplamDonusDerecesi > 180 ? 1 : 0;
  const disCemberBaslangic = nokta(acidan(0), rDis);
  const disCemberBitis = nokta(acidan(basamakSayisi), rDis);
  const tamTur = toplamDonusDerecesi >= 360;
  const disCemberPath = tamTur
    ? `M ${cx - rDis} ${cy} A ${rDis} ${rDis} 0 1 1 ${cx + rDis} ${cy} A ${rDis} ${rDis} 0 1 1 ${cx - rDis} ${cy}`
    : `M ${disCemberBaslangic.x} ${disCemberBaslangic.y} A ${rDis} ${rDis} 0 ${disCemberBuyukYay} 1 ${disCemberBitis.x} ${disCemberBitis.y}`;

  const olcuNoktasi = nokta(acidan(0), 0);
  const disOlcuNoktasi = nokta(acidan(0), rDis);
  const icOlcuNoktasi = nokta(acidan(0), rIc);

  const lejant = [
    { renk: PALET.ana, etiket: "Merkez Kolon" },
    { renk: PALET.yatay, etiket: "Basamak" },
    ...(korkulukVar ? [{ renk: PALET.stabilite, etiket: "Korkuluk" }] : []),
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Döner merdiven üstten (plan) görünüş şematik çizimi">
      <OkTanimlari />
      {dilimler.map((d) => (
        <path key={d.key} d={d.path} fill={PALET.yatay} fillOpacity={0.18} stroke={PALET.yatay} strokeWidth={1.5} />
      ))}
      <path d={disCemberPath} fill="none" stroke={PALET.yatay} strokeWidth={2} />
      {korkulukVar && <path d={disCemberPath} fill="none" stroke={PALET.stabilite} strokeWidth={2} strokeDasharray="6 4" />}
      <circle cx={cx} cy={cy} r={rIc} fill={PALET.ana} />
      <line x1={icOlcuNoktasi.x} y1={icOlcuNoktasi.y} x2={disOlcuNoktasi.x} y2={disOlcuNoktasi.y} stroke="#525252" strokeWidth={1} strokeDasharray="3 3" />
      <text x={cx} y={cy - rDis - 10} textAnchor="middle" fontSize={12} fontWeight={600} fill="#262626">
        {mmEtiket(disCapMm)} dış çap
      </text>
      <text x={olcuNoktasi.x} y={olcuNoktasi.y + 4} textAnchor="middle" fontSize={10} fill="#525252">
        {mmEtiket(icCapMm)}
      </text>
      <text x={cx} y={cy + rDis + 22} textAnchor="middle" fontSize={11} fill="#525252">
        {basamakSayisi} basamak × {basamakAcisiDerece.toFixed(1)}° ({toplamDonusDerecesi}° toplam dönüş)
      </text>
      <Lejant kalemler={lejant} y={VIEW_H + 6} />
    </svg>
  );
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 60;

function YandanGorunum({ veri }: { veri: DonerMerdivenSemaVeri }) {
  const { disCapMm, basamakSayisi, katYuksekligiMm = 0 } = veri;
  if (!katYuksekligiMm) return null;
  const gercekBasamakYuksekligiMm = katYuksekligiMm / basamakSayisi;

  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = drawH / katYuksekligiMm;
  const x0 = MARGIN_LEFT;
  const groundY = MARGIN_TOP + drawH;
  const topY = groundY - katYuksekligiMm * scale;
  const scaledDis = disCapMm * scale;

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Döner merdiven yandan görünüş şematik çizimi">
      <OkTanimlari />
      <text x={x0} y={MARGIN_TOP - 12} fontSize={11} fill="#a3a3a3">
        Yandan görünüş (yükselim)
      </text>
      <line x1={x0 - 15} y1={groundY} x2={x0 + Math.max(scaledDis, 200) + 15} y2={groundY} stroke="#a3a3a3" strokeWidth={2} />
      <rect x={x0 - 8} y={topY} width={16} height={groundY - topY} fill={PALET.ana} />
      {Array.from({ length: basamakSayisi + 1 }, (_, i) => groundY - i * gercekBasamakYuksekligiMm * scale).map((y, i) => (
        <line key={i} x1={x0 + 10} y1={y} x2={x0 + Math.max(scaledDis, 200) / 2 + 30} y2={y} stroke={PALET.yatay} strokeWidth={2} />
      ))}
      <DikeyOlcu y1={topY} y2={groundY} x={x0 - 30} etiket={mmEtiket(katYuksekligiMm)} />
      <text x={x0 + 60} y={groundY + 30} fontSize={11} fill="#525252">
        {basamakSayisi} basamak × {mmEtiket(Math.round(gercekBasamakYuksekligiMm))} rise
      </text>
      <Lejant kalemler={[{ renk: PALET.ana, etiket: "Merkez Kolon" }, { renk: PALET.yatay, etiket: "Basamak" }]} y={VIEW_H + 6} />
    </svg>
  );
}

function Gorunum3D({ veri }: { veri: DonerMerdivenSemaVeri }) {
  const { icCapMm, disCapMm, basamakSayisi, toplamDonusDerecesi, katYuksekligiMm = 0, merkezKolonKesit } = veri;
  if (!katYuksekligiMm) return null;

  const rIc = icCapMm / 2;
  const rDis = disCapMm / 2;
  const basamakAcisi = (toplamDonusDerecesi / basamakSayisi) * (Math.PI / 180);
  const yukselim = katYuksekligiMm / basamakSayisi;

  const kirisler: Kiris3D[] = [
    { a: [0, 0, 0], b: [0, katYuksekligiMm, 0], enMm: merkezKolonKesit?.enMm ?? 60, renk: PALET.ana, etiket: mmEtiket(katYuksekligiMm) },
  ];
  const yuzeyler: Yuzey3D[] = [];

  for (let i = 0; i < basamakSayisi; i++) {
    const a1 = i * basamakAcisi;
    const a2 = (i + 1) * basamakAcisi;
    const y = (i + 1) * yukselim;
    const p1: [number, number, number] = [rIc * Math.cos(a1), y, rIc * Math.sin(a1)];
    const p2: [number, number, number] = [rDis * Math.cos(a1), y, rDis * Math.sin(a1)];
    const p3: [number, number, number] = [rDis * Math.cos(a2), y, rDis * Math.sin(a2)];
    const p4: [number, number, number] = [rIc * Math.cos(a2), y, rIc * Math.sin(a2)];
    yuzeyler.push({ noktalar: [p1, p2, p3, p4], fill: PALET.yatay, fillOpacity: 0.45 });
    kirisler.push({ a: p1, b: p2, enMm: 25, renk: PALET.yatay });
  }

  const lejant = [
    { renk: PALET.ana, etiket: "Merkez Kolon" },
    { renk: PALET.yatay, etiket: "Basamak" },
  ];

  return <Izometrik3DSahne kirisler={kirisler} yuzeyler={yuzeyler} lejant={lejant} ariaLabel="Döner merdiven 3D izometrik görünüm" viewH={380} />;
}

/** Döner merdivenin üstten/yandan/3D görünüşlerini, seçilen merkez kolon profilinin gerçek
 * ölçüsüyle tutarlı, ölçekli bir çizim olarak gösterir. */
export default function DonerMerdivenSchematic({ veri }: { veri: DonerMerdivenSemaVeri }) {
  const [gorunum, setGorunum] = useState<SemaGorunumTipi>("ust");
  const { disCapMm, basamakSayisi, katYuksekligiMm } = veri;
  if (!disCapMm || !basamakSayisi) return null;

  const secenekler: SemaGorunumTipi[] = katYuksekligiMm ? ["ust", "yan", "3d"] : ["ust"];

  return (
    <div>
      <GorunumSekmeleri aktif={gorunum} onSec={setGorunum} secenekler={secenekler} />
      {gorunum === "ust" && <UstenGorunum veri={veri} />}
      {gorunum === "yan" && <YandanGorunum veri={veri} />}
      {gorunum === "3d" && <Gorunum3D veri={veri} />}
    </div>
  );
}
