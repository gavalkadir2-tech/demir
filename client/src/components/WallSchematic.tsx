import { useState, MouseEvent as ReactMouseEvent } from "react";
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

export interface DuvarBoslukVeri {
  etiket: string;
  konumMm: number;
  genislikMm: number;
  yukseklikMm: number;
  /** Tabandan boşluğun altına kadar mesafe (mm). 0/boş = kapı gibi tabana kadar iner. */
  tabanYuksekligiMm?: number;
}

export interface DuvarYatayAraProfilVeri {
  /** Tabandan yüksekliği (mm) */
  yMm: number;
  xBaslangicMm: number;
  xBitisMm: number;
}

export interface DuvarPaneliSemaVeri {
  genislikMm: number;
  yukseklikMm: number;
  dikmeAraligiHedefMm: number;
  bosluklar?: DuvarBoslukVeri[];
  disKaplamaVar?: boolean;
  icKaplamaVar?: boolean;
  dikmeKesit?: KesitOlcusu;
  rayKesit?: KesitOlcusu;
  /** Kullanıcının önceden elle düzenlediği dikme pozisyonları (mm) - verilirse otomatik eşit
   * aralık yerleşimi yerine doğrudan bu liste kullanılır. */
  dikmePozisyonlariOverrideMm?: number[];
  /** Kullanıcının elle eklediği, tek bir gözde (iki dikme arası) kısa yatay ara profiller. */
  yatayAraProfilleriMm?: DuvarYatayAraProfilVeri[];
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 70;
const EPSILON = 1;

function dikmePozisyonHesapla(veri: DuvarPaneliSemaVeri) {
  const { genislikMm, yukseklikMm, dikmeAraligiHedefMm, bosluklar = [], dikmePozisyonlariOverrideMm } = veri;
  const gecerliBosluklar = bosluklar
    .map((b) => ({ ...b, tabanYuksekligiMm: Math.max(0, b.tabanYuksekligiMm ?? 0) }))
    .filter(
      (b) =>
        b.genislikMm > 0 &&
        b.yukseklikMm > 0 &&
        b.konumMm >= 0 &&
        b.konumMm + b.genislikMm <= genislikMm &&
        b.tabanYuksekligiMm + b.yukseklikMm <= yukseklikMm
    )
    .sort((a, b) => a.konumMm - b.konumMm);

  if (dikmePozisyonlariOverrideMm && dikmePozisyonlariOverrideMm.length > 0) {
    const dikmePozisyonlari = Array.from(new Set(dikmePozisyonlariOverrideMm.map((x) => Math.round(x)))).sort((a, b) => a - b);
    return { gecerliBosluklar, dikmePozisyonlari };
  }

  const araliklarSayisi = Math.max(1, Math.ceil(genislikMm / dikmeAraligiHedefMm));
  const gercekAralikMm = genislikMm / araliklarSayisi;
  const temelPozisyonlar = Array.from({ length: araliklarSayisi + 1 }, (_, i) => Math.round(i * gercekAralikMm));

  let dikmePozisyonlari = temelPozisyonlar.filter(
    (x) => !gecerliBosluklar.some((b) => x > b.konumMm + EPSILON && x < b.konumMm + b.genislikMm - EPSILON)
  );
  for (const b of gecerliBosluklar) {
    for (const kenar of [b.konumMm, b.konumMm + b.genislikMm]) {
      if (!dikmePozisyonlari.some((x) => Math.abs(x - kenar) < EPSILON)) dikmePozisyonlari.push(Math.round(kenar));
    }
  }
  dikmePozisyonlari.sort((a, b) => a - b);
  return { gecerliBosluklar, dikmePozisyonlari };
}

/** Tıklanan noktanın, SVG'nin responsive ölçeklemesinden bağımsız gerçek viewBox koordinatını
 * verir - böylece ekran pikseli değil, çizimin kendi koordinat sistemi kullanılır. */
function svgKoordDonustur(e: ReactMouseEvent<SVGElement>): { x: number; y: number } {
  const svg = e.currentTarget.ownerSVGElement ?? (e.currentTarget as unknown as SVGSVGElement);
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const loc = pt.matrixTransform(ctm.inverse());
  return { x: loc.x, y: loc.y };
}

function OndenGorunum({
  veri,
  duzenlenebilir,
  eklemeModu,
  onDikmePozisyonlariDegisti,
  onYatayAraProfilleriDegisti,
}: {
  veri: DuvarPaneliSemaVeri;
  duzenlenebilir?: boolean;
  eklemeModu?: "dikme" | "yatay";
  onDikmePozisyonlariDegisti?: (yeniListe: number[]) => void;
  onYatayAraProfilleriDegisti?: (yeniListe: DuvarYatayAraProfilVeri[]) => void;
}) {
  const { genislikMm, yukseklikMm, disKaplamaVar = false, icKaplamaVar = false, dikmeKesit, rayKesit, yatayAraProfilleriMm = [] } = veri;
  const { gecerliBosluklar, dikmePozisyonlari } = dikmePozisyonHesapla(veri);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverYatayIndex, setHoverYatayIndex] = useState<number | null>(null);

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / genislikMm, drawH / yukseklikMm);

  const scaledW = genislikMm * scale;
  const scaledH = yukseklikMm * scale;
  const x0 = MARGIN_LEFT;
  const topY = MARGIN_TOP + (drawH - scaledH);
  const groundY = topY + scaledH;

  const dikmeGenislik = olcekliKalinlikPx(dikmeKesit?.enMm ?? 40, scale, 2);
  const rayKalinlik = olcekliKalinlikPx(rayKesit?.kalinlikMm ?? 40, scale, 2);
  const yatayProfilKalinlik = olcekliKalinlikPx(dikmeKesit?.kalinlikMm ?? 40, scale, 2);

  const tabanaInenler = gecerliBosluklar.filter((b) => b.tabanYuksekligiMm <= EPSILON);
  const altRaySegmentleri: { x1: number; x2: number }[] = [];
  let imlec = 0;
  for (const b of tabanaInenler) {
    if (b.konumMm > imlec) altRaySegmentleri.push({ x1: imlec, x2: b.konumMm });
    imlec = Math.max(imlec, b.konumMm + b.genislikMm);
  }
  if (imlec < genislikMm) altRaySegmentleri.push({ x1: imlec, x2: genislikMm });

  const dimGenislikY = groundY + 30;
  const dimYukseklikX = x0 - 30;

  const lejant = [
    { renk: PALET.ana, etiket: "Dikme" },
    { renk: PALET.yatay, etiket: "Üst/Alt Ray" },
    ...(gecerliBosluklar.length > 0 ? [{ renk: PALET.vurgu, etiket: "Lento/Eşik" }] : []),
    ...(yatayAraProfilleriMm.length > 0 ? [{ renk: PALET.ikincil, etiket: "Yatay Ara Profil" }] : []),
    ...(disKaplamaVar ? [{ renk: PALET.destek, etiket: "Dış Cephe Kaplaması" }] : []),
    ...(icKaplamaVar ? [{ renk: PALET.ikincil, etiket: "İç Cephe Kaplaması" }] : []),
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Duvar paneli önden görünüş şematik çizimi">
      <OkTanimlari />

      <line x1={x0 - 15} y1={groundY} x2={x0 + scaledW + 15} y2={groundY} stroke="#a3a3a3" strokeWidth={2} />

      {disKaplamaVar && (
        <rect x={x0 - 6} y={topY - 6} width={scaledW + 12} height={scaledH + 12} fill="none" stroke={PALET.destek} strokeWidth={4} opacity={0.6} />
      )}
      {icKaplamaVar && <rect x={x0} y={topY} width={scaledW} height={scaledH} fill={PALET.ikincil} opacity={0.12} />}

      {duzenlenebilir && eklemeModu === "dikme" && onDikmePozisyonlariDegisti && (
        <rect
          x={x0}
          y={topY}
          width={scaledW}
          height={scaledH}
          fill="transparent"
          style={{ cursor: "copy" }}
          onClick={(e) => {
            const { x } = svgKoordDonustur(e);
            const xMm = Math.round((x - x0) / scale);
            if (xMm <= 0 || xMm >= genislikMm) return;
            if (dikmePozisyonlari.some((p) => Math.abs(p - xMm) < 10)) return;
            onDikmePozisyonlariDegisti([...dikmePozisyonlari, xMm].sort((a, b) => a - b));
          }}
        >
          <title>Yeni dikme eklemek için tıkla</title>
        </rect>
      )}

      {duzenlenebilir && eklemeModu === "yatay" && onYatayAraProfilleriDegisti && (
        <rect
          x={x0}
          y={topY}
          width={scaledW}
          height={scaledH}
          fill="transparent"
          style={{ cursor: "copy" }}
          onClick={(e) => {
            const { x, y } = svgKoordDonustur(e);
            const xMm = (x - x0) / scale;
            const yMm = Math.round((groundY - y) / scale / 10) * 10;
            if (yMm <= 0 || yMm >= yukseklikMm) return;
            // Tıklanan x'in içinde bulunduğu gözü (iki ardışık dikme arasını) bul.
            let xBaslangicMm: number | null = null;
            let xBitisMm: number | null = null;
            for (let i = 0; i < dikmePozisyonlari.length - 1; i++) {
              if (xMm >= dikmePozisyonlari[i] && xMm <= dikmePozisyonlari[i + 1]) {
                xBaslangicMm = dikmePozisyonlari[i];
                xBitisMm = dikmePozisyonlari[i + 1];
                break;
              }
            }
            if (xBaslangicMm === null || xBitisMm === null) return;
            onYatayAraProfilleriDegisti([...yatayAraProfilleriMm, { yMm, xBaslangicMm, xBitisMm }]);
          }}
        >
          <title>Yeni yatay ara profil eklemek için tıkla</title>
        </rect>
      )}

      {gecerliBosluklar.map((bb, i) => {
        const bosAltY = groundY - bb.tabanYuksekligiMm * scale;
        const bosUstY = bosAltY - bb.yukseklikMm * scale;
        return (
          <g key={i}>
            <rect x={x0 + bb.konumMm * scale} y={bosUstY} width={bb.genislikMm * scale} height={bb.yukseklikMm * scale} fill="#ffffff" stroke="#d4d4d4" strokeDasharray="3 2" />
            <rect x={x0 + bb.konumMm * scale} y={bosUstY - rayKalinlik} width={bb.genislikMm * scale} height={rayKalinlik} fill={PALET.vurgu} />
            {bb.tabanYuksekligiMm > EPSILON && (
              <rect x={x0 + bb.konumMm * scale} y={bosAltY} width={bb.genislikMm * scale} height={rayKalinlik} fill={PALET.vurgu} />
            )}
            <text x={x0 + (bb.konumMm + bb.genislikMm / 2) * scale} y={bosUstY + 14} textAnchor="middle" fontSize={10} fill="#a3a3a3">
              {bb.etiket} ({mmEtiket(bb.genislikMm)})
            </text>
          </g>
        );
      })}

      {dikmePozisyonlari.map((px, i) => {
        const tiklanabilir = duzenlenebilir && onDikmePozisyonlariDegisti && dikmePozisyonlari.length > 2;
        return (
          <g key={i}>
            <rect
              x={x0 + px * scale - dikmeGenislik / 2}
              y={topY}
              width={dikmeGenislik}
              height={scaledH}
              fill={hoverIndex === i && tiklanabilir ? "#dc2626" : PALET.ana}
              style={{ pointerEvents: "none" }}
            />
            {tiklanabilir && (
              <rect
                x={x0 + px * scale - Math.max(dikmeGenislik, 12) / 2}
                y={topY}
                width={Math.max(dikmeGenislik, 12)}
                height={scaledH}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onDikmePozisyonlariDegisti!(dikmePozisyonlari.filter((p) => p !== px));
                  setHoverIndex(null);
                }}
              >
                <title>Bu dikmeyi kaldırmak için tıkla</title>
              </rect>
            )}
          </g>
        );
      })}

      <rect x={x0} y={topY} width={scaledW} height={rayKalinlik} fill={PALET.yatay} />
      {altRaySegmentleri.map((s, i) => (
        <rect key={i} x={x0 + s.x1 * scale} y={groundY - rayKalinlik} width={(s.x2 - s.x1) * scale} height={rayKalinlik} fill={PALET.yatay} />
      ))}

      {yatayAraProfilleriMm.map((p, i) => {
        const yatayTiklanabilir = duzenlenebilir && !!onYatayAraProfilleriDegisti;
        const cy = groundY - p.yMm * scale;
        const uzunlukMm = p.xBitisMm - p.xBaslangicMm;
        return (
          <g key={i}>
            <rect
              x={x0 + p.xBaslangicMm * scale}
              y={cy - yatayProfilKalinlik / 2}
              width={(p.xBitisMm - p.xBaslangicMm) * scale}
              height={yatayProfilKalinlik}
              fill={hoverYatayIndex === i && yatayTiklanabilir ? "#dc2626" : PALET.ikincil}
              style={{ pointerEvents: "none" }}
            />
            <text
              x={x0 + ((p.xBaslangicMm + p.xBitisMm) / 2) * scale}
              y={cy - yatayProfilKalinlik / 2 - 4}
              textAnchor="middle"
              fontSize={10}
              fill="#a3a3a3"
            >
              {mmEtiket(uzunlukMm)}
            </text>
            {yatayTiklanabilir && (
              <rect
                x={x0 + p.xBaslangicMm * scale}
                y={cy - Math.max(yatayProfilKalinlik, 12) / 2}
                width={(p.xBitisMm - p.xBaslangicMm) * scale}
                height={Math.max(yatayProfilKalinlik, 12)}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoverYatayIndex(i)}
                onMouseLeave={() => setHoverYatayIndex(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onYatayAraProfilleriDegisti!(yatayAraProfilleriMm.filter((_, idx) => idx !== i));
                  setHoverYatayIndex(null);
                }}
              >
                <title>Bu yatay ara profili kaldırmak için tıkla</title>
              </rect>
            )}
          </g>
        );
      })}

      <YatayOlcu x1={x0} x2={x0 + scaledW} y={dimGenislikY} etiket={mmEtiket(genislikMm)} />
      <DikeyOlcu y1={topY} y2={groundY} x={dimYukseklikX} etiket={mmEtiket(yukseklikMm)} />

      <Lejant kalemler={lejant} y={VIEW_H + 6} />
    </svg>
  );
}

