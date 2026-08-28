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

export interface KorkulukSemaVeri {
  toplamUzunlukMm: number;
  yukseklikMm: number;
  dikmeSayisi: number;
  araliklarSayisi: number;
  gercekAralikMm: number;
  araKayitSayisi?: number;
  dikmeKesit?: KesitOlcusu;
  ustProfilKesit?: KesitOlcusu;
  altProfilKesit?: KesitOlcusu;
  araKayitKesit?: KesitOlcusu;
  /** Kullanıcının önceden elle düzenlediği dikme pozisyonları (mm) - verilirse otomatik eşit
   * aralık yerleşimi yerine doğrudan bu liste kullanılır. */
  dikmePozisyonlariOverrideMm?: number[];
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 70;

/** Etkin dikme pozisyon listesini (mm) döner: elle düzenlenmiş bir liste varsa onu, yoksa
 * dikmeSayisi/araliklarSayisi/gercekAralikMm'den türetilen eşit aralıklı listeyi. */
function dikmePozisyonlariHesapla(veri: KorkulukSemaVeri): number[] {
  const { dikmeSayisi, araliklarSayisi, gercekAralikMm, dikmePozisyonlariOverrideMm } = veri;
  if (dikmePozisyonlariOverrideMm && dikmePozisyonlariOverrideMm.length > 0) {
    return Array.from(new Set(dikmePozisyonlariOverrideMm.map((x) => Math.round(x)))).sort((a, b) => a - b);
  }
  return Array.from({ length: dikmeSayisi }, (_, i) => Math.round(Math.min(i, araliklarSayisi) * gercekAralikMm));
}

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
  onDikmePozisyonlariDegisti,
}: {
  veri: KorkulukSemaVeri;
  duzenlenebilir?: boolean;
  onDikmePozisyonlariDegisti?: (yeniListe: number[]) => void;
}) {
  const { toplamUzunlukMm, yukseklikMm, araKayitSayisi = 0, dikmeKesit, ustProfilKesit, altProfilKesit, araKayitKesit } = veri;
  const dikmePozisyonlari = dikmePozisyonlariHesapla(veri);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / toplamUzunlukMm, drawH / yukseklikMm);

  const scaledW = toplamUzunlukMm * scale;
  const scaledH = yukseklikMm * scale;
  const x0 = MARGIN_LEFT;
  const topY = MARGIN_TOP + (drawH - scaledH);
  const groundY = topY + scaledH;

  const postWidth = olcekliKalinlikPx(dikmeKesit?.enMm ?? 40, scale, 2);
  const railThickness = olcekliKalinlikPx(ustProfilKesit?.kalinlikMm ?? 40, scale, 2);
  const altThickness = olcekliKalinlikPx(altProfilKesit?.kalinlikMm ?? 40, scale, 2);
  const araThickness = olcekliKalinlikPx(araKayitKesit?.kalinlikMm ?? 30, scale, 1.5);

  const araKayitYlar =
    araKayitSayisi > 0
      ? Array.from({ length: araKayitSayisi }, (_, i) => {
          const oran = (i + 1) / (araKayitSayisi + 1);
          return topY + railThickness + oran * (scaledH - railThickness - altThickness);
        })
      : [];

  const dimUzunlukY = groundY + 30;
  const dimYukseklikX = x0 - 30;
  const ilkAralikMm = dikmePozisyonlari.length > 1 ? dikmePozisyonlari[1] - dikmePozisyonlari[0] : 0;

  const lejant = [
    { renk: PALET.ana, etiket: "Dikme" },
    { renk: PALET.yatay, etiket: "Üst/Alt Profil" },
    ...(araKayitSayisi > 0 ? [{ renk: PALET.vurgu, etiket: "Ara Kayıt" }] : []),
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Korkuluk önden görünüş şematik çizimi">
      <OkTanimlari />

      <line x1={x0 - 15} y1={groundY} x2={x0 + scaledW + 15} y2={groundY} stroke="#a3a3a3" strokeWidth={2} />

      {duzenlenebilir && onDikmePozisyonlariDegisti && (
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
            if (xMm <= 0 || xMm >= toplamUzunlukMm) return;
            if (dikmePozisyonlari.some((p) => Math.abs(p - xMm) < 10)) return;
            onDikmePozisyonlariDegisti([...dikmePozisyonlari, xMm].sort((a, b) => a - b));
          }}
        >
          <title>Yeni dikme eklemek için tıkla</title>
        </rect>
      )}

      {dikmePozisyonlari.map((px, i) => {
        const tiklanabilir = duzenlenebilir && onDikmePozisyonlariDegisti && dikmePozisyonlari.length > 2;
        return (
          <g key={i}>
            <rect
              x={x0 + px * scale - postWidth / 2}
              y={topY}
              width={postWidth}
              height={scaledH}
              fill={hoverIndex === i && tiklanabilir ? "#dc2626" : PALET.ana}
              style={{ pointerEvents: "none" }}
            />
            {tiklanabilir && (
              <rect
                x={x0 + px * scale - Math.max(postWidth, 12) / 2}
                y={topY}
                width={Math.max(postWidth, 12)}
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

      <rect x={x0} y={topY} width={scaledW} height={railThickness} fill={PALET.yatay} />
      <rect x={x0} y={groundY - altThickness} width={scaledW} height={altThickness} fill={PALET.yatay} />
      {araKayitYlar.map((y, i) => (
        <rect key={i} x={x0} y={y - araThickness / 2} width={scaledW} height={araThickness} fill={PALET.vurgu} />
      ))}

      <YatayOlcu x1={x0} x2={x0 + scaledW} y={dimUzunlukY} etiket={mmEtiket(toplamUzunlukMm)} />
      <DikeyOlcu y1={topY} y2={groundY} x={dimYukseklikX} etiket={mmEtiket(yukseklikMm)} />

      {dikmePozisyonlari.length > 1 && (
        <YatayOlcu
          x1={x0 + dikmePozisyonlari[0] * scale}
          x2={x0 + dikmePozisyonlari[1] * scale}
          y={topY - 14}
          etiket={mmEtiket(ilkAralikMm)}
          etiketAltta={false}
          fontSize={11}
          kalin={false}
        />
      )}
      {dikmeKesit && (
        <text
          x={x0 + dikmePozisyonlari[0] * scale}
          y={topY + 22}
          textAnchor="middle"
          fontSize={9}
          fill="#737373"
          transform={`rotate(-90 ${x0 + dikmePozisyonlari[0] * scale} ${topY + 22})`}
        >
          {mmEtiket(dikmeKesit.enMm)}
        </text>
      )}

      <Lejant kalemler={lejant} y={VIEW_H + 6} />
    </svg>
  );
}

function UstenGorunum({ veri }: { veri: KorkulukSemaVeri }) {
  const { toplamUzunlukMm, dikmeKesit } = veri;
  const dikmePozisyonlari = dikmePozisyonlariHesapla(veri);
  const derinlikMm = dikmeKesit?.kalinlikMm ?? 40;
  const en = dikmeKesit?.enMm ?? 40;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const scale = drawW / toplamUzunlukMm;
  const cy = VIEW_H / 2 - 10;
  const x0 = MARGIN_LEFT;
  const scaledW = toplamUzunlukMm * scale;

  const postW = olcekliKalinlikPx(en, scale, 4);
  const postD = olcekliKalinlikPx(derinlikMm, scale, 4);

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Korkuluk üstten (plan) görünüş şematik çizimi">
      <OkTanimlari />
      <text x={x0} y={cy - postD / 2 - 20} fontSize={11} fill="#a3a3a3">
        Üstten görünüş (dikme yerleşim planı)
      </text>
      <line x1={x0} y1={cy} x2={x0 + scaledW} y2={cy} stroke="#d4d4d4" strokeDasharray="4 3" />
      {dikmePozisyonlari.map((px, i) => (
        <rect key={i} x={x0 + px * scale - postW / 2} y={cy - postD / 2} width={postW} height={postD} fill={PALET.ana} />
      ))}
      <YatayOlcu x1={x0} x2={x0 + scaledW} y={cy + postD / 2 + 30} etiket={mmEtiket(toplamUzunlukMm)} />
      <text x={x0 + scaledW / 2} y={cy + postD / 2 + 55} textAnchor="middle" fontSize={11} fill="#525252">
        dikme kesiti: {mmEtiket(en)} × {mmEtiket(derinlikMm)}
      </text>
      <Lejant kalemler={[{ renk: PALET.ana, etiket: "Dikme (kesit izi)" }]} y={VIEW_H + 6} />
    </svg>
  );
}

function Gorunum3D({ veri }: { veri: KorkulukSemaVeri }) {
  const { toplamUzunlukMm, yukseklikMm, araKayitSayisi = 0, dikmeKesit, ustProfilKesit, altProfilKesit, araKayitKesit } = veri;
  const dikmePozisyonlari = dikmePozisyonlariHesapla(veri);

  const kirisler: Kiris3D[] = [];
  dikmePozisyonlari.forEach((x, i) => {
    kirisler.push({ a: [x, 0, 0], b: [x, yukseklikMm, 0], enMm: dikmeKesit?.enMm ?? 40, renk: PALET.ana, etiket: i === 0 ? mmEtiket(yukseklikMm) : undefined });
  });
  kirisler.push({ a: [0, yukseklikMm, 0], b: [toplamUzunlukMm, yukseklikMm, 0], enMm: ustProfilKesit?.kalinlikMm ?? 40, renk: PALET.yatay });
  kirisler.push({ a: [0, 0, 0], b: [toplamUzunlukMm, 0, 0], enMm: altProfilKesit?.kalinlikMm ?? 40, renk: PALET.yatay, etiket: mmEtiket(toplamUzunlukMm) });
  for (let i = 1; i <= araKayitSayisi; i++) {
    const y = (yukseklikMm * i) / (araKayitSayisi + 1);
    kirisler.push({ a: [0, y, 0], b: [toplamUzunlukMm, y, 0], enMm: araKayitKesit?.kalinlikMm ?? 30, renk: PALET.vurgu });
  }

  const lejant = [
    { renk: PALET.ana, etiket: "Dikme" },
    { renk: PALET.yatay, etiket: "Üst/Alt Profil" },
    ...(araKayitSayisi > 0 ? [{ renk: PALET.vurgu, etiket: "Ara Kayıt" }] : []),
  ];

  return <Izometrik3DSahne kirisler={kirisler} lejant={lejant} ariaLabel="Korkuluk 3D izometrik görünüm" />;
}

/** Korkuluğun önden/üstten/3D görünüşlerini, seçilen malzemelerin gerçek kesit ölçüleriyle
 * tutarlı, ölçekli ve ölçülü bir çizim olarak gösterir. `duzenlenebilir` verilirse önden
 * görünüşte dikmelere tıklayarak kaldırma / boş alana tıklayarak ekleme yapılabilir. */
export default function RailingSchematic({
  veri,
  duzenlenebilir,
  onDikmePozisyonlariDegisti,
}: {
  veri: KorkulukSemaVeri;
  duzenlenebilir?: boolean;
  onDikmePozisyonlariDegisti?: (yeniListe: number[] | null) => void;
}) {
  const [gorunum, setGorunum] = useState<SemaGorunumTipi>("on");
  const [listeAcik, setListeAcik] = useState(false);
  const { toplamUzunlukMm, yukseklikMm, dikmeSayisi, dikmePozisyonlariOverrideMm } = veri;

  if (!toplamUzunlukMm || !yukseklikMm || dikmeSayisi < 2) return null;

  const editable = Boolean(duzenlenebilir && onDikmePozisyonlariDegisti);
  const dikmePozisyonlari = dikmePozisyonlariHesapla(veri);

  const dikmeSil = (index: number) => {
    if (dikmePozisyonlari.length <= 2) return;
    onDikmePozisyonlariDegisti!(dikmePozisyonlari.filter((_, i) => i !== index));
  };
  const dikmeDegistir = (index: number, deger: number) => {
    const yeni = [...dikmePozisyonlari];
    yeni[index] = deger;
    onDikmePozisyonlariDegisti!(yeni);
  };

  return (
    <div>
      <GorunumSekmeleri aktif={gorunum} onSec={setGorunum} secenekler={["on", "ust", "3d"]} />
      {editable && gorunum === "on" && (
        <div className="mb-2 space-y-1">
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-neutral-500">
            <span>💡 Bir dikmeye tıklayarak kaldırabilir, boş alana tıklayarak yeni dikme ekleyebilirsiniz.</span>
            <div className="flex items-center gap-2 shrink-0">
              {dikmePozisyonlariOverrideMm && dikmePozisyonlariOverrideMm.length > 0 && (
                <button type="button" className="text-brand-700 font-semibold whitespace-nowrap" onClick={() => onDikmePozisyonlariDegisti!(null)}>
                  ↺ Otomatik yerleşime dön
                </button>
              )}
              <button type="button" className="text-neutral-500 font-semibold whitespace-nowrap" onClick={() => setListeAcik((v) => !v)}>
                {listeAcik ? "▲" : "▼"} Pozisyonları Listele
              </button>
            </div>
          </div>
        </div>
      )}
      {gorunum === "on" && (
        <OndenGorunum
          veri={{ ...veri, toplamUzunlukMm, yukseklikMm, dikmeSayisi }}
          duzenlenebilir={editable}
          onDikmePozisyonlariDegisti={editable ? onDikmePozisyonlariDegisti : undefined}
        />
      )}
      {gorunum === "ust" && <UstenGorunum veri={veri} />}
      {gorunum === "3d" && <Gorunum3D veri={veri} />}

      {editable && gorunum === "on" && listeAcik && (
        <div className="mt-3 rounded-xl border border-neutral-200 p-3">
          <div className="text-xs font-semibold text-neutral-600 mb-1.5">Dikme Pozisyonları (mm, sol kenardan)</div>
          <div className="space-y-1.5">
            {dikmePozisyonlari.map((px, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="number" className="field-input text-sm py-1.5" value={px} onChange={(e) => dikmeDegistir(i, Number(e.target.value))} />
                <button type="button" className="text-red-600 text-xs font-semibold shrink-0" disabled={dikmePozisyonlari.length <= 2} onClick={() => dikmeSil(i)}>
                  Sil
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
