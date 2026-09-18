import { useId, useState } from "react";
import {
  OkTanimlari,
  YatayOlcu,
  DikeyOlcu,
  mmEtiket,
  PALET,
  Lejant,
  VIEW_W,
  KesitOlcusu,
  olcekliKalinlikPx,
  svgKoordDonustur,
  GorunumSekmeleri,
  SemaGorunumTipi,
} from "./schematicShared";
import TrussIsometricView from "./TrussIsometricView";

export interface CatiKafesiSemaVeri {
  /** bkz. server calc/roofTruss.ts CatiTipi. Verilmezse "acik_besik" (mevcut simetrik iki eğimli
   * çizim) varsayılır. Sadece "duz"/"sundurma" (tek eğimli) çizim geometrisini değiştirir;
   * "catikati"/"kirma" görsel olarak açık beşik ile aynı basitleştirilmiş şemayı kullanır. */
  catiTipi?: string;
  /** catiTipi "catikati" ise: diz duvarı (kneewall) yüksekliği (mm) - görsellerde eğimli çatının
   * altına eklenen dikey duvar bölümü olarak gösterilir. */
  dikmeYuksekligiMm?: number;
  acikligMm: number;
  egimYuzde: number;
  catiUzunluguMm: number;
  asikVar?: boolean;
  asikAraligiHedefMm?: number;
  diyagonalVar?: boolean;
  diyagonalPanelSayisi?: number;
  kafesSayisi?: number;
  gercekAralikMm?: number;
  /** Kullanıcının önceden elle (tıklayarak) düzenlediği kafes pozisyonları (mm) - verilirse
   * otomatik eşit aralık yerleşimi yerine doğrudan bu liste kullanılır (bkz. WallSchematic'teki
   * dikmePozisyonlariOverrideMm ile aynı desen). */
  kafesPozisyonlariOverrideMm?: number[];
  stabiliteVar?: boolean;
  direkSayisi?: number;
  ustBaslikKesit?: KesitOlcusu;
  kralKirisiKesit?: KesitOlcusu;
  asikKesit?: KesitOlcusu;
}

/** Gerçek kafes pozisyonlarını (mm, çatı uzunluğu ekseninde) döner - kullanıcı şematik üzerinden
 * elle düzenlemişse (kafesPozisyonlariOverrideMm) aynen bu liste kullanılır, aksi halde
 * kafesSayisi/gercekAralikMm'den eşit aralıklı pozisyonlar türetilir. */
function kafesPozisyonHesapla(veri: CatiKafesiSemaVeri): number[] {
  const { catiUzunluguMm, kafesSayisi = 2, gercekAralikMm = catiUzunluguMm, kafesPozisyonlariOverrideMm } = veri;
  if (kafesPozisyonlariOverrideMm && kafesPozisyonlariOverrideMm.length > 0) {
    return Array.from(new Set(kafesPozisyonlariOverrideMm.map((x) => Math.round(x)))).sort((a, b) => a - b);
  }
  return Array.from({ length: kafesSayisi }, (_, i) => Math.min(Math.round(i * gercekAralikMm), catiUzunluguMm));
}

const MARGIN_LEFT = 70;
const MARGIN_RIGHT = 30;
const PANEL_A_TOP = 20;
const PANEL_A_H = 220;
const PANEL_A_DIM_H = 40;
const PANEL_A_BOTTOM = PANEL_A_TOP + PANEL_A_H + PANEL_A_DIM_H;
const PANEL_A_LEGEND_Y = PANEL_A_BOTTOM + 8;
const PANEL_A_TOTAL_H = PANEL_A_LEGEND_Y + 32;

const PANEL_B_TOP = 46;
const PANEL_B_H = 180;
const PANEL_B_DIM_H = 40;
const PANEL_B_BOTTOM = PANEL_B_TOP + PANEL_B_H + PANEL_B_DIM_H;
const PANEL_B_LEGEND_Y = PANEL_B_BOTTOM + 8;
const PANEL_B_TOTAL_H = PANEL_B_LEGEND_Y + 32;

