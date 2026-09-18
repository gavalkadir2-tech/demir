import { PALET } from "./schematicShared";

export interface TrussIsoVeri {
  /** bkz. TrussSchematic.tsx CatiKafesiSemaVeri.catiTipi. */
  catiTipi?: string;
  /** bkz. TrussSchematic.tsx CatiKafesiSemaVeri.dikmeYuksekligiMm. */
  dikmeYuksekligiMm?: number;
  acikligMm: number;
  egimYuzde: number;
  catiUzunluguMm: number;
  /** Her kafesin çatı uzunluğu ekseninde gerçek pozisyonu (mm) - eşit aralıklı olmak zorunda değil
   * (bkz. TrussSchematic.tsx kafesPozisyonHesapla). */
  kafesPozisyonlariMm: number[];
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
    catiTipi = "acik_besik",
    dikmeYuksekligiMm: dikmeYuksekligiMmGirdi,
    acikligMm,
    egimYuzde,
    catiUzunluguMm,
    kafesPozisyonlariMm,
    asikVar = false,
    asikAraligiHedefMm = 1000,
    stabiliteVar = false,
    kaplamaGoster = true,
  } = veri;
  if (!acikligMm || !catiUzunluguMm || kafesPozisyonlariMm.length < 1) return null;

  const tekEgimliMi = catiTipi === "duz" || catiTipi === "sundurma";
  const etkinEgimYuzde = catiTipi === "duz" ? 0 : egimYuzde;
  const yariAciklik = tekEgimliMi ? acikligMm : acikligMm / 2;
  const mahya = yariAciklik * (etkinEgimYuzde / 100);
  const ustBaslikUzunluk = Math.sqrt(yariAciklik ** 2 + mahya ** 2);
  // Çatı katı: eğimli çatı gövdesi (rafter üçgeni) diz duvarının (kneewall) üzerine oturur - tüm
  // çatı gövdesi T kadar yukarı kaydırılır, altına dikey diz duvarı postaları/rayları eklenir.
  const T = catiTipi === "catikati" ? Math.max(0, dikmeYuksekligiMmGirdi ?? 0) : 0;

  const COS30 = Math.cos(Math.PI / 6);
  const SIN30 = Math.sin(Math.PI / 6);
  // X: çatı uzunluğu yönü, Y: yükseklik, Z: açıklık (span) yönü.
  const proj = (x: number, y: number, z: number) => ({ sx: (x - z) * COS30, sy: (x + z) * SIN30 - y });

  const kösePuanlari = [
    proj(0, 0, 0),
    proj(0, 0, acikligMm),
    proj(0, T + mahya, yariAciklik),
    proj(catiUzunluguMm, 0, 0),
    proj(catiUzunluguMm, 0, acikligMm),
    proj(catiUzunluguMm, T + mahya, yariAciklik),
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

  const kafesXler = kafesPozisyonlariMm;
  const asikSatirSayisiPerSide = asikVar ? Math.max(2, Math.ceil(ustBaslikUzunluk / asikAraligiHedefMm) + 1) : 0;
  const asikOranlari = Array.from({ length: asikSatirSayisiPerSide }, (_, i) => i / (asikSatirSayisiPerSide - 1));

  const cizgiler: Cizgi[] = [];
  const cizgi = (a: { x: number; y: number }, b: { x: number; y: number }, renk: string, kalinlik: number, kesikli?: boolean) =>
    cizgiler.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, renk, kalinlik, kesikli });

  // Kırma: mahya, uçlarda köşelere inen pah (hip) hatlarıyla kısalır - açık beşikten farklı olarak
  // kaplama yüzeyleri uçlarda üçgen pah yüzeyleriyle kapanır (dikdörtgen değil, altıgen taban).
  const kirmaMi = catiTipi === "kirma";
  const hipInsetMm = kirmaMi ? Math.min(yariAciklik, catiUzunluguMm / 2) : 0;

  // Kafesler (üst başlık, alt başlık, kral kirişi) - çatı katıda T kadar yukarıda oturur. Kırmada,
  // pah (hip) bölgesindeki kafesler (uçlara hipInsetMm'den yakın) tam yükseklikte mahyaya çıkan
  // açık-beşik tipi eğimli kirişler ÇİZMEZ - bu, gerçekte olmayan bir "iki eğimli" görünümü verirdi;
  // o bölgede görseli pah yüzeyleri/hatları taşır, kafes sadece alt başlık hizasında görünür.
  for (const X of kafesXler) {
    const pahBolgesindeMi = kirmaMi && (X < hipInsetMm || X > catiUzunluguMm - hipInsetMm);
    const eaveL = S(X, T, 0);
    const eaveR = S(X, T, acikligMm);
    cizgi(eaveL, eaveR, PALET.ana, 1.5);
    if (!pahBolgesindeMi) {
      const apex = S(X, T + mahya, yariAciklik);
      const tabanOrta = S(X, T, yariAciklik);
      cizgi(eaveL, apex, PALET.ana, 2);
      if (!tekEgimliMi) cizgi(apex, eaveR, PALET.ana, 2);
      cizgi(tabanOrta, apex, PALET.ikincil, 1.5, true);
    }
    if (T > 0) {
      cizgi(S(X, 0, 0), eaveL, PALET.yatay, 2);
      cizgi(S(X, 0, acikligMm), eaveR, PALET.yatay, 2);
    }
  }
  if (T > 0) {
    cizgi(S(0, 0, 0), S(catiUzunluguMm, 0, 0), PALET.yatay, 1.5);
    cizgi(S(0, 0, acikligMm), S(catiUzunluguMm, 0, acikligMm), PALET.yatay, 1.5);
  }

  // Aşıklar (çatı uzunluğu boyunca; tek eğimlide tek yamaç, diğerlerinde iki yamaç). Kırmada aşık
  // hattının uzunluğu, o yükseklikteki pah yamuğunun genişliğine göre daralır (mahyaya yaklaştıkça
  // X aralığı [oran*hipInsetMm, catiUzunluguMm - oran*hipInsetMm]'e kısalır) - aksi halde aşıklar
  // pah yüzeyinin dışına taşardı.
  if (asikVar) {
    for (const oran of asikOranlari) {
      const xBas = kirmaMi ? oran * hipInsetMm : 0;
      const xSon = kirmaMi ? catiUzunluguMm - oran * hipInsetMm : catiUzunluguMm;
      const solBas = S(xBas, T + oran * mahya, oran * yariAciklik);
      const solSon = S(xSon, T + oran * mahya, oran * yariAciklik);
      cizgi(solBas, solSon, PALET.vurgu, 1.5);
      if (!tekEgimliMi) {
        const sagZ = acikligMm - oran * yariAciklik;
        const sagBas = S(xBas, T + oran * mahya, sagZ);
        const sagSon = S(xSon, T + oran * mahya, sagZ);
        cizgi(sagBas, sagSon, PALET.vurgu, 1.5);
      }
    }
  }

  // Stabilite bağlantıları (ilk açıklıkta, X şeklinde)
  if (stabiliteVar && kafesXler.length >= 2) {
    const X0 = kafesXler[0];
    const X1 = kafesXler[1];
    // Yatay (üst başlık düzleminde; tek eğimlide tek yamaç, diğerlerinde iki yamaç)
    cizgi(S(X0, T, 0), S(X1, T + mahya, yariAciklik), PALET.stabilite, 2);
    cizgi(S(X0, T + mahya, yariAciklik), S(X1, T, 0), PALET.stabilite, 2);
    if (!tekEgimliMi) {
      cizgi(S(X0, T, acikligMm), S(X1, T + mahya, yariAciklik), PALET.stabilite, 2);
      cizgi(S(X0, T + mahya, yariAciklik), S(X1, T, acikligMm), PALET.stabilite, 2);
    }
    // Düşey (kral kirişleri/yüksek uç dikmeleri arasında)
    cizgi(S(X0, T, yariAciklik), S(X1, T + mahya, yariAciklik), PALET.yatay, 2);
    cizgi(S(X0, T + mahya, yariAciklik), S(X1, T, yariAciklik), PALET.yatay, 2);
  }

  if (kirmaMi) {
    const A0 = S(0, T, 0);
    const Aend = S(catiUzunluguMm, T, 0);
    const B0 = S(0, T, acikligMm);
    const Bend = S(catiUzunluguMm, T, acikligMm);
    const R0 = S(hipInsetMm, T + mahya, yariAciklik);
    const R1 = S(catiUzunluguMm - hipInsetMm, T + mahya, yariAciklik);
    cizgi(A0, R0, PALET.destek, 2);
    cizgi(B0, R0, PALET.destek, 2);
    cizgi(Aend, R1, PALET.destek, 2);
    cizgi(Bend, R1, PALET.destek, 2);
  }

  // Çatı kaplaması (sadece görsel bağlam için) - tek eğimlide tek yamaç yüzeyi yeterli; kırmada
  // mahya kısalır ve uçlarda üçgen pah yüzeyleri eklenir. Her yüzey, 3B normaline göre (basit bir
  // "yukarı-öne-sola" ışık kaynağına göre) farklı tonlanır - düz bir mavi yerine yamaçlar birbirinden
  // ayırt edilebilir, daha üç boyutlu bir izlenim verir.
  type Nokta3 = [number, number, number];
  const kaplamaYuzeyleri3D: Nokta3[][] = kaplamaGoster
    ? kirmaMi
      ? [
          [
            [0, T, 0],
            [hipInsetMm, T + mahya, yariAciklik],
            [catiUzunluguMm - hipInsetMm, T + mahya, yariAciklik],
            [catiUzunluguMm, T, 0],
          ],
          [
            [hipInsetMm, T + mahya, yariAciklik],
            [0, T, acikligMm],
            [catiUzunluguMm, T, acikligMm],
            [catiUzunluguMm - hipInsetMm, T + mahya, yariAciklik],
          ],
          [
            [0, T, 0],
            [hipInsetMm, T + mahya, yariAciklik],
            [0, T, acikligMm],
          ],
          [
            [catiUzunluguMm, T, 0],
            [catiUzunluguMm - hipInsetMm, T + mahya, yariAciklik],
            [catiUzunluguMm, T, acikligMm],
          ],
        ]
      : [
          [
            [0, T, 0],
            [0, T + mahya, yariAciklik],
            [catiUzunluguMm, T + mahya, yariAciklik],
            [catiUzunluguMm, T, 0],
          ],
          ...(tekEgimliMi
            ? []
            : ([
                [
                  [0, T + mahya, yariAciklik],
                  [0, T, acikligMm],
                  [catiUzunluguMm, T, acikligMm],
                  [catiUzunluguMm, T + mahya, yariAciklik],
                ],
              ] as Nokta3[][])),
        ]
    : [];

  const isikYonu = ((): Nokta3 => {
    const [lx, ly, lz] = [-0.5, 0.85, -0.6];
    const len = Math.sqrt(lx * lx + ly * ly + lz * lz);
    return [lx / len, ly / len, lz / len];
  })();
  const yuzeyTonlu = kaplamaYuzeyleri3D.map((noktalar) => {
    const [p0, p1, p2] = noktalar;
    const u: Nokta3 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    const v: Nokta3 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
    const n: Nokta3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const nLen = Math.sqrt(n[0] ** 2 + n[1] ** 2 + n[2] ** 2) || 1;
    const parlaklik = Math.max(
      0,
      (n[0] / nLen) * isikYonu[0] + (n[1] / nLen) * isikYonu[1] + (n[2] / nLen) * isikYonu[2]
    );
    const derinlik = noktalar.reduce((s, p) => s + p[0] + p[2], 0) / noktalar.length;
    return { noktalar, fillOpacity: 0.16 + 0.32 * parlaklik, derinlik };
  });
  // Derinlik sıralaması (uzak->yakın) - çakışan yüzeyler doğru üst üste binsin diye.
  yuzeyTonlu.sort((a, b) => a.derinlik - b.derinlik);
  const kaplamaPoligonlari = yuzeyTonlu.map((y) => ({
    puanlar: y.noktalar.map(([x, yy, z]) => S(x, yy, z)),
    fillOpacity: y.fillOpacity,
  }));

  const lejant = [
    { renk: PALET.ana, etiket: "Başlık" },
    { renk: PALET.ikincil, etiket: tekEgimliMi ? "Yüksek Uç Dikmesi" : "Kral Kirişi" },
    ...(T > 0 ? [{ renk: PALET.yatay, etiket: "Diz Duvarı (Kneewall)" }] : []),
    ...(kirmaMi ? [{ renk: PALET.destek, etiket: "Kırma (Pah) Hattı" }] : []),
    ...(asikVar ? [{ renk: PALET.vurgu, etiket: "Aşık" }] : []),
    ...(stabiliteVar ? [{ renk: PALET.stabilite, etiket: "Yatay Stabilite" }] : []),
    ...(stabiliteVar ? [{ renk: PALET.yatay, etiket: "Düşey Stabilite" }] : []),
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + 36}`} className="w-full h-auto" role="img" aria-label="Çatı kafesi 3D izometrik görünüm">
      {kaplamaPoligonlari.map((y, i) => (
        <polygon
          key={i}
          points={y.puanlar.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="#3b82f6"
          fillOpacity={y.fillOpacity}
          stroke="#3b82f6"
          strokeOpacity={0.3}
          strokeWidth={0.75}
        />
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
