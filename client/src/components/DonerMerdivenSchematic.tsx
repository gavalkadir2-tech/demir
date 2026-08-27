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
  const { disCapMm, basamakSayisi, toplamDonusDerecesi, katYuksekligiMm = 0 } = veri;
  if (!katYuksekligiMm) return null;
  const gercekBasamakYuksekligiMm = katYuksekligiMm / basamakSayisi;
  const basamakAcisiRad = (toplamDonusDerecesi / basamakSayisi) * (Math.PI / 180);
  const rDis = disCapMm / 2;

  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scaleY = drawH / katYuksekligiMm;
  // Yatay salınım genişliği, gerçek çapa bakılmaksızın okunabilir bir genlikte sabitlenir - tıpkı
  // bir mimari çizimde bir merdivenin döndüğünü göstermek için kullanılan sadeleştirilmiş gösterim gibi.
  const genlikPx = 140;
  const x0 = MARGIN_LEFT + genlikPx + 20;
  const groundY = MARGIN_TOP + drawH;
  const topY = groundY - katYuksekligiMm * scaleY;

  const disKenarNoktalari = Array.from({ length: basamakSayisi + 1 }, (_, i) => {
    const y = groundY - i * gercekBasamakYuksekligiMm * scaleY;
    const x = x0 + rDis * Math.cos(i * basamakAcisiRad) * (genlikPx / rDis);
    return { x, y };
  });
  const disKenarPolyline = disKenarNoktalari.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Döner merdiven yandan görünüş şematik çizimi">
      <OkTanimlari />
      <text x={x0 - genlikPx} y={MARGIN_TOP - 12} fontSize={11} fill="#a3a3a3">
        Yandan görünüş (yükselim - dönüşü göstermek için basitleştirilmiş)
      </text>
      <line x1={x0 - genlikPx - 15} y1={groundY} x2={x0 + genlikPx + 15} y2={groundY} stroke="#a3a3a3" strokeWidth={2} />
      <rect x={x0 - 8} y={topY} width={16} height={groundY - topY} fill={PALET.ana} />
      <polyline points={disKenarPolyline} fill="none" stroke={PALET.yatay} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.5} />
      {disKenarNoktalari.slice(1).map((p, i) => (
        <line key={i} x1={x0} y1={p.y} x2={p.x} y2={p.y} stroke={PALET.yatay} strokeWidth={2} />
      ))}
      <DikeyOlcu y1={topY} y2={groundY} x={x0 - genlikPx - 30} etiket={mmEtiket(katYuksekligiMm)} />
      <text x={x0 - genlikPx} y={groundY + 30} fontSize={11} fill="#525252">
        {basamakSayisi} basamak × {mmEtiket(Math.round(gercekBasamakYuksekligiMm))} rise
      </text>
      <Lejant kalemler={[{ renk: PALET.ana, etiket: "Merkez Kolon" }, { renk: PALET.yatay, etiket: "Basamak (dış kenar)" }]} y={VIEW_H + 6} />
    </svg>
  );
}

const GORUNUM3D_H = 420;

