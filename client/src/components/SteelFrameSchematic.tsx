import { useState } from "react";
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

export interface KolonKirisSemaVeri {
  acikligMm: number;
  uzunlukMm?: number;
  yukseklikMm: number;
  acikSayisi: number;
  cerceveSayisi: number;
  gercekAralikMm: number;
  baglantiKirisiVar?: boolean;
  stabiliteVar?: boolean;
  kolonKesit?: KesitOlcusu;
  kirisKesit?: KesitOlcusu;
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 60;

function OndenGorunum({
  veri,
  duzenlenebilir,
  onAcikSayisiDegisti,
}: {
  veri: KolonKirisSemaVeri;
  duzenlenebilir?: boolean;
  onAcikSayisiDegisti?: (yeniAcikSayisi: number) => void;
}) {
  const { acikligMm, yukseklikMm, acikSayisi, cerceveSayisi, gercekAralikMm, baglantiKirisiVar = false, stabiliteVar = false, kolonKesit, kirisKesit } = veri;
  const toplamGenislikMm = acikligMm * acikSayisi;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / toplamGenislikMm, drawH / yukseklikMm);

  const scaledW = toplamGenislikMm * scale;
  const scaledH = yukseklikMm * scale;
  const x0 = MARGIN_LEFT;
  const topY = MARGIN_TOP + (drawH - scaledH);
  const groundY = topY + scaledH;

  const kolonGenislik = olcekliKalinlikPx(kolonKesit?.enMm ?? 100, scale, 3);
  const kirisKalinlik = olcekliKalinlikPx(kirisKesit?.kalinlikMm ?? 100, scale, 3);

  const kolonXler = Array.from({ length: acikSayisi + 1 }, (_, i) => x0 + i * acikligMm * scale);
  const tiklanabilir = Boolean(duzenlenebilir && onAcikSayisiDegisti);

  const dimGenislikY = groundY + 26;
  const dimYukseklikX = x0 - 30;

  const lejant = [
    { renk: PALET.ana, etiket: "Kolon" },
    { renk: PALET.yatay, etiket: "Kiriş" },
    ...(baglantiKirisiVar ? [{ renk: PALET.destek, etiket: "Bağlantı Kirişi" }] : []),
    ...(stabiliteVar ? [{ renk: PALET.stabilite, etiket: "Stabilite Çaprazı" }] : []),
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Kolon-kiriş önden görünüş şematik çizimi">
      <OkTanimlari />

      <line x1={x0 - 15} y1={groundY} x2={x0 + scaledW + 15} y2={groundY} stroke="#a3a3a3" strokeWidth={2} />

      {stabiliteVar && kolonXler.length > 1 && (
        <g stroke={PALET.stabilite} strokeWidth={2}>
          <line x1={kolonXler[0]} y1={groundY} x2={kolonXler[1]} y2={topY} />
          <line x1={kolonXler[0]} y1={topY} x2={kolonXler[1]} y2={groundY} />
        </g>
      )}

      {tiklanabilir && (
        <rect
          x={x0}
          y={topY}
          width={scaledW}
          height={scaledH}
          fill="transparent"
          style={{ cursor: "copy" }}
          onClick={() => onAcikSayisiDegisti!(acikSayisi + 1)}
        >
          <title>Yeni açıklık (kolon çifti) eklemek için tıkla</title>
        </rect>
      )}

      {kolonXler.map((cx, i) => (
        <g key={i}>
          <rect
            x={cx - kolonGenislik / 2}
            y={topY}
            width={kolonGenislik}
            height={scaledH}
            fill={hoverIndex === i && tiklanabilir ? "#dc2626" : PALET.ana}
            style={{ pointerEvents: "none" }}
          />
          {tiklanabilir && acikSayisi > 1 && (
            <rect
              x={cx - Math.max(kolonGenislik, 14) / 2}
              y={topY}
              width={Math.max(kolonGenislik, 14)}
              height={scaledH}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              onClick={(e) => {
                e.stopPropagation();
                onAcikSayisiDegisti!(acikSayisi - 1);
                setHoverIndex(null);
              }}
            >
              <title>Bitişik açıklığı kaldırmak için tıkla</title>
            </rect>
          )}
        </g>
      ))}

      <rect x={x0} y={topY} width={scaledW} height={kirisKalinlik} fill={PALET.yatay} />

      {baglantiKirisiVar && (
        <g>
          {kolonXler.map((cx, i) => (
            <circle key={i} cx={cx} cy={topY - 10} r={3} fill={PALET.destek} />
          ))}
          <text x={x0 + scaledW / 2} y={topY - 16} textAnchor="middle" fontSize={10} fill={PALET.destek}>
            boy yönünde bağlantı kirişi (her kolon hizasında)
          </text>
        </g>
      )}

      <YatayOlcu x1={x0} x2={x0 + scaledW} y={dimGenislikY} etiket={mmEtiket(toplamGenislikMm)} />
      <DikeyOlcu y1={topY} y2={groundY} x={dimYukseklikX} etiket={mmEtiket(yukseklikMm)} />
      {kolonXler.length > 1 && (
        <YatayOlcu x1={kolonXler[0]} x2={kolonXler[1]} y={topY - 14} etiket={mmEtiket(acikligMm)} etiketAltta={false} fontSize={10} kalin={false} />
      )}

      <text x={x0 + scaledW / 2} y={dimGenislikY + 20} textAnchor="middle" fontSize={11} fill="#a3a3a3">
        {cerceveSayisi} çerçeve, {mmEtiket(gercekAralikMm)} aralıkla (boy yönünde) dizilmiştir
      </text>

      <Lejant kalemler={lejant} y={VIEW_H + 6} />
    </svg>
  );
}

