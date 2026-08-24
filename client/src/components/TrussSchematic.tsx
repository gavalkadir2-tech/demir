import { OkTanimlari, YatayOlcu, DikeyOlcu, mmEtiket, PALET, Lejant, VIEW_W } from "./schematicShared";

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
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 30;

// Panel A: kesit görünüşü (üçgen profil)
const PANEL_A_TOP = 20;
const PANEL_A_H = 190;
const PANEL_A_DIM_H = 40;
const PANEL_A_BOTTOM = PANEL_A_TOP + PANEL_A_H + PANEL_A_DIM_H;

// Panel B: aşık yerleşim planı (bir yamaç, açılmış görünüş)
const PANEL_B_LABEL_H = 40;
const PANEL_B_TOP = PANEL_A_BOTTOM + PANEL_B_LABEL_H;
const PANEL_B_H = 110;
const PANEL_B_DIM_H = 40;
const PANEL_B_BOTTOM = PANEL_B_TOP + PANEL_B_H + PANEL_B_DIM_H;

const LEGEND_Y = PANEL_B_BOTTOM + 8;
const LEGEND_H = 32;
const TOTAL_H = LEGEND_Y + LEGEND_H;

/** Çatı kafesinin (kral kirişi tipi) kesit görünüşünü + aşık yerleşim planını ölçekli SVG olarak gösterir. */
export default function TrussSchematic({ veri }: { veri: CatiKafesiSemaVeri }) {
  const {
    acikligMm,
    egimYuzde,
    catiUzunluguMm,
    asikVar = false,
    asikAraligiHedefMm = 1000,
    diyagonalVar = false,
    diyagonalPanelSayisi = 0,
    kafesSayisi = 2,
    gercekAralikMm = catiUzunluguMm,
    stabiliteVar = false,
  } = veri;
  if (!acikligMm) return null;

  const yariAciklikMm = acikligMm / 2;
  const mahyaYuksekligiMm = yariAciklikMm * (egimYuzde / 100);
  const ustBaslikUzunlukMm = Math.sqrt(yariAciklikMm ** 2 + mahyaYuksekligiMm ** 2);
  const asikSatirSayisiPerSide = asikVar ? Math.max(2, Math.ceil(ustBaslikUzunlukMm / asikAraligiHedefMm) + 1) : 0;
  const M = diyagonalVar ? diyagonalPanelSayisi : 0;

  // --- Panel A: kesit görünüşü ---
  const drawWA = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const scaleA = Math.min(drawWA / acikligMm, PANEL_A_H / Math.max(mahyaYuksekligiMm, acikligMm / 6));

  const scaledAciklik = acikligMm * scaleA;
  const scaledMahya = mahyaYuksekligiMm * scaleA;

  const x0 = MARGIN_LEFT;
  const groundY = PANEL_A_TOP + PANEL_A_H;
  const xOrta = x0 + scaledAciklik / 2;
  const tepeY = groundY - scaledMahya;

  const gövde = `${x0},${groundY} ${xOrta},${tepeY} ${x0 + scaledAciklik},${groundY}`;

  // Çapraz destekler: yarım açıklığı M eşit panele bölüp, alt başlık <-> üst başlık arasında zikzak
  // (Warren tipi) tam bir diyagonal ağ oluşturur - gerçek bir kafes makasındaki gibi.
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

  const dimAciklikY = groundY + 30;
  const dimYukseklikX = x0 - 30;

  // --- Panel B: aşık yerleşim planı (bir yamaç, çatı uzunluğu × üst başlık uzunluğu) ---
  const drawWB = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const scaleBx = drawWB / catiUzunluguMm;
  const scaleBy = PANEL_B_H / ustBaslikUzunlukMm;
  const bx0 = MARGIN_LEFT;
  const by0 = PANEL_B_TOP;
  const scaledUzunluk = catiUzunluguMm * scaleBx;
  const scaledRafter = ustBaslikUzunlukMm * scaleBy;

  const kafesXPozisyonlari = Array.from({ length: kafesSayisi }, (_, i) =>
    bx0 + Math.min(i * gercekAralikMm, catiUzunluguMm) * scaleBx
  );
  const asikYPozisyonlari = asikVar
    ? Array.from({ length: asikSatirSayisiPerSide }, (_, i) => by0 + (i / (asikSatirSayisiPerSide - 1)) * scaledRafter)
    : [];

  const stabiliteCizilecek = stabiliteVar && kafesSayisi >= 2;

  const lejant = [
    { renk: PALET.ana, etiket: "Üst/Alt Başlık" },
    { renk: PALET.ikincil, etiket: "Kral Kirişi" },
    ...(M > 0 ? [{ renk: PALET.destek, etiket: "Çapraz Destek" }] : []),
    ...(asikVar ? [{ renk: PALET.vurgu, etiket: "Aşık" }] : []),
    ...(stabiliteCizilecek ? [{ renk: PALET.stabilite, etiket: "Stabilite Bağlantısı" }] : []),
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${TOTAL_H}`} className="w-full h-auto" role="img" aria-label="Çatı kafesi şematik çizimi">
      <OkTanimlari />

      {/* --- Panel A: kesit görünüşü --- */}
      <text x={x0} y={PANEL_A_TOP - 6} fontSize={11} fill="#a3a3a3">
        Kesit görünüşü (bir kafes)
      </text>
      <line x1={x0 - 15} y1={groundY} x2={x0 + scaledAciklik + 15} y2={groundY} stroke="#a3a3a3" strokeWidth={2} />

      <polygon points={gövde} fill="#e5e5e5" stroke="none" />
      <line x1={x0} y1={groundY} x2={x0 + scaledAciklik} y2={groundY} stroke={PALET.ana} strokeWidth={3} />
      <line x1={x0} y1={groundY} x2={xOrta} y2={tepeY} stroke={PALET.ana} strokeWidth={3} />
      <line x1={x0 + scaledAciklik} y1={groundY} x2={xOrta} y2={tepeY} stroke={PALET.ana} strokeWidth={3} />
      {/* Kral kirişi */}
      <line x1={xOrta} y1={groundY} x2={xOrta} y2={tepeY} stroke={PALET.ikincil} strokeWidth={2} strokeDasharray="5 3" />
      {/* Çapraz destekler */}
      {caprazCizgileri.map((c, i) => (
        <line key={i} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke={PALET.destek} strokeWidth={2} />
      ))}

      {/* Aşık sıraları (her iki yamaçta, eşit aralıklı noktalar) */}
      {asikVar &&
        Array.from({ length: asikSatirSayisiPerSide }, (_, i) => i / (asikSatirSayisiPerSide - 1)).map((oran, i) => (
          <g key={i}>
            <circle cx={x0 + oran * (xOrta - x0)} cy={groundY + oran * (tepeY - groundY)} r={3.5} fill={PALET.vurgu} />
            <circle
              cx={x0 + scaledAciklik - oran * (x0 + scaledAciklik - xOrta)}
              cy={groundY + oran * (tepeY - groundY)}
              r={3.5}
              fill={PALET.vurgu}
            />
          </g>
        ))}

      <YatayOlcu x1={x0} x2={x0 + scaledAciklik} y={dimAciklikY} etiket={mmEtiket(acikligMm)} />
      <DikeyOlcu y1={tepeY} y2={groundY} x={dimYukseklikX} etiket={mmEtiket(mahyaYuksekligiMm)} />

      <text x={xOrta} y={tepeY - 10} textAnchor="middle" fontSize={12} fill="#525252">
        eğim %{egimYuzde}
      </text>

      {/* --- Panel B: aşık yerleşim planı --- */}
      <text x={bx0} y={by0 - 28} fontSize={11} fill="#a3a3a3">
        Aşık yerleşim planı (bir yamaç, açılmış görünüş — üstten bakış)
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
          <line
            x1={kafesXPozisyonlari[0]}
            y1={by0}
            x2={kafesXPozisyonlari[1]}
            y2={by0 + scaledRafter}
            stroke={PALET.stabilite}
            strokeWidth={2.5}
          />
          <line
            x1={kafesXPozisyonlari[0]}
            y1={by0 + scaledRafter}
            x2={kafesXPozisyonlari[1]}
            y2={by0}
            stroke={PALET.stabilite}
            strokeWidth={2.5}
          />
        </g>
      )}

      <YatayOlcu x1={bx0} x2={bx0 + scaledUzunluk} y={by0 + scaledRafter + 30} etiket={mmEtiket(catiUzunluguMm)} />
      <DikeyOlcu y1={by0} y2={by0 + scaledRafter} x={bx0 - 30} etiket={mmEtiket(ustBaslikUzunlukMm)} />
      {kafesXPozisyonlari.length > 1 && (
        <YatayOlcu
          x1={kafesXPozisyonlari[0]}
          x2={kafesXPozisyonlari[1]}
          y={by0 - 12}
          etiket={mmEtiket(gercekAralikMm)}
          etiketAltta={false}
          fontSize={10}
          kalin={false}
        />
      )}

      <Lejant kalemler={lejant} y={LEGEND_Y} />
    </svg>
  );
}
