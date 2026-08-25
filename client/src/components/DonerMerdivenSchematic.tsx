import { OkTanimlari, mmEtiket, PALET, Lejant, VIEW_W, VIEW_H, LEGEND_H } from "./schematicShared";

export interface DonerMerdivenSemaVeri {
  icCapMm: number;
  disCapMm: number;
  basamakSayisi: number;
  toplamDonusDerecesi: number;
  korkulukVar?: boolean;
}

const MARGIN = 30;

/** Döner merdivenin üstten (plan) görünüşünü - merkez kolon, iç/dış çap ve basamak dilimleri - SVG olarak gösterir. */
export default function DonerMerdivenSchematic({ veri }: { veri: DonerMerdivenSemaVeri }) {
  const { icCapMm, disCapMm, basamakSayisi, toplamDonusDerecesi, korkulukVar = false } = veri;
  if (!disCapMm || !basamakSayisi) return null;

  const cx = VIEW_W / 2;
  const cy = (VIEW_H - LEGEND_H) / 2 + 10;
  const drawSize = Math.min(VIEW_W, VIEW_H - LEGEND_H) - MARGIN * 2;
  const scale = drawSize / disCapMm;

  const rDis = (disCapMm / 2) * scale;
  const rIc = (icCapMm / 2) * scale;

  const basamakAcisiDerece = toplamDonusDerecesi / basamakSayisi;
  // Üstten 12 yönünden başlayıp saat yönünde ilerler (SVG açı 0 = sağ, -90 = yukarı).
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
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Döner merdiven plan şematik çizimi">
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