function UstenGorunum({ veri }: { veri: DuvarPaneliSemaVeri }) {
  const { genislikMm, dikmeKesit } = veri;
  const { dikmePozisyonlari } = dikmePozisyonHesapla(veri);
  const derinlikMm = dikmeKesit?.kalinlikMm ?? 40;
  const en = dikmeKesit?.enMm ?? 40;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const scale = drawW / genislikMm;
  const cy = VIEW_H / 2 - 10;
  const x0 = MARGIN_LEFT;
  const scaledW = genislikMm * scale;

  const postW = olcekliKalinlikPx(en, scale, 4);
  const postD = olcekliKalinlikPx(derinlikMm, scale, 4);

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Duvar paneli üstten (plan) görünüş şematik çizimi">
      <OkTanimlari />
      <text x={x0} y={cy - postD / 2 - 20} fontSize={11} fill="#a3a3a3">
        Üstten görünüş (dikme yerleşim planı)
      </text>
      <line x1={x0} y1={cy} x2={x0 + scaledW} y2={cy} stroke="#d4d4d4" strokeDasharray="4 3" />
      {dikmePozisyonlari.map((px, i) => (
        <rect key={i} x={x0 + px * scale - postW / 2} y={cy - postD / 2} width={postW} height={postD} fill={PALET.ana} />
      ))}
      <YatayOlcu x1={x0} x2={x0 + scaledW} y={cy + postD / 2 + 30} etiket={mmEtiket(genislikMm)} />
      <text x={x0 + scaledW / 2} y={cy + postD / 2 + 55} textAnchor="middle" fontSize={11} fill="#525252">
        dikme kesiti: {mmEtiket(en)} × {mmEtiket(derinlikMm)}
      </text>
      <Lejant kalemler={[{ renk: PALET.ana, etiket: "Dikme (kesit izi)" }]} y={VIEW_H + 6} />
    </svg>
  );
}

