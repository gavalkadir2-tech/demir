import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateContainer, KonteynerDuvarGirdi, KonteynerDuvarSeti, KonteynerCatiGirdi } from "../container";
import { HesaplamaHatasi } from "../units";

function duvar(overrides: Partial<KonteynerDuvarGirdi> = {}): KonteynerDuvarGirdi {
  return {
    dikmeAraligiHedefMm: 600,
    ustProfilKey: "40x40x2",
    altProfilKey: "40x40x2",
    dikmeProfilKey: "40x40x2",
    ...overrides,
  };
}

function duvarSeti(overrides: Partial<Record<keyof KonteynerDuvarSeti, Partial<KonteynerDuvarGirdi>>> = {}): KonteynerDuvarSeti {
  return {
    on: duvar(overrides.on),
    arka: duvar(overrides.arka),
    sol: duvar(overrides.sol),
    sag: duvar(overrides.sag),
  };
}

function cati(overrides: Partial<KonteynerCatiGirdi> = {}): KonteynerCatiGirdi {
  return {
    egimYuzde: 20,
    kafesAraligiHedefMm: 1000,
    ustBaslikProfilKey: "40x40x2",
    altBaslikProfilKey: "40x40x2",
    ...overrides,
  };
}

test("konteyner: 4 duvar da tam bir çelik duvar paneli olarak hesaplanıyor (tek kat)", () => {
  const sonuc = calculateContainer({
    genislikMm: 2438,
    uzunlukMm: 6058,
    katYuksekligiMm: 2591,
    katSayisi: 1,
    duvarlar: duvarSeti(),
  });

  // Her duvar için "Dikme", "Üst ray", "Alt ray" parçaları etiket ön ekiyle üretilmeli.
  for (const yon of ["Ön Duvar", "Arka Duvar", "Sol Duvar", "Sağ Duvar"]) {
    assert.ok(sonuc.parcalar.some((p) => p.label === `${yon}: Dikme`), `${yon}: Dikme parçası eksik`);
    assert.ok(sonuc.parcalar.some((p) => p.label === `${yon}: Üst ray`), `${yon}: Üst ray parçası eksik`);
  }

  // Ön/arka duvarlar konteyner eniyle (2438), sol/sağ duvarlar konteyner boyuyla (6058) genişlikte olmalı.
  const onUstRay = sonuc.parcalar.find((p) => p.label === "Ön Duvar: Üst ray")!;
  assert.equal(onUstRay.uzunlukMm, 2438);
  const solUstRay = sonuc.parcalar.find((p) => p.label === "Sol Duvar: Üst ray")!;
  assert.equal(solUstRay.uzunlukMm, 6058);

  // Tek kat olduğundan "1. Kat" / "2. Kat" ön eki OLMAMALI.
  assert.ok(!sonuc.parcalar.some((p) => p.label.includes("1. Kat")));
  assert.ok(!sonuc.parcalar.some((p) => p.label.includes("2. Kat İskeleti")));

  assert.ok(sonuc.ozetDegerler.toplamDikmeSayisi > 0);
  assert.equal(sonuc.ozetDegerler.toplamBoslukSayisi, 0);
});

test("konteyner: duvardaki pencere/kapı boşluğu ve iç/dış kaplama özellikleri çalışıyor", () => {
  const sonuc = calculateContainer({
    genislikMm: 2438,
    uzunlukMm: 6058,
    katYuksekligiMm: 2591,
    katSayisi: 1,
    duvarlar: duvarSeti({
      on: {
        bosluklar: [{ etiket: "Kapı", konumMm: 500, genislikMm: 900, yukseklikMm: 2000, tabanYuksekligiMm: 0 }],
        disKaplamaTuru: "trapez_sac",
      },
    }),
  });

  assert.ok(sonuc.parcalar.some((p) => p.label === "Ön Duvar: Lento (Kapı)"));
  assert.ok(sonuc.sacKalemleri.some((s) => s.label.includes("Ön Duvar") && s.label.includes("kaplaması")));
  assert.equal(sonuc.ozetDegerler.toplamBoslukSayisi, 1);
});

