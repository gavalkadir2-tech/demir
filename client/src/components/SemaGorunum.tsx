import RailingSchematic from "./RailingSchematic";
import StairsSchematic from "./StairsSchematic";
import CanopySchematic from "./CanopySchematic";
import DoorSchematic from "./DoorSchematic";
import WallSchematic, { DuvarBoslukVeri } from "./WallSchematic";
import TrussSchematic from "./TrussSchematic";

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
    default:
      return null;
  }
}
