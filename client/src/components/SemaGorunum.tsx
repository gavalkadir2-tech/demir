import { Material } from "../api/types";
import { kesitOlcusu } from "./schematicShared";
import RailingSchematic from "./RailingSchematic";
import StairsSchematic from "./StairsSchematic";
import CanopySchematic from "./CanopySchematic";
import DoorSchematic from "./DoorSchematic";
import WallSchematic, { DuvarBoslukVeri, DuvarYatayAraProfilVeri, DuvarPaneliSemaVeri } from "./WallSchematic";
import TrussSchematic, { CatiKafesiSemaVeri } from "./TrussSchematic";
import RafSchematic from "./RafSchematic";
import DonerMerdivenSchematic from "./DonerMerdivenSchematic";
import PergolaSchematic from "./PergolaSchematic";
import FerforjePanelSchematic from "./FerforjePanelSchematic";
import SteelFrameSchematic from "./SteelFrameSchematic";
import ContainerSchematic, { KonteynerYon } from "./ContainerSchematic";

/** Ürün şablonuna göre uygun şematik çizimi seçip render eder. Seçilen malzemelerin gerçek
 * kesit ölçülerini (widthMm/heightMm) çözüp her şemaya iletir; böylece çizimdeki profil
 * kalınlıkları sabit bir varsayım değil, kullanıcının seçtiği malzemeyle tutarlı olur. */