function Gorunum3D({ veri }: { veri: DuvarPaneliSemaVeri }) {
  const { genislikMm, yukseklikMm, dikmeKesit, rayKesit } = veri;
  const { dikmePozisyonlari } = dikmePozisyonHesapla(veri);

  const kirisler: Kiris3D[] = [];
  dikmePozisyonlari.forEach((x, i) => {
    kirisler.push({ a: [x, 0, 0], b: [x, yukseklikMm, 0], enMm: dikmeKesit?.enMm ?? 40, renk: PALET.ana, etiket: i === 0 ? mmEtiket(yukseklikMm) : undefined });
  });
  kirisler.push({ a: [0, yukseklikMm, 0], b: [genislikMm, yukseklikMm, 0], enMm: rayKesit?.kalinlikMm ?? 40, renk: PALET.yatay });
  kirisler.push({ a: [0, 0, 0], b: [genislikMm, 0, 0], enMm: rayKesit?.kalinlikMm ?? 40, renk: PALET.yatay, etiket: mmEtiket(genislikMm) });

  const lejant = [
    { renk: PALET.ana, etiket: "Dikme" },
    { renk: PALET.yatay, etiket: "Üst/Alt Ray" },
  ];

  return <Izometrik3DSahne kirisler={kirisler} lejant={lejant} ariaLabel="Duvar paneli 3D izometrik görünüm" />;
}