/** Kesit (bir kafes) görünüşü - üçgen profil, diyagonal/direk detayları. */
function KesitGorunumu({ veri }: { veri: CatiKafesiSemaVeri }) {
  const gradientId = useId();
  const {
    catiTipi = "acik_besik",
    dikmeYuksekligiMm: dikmeYuksekligiMmGirdi,
    acikligMm,
    egimYuzde,
    asikVar = false,
    asikAraligiHedefMm = 1000,
    diyagonalVar = false,
    diyagonalPanelSayisi = 0,
    stabiliteVar = false,
    direkSayisi = 0,
    ustBaslikKesit,
    kralKirisiKesit,
    asikKesit,
  } = veri;

  // "duz"/"sundurma" tek eğimlidir (mahya yok, açıklığın tamamı tek yamaç); diğer tipler
  // (açık beşik/çatı katı/kırma) görsel olarak simetrik iki eğimli şemayı kullanır.
  const tekEgimliMi = catiTipi === "duz" || catiTipi === "sundurma";
  const etkinEgimYuzde = catiTipi === "duz" ? 0 : egimYuzde;
  const yariAciklikMm = tekEgimliMi ? acikligMm : acikligMm / 2;
  const mahyaYuksekligiMm = yariAciklikMm * (etkinEgimYuzde / 100);
  const ustBaslikUzunlukMm = Math.sqrt(yariAciklikMm ** 2 + mahyaYuksekligiMm ** 2);
  const asikSatirSayisiPerSide = asikVar ? Math.max(2, Math.ceil(ustBaslikUzunlukMm / asikAraligiHedefMm) + 1) : 0;
  const M = diyagonalVar ? diyagonalPanelSayisi : 0;
  // Çatı katı: eğimli çatı gövdesi diz duvarının (kneewall) üzerine oturur - görsel olarak triangle
  // (rafter üçgeni) yukarı kaydırılır, altına dikey diz duvarı çizilir.
  const dikmeYuksekligiMm = catiTipi === "catikati" ? Math.max(0, dikmeYuksekligiMmGirdi ?? 0) : 0;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const scale = Math.min(drawW / acikligMm, PANEL_A_H / Math.max(mahyaYuksekligiMm + dikmeYuksekligiMm, acikligMm / 6));

  const scaledAciklik = acikligMm * scale;
  const scaledMahya = mahyaYuksekligiMm * scale;
  const scaledDikme = dikmeYuksekligiMm * scale;

  const x0 = MARGIN_LEFT;
  const zeminY = PANEL_A_TOP + PANEL_A_H;
  const tabanY = zeminY - scaledDikme;
  const xOrta = tekEgimliMi ? x0 + scaledAciklik : x0 + scaledAciklik / 2;
  const tepeY = tabanY - scaledMahya;

  const gövde = `${x0},${tabanY} ${xOrta},${tepeY} ${x0 + scaledAciklik},${tabanY}`;
  const baslikKalinlik = olcekliKalinlikPx(ustBaslikKesit?.kalinlikMm ?? 40, scale, 2.5);
  const kralKirisiKalinlik = olcekliKalinlikPx(kralKirisiKesit?.kalinlikMm ?? 30, scale, 2);

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
      ? [
          ...zigzagSegmentleri(x0, xOrta, tabanY, tepeY, M),
          ...(tekEgimliMi ? [] : zigzagSegmentleri(x0 + scaledAciklik, xOrta, tabanY, tepeY, M)),
        ]
      : [];

  const direkCizgileri = (xA: number, xB: number, yAlt: number, yUst: number, sayisi: number, panelSayisi: number) => {
    if (sayisi <= 0 || panelSayisi <= 0) return [];
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let k = 1; k <= sayisi; k++) {
      const x = xA + (k / panelSayisi) * (xB - xA);
      const yTop = yAlt + (k / panelSayisi) * (yUst - yAlt);
      lines.push({ x1: x, y1: yAlt, x2: x, y2: yTop });
    }
    return lines;
  };
  const direkPanelSayisi = direkSayisi > 0 ? direkSayisi + 1 : M;
  const direkCizgileriListesi =
    direkSayisi > 0
      ? [
          ...direkCizgileri(x0, xOrta, tabanY, tepeY, direkSayisi, direkPanelSayisi),
          ...(tekEgimliMi ? [] : direkCizgileri(x0 + scaledAciklik, xOrta, tabanY, tepeY, direkSayisi, direkPanelSayisi)),
        ]
      : [];

  const dimAciklikY = zeminY + 30;
  const dimYukseklikX = x0 - 30;

  // Zemin tarama çizgileri (standart mimari çizim kuralı) - çatının boşlukta değil, bir yapının
  // üzerinde oturduğu hissini vermek için zemin çizgisinin altına kısa diyagonal tikler eklenir.
  const zeminTicksBaslangic = x0 - 15;
  const zeminTicksBitis = x0 + scaledAciklik + 15;
  const zeminTickAraligi = 10;
  const zeminTickler = Array.from(
    { length: Math.max(0, Math.floor((zeminTicksBitis - zeminTicksBaslangic) / zeminTickAraligi)) },
    (_, i) => zeminTicksBaslangic + i * zeminTickAraligi
  );

  const lejant = [
    { renk: PALET.ana, etiket: "Üst/Alt Başlık" },
    { renk: PALET.ikincil, etiket: tekEgimliMi ? "Yüksek Uç Dikmesi" : "Kral Kirişi" },
    ...(dikmeYuksekligiMm > 0 ? [{ renk: PALET.yatay, etiket: "Diz Duvarı (Kneewall)" }] : []),
    ...(direkSayisi > 0 ? [{ renk: PALET.yatay, etiket: "Direk" }] : []),
    ...(M > 0 ? [{ renk: PALET.destek, etiket: "Çapraz Destek" }] : []),
    ...(asikVar ? [{ renk: PALET.vurgu, etiket: "Aşık" }] : []),
    ...(stabiliteVar ? [{ renk: PALET.stabilite, etiket: "Stabilite Bağlantısı" }] : []),
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${PANEL_A_TOTAL_H}`} className="w-full h-auto" role="img" aria-label="Çatı kafesi kesit görünüşü şematik çizimi">
      <OkTanimlari />
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eef2f7" />
          <stop offset="100%" stopColor="#dde3ea" />
        </linearGradient>
      </defs>
      <text x={x0} y={PANEL_A_TOP - 6} fontSize={11} fill="#a3a3a3">
        Kesit görünüşü (bir kafes){catiTipi === "kirma" ? " - orta kesit, uçlarda pah var (bkz. 3D görünüm)" : ""}
      </text>
      <line x1={x0 - 15} y1={zeminY} x2={x0 + scaledAciklik + 15} y2={zeminY} stroke="#a3a3a3" strokeWidth={2} />
      {zeminTickler.map((tx, i) => (
        <line key={i} x1={tx} y1={zeminY} x2={tx - 6} y2={zeminY + 6} stroke="#c7ccd2" strokeWidth={1} />
      ))}

      {dikmeYuksekligiMm > 0 && (
        <>
          <rect
            x={x0}
            y={tabanY}
            width={scaledAciklik}
            height={zeminY - tabanY}
            fill={PALET.yatay}
            fillOpacity={0.12}
            stroke={PALET.yatay}
            strokeWidth={1}
          />
          <line x1={x0} y1={zeminY} x2={x0} y2={tabanY} stroke={PALET.yatay} strokeWidth={baslikKalinlik} />
          <line x1={x0 + scaledAciklik} y1={zeminY} x2={x0 + scaledAciklik} y2={tabanY} stroke={PALET.yatay} strokeWidth={baslikKalinlik} />
        </>
      )}

      <polygon points={gövde} fill={`url(#${gradientId})`} stroke="none" />
      <line x1={x0} y1={tabanY} x2={x0 + scaledAciklik} y2={tabanY} stroke={PALET.ana} strokeWidth={baslikKalinlik} />
      <line x1={x0} y1={tabanY} x2={xOrta} y2={tepeY} stroke={PALET.ana} strokeWidth={baslikKalinlik} />
      {!tekEgimliMi && (
        <line x1={x0 + scaledAciklik} y1={tabanY} x2={xOrta} y2={tepeY} stroke={PALET.ana} strokeWidth={baslikKalinlik} />
      )}
      <line x1={xOrta} y1={tabanY} x2={xOrta} y2={tepeY} stroke={PALET.ikincil} strokeWidth={kralKirisiKalinlik} strokeDasharray="5 3" />
      {direkCizgileriListesi.map((c, i) => (
        <line key={i} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke={PALET.yatay} strokeWidth={2.5} />
      ))}
      {caprazCizgileri.map((c, i) => (
        <line key={i} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke={PALET.destek} strokeWidth={2} />
      ))}
      {asikVar &&
        Array.from({ length: asikSatirSayisiPerSide }, (_, i) => i / (asikSatirSayisiPerSide - 1)).map((oran, i) => (
          <g key={i}>
            <circle cx={x0 + oran * (xOrta - x0)} cy={tabanY + oran * (tepeY - tabanY)} r={Math.max(2, olcekliKalinlikPx(asikKesit?.enMm ?? 30, scale) / 2)} fill={PALET.vurgu} />
            {!tekEgimliMi && (
              <circle
                cx={x0 + scaledAciklik - oran * (x0 + scaledAciklik - xOrta)}
                cy={tabanY + oran * (tepeY - tabanY)}
                r={Math.max(2, olcekliKalinlikPx(asikKesit?.enMm ?? 30, scale) / 2)}
                fill={PALET.vurgu}
              />
            )}
          </g>
        ))}

      <YatayOlcu x1={x0} x2={x0 + scaledAciklik} y={dimAciklikY} etiket={mmEtiket(acikligMm)} />
      <DikeyOlcu y1={tepeY} y2={tabanY} x={dimYukseklikX} etiket={mmEtiket(mahyaYuksekligiMm)} />
      {dikmeYuksekligiMm > 0 && <DikeyOlcu y1={tabanY} y2={zeminY} x={dimYukseklikX} etiket={mmEtiket(dikmeYuksekligiMm)} />}
      <text x={xOrta} y={tepeY - 10} textAnchor="middle" fontSize={12} fill="#525252">
        eğim %{etkinEgimYuzde} · başlık {mmEtiket(ustBaslikUzunlukMm)}
      </text>

      <Lejant kalemler={lejant} y={PANEL_A_LEGEND_Y} />
    </svg>
  );
}