test("konteyner: 2 katlı ve duvarlar2 verilmezse 1. kat duvarları 2. kat için de kullanılır", () => {
  const sonuc = calculateContainer({
    genislikMm: 2438,
    uzunlukMm: 6058,
    katYuksekligiMm: 2591,
    katSayisi: 2,
    duvarlar: duvarSeti(),
  });

  assert.ok(sonuc.parcalar.some((p) => p.label === "1. Kat Ön Duvar: Dikme"));
  assert.ok(sonuc.parcalar.some((p) => p.label === "2. Kat Ön Duvar: Dikme"));
  const kat1 = sonuc.parcalar.find((p) => p.label === "1. Kat Ön Duvar: Dikme")!;
  const kat2 = sonuc.parcalar.find((p) => p.label === "2. Kat Ön Duvar: Dikme")!;
  assert.equal(kat1.adet, kat2.adet);
});

test("konteyner: duvarlar2 verilirse 2. kat kendi ayarlarıyla (farklı boşluklarla) hesaplanır", () => {
  const sonuc = calculateContainer({
    genislikMm: 2438,
    uzunlukMm: 6058,
    katYuksekligiMm: 2591,
    katSayisi: 2,
    duvarlar: duvarSeti(),
    duvarlar2: duvarSeti({
      on: { bosluklar: [{ etiket: "Pencere", konumMm: 500, genislikMm: 1200, yukseklikMm: 1200, tabanYuksekligiMm: 900 }] },
    }),
  });

  assert.ok(!sonuc.parcalar.some((p) => p.label === "1. Kat Ön Duvar: Lento (Pencere)"));
  assert.ok(sonuc.parcalar.some((p) => p.label === "2. Kat Ön Duvar: Lento (Pencere)"));
});

test("konteyner: duvar hatası konteyner seviyesinde yön/kat bilgisiyle fırlatılır", () => {
  assert.throws(
    () =>
      calculateContainer({
        genislikMm: 2438,
        uzunlukMm: 6058,
        katYuksekligiMm: 2591,
        katSayisi: 1,
        duvarlar: duvarSeti({ on: { ustProfilKey: "" } }),
      }),
    (err: unknown) => err instanceof HesaplamaHatasi && err.message.includes("Ön Duvar")
  );
});

test("konteyner: 2 katlı + merdiven + platform korkuluğu + 2. kat iskeleti birlikte doğru birleşiyor", () => {
  const sonuc = calculateContainer({
    genislikMm: 2438,
    uzunlukMm: 6058,
    katYuksekligiMm: 2591,
    katSayisi: 2,
    duvarlar: duvarSeti(),
    merdivenVar: true,
    merdivenDerinlikMm: 3000,
    merdivenTasiyiciProfilKey: "80x80x3",
    platformKorkulukVar: true,
    platformKorkulukUzunlukMm: 6058,
    platformUstProfilKey: "40x40x2",
    platformAltProfilKey: "40x40x2",
    platformDikmeProfilKey: "40x40x2",
    ikinciKatIskeletVar: true,
    iskeletKolonProfilKey: "100x100x4",
    iskeletKirisProfilKey: "100x100x4",
  });

  assert.ok(sonuc.ozetDegerler.merdivenBasamakSayisi > 0);
  assert.ok(sonuc.ozetDegerler.platformKorkulukDikmeSayisi > 1);
  assert.ok(sonuc.ozetDegerler.iskeletKolonSayisi > 0);

  assert.ok(sonuc.parcalar.some((p) => p.label.startsWith("Merdiven: ")));
  assert.ok(sonuc.parcalar.some((p) => p.label.startsWith("Platform korkuluğu: ")));
  assert.ok(sonuc.parcalar.some((p) => p.label.startsWith("2. Kat İskeleti: ")));
});