export default function SemaGorunum({
  templateKey,
  params,
  ozetDegerler,
  malzemeler,
  duzenlenebilir,
  onDikmePozisyonlariDegisti,
  onYatayAraProfilleriDegisti,
  onDikmeSayisiDegisti,
  onKolonSiraAdediDegisti,
  onAcikSayisiDegisti,
  onRafSayisiDegisti,
  onKafesSayisiDegisti,
  onDikeyCubukSayisiDegisti,
  onKonteynerDuvarDikmeDegisti,
  onKonteynerDuvarYatayDegisti,
  onKonteynerIcDuvarDikmeDegisti,
  onKonteynerIcDuvarYatayDegisti,
  onKonteynerCatiKafesSayisiDegisti,
}: {
  templateKey: string;
  params: Record<string, unknown>;
  ozetDegerler: Record<string, number>;
  /** materialId (string) -> Material sözlüğü; hesap önizlemesinden veya kayıtlı parçalardan gelir. */
  malzemeler: Record<string, Material>;
  /** "wall" ve "railing" şablonlarında kullanılır: dikmelere tıklayarak kaldırma/ekleme yapılabilir. */
  duzenlenebilir?: boolean;
  onDikmePozisyonlariDegisti?: (yeniListe: number[] | null) => void;
  onYatayAraProfilleriDegisti?: (yeniListe: DuvarYatayAraProfilVeri[]) => void;
  /** "canopy" şablonunda kullanılır: dikme sayısını tıklayarak artırma/azaltma. */
  onDikmeSayisiDegisti?: (yeniSayi: number) => void;
  /** "pergola" şablonunda kullanılır: kolon sıra adedini (ön+arka çifti) tıklayarak artırma/azaltma. */
  onKolonSiraAdediDegisti?: (yeniSiraAdedi: number) => void;
  /** "steel_frame" şablonunda kullanılır: açıklık sayısını tıklayarak artırma/azaltma. */
  onAcikSayisiDegisti?: (yeniAcikSayisi: number) => void;
  /** "shelf" şablonunda kullanılır: raf sayısını tıklayarak artırma/azaltma. */
  onRafSayisiDegisti?: (yeniSayi: number) => void;
  /** "truss" şablonunda kullanılır: kafes sayısını tıklayarak artırma/azaltma. */
  onKafesSayisiDegisti?: (yeniSayi: number) => void;
  /** "ferforje_panel" şablonunda kullanılır: dikey çubuk sayısını tıklayarak artırma/azaltma. */
  onDikeyCubukSayisiDegisti?: (yeniSayi: number) => void;
  /** "container" şablonunda kullanılır: aktif kat+yön duvarının dikme pozisyonlarını düzenleme. */
  onKonteynerDuvarDikmeDegisti?: (kat: 1 | 2, yon: KonteynerYon, yeniListe: number[] | null) => void;
  /** "container" şablonunda kullanılır: aktif kat+yön duvarının yatay ara profillerini düzenleme. */
  onKonteynerDuvarYatayDegisti?: (kat: 1 | 2, yon: KonteynerYon, yeniListe: DuvarYatayAraProfilVeri[]) => void;
  /** "container" şablonunda kullanılır: aktif iç bölme duvarının dikme pozisyonlarını düzenleme. */
  onKonteynerIcDuvarDikmeDegisti?: (index: number, yeniListe: number[] | null) => void;
  /** "container" şablonunda kullanılır: aktif iç bölme duvarının yatay ara profillerini düzenleme. */
  onKonteynerIcDuvarYatayDegisti?: (index: number, yeniListe: DuvarYatayAraProfilVeri[]) => void;
  /** "container" şablonunda kullanılır: çatının kafes sayısını tıklayarak artırma/azaltma. */
  onKonteynerCatiKafesSayisiDegisti?: (yeniSayi: number) => void;
}) {
  const n = (k: string): number => Number(params[k] ?? 0);
  const b = (k: string): boolean => Boolean(params[k]);
  const mat = (k: string): Material | undefined => {
    const v = params[k];
    return typeof v === "number" ? malzemeler[String(v)] : undefined;
  };
  const kesit = (k: string) => kesitOlcusu(mat(k));

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
            dikmeKesit: kesit("dikmeProfilId"),
            ustProfilKesit: kesit("ustProfilId"),
            altProfilKesit: kesit("altProfilId"),
            araKayitKesit: kesit("araKayitProfilId"),
            dikmePozisyonlariOverrideMm: params.dikmePozisyonlariMm as number[] | undefined,
          }}
          duzenlenebilir={duzenlenebilir}
          onDikmePozisyonlariDegisti={onDikmePozisyonlariDegisti}
        />
      );
    case "stairs":
      return (
        <StairsSchematic
          veri={{
            katYuksekligiMm: n("katYuksekligiMm"),
            genislikMm: n("genislikMm"),
            basamakDerinligiMm: ozetDegerler.basamakDerinligiMm,
            basamakSayisi: ozetDegerler.basamakSayisi,
            gercekBasamakYuksekligiMm: ozetDegerler.gercekBasamakYuksekligiMm,
            kosegenMm: ozetDegerler.kosegenMm,
            egimAcisiDerece: ozetDegerler.egimAcisiDerece,
            tasiyiciAdet: n("tasiyiciAdet") || 2,
            basamakKalinlikMm: n("basamakKalinlikMm") || 3,
            tasiyiciKesit: kesit("tasiyiciProfilId"),
          }}
        />
      );
    case "canopy":
      return (
        <CanopySchematic
          veri={{
            yukseklikMm: n("yukseklikMm"),
            boyMm: n("boyMm"),
            genislikMm: n("genislikMm"),
            egimYuzde: n("egimYuzde"),
            dikmeSayisi: n("dikmeSayisi") || 2,
            kirisUzunlukMm: ozetDegerler.kirisUzunlukMm,
            egimDerece: ozetDegerler.egimDerece,
            dikmeKesit: kesit("dikmeProfilId"),
            anaTasiyiciKesit: kesit("anaTasiyiciProfilId"),
          }}
          duzenlenebilir={duzenlenebilir}
          onDikmeSayisiDegisti={onDikmeSayisiDegisti}
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
            sacKalinlikMm: n("sacKalinlikMm") || 1.5,
            kasaKesit: kesit("kasaProfilId"),
            kanatKesit: kesit("kanatProfilId"),
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
            dikmeKesit: kesit("dikmeProfilId"),
            rayKesit: kesit("ustProfilId"),
            dikmePozisyonlariOverrideMm: params.dikmePozisyonlariMm as number[] | undefined,
            yatayAraProfilleriMm: (params.yatayAraProfilleri as DuvarYatayAraProfilVeri[] | undefined) ?? [],
          }}
          duzenlenebilir={duzenlenebilir}
          onDikmePozisyonlariDegisti={onDikmePozisyonlariDegisti}
          onYatayAraProfilleriDegisti={onYatayAraProfilleriDegisti}
        />
      );
    case "truss":
      return (
        <TrussSchematic
          veri={{
            catiTipi: (params.catiTipi as string | undefined) ?? "acik_besik",
            dikmeYuksekligiMm: n("dikmeYuksekligiMm"),
            acikligMm: n("acikligMm"),
            egimYuzde: n("egimYuzde"),
            catiUzunluguMm: n("catiUzunluguMm"),
            asikVar: b("asikProfilId"),
            asikAraligiHedefMm: n("asikAraligiHedefMm") || 1000,
            diyagonalVar: b("diyagonalProfilId"),
            diyagonalPanelSayisi: ozetDegerler.diyagonalPanelSayisi,
            kafesSayisi: ozetDegerler.kafesSayisi,
            gercekAralikMm: ozetDegerler.gercekAralikMm,
            stabiliteVar: Boolean(params.stabiliteBaglantisiVar && params.stabiliteProfilId),
            direkSayisi: Number(params.direkSayisi ?? 0),
            ustBaslikKesit: kesit("ustBaslikProfilId"),
            kralKirisiKesit: kesit("kralKirisiProfilId"),
            asikKesit: kesit("asikProfilId"),
          }}
          duzenlenebilir={duzenlenebilir}
          onKafesSayisiDegisti={onKafesSayisiDegisti}
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
            korkulukVar: b("korkulukVar"),
            katYuksekligiMm: n("katYuksekligiMm"),
            merkezKolonKesit: kesit("merkezKolonProfilId"),
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
            sacVar: b("rafSacKullan"),
            caprazVar: b("caprazProfilId"),
            ayakKesit: kesit("ayakProfilId"),
            rafCercevesiKesit: kesit("rafCercevesiProfilId"),
            sacKalinlikMm: n("sacKalinlikMm") || 1.5,
          }}
          duzenlenebilir={duzenlenebilir}
          onRafSayisiDegisti={onRafSayisiDegisti}
        />
      );
    case "pergola":
      return (
        <PergolaSchematic
          veri={{
            genislikMm: n("genislikMm"),
            boyMm: n("boyMm"),
            yukseklikMm: n("yukseklikMm"),
            kolonSiraAdedi: ozetDegerler.kolonSiraAdedi,
            lataYonu: (params.lataYonu as "genislik" | "boy" | undefined) ?? "genislik",
            lataSayisi: ozetDegerler.lataSayisi,
            gercekLataAralikMm: ozetDegerler.gercekLataAralikMm,
            kolonKesit: kesit("kolonProfilId"),
            kirisKesit: kesit("kirisProfilId"),
          }}
          duzenlenebilir={duzenlenebilir}
          onKolonSiraAdediDegisti={onKolonSiraAdediDegisti}
        />
      );
    case "ferforje_panel":
      return (
        <FerforjePanelSchematic
          veri={{
            genislikMm: n("genislikMm"),
            yukseklikMm: n("yukseklikMm"),
            dikeyCubukSayisi: ozetDegerler.dikeyCubukSayisi,
            gercekAralikMm: ozetDegerler.gercekAralikMm,
            yatayAraKayitSayisi: Number(params.yatayAraKayitSayisi ?? 0),
            susVar: b("susVar"),
            cerceveKesit: kesit("cerceveProfilId"),
            cubukKesit: kesit("dikeyCubukProfilId"),
          }}
          duzenlenebilir={duzenlenebilir}
          onDikeyCubukSayisiDegisti={onDikeyCubukSayisiDegisti}
        />
      );
    case "steel_frame":
      return (
        <SteelFrameSchematic
          veri={{
            acikligMm: n("acikligMm"),
            uzunlukMm: n("uzunlukMm"),
            yukseklikMm: n("yukseklikMm"),
            acikSayisi: n("acikSayisi") || 1,
            cerceveSayisi: ozetDegerler.cerceveSayisi,
            gercekAralikMm: ozetDegerler.gercekAralikMm,
            baglantiKirisiVar: b("baglantiKirisiProfilId"),
            stabiliteVar: Boolean(params.stabiliteBaglantisiVar && params.stabiliteProfilId),
            kolonKesit: kesit("kolonProfilId"),
            kirisKesit: kesit("kirisProfilId"),
          }}
          duzenlenebilir={duzenlenebilir}
          onAcikSayisiDegisti={onAcikSayisiDegisti}
        />
      );
    case "container": {
      const katSayisiKonteyner = (n("katSayisi") === 2 ? 2 : 1) as 1 | 2;
      const genislikMmKonteyner = n("genislikMm");
      const uzunlukMmKonteyner = n("uzunlukMm");
      const katYuksekligiMmKonteyner = n("katYuksekligiMm");
      const duvarSemaVeriGenel = (duvarParams: Record<string, unknown> | undefined, genislikMmDuvar: number): DuvarPaneliSemaVeri => {
        const dp = duvarParams ?? {};
        const matAt = (k: string): Material | undefined => {
          const v = dp[k];
          return typeof v === "number" ? malzemeler[String(v)] : undefined;
        };
        return {
          genislikMm: genislikMmDuvar,
          yukseklikMm: katYuksekligiMmKonteyner,
          dikmeAraligiHedefMm: Number(dp.dikmeAraligiHedefMm ?? 0),
          bosluklar: (dp.bosluklar as DuvarBoslukVeri[] | undefined) ?? [],
          disKaplamaVar: Boolean(dp.disKaplamaTuru && dp.disKaplamaTuru !== "yok"),
          icKaplamaVar: Boolean(dp.icKaplamaTuru && dp.icKaplamaTuru !== "yok"),
          dikmeKesit: kesitOlcusu(matAt("dikmeProfilId")),
          rayKesit: kesitOlcusu(matAt("ustProfilId")),
          dikmePozisyonlariOverrideMm: dp.dikmePozisyonlariMm as number[] | undefined,
          yatayAraProfilleriMm: (dp.yatayAraProfilleri as DuvarYatayAraProfilVeri[] | undefined) ?? [],
        };
      };
      const duvarSemaVeri = (duvarParams: Record<string, unknown> | undefined, yon: KonteynerYon): DuvarPaneliSemaVeri =>
        duvarSemaVeriGenel(duvarParams, yon === "on" || yon === "arka" ? genislikMmKonteyner : uzunlukMmKonteyner);
      const duvarlar1Raw = (params.duvarlar as Record<KonteynerYon, Record<string, unknown>> | undefined) ?? ({} as any);
      const duvarlar2Raw = params.duvarlar2 as Record<KonteynerYon, Record<string, unknown>> | undefined;
      const kat1: Record<KonteynerYon, DuvarPaneliSemaVeri> = {
        on: duvarSemaVeri(duvarlar1Raw.on, "on"),
        arka: duvarSemaVeri(duvarlar1Raw.arka, "arka"),
        sol: duvarSemaVeri(duvarlar1Raw.sol, "sol"),
        sag: duvarSemaVeri(duvarlar1Raw.sag, "sag"),
      };
      const kat2: Record<KonteynerYon, DuvarPaneliSemaVeri> | undefined =
        katSayisiKonteyner === 2
          ? {
              on: duvarSemaVeri(duvarlar2Raw?.on ?? duvarlar1Raw.on, "on"),
              arka: duvarSemaVeri(duvarlar2Raw?.arka ?? duvarlar1Raw.arka, "arka"),
              sol: duvarSemaVeri(duvarlar2Raw?.sol ?? duvarlar1Raw.sol, "sol"),
              sag: duvarSemaVeri(duvarlar2Raw?.sag ?? duvarlar1Raw.sag, "sag"),
            }
          : undefined;
      const icDuvarlarRaw = (params.icDuvarlar as Record<string, unknown>[] | undefined) ?? [];
      const icDuvarlarVeri: DuvarPaneliSemaVeri[] = icDuvarlarRaw.map((dp) => duvarSemaVeriGenel(dp, Number(dp.genislikMm ?? 0)));
      const catiParams = params.cati as Record<string, unknown> | undefined;
      const catiParam = (k: string): unknown => catiParams?.[k];
      const catiMatAt = (k: string): Material | undefined => {
        const v = catiParam(k);
        return typeof v === "number" ? malzemeler[String(v)] : undefined;
      };
      const catiVeri: CatiKafesiSemaVeri | undefined = b("catiVar")
        ? {
            catiTipi: (catiParam("catiTipi") as string | undefined) ?? "acik_besik",
            dikmeYuksekligiMm: Number(catiParam("dikmeYuksekligiMm") ?? 0),
            acikligMm: genislikMmKonteyner,
            egimYuzde: Number(catiParam("egimYuzde") ?? 0),
            catiUzunluguMm: uzunlukMmKonteyner,
            asikVar: Boolean(catiParam("asikProfilId")),
            asikAraligiHedefMm: Number(catiParam("asikAraligiHedefMm") ?? 0) || 1000,
            diyagonalVar: Boolean(catiParam("diyagonalProfilId")),
            diyagonalPanelSayisi: ozetDegerler.catiDiyagonalPanelSayisi,
            kafesSayisi: ozetDegerler.catiKafesSayisi,
            gercekAralikMm: ozetDegerler.catiGercekAralikMm,
            stabiliteVar: Boolean(catiParam("stabiliteBaglantisiVar") && catiParam("stabiliteProfilId")),
            direkSayisi: Number(catiParam("direkSayisi") ?? 0),
            ustBaslikKesit: kesitOlcusu(catiMatAt("ustBaslikProfilId")),
            kralKirisiKesit: kesitOlcusu(catiMatAt("kralKirisiProfilId")),
            asikKesit: kesitOlcusu(catiMatAt("asikProfilId")),
          }
        : undefined;
      return (
        <ContainerSchematic
          katSayisi={katSayisiKonteyner}
          kat1Duvarlar={kat1}
          kat2Duvarlar={kat2}
          icDuvarlar={icDuvarlarVeri.length > 0 ? icDuvarlarVeri : undefined}
          cati={catiVeri}
          duzenlenebilir={duzenlenebilir}
          onDikmePozisyonlariDegisti={onKonteynerDuvarDikmeDegisti}
          onYatayAraProfilleriDegisti={onKonteynerDuvarYatayDegisti}
          onIcDuvarDikmePozisyonlariDegisti={onKonteynerIcDuvarDikmeDegisti}
          onIcDuvarYatayAraProfilleriDegisti={onKonteynerIcDuvarYatayDegisti}
          onCatiKafesSayisiDegisti={onKonteynerCatiKafesSayisiDegisti}
        />
      );
    }
    default:
      return null;
  }
}