/** Üstten görünüş - binanın gerçek planı (çatı uzunluğu x açıklık), üzerinde kafes pozisyonları,
 * mahya/pah (hip) hatları ve aşık sıraları. Önceden yalnızca "bir yamaç açılmış" soyut bir şerit
 * gösteriliyordu (gerçek plan oranlarını yansıtmıyordu, çatı tipleri arasında görsel fark yoktu) -
 * artık gerçek bina dikdörtgeni üzerinde her çatı tipi kendi mahya/pah şeklini gösteriyor. */
function AsikPlaniGorunumu({
  veri,
  duzenlenebilir,
  onKafesPozisyonlariDegisti,
}: {
  veri: CatiKafesiSemaVeri;
  duzenlenebilir?: boolean;
  onKafesPozisyonlariDegisti?: (yeniListe: number[] | null) => void;
}) {
  const {
    catiTipi = "acik_besik",
    acikligMm,
    egimYuzde,
    catiUzunluguMm,
    asikVar = false,
    asikAraligiHedefMm = 1000,
    stabiliteVar = false,
  } = veri;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const kafesPozisyonlari = kafesPozisyonHesapla(veri);

  const tekEgimliMi = catiTipi === "duz" || catiTipi === "sundurma";
  const kirmaMi = catiTipi === "kirma";
  const etkinEgimYuzde = catiTipi === "duz" ? 0 : egimYuzde;
  const yariAciklikMm = tekEgimliMi ? acikligMm : acikligMm / 2;
  const mahyaYuksekligiMm = yariAciklikMm * (etkinEgimYuzde / 100);
  const ustBaslikUzunlukMm = Math.sqrt(yariAciklikMm ** 2 + mahyaYuksekligiMm ** 2);
  const asikSatirSayisiPerSide = asikVar ? Math.max(2, Math.ceil(ustBaslikUzunlukMm / asikAraligiHedefMm) + 1) : 0;
  const hipInsetMm = kirmaMi ? Math.min(yariAciklikMm, catiUzunluguMm / 2) : 0;

  const drawW = VIEW_W - MARGIN_LEFT - MARGIN_RIGHT;
  const scaleBx = drawW / catiUzunluguMm;
  const scaleBy = PANEL_B_H / acikligMm;
  const bx0 = MARGIN_LEFT;
  const by0 = PANEL_B_TOP;
  const scaledUzunluk = catiUzunluguMm * scaleBx;
  const scaledGenislik = acikligMm * scaleBy;
  // Z ekseni (açıklık yönü) -> ekran Y: Z=0 üstte (by0), Z=acikligMm altta (by0+scaledGenislik).
  const zY = (zMm: number) => by0 + zMm * scaleBy;
  const xX = (xMm: number) => bx0 + xMm * scaleBx;

  const kafesXPozisyonlari = kafesPozisyonlari.map(xX);
  const gercekAralikMm = kafesPozisyonlari.length > 1 ? kafesPozisyonlari[1] - kafesPozisyonlari[0] : catiUzunluguMm;
  const asikYCiftleri = asikVar
    ? Array.from({ length: asikSatirSayisiPerSide }, (_, i) => {
        const oran = i / (asikSatirSayisiPerSide - 1);
        return tekEgimliMi ? [zY(oran * yariAciklikMm)] : [zY(oran * yariAciklikMm), zY(acikligMm - oran * yariAciklikMm)];
      }).flat()
    : [];
  const stabiliteCizilecek = stabiliteVar && kafesPozisyonlari.length >= 2;
  const tiklanabilir = Boolean(duzenlenebilir && onKafesPozisyonlariDegisti);

  // Mahya/pah (hip) hattı - çatı tipine göre farklı şekil: düzde yok, sundurmada yüksek kenarda,
  // kırmada uçlarda köşelere pah ile kısalır, diğerlerinde (açık beşik/çatı katı) tam ortada.
  const mahyaY = tekEgimliMi ? zY(acikligMm) : zY(yariAciklikMm);
  const mahyaCizgileri: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const pahCizgileri: { x1: number; y1: number; x2: number; y2: number }[] = [];
  if (catiTipi === "sundurma") {
    mahyaCizgileri.push({ x1: bx0, y1: mahyaY, x2: bx0 + scaledUzunluk, y2: mahyaY });
  } else if (kirmaMi) {
    const rX0 = xX(hipInsetMm);
    const rX1 = xX(catiUzunluguMm - hipInsetMm);
    mahyaCizgileri.push({ x1: rX0, y1: mahyaY, x2: rX1, y2: mahyaY });
    pahCizgileri.push(
      { x1: bx0, y1: zY(0), x2: rX0, y2: mahyaY },
      { x1: bx0, y1: zY(acikligMm), x2: rX0, y2: mahyaY },
      { x1: bx0 + scaledUzunluk, y1: zY(0), x2: rX1, y2: mahyaY },
      { x1: bx0 + scaledUzunluk, y1: zY(acikligMm), x2: rX1, y2: mahyaY }
    );
  } else if (catiTipi !== "duz") {
    mahyaCizgileri.push({ x1: bx0, y1: mahyaY, x2: bx0 + scaledUzunluk, y2: mahyaY });
  }

  const lejant = [
    { renk: PALET.ana, etiket: "Kafes" },
    ...(mahyaCizgileri.length > 0 ? [{ renk: PALET.ikincil, etiket: tekEgimliMi ? "Yüksek Kenar" : "Mahya" }] : []),
    ...(pahCizgileri.length > 0 ? [{ renk: PALET.destek, etiket: "Kırma (Pah) Hattı" }] : []),
    ...(asikVar ? [{ renk: PALET.vurgu, etiket: "Aşık" }] : []),
    ...(stabiliteCizilecek ? [{ renk: PALET.stabilite, etiket: "Stabilite Bağlantısı" }] : []),
  ];

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${PANEL_B_TOTAL_H}`} className="w-full h-auto" role="img" aria-label="Çatı kafesi üstten görünüş (çatı planı) şematik çizimi">
      <OkTanimlari />
      <text x={bx0} y={16} fontSize={11} fill="#a3a3a3">
        Üstten görünüş (çatı planı)
      </text>
      <rect x={bx0} y={by0} width={scaledUzunluk} height={scaledGenislik} fill="#f5f5f5" stroke="#d4d4d4" />

      {tiklanabilir && (
        <rect
          x={bx0}
          y={by0}
          width={scaledUzunluk}
          height={scaledGenislik}
          fill="transparent"
          style={{ cursor: "copy" }}
          onClick={(e) => {
            const { x } = svgKoordDonustur(e);
            const xMm = Math.round((x - bx0) / scaleBx);
            if (xMm <= 0 || xMm >= catiUzunluguMm) return;
            if (kafesPozisyonlari.some((p) => Math.abs(p - xMm) < 10)) return;
            onKafesPozisyonlariDegisti!([...kafesPozisyonlari, xMm].sort((a, b) => a - b));
          }}
        >
          <title>Yeni kafes eklemek için tıkla</title>
        </rect>
      )}

      {asikYCiftleri.map((py, i) => (
        <line key={i} x1={bx0} y1={py} x2={bx0 + scaledUzunluk} y2={py} stroke={PALET.vurgu} strokeWidth={1.5} style={{ pointerEvents: "none" }} />
      ))}
      {pahCizgileri.map((c, i) => (
        <line key={i} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke={PALET.destek} strokeWidth={2} style={{ pointerEvents: "none" }} />
      ))}
      {mahyaCizgileri.map((c, i) => (
        <line key={i} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke={PALET.ikincil} strokeWidth={2.5} style={{ pointerEvents: "none" }} />
      ))}

      {kafesXPozisyonlari.map((px, i) => (
        <g key={i}>
          <line
            x1={px}
            y1={by0}
            x2={px}
            y2={by0 + scaledGenislik}
            stroke={hoverIndex === i && tiklanabilir ? "#dc2626" : PALET.ana}
            strokeWidth={2.5}
            style={{ pointerEvents: "none" }}
          />
          {tiklanabilir && kafesPozisyonlari.length > 2 && (
            <rect
              x={px - 7}
              y={by0}
              width={14}
              height={scaledGenislik}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              onClick={(e) => {
                e.stopPropagation();
                onKafesPozisyonlariDegisti!(kafesPozisyonlari.filter((_, idx) => idx !== i));
                setHoverIndex(null);
              }}
            >
              <title>Bu kafesi kaldırmak için tıkla</title>
            </rect>
          )}
        </g>
      ))}
      {stabiliteCizilecek && (
        <g>
          <line x1={kafesXPozisyonlari[0]} y1={by0} x2={kafesXPozisyonlari[1]} y2={by0 + scaledGenislik} stroke={PALET.stabilite} strokeWidth={2.5} />
          <line x1={kafesXPozisyonlari[0]} y1={by0 + scaledGenislik} x2={kafesXPozisyonlari[1]} y2={by0} stroke={PALET.stabilite} strokeWidth={2.5} />
        </g>
      )}

      <YatayOlcu x1={bx0} x2={bx0 + scaledUzunluk} y={by0 + scaledGenislik + 30} etiket={mmEtiket(catiUzunluguMm)} />
      <DikeyOlcu y1={by0} y2={by0 + scaledGenislik} x={bx0 - 30} etiket={mmEtiket(acikligMm)} />
      {kafesXPozisyonlari.length > 1 && (
        <YatayOlcu x1={kafesXPozisyonlari[0]} x2={kafesXPozisyonlari[1]} y={by0 - 12} etiket={mmEtiket(gercekAralikMm)} etiketAltta={false} fontSize={10} kalin={false} />
      )}

      <Lejant kalemler={lejant} y={PANEL_B_LEGEND_Y} />
    </svg>
  );
}

/** Çatı kafesinin kesit/üstten planı/3D görünüşlerini, seçilen başlık/aşık profilinin gerçek
 * ölçüsüyle tutarlı, ölçekli bir çizim olarak gösterir. `duzenlenebilir` verilirse üstten
 * görünüşte, tıpkı Çelik Duvar Paneli'nin dikme düzenlemesi gibi, boş alana tıklayarak kafes
 * eklenebilir, bir kafese tıklayarak kaldırılabilir, ayrıca sayısal bir liste üzerinden
 * pozisyonlar elle de düzenlenebilir. */
export default function TrussSchematic({
  veri,
  duzenlenebilir,
  onKafesPozisyonlariDegisti,
}: {
  veri: CatiKafesiSemaVeri;
  duzenlenebilir?: boolean;
  onKafesPozisyonlariDegisti?: (yeniListe: number[] | null) => void;
}) {
  const [gorunum, setGorunum] = useState<SemaGorunumTipi>("on");
  const [listeAcik, setListeAcik] = useState(false);
  const { acikligMm, catiUzunluguMm, kafesPozisyonlariOverrideMm } = veri;
  if (!acikligMm) return null;

  const editable = Boolean(duzenlenebilir && onKafesPozisyonlariDegisti);
  const kafesPozisyonlari = kafesPozisyonHesapla(veri);

  const kafesSil = (index: number) => {
    if (kafesPozisyonlari.length <= 2) return;
    onKafesPozisyonlariDegisti!(kafesPozisyonlari.filter((_, i) => i !== index));
  };
  const kafesDegistir = (index: number, deger: number) => {
    const yeni = [...kafesPozisyonlari];
    yeni[index] = deger;
    onKafesPozisyonlariDegisti!(yeni);
  };

  return (
    <div>
      <GorunumSekmeleri aktif={gorunum} onSec={setGorunum} secenekler={["on", "ust", "3d"]} />
      {editable && gorunum === "ust" && (
        <div className="mb-2 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {kafesPozisyonlariOverrideMm && kafesPozisyonlariOverrideMm.length > 0 && (
              <button
                type="button"
                className="text-brand-700 font-semibold text-xs whitespace-nowrap"
                onClick={() => onKafesPozisyonlariDegisti!(null)}
              >
                ↺ Otomatik yerleşime dön
              </button>
            )}
            <button
              type="button"
              className="text-neutral-500 text-xs font-semibold whitespace-nowrap ml-auto"
              onClick={() => setListeAcik((v) => !v)}
            >
              {listeAcik ? "▲" : "▼"} Pozisyonları Listele
            </button>
          </div>
          <div className="text-xs text-neutral-500">
            💡 Boş alana tıklayarak kafes ekleyebilir, bir kafese tıklayarak kaldırabilirsiniz.
          </div>
        </div>
      )}
      {gorunum === "on" && <KesitGorunumu veri={veri} />}
      {gorunum === "ust" && <AsikPlaniGorunumu veri={veri} duzenlenebilir={editable} onKafesPozisyonlariDegisti={onKafesPozisyonlariDegisti} />}
      {gorunum === "3d" && catiUzunluguMm > 0 && (
        <TrussIsometricView
          veri={{
            catiTipi: veri.catiTipi,
            dikmeYuksekligiMm: veri.dikmeYuksekligiMm,
            acikligMm,
            egimYuzde: veri.egimYuzde,
            catiUzunluguMm,
            kafesPozisyonlariMm: kafesPozisyonlari,
            asikVar: veri.asikVar,
            asikAraligiHedefMm: veri.asikAraligiHedefMm,
            stabiliteVar: veri.stabiliteVar,
            kaplamaGoster: true,
          }}
        />
      )}

      {editable && gorunum === "ust" && listeAcik && (
        <div className="mt-3 rounded-xl border border-neutral-200 p-3">
          <div className="text-xs font-semibold text-neutral-600 mb-1.5">Kafes Pozisyonları (mm, çatı başından)</div>
          <div className="space-y-1.5">
            {kafesPozisyonlari.map((px, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="number" className="field-input text-sm py-1.5" value={px} onChange={(e) => kafesDegistir(i, Number(e.target.value))} />
                <button
                  type="button"
                  className="text-red-600 text-xs font-semibold shrink-0"
                  disabled={kafesPozisyonlari.length <= 2}
                  onClick={() => kafesSil(i)}
                >
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