/** Duvar panelinin önden/üstten/3D görünüşlerini, seçilen dikme/ray profilinin gerçek
 * ölçüsüyle tutarlı, ölçekli bir çizim olarak gösterir. `duzenlenebilir` verilirse önden
 * görünüşte "Dikme Ekle"/"Yatay Profil Ekle" modu seçilip tıklayarak eleman eklenip
 * kaldırılabilir; ayrıca sayısal bir liste üzerinden pozisyonlar elle de düzenlenebilir. */
export default function WallSchematic({
  veri,
  duzenlenebilir,
  onDikmePozisyonlariDegisti,
  onYatayAraProfilleriDegisti,
}: {
  veri: DuvarPaneliSemaVeri;
  duzenlenebilir?: boolean;
  onDikmePozisyonlariDegisti?: (yeniListe: number[] | null) => void;
  onYatayAraProfilleriDegisti?: (yeniListe: DuvarYatayAraProfilVeri[]) => void;
}) {
  const [gorunum, setGorunum] = useState<SemaGorunumTipi>("on");
  const [eklemeModu, setEklemeModu] = useState<"dikme" | "yatay">("dikme");
  const [listeAcik, setListeAcik] = useState(false);
  const { genislikMm, yukseklikMm, dikmeAraligiHedefMm, dikmePozisyonlariOverrideMm, yatayAraProfilleriMm = [] } = veri;
  if (!genislikMm || !yukseklikMm || !dikmeAraligiHedefMm) return null;

  const editable = Boolean(duzenlenebilir && onDikmePozisyonlariDegisti);
  const { dikmePozisyonlari } = dikmePozisyonHesapla(veri);

  const dikmeSil = (index: number) => {
    if (dikmePozisyonlari.length <= 2) return;
    onDikmePozisyonlariDegisti!(dikmePozisyonlari.filter((_, i) => i !== index));
  };
  const dikmeDegistir = (index: number, deger: number) => {
    const yeni = [...dikmePozisyonlari];
    yeni[index] = deger;
    onDikmePozisyonlariDegisti!(yeni);
  };
  const yatayDegistir = (index: number, alan: keyof DuvarYatayAraProfilVeri, deger: number) => {
    const yeni = yatayAraProfilleriMm.map((p, i) => (i === index ? { ...p, [alan]: deger } : p));
    onYatayAraProfilleriDegisti!(yeni);
  };
  const yataySil = (index: number) => {
    onYatayAraProfilleriDegisti!(yatayAraProfilleriMm.filter((_, i) => i !== index));
  };

  return (
    <div>
      <GorunumSekmeleri aktif={gorunum} onSec={setGorunum} secenekler={["on", "ust", "3d"]} />
      {editable && gorunum === "on" && (
        <div className="mb-2 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              className={eklemeModu === "dikme" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
              onClick={() => setEklemeModu("dikme")}
            >
              🧱 Dikme Ekle
            </button>
            {onYatayAraProfilleriDegisti && (
              <button
                type="button"
                className={eklemeModu === "yatay" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
                onClick={() => setEklemeModu("yatay")}
              >
                ➖ Yatay Profil Ekle
              </button>
            )}
            {dikmePozisyonlariOverrideMm && dikmePozisyonlariOverrideMm.length > 0 && (
              <button type="button" className="text-brand-700 font-semibold text-xs whitespace-nowrap" onClick={() => onDikmePozisyonlariDegisti!(null)}>
                ↺ Otomatik yerleşime dön
              </button>
            )}
            <button type="button" className="text-neutral-500 text-xs font-semibold whitespace-nowrap ml-auto" onClick={() => setListeAcik((v) => !v)}>
              {listeAcik ? "▲" : "▼"} Pozisyonları Listele
            </button>
          </div>
          <div className="text-xs text-neutral-500">
            {eklemeModu === "dikme"
              ? "💡 Bir dikmeye tıklayarak kaldırabilir, boş alana tıklayarak yeni dikme ekleyebilirsiniz."
              : "💡 İki dikme arasındaki bir göze tıklayarak o yükseklikte yatay ara profil ekleyebilir, profile tıklayarak kaldırabilirsiniz."}
          </div>
        </div>
      )}
      {gorunum === "on" && (
        <OndenGorunum
          veri={veri}
          duzenlenebilir={editable}
          eklemeModu={eklemeModu}
          onDikmePozisyonlariDegisti={editable ? onDikmePozisyonlariDegisti : undefined}
          onYatayAraProfilleriDegisti={editable ? onYatayAraProfilleriDegisti : undefined}
        />
      )}
      {gorunum === "ust" && <UstenGorunum veri={veri} />}
      {gorunum === "3d" && <Gorunum3D veri={veri} />}

      {editable && gorunum === "on" && listeAcik && (
        <div className="mt-3 space-y-4 rounded-xl border border-neutral-200 p-3">
          <div>
            <div className="text-xs font-semibold text-neutral-600 mb-1.5">Dikme Pozisyonları (mm, sol kenardan)</div>
            <div className="space-y-1.5">
              {dikmePozisyonlari.map((px, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="number"
                    className="field-input text-sm py-1.5"
                    value={px}
                    onChange={(e) => dikmeDegistir(i, Number(e.target.value))}
                  />
                  <button
                    type="button"
                    className="text-red-600 text-xs font-semibold shrink-0"
                    disabled={dikmePozisyonlari.length <= 2}
                    onClick={() => dikmeSil(i)}
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>
          </div>
          {onYatayAraProfilleriDegisti && (
            <div>
              <div className="text-xs font-semibold text-neutral-600 mb-1.5">Yatay Ara Profiller (mm)</div>
              {yatayAraProfilleriMm.length === 0 ? (
                <div className="text-xs text-neutral-400">Henüz eklenmedi.</div>
              ) : (
                <div className="space-y-1.5">
                  {yatayAraProfilleriMm.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-neutral-400">Yükseklik</label>
                        <input
                          type="number"
                          className="field-input text-sm py-1.5"
                          value={p.yMm}
                          onChange={(e) => yatayDegistir(i, "yMm", Number(e.target.value))}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-neutral-400">Başlangıç</label>
                        <input
                          type="number"
                          className="field-input text-sm py-1.5"
                          value={p.xBaslangicMm}
                          onChange={(e) => yatayDegistir(i, "xBaslangicMm", Number(e.target.value))}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-neutral-400">Bitiş</label>
                        <input
                          type="number"
                          className="field-input text-sm py-1.5"
                          value={p.xBitisMm}
                          onChange={(e) => yatayDegistir(i, "xBitisMm", Number(e.target.value))}
                        />
                      </div>
                      <button type="button" className="text-red-600 text-xs font-semibold shrink-0 mt-3" onClick={() => yataySil(i)}>
                        Sil
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
