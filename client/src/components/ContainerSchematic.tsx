import { useState } from "react";
import WallSchematic, { DuvarPaneliSemaVeri, DuvarYatayAraProfilVeri } from "./WallSchematic";
import TrussSchematic, { CatiKafesiSemaVeri } from "./TrussSchematic";

export type KonteynerYon = "on" | "arka" | "sol" | "sag";

const YON_ETIKET: Record<KonteynerYon, string> = {
  on: "Ön Duvar",
  arka: "Arka Duvar",
  sol: "Sol Duvar",
  sag: "Sağ Duvar",
};

const YON_SIRASI: KonteynerYon[] = ["on", "arka", "sol", "sag"];

/** Konteynerin 4 duvarını (ön/arka/sol/sağ), her biri kendi Çelik Duvar Paneli şematiği olarak
 * gösterir - dikme/boşluk/kaplama/dikme pozisyonu düzenleme dahil duvar panelindeki TÜM özellikler
 * her bir duvarda ayrı ayrı kullanılabilir. 2 katlıysa kat sekmesi de eklenir; çatı eklenmişse
 * ayrı bir "Çatı" sekmesinde Çatı Kafesi şematiği (kafes ekleme/kaldırma dahil) gösterilir. */
export default function ContainerSchematic({
  katSayisi,
  kat1Duvarlar,
  kat2Duvarlar,
  cati,
  duzenlenebilir,
  onDikmePozisyonlariDegisti,
  onYatayAraProfilleriDegisti,
  onCatiKafesSayisiDegisti,
}: {
  katSayisi: 1 | 2;
  kat1Duvarlar: Record<KonteynerYon, DuvarPaneliSemaVeri>;
  kat2Duvarlar?: Record<KonteynerYon, DuvarPaneliSemaVeri>;
  cati?: CatiKafesiSemaVeri;
  duzenlenebilir?: boolean;
  onDikmePozisyonlariDegisti?: (kat: 1 | 2, yon: KonteynerYon, yeniListe: number[] | null) => void;
  onYatayAraProfilleriDegisti?: (kat: 1 | 2, yon: KonteynerYon, yeniListe: DuvarYatayAraProfilVeri[]) => void;
  onCatiKafesSayisiDegisti?: (yeniSayi: number) => void;
}) {
  const [eleman, setEleman] = useState<"duvarlar" | "cati">("duvarlar");
  const [aktifKat, setAktifKat] = useState<1 | 2>(1);
  const [aktifYon, setAktifYon] = useState<KonteynerYon>("on");

  const kat = aktifKat === 2 && kat2Duvarlar ? 2 : 1;
  const duvarlar = kat === 2 ? kat2Duvarlar! : kat1Duvarlar;
  const veri = duvarlar[aktifYon];

  return (
    <div>
      {cati && (
        <div className="flex gap-1 mb-2">
          <button type="button" className={eleman === "duvarlar" ? "btn-primary btn-sm" : "btn-secondary btn-sm"} onClick={() => setEleman("duvarlar")}>
            Duvarlar
          </button>
          <button type="button" className={eleman === "cati" ? "btn-primary btn-sm" : "btn-secondary btn-sm"} onClick={() => setEleman("cati")}>
            Çatı
          </button>
        </div>
      )}

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

      {eleman === "cati" && cati && (
        <TrussSchematic veri={cati} duzenlenebilir={duzenlenebilir} onKafesSayisiDegisti={onCatiKafesSayisiDegisti} />
      )}
    </div>
  );
}
