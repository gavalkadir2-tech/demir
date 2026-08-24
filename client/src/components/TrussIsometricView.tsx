import { PALET } from "./schematicShared";

export interface TrussIsoVeri {
  acikligMm: number;
  egimYuzde: number;
  catiUzunluguMm: number;
  kafesSayisi: number;
  gercekAralikMm: number;
  asikVar?: boolean;
  asikAraligiHedefMm?: number;
  stabiliteVar?: boolean;
  kaplamaGoster?: boolean;
}

const VIEW_W = 640;
const VIEW_H = 440;
const MARGIN = 40;

interface Cizgi {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  renk: string;
  kalinlik: number;
  kesikli?: boolean;
}

/** Çatı kafesi sistemini basit izometrik (30°) projeksiyonla, birden fazla kafes + aşık + varsa
 * stabilite çaprazlarıyla birlikte üç boyutlu izlenim veren bir çizim olarak gösterir. */
export default function TrussIsometricView({ veri }: { veri: TrussIsoVeri }) {
  const {
    acikligMm,
    egimYuzde,
    catiUzunluguMm,
    kafesSayisi,
    gercekAralikMm,
    asikVar = false,
    asikAraligiHedefMm = 1000,
    stabiliteVar = false,
    kaplamaGoster = true,
  } = veri;
  if (!acikligMm || !catiUzunluguMm || kafesSayisi < 1) return null;

  const yariAciklik = acikligMm / 2;
  const mahya = yariAciklik * (egimYuzde / 100);
  const ustBaslikUzunluk = Math.sqrt(yariAciklik ** 2 + mahya ** 2);

  const COS30 = Math.cos(Math.PI / 6);
  const SIN30 = Math.sin(Math.PI / 6);
  // X: çatı uzunluğu yönü, Y: yükseklik, Z: açıklık (span) yönü.
  const proj = (x: number, y: number, z: number) => ({ sx: (x - z) * COS30, sy: (x + z) * SIN30 - y });

  const kösePuanlari = [
    proj(0, 0, 0),
    proj(0, 0, acikligMm),
    proj(0, mahya, yariAciklik),
    proj(catiUzunluguMm, 0, 0),
    proj(catiUzunluguMm, 0, acikligMm),
    proj(catiUzunluguMm, mahya, yariAciklik),
  ];
  const minX = Math.min(...kösePuanlari.map((p) => p.sx));
  const maxX = Math.max(...kösePuanlari.map((p) => p.sx));
  const minY = Math.min(...kösePuanlari.map((p) => p.sy));
  const maxY = Math.max(...kösePuanlari.map((p) => p.sy));

  const drawW = VIEW_W - 2 * MARGIN;
  const drawH = VIEW_H - 2 * MARGIN;
  const scale = Math.min(drawW / (maxX - minX || 1), drawH / (maxY - minY || 1));
  const offX = MARGIN - minX * scale;
  const offY = MARGIN - minY * scale;
  const S = (x: number, y: number, z: number) => {
    const { sx, sy } = proj(x, y, z);
    return { x: sx * scale + offX, y: sy * scale + offY };
  };

  const kafesXler = Array.from({ length: kafesSayisi }, (_, i) => Math.min(i * gercekAralikMm, catiUzunluguMm));
  const asikSatirSayisiPerSide = asikVar ? Math.max(2, Math.ceil(ustBaslikUzunluk / asikAraligiHedefMm) + 1) : 0;
  const asikOranlari = Array.from({ length: asikSatirSayisiPerSide }, (_, i) => i / (asikSatirSayisiPerSide - 1));

  const cizgiler: Cizgi[] = [];
  const cizgi = (a: { x: number; y: number }, b: { x: number; y: number }, renk: string, kalinlik: number, kesikli?: boolean) =>
    cizgiler.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, renk, kalinlik, kesikli });

  // Kafesler (üst başlık, alt başlık, kral kirişi)
  for (const X of kafesXler) {
    const eaveL = S(X, 0, 0);
    const eaveR = S(X, 0, acikligMm);
    const apex = S(X, mahya, yariAciklik);
    const tabanOrta = S(X, 0, yariAciklik);
    cizgi(eaveL, apex, PALET.ana, 2);
    cizgi(apex, eaveR, PALET.ana, 2);
    cizgi(eaveL, eaveR, PALET.ana, 1.5);
    cizgi(tabanOrta, apex, PALET.ikincil, 1.5, true);
  }

  // Aşıklar (çatı uzunluğu boyunca, her iki yamaçta)
  if (asikVar) {
    for (const oran of asikOranlari) {
      const solBas = S(0, oran * mahya, oran * yariAciklik);
      const solSon = S(catiUzunluguMm, oran * mahya, oran * yariAciklik);
      cizgi(solBas, solSon, PALET.vurgu, 1.5);
      const sagZ = acikligMm - oran * yariAciklik;
      const sagBas = S(0, oran * mahya, sagZ);
      const sagSon = S(catiUzunluguMm, oran * mahya, sagZ);
      cizgi(sagBas, sagSon, PALET.vurgu, 1.5);
    }
  }

  // Stabilite bağlantıları (ilk açıklıkta, X şeklinde)
  if (stabiliteVar && kafesSayisi >= 2) {
    const X0 = kafesXler[0];
    const X1 = kafesXler[1];
    // Yatay (üst başlık düzleminde, her iki yamaçta)
    cizgi(S(X0, 0, 0), S(X1, mahya, yariAciklik), PALET.stabilite, 2);
    cizgi(S(X0, mahya, yariAciklik), S(X1, 0, 0), PALET.stabilite, 2);
    cizgi(S(X0, 0, acikligMm), S(X1, mahya, yariAciklik), PALET.stabilite, 2);
    cizgi(S(X0, mahya, yariAciklik), S(X1, 0, acikligMm), PALET.stabilite, 2);
    // Düşey (kral kirişleri arasında)
    cizgi(S(X0, 0, yariAciklik), S(X1, mahya, yariAciklik), PALET.yatay, 2);
    cizgi(S(X0, mahya, yariAciklik), S(X1, 0, yariAciklik), PALET.yatay, 2);
  }

  // Çatı kaplaması (yarı saydam, sadece görsel bağlam için)
  const kaplamaPoligonlari = kaplamaGoster
    ? [
        [S(0, 0, 0), S(0, mahya, yariAciklik), S(catiUzunluguMm, mahya, yariAciklik), S(catiUzunluguMm, 0, 0)],
        [S(0, mahya, yariAciklik), S(0, 0, acikligMm), S(catiUzunluguMm, 0, acikligMm), S(catiUzunluguMm, mahya, yariAciklik)],
      ]
    : [];

  const lejant = [
    { renk: PALET.ana, etiket: "Başlık" },
    { renk: PALET.ikincil, etiket: "Kral Kirişi" },
    ...(asikVar ? [{ renk: PALET.vurgu, etiket: "Aşık" }] : []),
    ...(stabiliteVar ? [{ renk: PALET.stabilite, etiket: "Yatay Stabilite" }] : []),
    ...(stabiliteVar ? [{ renk: PALET.yatay, etiket: "Düşey Stabilite" }] : []),
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + 36}`} className="w-full h-auto" role="img" aria-label="Çatı kafesi 3D izometrik görünüm">
      {kaplamaPoligonlari.map((pts, i) => (
        <polygon key={i} points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="#93c5fd" fillOpacity={0.25} stroke="none" />
      ))}
      {cizgiler.map((c, i) => (
        <line
          key={i}
          x1={c.x1}
          y1={c.y1}
          x2={c.x2}
          y2={c.y2}
          stroke={c.renk}
          strokeWidth={c.kalinlik}
          strokeDasharray={c.kesikli ? "5 3" : undefined}
        />
      ))}
      <g>
        {lejant.map((k, i) => {
          const itemW = Math.min(150, (VIEW_W - 20) / lejant.length);
          const startX = (VIEW_W - itemW * lejant.length) / 2;
          return (
            <g key={i} transform={`translate(${startX + i * itemW}, ${VIEW_H + 6})`}>
              <rect x={0} y={0} width={12} height={12} rx={2} fill={k.renk} />
              <text x={18} y={10} fontSize={10} fill="#525252">
                {k.etiket}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
