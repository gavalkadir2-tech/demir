import { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { sayi } from "../lib/format";
import { Material } from "../api/types";

const KOYU = "#404040";
export const OK_MARKER_ID = "sema-ok";
export const OK_TERS_MARKER_ID = "sema-ok-ters";

/** Parça tipine göre tutarlı renk paleti - tüm şema çizimlerinde aynı anlamda kullanılır. */
export const PALET = {
  ana: "#404040", // ana taşıyıcı / dikme / kasa - koyu gri
  yatay: "#2563eb", // yatay ray / profil / başlık - mavi
  vurgu: "#f97316", // ikincil / ara eleman (ara kayıt, lento, eşik) - turuncu
  destek: "#16a34a", // çapraz / destek elemanı - yeşil
  ikincil: "#7c3aed", // özel eleman (kral kirişi, kanat, aşık) - mor
  stabilite: "#dc2626", // stabilite/rüzgar-deprem çaprazı - kırmızı
} as const;

export interface LejantKalemi {
  renk: string;
  etiket: string;
}

export const LEGEND_H = 32;

/** Şema altında, kullanılan renklerin ne anlama geldiğini gösteren küçük bir lejant. Her kaleme,
 * eşit pay yerine kendi metin uzunluğuyla orantılı genişlik ayrılır - eskiden sabit eşit paylaşım
 * kısa etiketlerde israf, uzun etiketlerde (örn. "Duvarlar (kutu, basitleştirilmiş)") bir sonraki
 * kalemin üzerine binen metin taşmasına yol açıyordu. */
export function Lejant({ kalemler, y }: { kalemler: LejantKalemi[]; y: number }) {
  if (kalemler.length === 0) return null;
  const kullanilabilirGenislik = VIEW_W - 20;
  const toplamKarakter = kalemler.reduce((s, k) => s + k.etiket.length, 0) || 1;
  const genislikler = kalemler.map((k) => Math.max(45, (k.etiket.length / toplamKarakter) * kullanilabilirGenislik));
  const toplamGenislik = genislikler.reduce((a, b) => a + b, 0);
  const startX = (VIEW_W - toplamGenislik) / 2;
  let ilerleme = 0;
  return (
    <g>
      {kalemler.map((k, i) => {
        const x = startX + ilerleme;
        ilerleme += genislikler[i];
        return (
          <g key={i} transform={`translate(${x}, ${y})`}>
            <rect x={0} y={0} width={12} height={12} rx={2} fill={k.renk} />
            <text x={18} y={10} fontSize={11} fill="#525252">
              {k.etiket}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** Ölçü çizgilerinde kullanılan ok başı tanımları. Her şema SVG'sinde bir kez <defs> içine konur. */
export function OkTanimlari() {
  return (
    <defs>
      <marker id={OK_MARKER_ID} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill={KOYU} />
      </marker>
      <marker id={OK_TERS_MARKER_ID} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
        <path d="M0,0 L8,4 L0,8 Z" fill={KOYU} />
      </marker>
    </defs>
  );
}

const okProps = { markerStart: `url(#${OK_TERS_MARKER_ID})`, markerEnd: `url(#${OK_MARKER_ID})` };

/** Yatay ölçü çizgisi: x1'den x2'ye, y yüksekliğinde, altında/üstünde etiketli. */
export function YatayOlcu({
  x1,
  x2,
  y,
  etiket,
  etiketAltta = true,
  fontSize = 13,
  kalin = true,
}: {
  x1: number;
  x2: number;
  y: number;
  etiket: string;
  etiketAltta?: boolean;
  fontSize?: number;
  kalin?: boolean;
}) {
  return (
    <>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={KOYU} strokeWidth={1} {...okProps} />
      <text
        x={(x1 + x2) / 2}
        y={etiketAltta ? y + fontSize + 3 : y - 6}
        textAnchor="middle"
        fontSize={fontSize}
        fill="#262626"
        fontWeight={kalin ? 600 : 400}
      >
        {etiket}
      </text>
    </>
  );
}

/** Dikey ölçü çizgisi: y1'den y2'ye, x konumunda, sola doğru döndürülmüş etiketli. */
export function DikeyOlcu({
  y1,
  y2,
  x,
  etiket,
  fontSize = 13,
}: {
  y1: number;
  y2: number;
  x: number;
  etiket: string;
  fontSize?: number;
}) {
  const midY = (y1 + y2) / 2;
  return (
    <>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={KOYU} strokeWidth={1} {...okProps} />
      <text
        x={x - 10}
        y={midY}
        textAnchor="middle"
        fontSize={fontSize}
        fill="#262626"
        fontWeight={600}
        transform={`rotate(-90 ${x - 10} ${midY})`}
      >
        {etiket}
      </text>
    </>
  );
}

export const mmEtiket = (n: number): string => `${sayi(n)} mm`;

export const VIEW_W = 640;
export const VIEW_H = 320;

// --- Malzeme ölçüsüne dayalı, ölçekli çizim yardımcıları ---------------------------------------
// Amaç: şema çizimlerindeki profil/kesit kalınlıklarının, önceden olduğu gibi sabit piksel
// değerleri yerine kullanıcının gerçekten seçtiği malzemenin gerçek en/kalınlık ölçüsünü,
// çizimin genel ölçeğiyle tutarlı biçimde yansıtması.

export interface KesitOlcusu {
  /** Görünen (geniş) yüz ölçüsü, mm */
  enMm: number;
  /** Derinlik / et kalınlığı yönü, mm */
  kalinlikMm: number;
}

const VARSAYILAN_KESIT: KesitOlcusu = { enMm: 40, kalinlikMm: 40 };

/** Bir Material kaydından şematik çizim için kesit ölçüsü çıkarır. Malzeme seçilmemişse veya
 * ölçü verisi eksikse makul bir varsayılana düşer (eski sabit piksel değerlerinin yerini alır). */
export function kesitOlcusu(material?: Material | null, varsayilan: KesitOlcusu = VARSAYILAN_KESIT): KesitOlcusu {
  if (!material) return varsayilan;
  const en = material.widthMm ?? varsayilan.enMm;
  const kalinlik = material.heightMm ?? material.thicknessMm ?? en;
  return { enMm: en, kalinlikMm: kalinlik };
}

/** Gerçek mm ölçüsünü verilen çizim ölçeğinde piksele çevirir. Çok ince profillerin görünmez
 * olmaması için en az minPx, çok kalın/büyük ölçülü bir malzeme (örn. geniş bir I-profili veya
 * yanlışlıkla girilmiş bir sac ölçüsü) tüm çizimi kaplayıp taşırmasın diye en fazla maxPx
 * genişlikte tutar - teknik şemalarda alışılan, gerçek orana birebir değil okunabilirliğe göre
 * ölçeklenmiş kalınlık gösterimi. */
export function olcekliKalinlikPx(gercekMm: number, scale: number, minPx = 1.5, maxPx = 24): number {
  return Math.min(maxPx, Math.max(minPx, gercekMm * scale));
}

/** Tıklanan noktanın, SVG'nin responsive ölçeklemesinden bağımsız gerçek viewBox koordinatını
 * verir - böylece ekran pikseli değil, çizimin kendi koordinat sistemi kullanılır. Tıklayarak
 * eleman ekleme/kaldırma yapılan tüm şematik çizimlerde (duvar, çatı kafesi, ...) ortak kullanılır. */
export function svgKoordDonustur(e: ReactMouseEvent<SVGElement>): { x: number; y: number } {
  const svg = e.currentTarget.ownerSVGElement ?? (e.currentTarget as unknown as SVGSVGElement);
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const loc = pt.matrixTransform(ctm.inverse());
  return { x: loc.x, y: loc.y };
}

// --- Çoklu açı görünüm sekmesi ----------------------------------------------------------------

export type SemaGorunumTipi = "on" | "yan" | "ust" | "3d";

export const GORUNUM_ETIKET: Record<SemaGorunumTipi, string> = {
  on: "Önden",
  yan: "Yandan",
  ust: "Üstten",
  "3d": "3D",
};

/** Şema çizimlerinin üstünde, "Önden / Yandan / Üstten / 3D" gibi görünüm açısı seçimi yapılan
 * küçük bir sekme çubuğu. Tek seçenek varsa hiçbir şey render etmez. */
export function GorunumSekmeleri({
  aktif,
  onSec,
  secenekler,
}: {
  aktif: SemaGorunumTipi;
  onSec: (g: SemaGorunumTipi) => void;
  secenekler: SemaGorunumTipi[];
}) {
  if (secenekler.length <= 1) return null;
  return (
    <div className="flex gap-1 mb-2 flex-wrap">
      {secenekler.map((g) => (
        <button
          key={g}
          type="button"
          onClick={() => onSec(g)}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition ${
            aktif === g
              ? "bg-neutral-800 text-white border-neutral-800"
              : "bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50"
          }`}
        >
          {GORUNUM_ETIKET[g]}
        </button>
      ))}
    </div>
  );
}

// --- Genel izometrik 3D sahne render helper'ı -------------------------------------------------
// X: uzunluk ekseni, Y: yükseklik ekseni, Z: derinlik ekseni varsayımıyla 30° izometrik
// projeksiyon. Her şablonun 3D görünümü, bu ortak render motoruna sadece bir "kiriş" (çubuk/beam)
// listesi ve opsiyonel dolgu yüzeyleri vererek kendi 3D sahnesini tanımlar.

export type Nokta3D = readonly [number, number, number];

export interface Kiris3D {
  a: Nokta3D;
  b: Nokta3D;
  /** Gerçek kesit ölçüsü (mm) - çizgi kalınlığına ölçekli olarak yansır. */
  enMm: number;
  renk: string;
  kesikli?: boolean;
  /** Segment ortasına yazılacak opsiyonel etiket (örn. uzunluk). Kalabalığı önlemek için sadece
   * temsili elemanlara verilmeli. */
  etiket?: string;
}

export interface Yuzey3D {
  noktalar: Nokta3D[];
  fill: string;
  fillOpacity?: number;
}

const IZO_COS30 = Math.cos(Math.PI / 6);
const IZO_SIN30 = Math.sin(Math.PI / 6);

export function izoProjeksiyon(x: number, y: number, z: number): { sx: number; sy: number } {
  return { sx: (x - z) * IZO_COS30, sy: (x + z) * IZO_SIN30 - y };
}

/** Bir yüzeyin (en az 3 nokta) 3D normal vektörünü döndürür - ilk üç noktanın kenar vektörlerinin
 * çapraz çarpımı. Otomatik gölgelendirme için kullanılır. */
function yuzeyNormali(noktalar: Nokta3D[]): Nokta3D {
  if (noktalar.length < 3) return [0, 1, 0];
  const [p0, p1, p2] = noktalar;
  const e1: Nokta3D = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const e2: Nokta3D = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
  const n: Nokta3D = [
    e1[1] * e2[2] - e1[2] * e2[1],
    e1[2] * e2[0] - e1[0] * e2[2],
    e1[0] * e2[1] - e1[1] * e2[0],
  ];
  const uzunluk = Math.hypot(n[0], n[1], n[2]) || 1;
  return [n[0] / uzunluk, n[1] / uzunluk, n[2] / uzunluk];
}

/** Yüzeyin bakış yönüne göre bir opaklık çarpanı üretir - üstten sanal bir ışık kaynağı varsayımıyla
 * yatay (tavan/çatı/taban gibi yukarı veya aşağı bakan) yüzeyler en açık, dikey yüzeyler arasında da
 * kameraya daha dönük olan taraf biraz daha açık render edilir. Böylece düz tek renkli dolgular
 * yerine, kutu/duvar gibi şekiller gerçekten üç boyutluymuş hissi verir. */
function yuzeyOpaklikCarpani(normal: Nokta3D): number {
  const [nx, , nz] = normal;
  const yatayBakis = Math.abs(normal[1]);
  if (yatayBakis > 0.5) return 0.55; // tavan/çatı/taban - en açık (ışığa en dönük)
  if (nx >= 0 && nz >= 0) return 0.85; // kameraya dönük ön yüzeyler
  return 1.35; // arkaya/yana dönük yüzeyler - en koyu (gölgede)
}

interface RenderElemani {
  derinlik: number;
  cizim: () => ReactNode;
}

/** Bir 3D kiriş/çubuk listesini (opsiyonel dolgu yüzeylerle) otomatik ölçek/kadrajla izometrik
 * SVG sahnesi olarak render eder. Gerçek kesit kalınlıkları çizgi kalınlığına yansır. Yüzeyler
 * yön/ışığa göre otomatik gölgelendirilir; tüm kiriş+yüzey öğeleri kameraya uzaklığına göre
 * (painter's algorithm) sıralanıp öyle çizilir - böylece önde olan öğeler arkadakileri doğru
 * şekilde örter. */
export function Izometrik3DSahne({
  kirisler,
  yuzeyler = [],
  lejant = [],
  ariaLabel,
  viewW = VIEW_W,
  viewH = VIEW_H,
  margin = 40,
}: {
  kirisler: Kiris3D[];
  yuzeyler?: Yuzey3D[];
  lejant?: LejantKalemi[];
  ariaLabel: string;
  viewW?: number;
  viewH?: number;
  margin?: number;
}) {
  if (kirisler.length === 0) return null;

  const tumNoktalar: Nokta3D[] = [...kirisler.flatMap((k) => [k.a, k.b]), ...yuzeyler.flatMap((y) => y.noktalar)];
  const projeli = tumNoktalar.map((p) => izoProjeksiyon(p[0], p[1], p[2]));
  const minX = Math.min(...projeli.map((p) => p.sx));
  const maxX = Math.max(...projeli.map((p) => p.sx));
  const minY = Math.min(...projeli.map((p) => p.sy));
  const maxY = Math.max(...projeli.map((p) => p.sy));

  const drawW = viewW - 2 * margin;
  const drawH = viewH - 2 * margin;
  const scale = Math.min(drawW / (maxX - minX || 1), drawH / (maxY - minY || 1));
  const offX = margin - minX * scale;
  const offY = margin - minY * scale;
  const S = (p: Nokta3D) => {
    const { sx, sy } = izoProjeksiyon(p[0], p[1], p[2]);
    return { x: sx * scale + offX, y: sy * scale + offY };
  };
  // Bu izometrik kamera düzeninde (bkz. izoProjeksiyon) x+z arttıkça öğe kameraya/izleyiciye
  // yaklaşır - derinlik sıralaması için ortalama (x+z) kullanılır, küçükten büyüğe çizilir ki
  // arkadaki önce, öndeki en son (üstte) çizilsin.
  const derinlikSkoru = (noktalar: Nokta3D[]) =>
    noktalar.reduce((s, p) => s + p[0] + p[2], 0) / noktalar.length;

  const elemanlar: RenderElemani[] = [
    ...yuzeyler.map((y, i) => ({
      derinlik: derinlikSkoru(y.noktalar),
      cizim: () => {
        const carpan = yuzeyOpaklikCarpani(yuzeyNormali(y.noktalar));
        const opaklik = Math.min(0.9, Math.max(0.12, (y.fillOpacity ?? 0.38) * carpan));
        return (
          <polygon
            key={`y${i}`}
            points={y.noktalar.map((p) => {
              const s = S(p);
              return `${s.x},${s.y}`;
            }).join(" ")}
            fill={y.fill}
            fillOpacity={opaklik}
            stroke={y.fill}
            strokeOpacity={0.5}
            strokeWidth={0.75}
            strokeLinejoin="round"
          />
        );
      },
    })),
    ...kirisler.map((k, i) => ({
      derinlik: derinlikSkoru([k.a, k.b]),
      cizim: () => {
        const a = S(k.a);
        const b = S(k.b);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const aci = Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
        return (
          <g key={`k${i}`}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={k.renk}
              strokeWidth={olcekliKalinlikPx(k.enMm, scale, 1.5)}
              strokeLinecap="round"
              strokeDasharray={k.kesikli ? "5 3" : undefined}
            />
            {k.etiket && (
              <text
                x={mid.x}
                y={mid.y - 5}
                textAnchor="middle"
                fontSize={9.5}
                fill="#262626"
                fontWeight={600}
                transform={`rotate(${aci} ${mid.x} ${mid.y - 5})`}
              >
                {k.etiket}
              </text>
            )}
          </g>
        );
      },
    })),
  ].sort((a, b) => a.derinlik - b.derinlik);

  return (
    <svg
      viewBox={`0 0 ${viewW} ${viewH + (lejant.length ? LEGEND_H : 0)}`}
      className="w-full h-auto"
      role="img"
      aria-label={ariaLabel}
    >
      {elemanlar.map((e) => e.cizim())}
      {lejant.length > 0 && <Lejant kalemler={lejant} y={viewH + 6} />}
    </svg>
  );
}