function UstenGorunum({ veri }: { veri: KolonKirisSemaVeri }) {
  const { acikligMm, acikSayisi, uzunlukMm = 0, cerceveSayisi, gercekAralikMm, kolonKesit } = veri;
  const toplamGenislikMm = acikligMm * acikSayisi;
  if (!uzunlukMm) return null;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / uzunlukMm, drawH / toplamGenislikMm);

  const x0 = MARGIN_LEFT;
  const y0 = MARGIN_TOP;
  const scaledUzunluk = uzunlukMm * scale;
  const scaledGenislik = toplamGenislikMm * scale;

  const kolonXlerBoyunca = Array.from({ length: cerceveSayisi }, (_, i) => x0 + Math.min(i * gercekAralikMm, uzunlukMm) * scale);
  const kolonZler = Array.from({ length: acikSayisi + 1 }, (_, i) => y0 + i * acikligMm * scale);
  const kolonR = Math.max(3, olcekliKalinlikPx(kolonKesit?.enMm ?? 100, scale, 6) / 2);

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H + LEGEND_H}`} className="w-full h-auto" role="img" aria-label="Kolon-kiriş üstten (plan) görünüş şematik çizimi">
      <OkTanimlari />
      <text x={x0} y={y0 - 12} fontSize={11} fill="#a3a3a3">
        Üstten görünüş (kolon yerleşim planı)
      </text>
      <rect x={x0} y={y0} width={scaledUzunluk} height={scaledGenislik} fill="#f5f5f5" stroke="#d4d4d4" />
      {kolonXlerBoyunca.map((x, i) =>
        kolonZler.map((z, j) => <circle key={`${i}-${j}`} cx={x} cy={z} r={kolonR} fill={PALET.ana} />)
      )}
      <YatayOlcu x1={x0} x2={x0 + scaledUzunluk} y={y0 + scaledGenislik + 30} etiket={mmEtiket(uzunlukMm)} />
      <DikeyOlcu y1={y0} y2={y0 + scaledGenislik} x={x0 - 30} etiket={mmEtiket(toplamGenislikMm)} />
      {kolonXlerBoyunca.length > 1 && (
        <YatayOlcu x1={kolonXlerBoyunca[0]} x2={kolonXlerBoyunca[1]} y={y0 - 12} etiket={mmEtiket(gercekAralikMm)} etiketAltta={false} fontSize={10} kalin={false} />
      )}
      <Lejant kalemler={[{ renk: PALET.ana, etiket: `Kolon (${cerceveSayisi} çerçeve × ${acikSayisi + 1})` }]} y={VIEW_H + 6} />
    </svg>
  );
}

function Gorunum3D({ veri }: { veri: KolonKirisSemaVeri }) {
  const { acikligMm, yukseklikMm, acikSayisi, cerceveSayisi, gercekAralikMm, uzunlukMm = 0, stabiliteVar = false, kolonKesit, kirisKesit } = veri;
  const toplamGenislikMm = acikligMm * acikSayisi;
  const cerceveZler = Array.from({ length: Math.min(cerceveSayisi, 6) }, (_, i) => Math.min(i * gercekAralikMm, uzunlukMm || (cerceveSayisi - 1) * gercekAralikMm));

  const kirisler: Kiris3D[] = [];
  cerceveZler.forEach((z, ci) => {
    const kolonXler = Array.from({ length: acikSayisi + 1 }, (_, i) => i * acikligMm);
    kolonXler.forEach((x, i) => {
      kirisler.push({ a: [x, 0, z], b: [x, yukseklikMm, z], enMm: kolonKesit?.enMm ?? 100, renk: PALET.ana, etiket: ci === 0 && i === 0 ? mmEtiket(yukseklikMm) : undefined });
    });
    kirisler.push({ a: [0, yukseklikMm, z], b: [toplamGenislikMm, yukseklikMm, z], enMm: kirisKesit?.kalinlikMm ?? 100, renk: PALET.yatay, etiket: ci === 0 ? mmEtiket(toplamGenislikMm) : undefined });
  });
  for (let i = 0; i < cerceveZler.length - 1; i++) {
    kirisler.push({ a: [0, yukseklikMm, cerceveZler[i]], b: [0, yukseklikMm, cerceveZler[i + 1]], enMm: 60, renk: PALET.destek });
    kirisler.push({ a: [toplamGenislikMm, yukseklikMm, cerceveZler[i]], b: [toplamGenislikMm, yukseklikMm, cerceveZler[i + 1]], enMm: 60, renk: PALET.destek });
  }
  if (stabiliteVar && cerceveZler.length >= 2) {
    kirisler.push({ a: [0, 0, cerceveZler[0]], b: [acikligMm, yukseklikMm, cerceveZler[1]], enMm: 40, renk: PALET.stabilite });
    kirisler.push({ a: [0, yukseklikMm, cerceveZler[0]], b: [acikligMm, 0, cerceveZler[1]], enMm: 40, renk: PALET.stabilite });
  }

  const lejant = [
    { renk: PALET.ana, etiket: "Kolon" },
    { renk: PALET.yatay, etiket: "Kiriş" },
    { renk: PALET.destek, etiket: "Bağlantı Kirişi" },
    ...(stabiliteVar ? [{ renk: PALET.stabilite, etiket: "Stabilite Çaprazı" }] : []),
  ];

  return <Izometrik3DSahne kirisler={kirisler} lejant={lejant} ariaLabel="Kolon-kiriş iskelet 3D izometrik görünüm" />;
}

/** Kolon-kiriş iskeletin önden/üstten/3D görünüşlerini, seçilen kolon/kiriş profilinin gerçek
 * ölçüsüyle tutarlı, ölçekli bir çizim olarak gösterir. `duzenlenebilir` verilirse önden
 * görünüşte bir kolona tıklayarak bitişik açıklığı kaldırabilir / boş alana tıklayarak yeni bir
 * açıklık ekleyebilirsiniz (pozisyonlar eşit aralıklı kalır, sadece açıklık sayısı değişir). */
export default function SteelFrameSchematic({
  veri,
  duzenlenebilir,
  onAcikSayisiDegisti,
}: {
  veri: KolonKirisSemaVeri;
  duzenlenebilir?: boolean;
  onAcikSayisiDegisti?: (yeniAcikSayisi: number) => void;
}) {
  const [gorunum, setGorunum] = useState<SemaGorunumTipi>("on");
  const { acikligMm, yukseklikMm, acikSayisi, uzunlukMm } = veri;
  const toplamGenislikMm = acikligMm * acikSayisi;
  if (!toplamGenislikMm || !yukseklikMm || acikSayisi < 1) return null;

  const secenekler: SemaGorunumTipi[] = uzunlukMm ? ["on", "ust", "3d"] : ["on", "3d"];
  const editable = Boolean(duzenlenebilir && onAcikSayisiDegisti);

  return (
    <div>
      <GorunumSekmeleri aktif={gorunum} onSec={setGorunum} secenekler={secenekler} />
      {editable && gorunum === "on" && (
        <div className="mb-2 text-xs text-neutral-500">
          💡 Boş alana tıklayarak açıklık ekleyebilir, bir kolona tıklayarak bitişik açıklığı kaldırabilirsiniz.
        </div>
      )}
      {gorunum === "on" && <OndenGorunum veri={veri} duzenlenebilir={editable} onAcikSayisiDegisti={onAcikSayisiDegisti} />}
      {gorunum === "ust" && <UstenGorunum veri={veri} />}
      {gorunum === "3d" && <Gorunum3D veri={veri} />}
    </div>
  );
}
