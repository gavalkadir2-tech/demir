import { useState } from "react";
import WallSchematic, { DuvarPaneliSemaVeri, DuvarYatayAraProfilVeri } from "./WallSchematic";
import TrussSchematic, { CatiKafesiSemaVeri } from "./TrussSchematic";
import { Izometrik3DSahne, Kiris3D, Nokta3D, Yuzey3D, PALET, mmEtiket } from "./schematicShared";

export type KonteynerYon = "on" | "arka" | "sol" | "sag";

const YON_ETIKET: Record<KonteynerYon, string> = {
  on: "Ön Duvar",
  arka: "Arka Duvar",
  sol: "Sol Duvar",
  sag: "Sağ Duvar",
};

const YON_SIRASI: KonteynerYon[] = ["on", "arka", "sol", "sag"];

/** Konteynerin tüm kutusunu (4 duvar + varsa kat ayrımı + varsa çatı mahyası + ön duvar boşlukları)
 * basitleştirilmiş bir izometrik kutu olarak gösterir. Dikme/profil detayı içermez - bunlar için
 * ilgili duvarın "Duvarlar" sekmesindeki kendi 3D görünüşüne bakılmalı; bu görünüm sadece genel
 * kütle/oranları ve çatı eğimini göstermek içindir. X: konteyner boyu, Z: konteyner eni, Y: yükseklik. */
function ContainerGorunum3D({
  genislikMm,
  uzunlukMm,
  katYuksekligiMm,
  katSayisi,
  onDuvarBosluklari,
  cati,
}: {
  genislikMm: number;
  uzunlukMm: number;
  katYuksekligiMm: number;
  katSayisi: 1 | 2;
  onDuvarBosluklari?: DuvarPaneliSemaVeri["bosluklar"];
  cati?: CatiKafesiSemaVeri;
}) {
  const toplamYukseklikMm = katYuksekligiMm * katSayisi;
  const kirisler: Kiris3D[] = [];
  const yuzeyler: Yuzey3D[] = [];

  const altKoseler: Nokta3D[] = [
    [0, 0, 0],
    [uzunlukMm, 0, 0],
    [uzunlukMm, 0, genislikMm],
    [0, 0, genislikMm],
  ];
  const ustKoseler: Nokta3D[] = altKoseler.map(([x, , z]) => [x, toplamYukseklikMm, z] as Nokta3D);

  // 4 duvarı yarı saydam dolu yüzey olarak çiz - önceden sadece kenar çizgileri (tel kafes)
  // görünüyordu, bu da kutuyu içi boş bir iskelet gibi gösteriyordu. Otomatik gölgelendirme
  // (bkz. Izometrik3DSahne) her duvara bakış açısına göre farklı bir ton verir.
  for (let i = 0; i < 4; i++) {
    yuzeyler.push({
      noktalar: [altKoseler[i], altKoseler[(i + 1) % 4], ustKoseler[(i + 1) % 4], ustKoseler[i]],
      fill: PALET.ana,
    });
  }

  kirisler.push({ a: altKoseler[0], b: altKoseler[1], enMm: 60, renk: PALET.ana, etiket: mmEtiket(uzunlukMm) });
  kirisler.push({ a: altKoseler[1], b: altKoseler[2], enMm: 60, renk: PALET.ana, etiket: mmEtiket(genislikMm) });
  kirisler.push({ a: altKoseler[2], b: altKoseler[3], enMm: 60, renk: PALET.ana });
  kirisler.push({ a: altKoseler[3], b: altKoseler[0], enMm: 60, renk: PALET.ana });
  for (let i = 0; i < 4; i++) kirisler.push({ a: ustKoseler[i], b: ustKoseler[(i + 1) % 4], enMm: 60, renk: PALET.ana });
  for (let i = 0; i < 4; i++)
    kirisler.push({ a: altKoseler[i], b: ustKoseler[i], enMm: 60, renk: PALET.ana, etiket: i === 0 ? mmEtiket(toplamYukseklikMm) : undefined });

  if (katSayisi === 2) {
    const araKoseler = altKoseler.map(([x, , z]) => [x, katYuksekligiMm, z] as Nokta3D);
    for (let i = 0; i < 4; i++) kirisler.push({ a: araKoseler[i], b: araKoseler[(i + 1) % 4], enMm: 40, renk: PALET.yatay });
  }

  const mahyaYuksekligiMm = cati ? (cati.acikligMm / 2) * (cati.egimYuzde / 100) : 0;
  if (cati && mahyaYuksekligiMm > 0) {
    const ridgeY = toplamYukseklikMm + mahyaYuksekligiMm;
    const ridgeZ = genislikMm / 2;
    const ridgeA: Nokta3D = [0, ridgeY, ridgeZ];
    const ridgeB: Nokta3D = [uzunlukMm, ridgeY, ridgeZ];
    kirisler.push({ a: ridgeA, b: ridgeB, enMm: 60, renk: PALET.ikincil, etiket: `Mahya ${mmEtiket(Math.round(mahyaYuksekligiMm))}` });
    kirisler.push({ a: ustKoseler[0], b: ridgeA, enMm: 40, renk: PALET.ikincil });
    kirisler.push({ a: ustKoseler[3], b: ridgeA, enMm: 40, renk: PALET.ikincil });
    kirisler.push({ a: ustKoseler[1], b: ridgeB, enMm: 40, renk: PALET.ikincil });
    kirisler.push({ a: ustKoseler[2], b: ridgeB, enMm: 40, renk: PALET.ikincil });
    // İki eğimli çatı yüzeyi (mahyanın iki yanı).
    yuzeyler.push({ noktalar: [ustKoseler[0], ustKoseler[1], ridgeB, ridgeA], fill: PALET.ikincil, fillOpacity: 0.45 });
    yuzeyler.push({ noktalar: [ridgeA, ridgeB, ustKoseler[2], ustKoseler[3]], fill: PALET.ikincil, fillOpacity: 0.45 });
  } else {
    // Çatı eklenmemişse düz bir üst yüzey (tavan) göster ki kutu tamamen kapalı görünsün.
    yuzeyler.push({ noktalar: ustKoseler, fill: PALET.ana, fillOpacity: 0.3 });
  }

  for (const b of onDuvarBosluklari ?? []) {
    const z0 = b.konumMm;
    const z1 = b.konumMm + b.genislikMm;
    const y0 = b.tabanYuksekligiMm ?? 0;
    const y1 = y0 + b.yukseklikMm;
    const kose: Nokta3D[] = [
      [0, y0, z0],
      [0, y0, z1],
      [0, y1, z1],
      [0, y1, z0],
    ];
    for (let i = 0; i < 4; i++) kirisler.push({ a: kose[i], b: kose[(i + 1) % 4], enMm: 30, renk: PALET.vurgu });
  }

  const lejant = [
    { renk: PALET.ana, etiket: "Duvarlar (kutu, basitleştirilmiş)" },
    ...(katSayisi === 2 ? [{ renk: PALET.yatay, etiket: "Kat ayrımı" }] : []),
    ...(cati && mahyaYuksekligiMm > 0 ? [{ renk: PALET.ikincil, etiket: "Çatı (basitleştirilmiş)" }] : []),
    ...((onDuvarBosluklari?.length ?? 0) > 0 ? [{ renk: PALET.vurgu, etiket: "Ön duvar boşlukları" }] : []),
  ];

  return (
    <div>
      <p className="text-xs text-neutral-500 mb-2">
        Basitleştirilmiş genel görünüm - dikme/profil detayı için ilgili duvarın kendi 3D görünüşüne bakın. Sadece ön
        duvarın kapı/pencere boşlukları temsili olarak gösterilir.
      </p>
      <Izometrik3DSahne kirisler={kirisler} yuzeyler={yuzeyler} lejant={lejant} ariaLabel="Konteyner 3D basitleştirilmiş görünüm" />
    </div>
  );
}