// Not: Paylaşılan Izometrik3DSahne motoru (x=uzunluk, y=yükseklik, z=derinlik) dikdörtgen
// iskeletler için tasarlandı; standart 30° izometrik formülünde yatay dönüş bileşeni düşey
// eksene de karışır (sy = (x+z)*sin30 - y). Tam turu bulan/aşan bir sarmal merdivende bu, dönüşün
// "kapandığı" noktada yatay salınımın düşey ilerlemeyi neredeyse iptal etmesine, dolayısıyla
// basamakların ekranda üst üste binmesine yol açıyor (gerçek bir matematiksel etkileşim, çizim
// hatası değil). Bu yüzden sarmal merdiven için düşey konumu SADECE yüksekliğin belirlediği,
// önden/arkadan basamak ayrımıyla derinlik hissi veren ayrı bir projeksiyon kullanılıyor.
function Gorunum3D({ veri }: { veri: DonerMerdivenSemaVeri }) {
  const { icCapMm, disCapMm, basamakSayisi, toplamDonusDerecesi, katYuksekligiMm = 0, merkezKolonKesit } = veri;
  if (!katYuksekligiMm) return null;

  const rIc = icCapMm / 2;
  const rDis = disCapMm / 2;
  const basamakAcisi = (toplamDonusDerecesi / basamakSayisi) * (Math.PI / 180);
  const yukselim = katYuksekligiMm / basamakSayisi;

  const drawH = GORUNUM3D_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scaleY = drawH / katYuksekligiMm;
  const genlikPx = 150;
  const scaleX = genlikPx / rDis;
  const x0 = VIEW_W / 2;
  const groundY = MARGIN_TOP + drawH;
  const topY = groundY - katYuksekligiMm * scaleY;
  const ellipseRy = genlikPx * 0.28;

  // x: yatay salınım (sağ/sol), y: SADECE yüksekliğe bağlı (derinlik ekseni düşey konuma hiç
  // karışmaz - basamakların üst üste binmesine yol açan asıl etkileşim buydu). Derinlik (ön/arka)
  // sadece çizgi kalınlığı/saydamlığıyla ifade edilir, konumu etkilemez.
  const nokta = (aci: number, r: number, y: number) => ({
    x: x0 + r * Math.cos(aci) * scaleX,
    y: groundY - y * scaleY,
    onde: Math.sin(aci) > 0,
  });

  const dilimler = Array.from({ length: basamakSayisi }, (_, i) => {
    const a1 = i * basamakAcisi;
    const a2 = (i + 1) * basamakAcisi;
    const y = (i + 1) * yukselim;
    return { ic: nokta(a1, rIc, y), dis1: nokta(a1, rDis, y), dis2: nokta(a2, rDis, y) };
  });

  const lejant = [
    { renk: PALET.ana, etiket: "Merkez Kolon" },
    { renk: PALET.yatay, etiket: "Basamak (dış kenar)" },
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${GORUNUM3D_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Döner merdiven 3D izometrik görünüm">
      <OkTanimlari />
      {/* Taban izdüşümü - dairesel planı üstten-eğik bakışla ima eder */}
      <ellipse cx={x0} cy={groundY} rx={genlikPx} ry={ellipseRy} fill="none" stroke="#d4d4d4" strokeDasharray="4 3" />
      <rect x={x0 - Math.max(6, (merkezKolonKesit?.enMm ?? 60) * scaleY) / 2} y={topY} width={Math.max(6, (merkezKolonKesit?.enMm ?? 60) * scaleY)} height={groundY - topY} fill={PALET.ana} />
      <text x={x0 + 8} y={(topY + groundY) / 2} fontSize={10} fill="#525252" transform={`rotate(-90 ${x0 + 8} ${(topY + groundY) / 2})`} textAnchor="middle">
        {mmEtiket(katYuksekligiMm)}
      </text>
      {dilimler.map((d, i) => (
        <g key={i} opacity={d.dis1.onde ? 1 : 0.45}>
          <line x1={d.ic.x} y1={d.ic.y} x2={d.dis1.x} y2={d.dis1.y} stroke={PALET.yatay} strokeWidth={d.dis1.onde ? 2.5 : 1.5} strokeDasharray={d.dis1.onde ? undefined : "3 2"} />
          <line x1={d.dis1.x} y1={d.dis1.y} x2={d.dis2.x} y2={d.dis2.y} stroke={PALET.yatay} strokeWidth={d.dis1.onde ? 2.5 : 1.5} strokeDasharray={d.dis1.onde ? undefined : "3 2"} />
        </g>
      ))}
      <text x={x0} y={groundY + 26} textAnchor="middle" fontSize={11} fill="#525252">
        {basamakSayisi} basamak × {mmEtiket(Math.round(yukselim))} yükselim
      </text>
      <Lejant kalemler={lejant} y={GORUNUM3D_H + 6} />
    </svg>
  );
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
