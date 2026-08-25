import RailingSchematic from "./RailingSchematic";
import StairsSchematic from "./StairsSchematic";
import CanopySchematic from "./CanopySchematic";
import DoorSchematic from "./DoorSchematic";
import WallSchematic, { DuvarBoslukVeri } from "./WallSchematic";
import TrussSchematic from "./TrussSchematic";
import RafSchematic from "./RafSchematic";
import DonerMerdivenSchematic from "./DonerMerdivenSchematic";

/** Ürün şablonuna göre uygun şematik çizimi seçip render eder (railing/stairs/canopy/door). */
export default function SemaGorunum({
  templateKey,
  params,
  ozetDegerler,
}: {
  templateKey: string;
  params: Record<string, unknown>;
  ozetDegerler: Record<string, number>;
}) {
  const n = (k: string): number => Number(params[k] ?? 0);

  switch (templateKey) {
    case "railing":
      return (
        <RailingSchematic
          veri={{
            toplamUzunlukMm: n("toplamUzunlukMm"),
            yukseklikMm: n("yukseklikMm"),
            araKayitSayisi: n("araKayitSayisi"),
            dikmeSayisi: ozetDegerler.dikmeSayisi,
            araliklarSayisi: ozetDegerler.araliklarSayisi,
            gercekAralikMm: ozetDegerler.gercekAralikMm,
          }}
        />
      );
    case "stairs":
      return (
        <StairsSchematic
          veri={{
            katYuksekligiMm: n("katYuksekligiMm"),
            basamakDerinligiMm: ozetDegerler.basamakDerinligiMm,
            basamakSayisi: ozetDegerler.basamakSayisi,
            gercekBasamakYuksekligiMm: ozetDegerler.gercekBasamakYuksekligiMm,
            kosegenMm: ozetDegerler.kosegenMm,
            egimAcisiDerece: ozetDegerler.egimAcisiDerece,
          }}
        />
      );
    case "canopy":
      return (
        <CanopySchematic
          veri={{
            yukseklikMm: n("yukseklikMm"),
            boyMm: n("boyMm"),
            egimYuzde: n("egimYuzde"),
            kirisUzunlukMm: ozetDegerler.kirisUzunlukMm,
            egimDerece: ozetDegerler.egimDerece,
          }}
        />
      );
    case "door":
      return (
        <DoorSchematic
          veri={{
            genislikMm: n("genislikMm"),
            yukseklikMm: n("yukseklikMm"),
            kanatGenislikMm: ozetDegerler.kanatGenislikMm,
            kanatYukseklikMm: ozetDegerler.kanatYukseklikMm,
            araKayitSayisi: n("araKayitSayisi"),
          }}
        />
      );
    case "wall":
      return (
        <WallSchematic
          veri={{
            genislikMm: n("genislikMm"),
            yukseklikMm: n("yukseklikMm"),
            dikmeAraligiHedefMm: n("dikmeAraligiHedefMm"),
            bosluklar: (params.bosluklar as DuvarBoslukVeri[] | undefined) ?? [],
            disKaplamaVar: Boolean(params.disKaplamaTuru && params.disKaplamaTuru !== "yok"),
            icKaplamaVar: Boolean(params.icKaplamaTuru && params.icKaplamaTuru !== "yok"),
          }}
        />
      );
    case "truss":
      return (
        <TrussSchematic
          veri={{
            acikligMm: n("acikligMm"),
            egimYuzde: n("egimYuzde"),
            catiUzunluguMm: n("catiUzunluguMm"),
            asikVar: Boolean(params.asikProfilId),
            asikAraligiHedefMm: n("asikAraligiHedefMm") || 1000,
            diyagonalVar: Boolean(params.diyagonalProfilId),
            diyagonalPanelSayisi: ozetDegerler.diyagonalPanelSayisi,
            kafesSayisi: ozetDegerler.kafesSayisi,
            gercekAralikMm: ozetDegerler.gercekAralikMm,
            stabiliteVar: Boolean(params.stabiliteBaglantisiVar && params.stabiliteProfilId),
            direkSayisi: Number(params.direkSayisi ?? 0),
          }}
        />
      );
    case "spiral_stairs":
      return (
        <DonerMerdivenSchematic
          veri={{
            icCapMm: n("icCapMm"),
            disCapMm: n("disCapMm"),
            basamakSayisi: ozetDegerler.basamakSayisi,
            toplamDonusDerecesi: n("toplamDonusDerecesi"),
            korkulukVar: Boolean(params.korkulukVar),
          }}
        />
      );
    case "shelf":
      return (
        <RafSchematic
          veri={{
            genislikMm: n("genislikMm"),
            derinlikMm: n("derinlikMm"),
            yukseklikMm: n("yukseklikMm"),
            rafSayisi: ozetDegerler.rafSayisi,
            rafAraligiMm: ozetDegerler.rafAraligiMm,
            sacVar: Boolean(params.rafSacKullan),
            caprazVar: Boolean(params.caprazProfilId),
          }}
        />
      );
    default:
      return null;
  }
}