/** Konteynerin 4 duvarını (ön/arka/sol/sağ), her biri kendi Çelik Duvar Paneli şematiği olarak
 * gösterir - dikme/boşluk/kaplama/dikme pozisyonu düzenleme dahil duvar panelindeki TÜM özellikler
 * her bir duvarda ayrı ayrı kullanılabilir. 2 katlıysa kat sekmesi de eklenir; varsa iç bölme
 * duvarları ayrı bir sekmede, çatı eklenmişse ayrı bir "Çatı" sekmesinde (kafes ekleme/kaldırma
 * dahil) ve genel kütleyi gösteren bir "3D" sekmesi de eklenir. */
export default function ContainerSchematic({
  katSayisi,
  kat1Duvarlar,
  kat2Duvarlar,
  icDuvarlar,
  cati,
  duzenlenebilir,
  onDikmePozisyonlariDegisti,
  onYatayAraProfilleriDegisti,
  onIcDuvarDikmePozisyonlariDegisti,
  onIcDuvarYatayAraProfilleriDegisti,
  onCatiKafesSayisiDegisti,
}: {
  katSayisi: 1 | 2;
  kat1Duvarlar: Record<KonteynerYon, DuvarPaneliSemaVeri>;
  kat2Duvarlar?: Record<KonteynerYon, DuvarPaneliSemaVeri>;
  icDuvarlar?: DuvarPaneliSemaVeri[];
  cati?: CatiKafesiSemaVeri;
  duzenlenebilir?: boolean;
  onDikmePozisyonlariDegisti?: (kat: 1 | 2, yon: KonteynerYon, yeniListe: number[] | null) => void;
  onYatayAraProfilleriDegisti?: (kat: 1 | 2, yon: KonteynerYon, yeniListe: DuvarYatayAraProfilVeri[]) => void;
  onIcDuvarDikmePozisyonlariDegisti?: (index: number, yeniListe: number[] | null) => void;
  onIcDuvarYatayAraProfilleriDegisti?: (index: number, yeniListe: DuvarYatayAraProfilVeri[]) => void;
  onCatiKafesSayisiDegisti?: (yeniSayi: number) => void;
}) {
  const [eleman, setEleman] = useState<"duvarlar" | "ic_duvarlar" | "cati" | "3d">("duvarlar");
  const [aktifKat, setAktifKat] = useState<1 | 2>(1);
  const [aktifYon, setAktifYon] = useState<KonteynerYon>("on");
  const [aktifIcDuvar, setAktifIcDuvar] = useState(0);

  const kat = aktifKat === 2 && kat2Duvarlar ? 2 : 1;
  const duvarlar = kat === 2 ? kat2Duvarlar! : kat1Duvarlar;
  const veri = duvarlar[aktifYon];
  const icDuvarVeri = icDuvarlar?.[aktifIcDuvar];

  const genislikMm = kat1Duvarlar.on.genislikMm;
  const uzunlukMm = kat1Duvarlar.sol.genislikMm;
  const katYuksekligiMm = kat1Duvarlar.on.yukseklikMm;

  return (
    <div>
      <div className="flex gap-1 mb-2 flex-wrap">
        <button type="button" className={eleman === "duvarlar" ? "btn-primary btn-sm" : "btn-secondary btn-sm"} onClick={() => setEleman("duvarlar")}>
          Duvarlar
        </button>
        {icDuvarlar && icDuvarlar.length > 0 && (
          <button
            type="button"
            className={eleman === "ic_duvarlar" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
            onClick={() => setEleman("ic_duvarlar")}
          >
            İç Duvarlar
          </button>
        )}
        {cati && (
          <button type="button" className={eleman === "cati" ? "btn-primary btn-sm" : "btn-secondary btn-sm"} onClick={() => setEleman("cati")}>
            Çatı
          </button>
        )}
        <button type="button" className={eleman === "3d" ? "btn-primary btn-sm" : "btn-secondary btn-sm"} onClick={() => setEleman("3d")}>
          3D
        </button>
      </div>

      {eleman === "duvarlar" && veri && (
        <div>
          {katSayisi === 2 && (
            <div className="flex gap-1 mb-2">
              {[1, 2].map((k) => (
                <button
                  key={k}
                  type="button"
                  className={aktifKat === k ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
                  onClick={() => setAktifKat(k as 1 | 2)}
                >
                  {k}. Kat
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-1 mb-3 flex-wrap">
            {YON_SIRASI.map((yon) => (
              <button
                key={yon}
                type="button"
                className={aktifYon === yon ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
                onClick={() => setAktifYon(yon)}
              >
                {YON_ETIKET[yon]}
              </button>
            ))}
          </div>
          <WallSchematic
            veri={veri}
            duzenlenebilir={duzenlenebilir}
            onDikmePozisyonlariDegisti={
              onDikmePozisyonlariDegisti ? (yeniListe) => onDikmePozisyonlariDegisti(aktifKat, aktifYon, yeniListe) : undefined
            }
            onYatayAraProfilleriDegisti={
              onYatayAraProfilleriDegisti ? (yeniListe) => onYatayAraProfilleriDegisti(aktifKat, aktifYon, yeniListe) : undefined
            }
          />
        </div>
      )}

      {eleman === "ic_duvarlar" && icDuvarVeri && (
        <div>
          <div className="flex gap-1 mb-3 flex-wrap">
            {icDuvarlar!.map((_, i) => (
              <button
                key={i}
                type="button"
                className={aktifIcDuvar === i ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
                onClick={() => setAktifIcDuvar(i)}
              >
                İç Duvar {i + 1}
              </button>
            ))}
          </div>
          <WallSchematic
            veri={icDuvarVeri}
            duzenlenebilir={duzenlenebilir}
            onDikmePozisyonlariDegisti={
              onIcDuvarDikmePozisyonlariDegisti ? (yeniListe) => onIcDuvarDikmePozisyonlariDegisti(aktifIcDuvar, yeniListe) : undefined
            }
            onYatayAraProfilleriDegisti={
              onIcDuvarYatayAraProfilleriDegisti ? (yeniListe) => onIcDuvarYatayAraProfilleriDegisti(aktifIcDuvar, yeniListe) : undefined
            }
          />
        </div>
      )}

      {eleman === "cati" && cati && (
        <TrussSchematic veri={cati} duzenlenebilir={duzenlenebilir} onKafesSayisiDegisti={onCatiKafesSayisiDegisti} />
      )}

      {eleman === "3d" && (
        <ContainerGorunum3D
          genislikMm={genislikMm}
          uzunlukMm={uzunlukMm}
          katYuksekligiMm={katYuksekligiMm}
          katSayisi={katSayisi}
          onDuvarBosluklari={kat1Duvarlar.on.bosluklar}
          cati={cati}
        />
      )}
    </div>
  );
}