test("konteyner: merdiven eklenip taşıyıcı profili/derinlik verilmezse hata verir", () => {
  assert.throws(
    () =>
      calculateContainer({
        genislikMm: 2438,
        uzunlukMm: 6058,
        katYuksekligiMm: 2591,
        katSayisi: 2,
        duvarlar: duvarSeti(),
        merdivenVar: true,
      }),
    HesaplamaHatasi
  );
});

test("konteyner: 2 katlı olmayan konteynerde merdiven/iskelet istenirse uyarıyla atlanır, hata vermez", () => {
  const sonuc = calculateContainer({
    genislikMm: 2438,
    uzunlukMm: 6058,
    katYuksekligiMm: 2591,
    katSayisi: 1,
    duvarlar: duvarSeti(),
    merdivenVar: true,
    ikinciKatIskeletVar: true,
  });

  assert.equal(sonuc.ozetDegerler.merdivenBasamakSayisi, undefined);
  assert.equal(sonuc.ozetDegerler.iskeletKolonSayisi, undefined);
  assert.ok(sonuc.uyarilar.some((u) => u.includes("Merdiven yalnızca 2 katlı")));
  assert.ok(sonuc.uyarilar.some((u) => u.includes("2. kat iskeleti yalnızca 2 katlı")));
});

test("konteyner: geçersiz girdilerde hata fırlatır", () => {
  assert.throws(
    () =>
      calculateContainer({
        genislikMm: -1,
        uzunlukMm: 6058,
        katYuksekligiMm: 2591,
        katSayisi: 1,
        duvarlar: duvarSeti(),
      }),
    HesaplamaHatasi
  );
});

test("konteyner: çatı eklenirse konteyner eni/boyu açıklık/çatı uzunluğu olarak kullanılır (tek kat)", () => {
  const sonuc = calculateContainer({
    genislikMm: 2438,
    uzunlukMm: 6058,
    katYuksekligiMm: 2591,
    katSayisi: 1,
    duvarlar: duvarSeti(),
    catiVar: true,
    cati: cati(),
  });

  assert.ok(sonuc.parcalar.some((p) => p.label === "Çatı: Üst başlık"));
  assert.ok(sonuc.ozetDegerler.catiKafesSayisi > 0);
  assert.ok(sonuc.ozetDegerler.catiMahyaYuksekligiMm > 0);

  // Çatı, kat sayısından bağımsız - iki katlı olmasa da hesaplanmalı, uyarı verilmemeli.
  assert.ok(!sonuc.uyarilar.some((u) => u.includes("Çatı")));
});

test("konteyner: çatı 2 katlı konteynerde de kat sayısından bağımsız çalışır", () => {
  const sonuc = calculateContainer({
    genislikMm: 2438,
    uzunlukMm: 6058,
    katYuksekligiMm: 2591,
    katSayisi: 2,
    duvarlar: duvarSeti(),
    catiVar: true,
    cati: cati(),
  });

  assert.ok(sonuc.parcalar.some((p) => p.label === "Çatı: Üst başlık"));
  assert.ok(sonuc.ozetDegerler.catiKafesSayisi > 0);
});

test("konteyner: çatı eklenip ayarları girilmezse hata verir", () => {
  assert.throws(
    () =>
      calculateContainer({
        genislikMm: 2438,
        uzunlukMm: 6058,
        katYuksekligiMm: 2591,
        katSayisi: 1,
        duvarlar: duvarSeti(),
        catiVar: true,
      }),
    HesaplamaHatasi
  );
});

test("konteyner: çatı hatası konteyner seviyesinde 'Çatı' önekiyle fırlatılır", () => {
  assert.throws(
    () =>
      calculateContainer({
        genislikMm: 2438,
        uzunlukMm: 6058,
        katYuksekligiMm: 2591,
        katSayisi: 1,
        duvarlar: duvarSeti(),
        catiVar: true,
        cati: cati({ ustBaslikProfilKey: "" }),
      }),
    (err: unknown) => err instanceof HesaplamaHatasi && err.message.startsWith("Çatı:")
  );
});
