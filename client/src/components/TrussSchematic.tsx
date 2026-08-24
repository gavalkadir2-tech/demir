import { OkTanimlari, YatayOlcu, DikeyOlcu, mmEtiket, KOYU, VIEW_W, VIEW_H } from "./schematicShared";

export interface CatiKafesiSemaVeri {
  acikligMm: number;
  egimYuzde: number;
  asikVar?: boolean;
  asikAraligiHedefMm?: number;
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 30;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 60;

/** Çatı kafesinin (kral kirişi tipi) önden görünüşünü ölçekli, ölçüleri etiketli SVG olarak gösterir. */
export default function TrussSchematic({ veri }: { veri: CatiKafesiSemaVeri }) {
  const { acikligMm, egimYuzde, asikVar = false, asikAraligiHedefMm = 1000 } = veri;
  if (!acikligMm) return null;

  const yariAciklikMm = acikligMm / 2;
  const mahyaYuksekligiMm = yariAciklikMm * (egimYuzde / 100);
  const ustBaslikUzunlukMm = Math.sqrt(yariAciklikMm ** 2 + mahyaYuksekligiMm ** 2);
  const asikSatirSayisiPerSide = asikVar ? Math.max(2, Math.ceil(ustBaslikUzunlukMm / asikAraligiHedefMm) + 1) : 0;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / acikligMm, drawH / Math.max(mahyaYuksekligiMm, acikligMm / 6));

  const scaledAciklik = acikligMm * scale;
  const scaledMahya = mahyaYuksekligiMm * scale;

  const x0 = MARGIN_LEFT;
  const groundY = MARGIN_TOP + drawH;
  const xOrta = x0 + scaledAciklik / 2;
  const tepeY = groundY - scaledMahya;

  const gövde = `${x0},${groundY} ${xOrta},${tepeY} ${x0 + scaledAciklik},${groundY}`;

  const dimAciklikY = groundY + 30;
  const dimYukseklikX = x0 - 30;

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-auto" role="img" aria-label="Çatı kafesi şematik çizimi">
      <OkTanimlari />

      <line x1={x0 - 15} y1={groundY} x2={x0 + scaledAciklik + 15} y2={groundY} stroke="#a3a3a3" strokeWidth={2} />

      <polygon points={gövde} fill="#e5e5e5" stroke="none" />
      <line x1={x0} y1={groundY} x2={x0 + scaledAciklik} y2={groundY} stroke={KOYU} strokeWidth={3} />
      <line x1={x0} y1={groundY} x2={xOrta} y2={tepeY} stroke={KOYU} strokeWidth={3} />
      <line x1={x0 + scaledAciklik} y1={groundY} x2={xOrta} y2={tepeY} stroke={KOYU} strokeWidth={3} />
      {/* Kral kirişi */}
      <line x1={xOrta} y1={groundY} x2={xOrta} y2={tepeY} stroke={KOYU} strokeWidth={2} strokeDasharray="5 3" />

      {/* Aşık sıraları (her iki yamaçta, eşit aralıklı noktalar) */}
      {asikVar &&
        Array.from({ length: asikSatirSayisiPerSide }, (_, i) => i / (asikSatirSayisiPerSide - 1)).map((oran, i) => (
          <g key={i}>
            <circle cx={x0 + oran * (xOrta - x0)} cy={groundY + oran * (tepeY - groundY)} r={3.5} fill="#f97316" />
            <circle
              cx={x0 + scaledAciklik - oran * (x0 + scaledAciklik - xOrta)}
              cy={groundY + oran * (tepeY - groundY)}
              r={3.5}
              fill="#f97316"
            />
          </g>
        ))}

      <YatayOlcu x1={x0} x2={x0 + scaledAciklik} y={dimAciklikY} etiket={mmEtiket(acikligMm)} />
      <DikeyOlcu y1={tepeY} y2={groundY} x={dimYukseklikX} etiket={mmEtiket(mahyaYuksekligiMm)} />

      <text x={xOrta} y={tepeY - 10} textAnchor="middle" fontSize={12} fill="#525252">
        eğim %{egimYuzde}
      </text>
    </svg>
  );
}
