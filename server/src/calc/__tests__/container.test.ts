import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateContainer,
  KonteynerDuvarGirdi,
  KonteynerDuvarSeti,
  KonteynerCatiGirdi,
  KonteynerIcDuvarGirdi,
} from "../container";
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

function icDuvar(overrides: Partial<KonteynerIcDuvarGirdi> = {}): KonteynerIcDuvarGirdi {
  return {
    genislikMm: 2000,
    dikmeAraligiHedefMm: 600,
    ustProfilKey: "40x40x2",
    altProfilKey: "40x40x2",
    dikmeProfilKey: "40x40x2",
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

test("konteyner: iç bölme duvarları eklenirse ayrı parça olarak hesaplanır (tek kat)", () => {
  const sonuc = calculateContainer({
    genislikMm: 2438,
    uzunlukMm: 6058,
    katYuksekligiMm: 2591,
    katSayisi: 1,
    duvarlar: duvarSeti(),
    icDuvarlar: [icDuvar({ genislikMm: 2000 }), icDuvar({ genislikMm: 1500 })],
  });

  assert.ok(sonuc.parcalar.some((p) => p.label === "İç Duvar 1: Dikme"));
  assert.ok(sonuc.parcalar.some((p) => p.label === "İç Duvar 2: Dikme"));
  // Tek kat olduğundan "1. Kat" öneki OLMAMALI.
  assert.ok(!sonuc.parcalar.some((p) => p.label.includes("1. Kat İç Duvar")));
  assert.equal(sonuc.ozetDegerler.icDuvarSayisi, 2);

  const icDuvar1UstRay = sonuc.parcalar.find((p) => p.label === "İç Duvar 1: Üst ray")!;
  assert.equal(icDuvar1UstRay.uzunlukMm, 2000);
});

test("konteyner: iç bölme duvarları 2 katlı konteynerde her katta tekrarlanır", () => {
  const sonuc = calculateContainer({
    genislikMm: 2438,
    uzunlukMm: 6058,
    katYuksekligiMm: 2591,
    katSayisi: 2,
    duvarlar: duvarSeti(),
    icDuvarlar: [icDuvar()],
  });

  assert.ok(sonuc.parcalar.some((p) => p.label === "1. Kat İç Duvar 1: Dikme"));
  assert.ok(sonuc.parcalar.some((p) => p.label === "2. Kat İç Duvar 1: Dikme"));
});

test("konteyner: iç bölme duvarı hatası kendi etiketiyle fırlatılır ve toplam duvar alanına dahil olur", () => {
  assert.throws(
    () =>
      calculateContainer({
        genislikMm: 2438,
        uzunlukMm: 6058,
        katYuksekligiMm: 2591,
        katSayisi: 1,
        duvarlar: duvarSeti(),
        icDuvarlar: [icDuvar({ ustProfilKey: "" })],
      }),
    (err: unknown) => err instanceof HesaplamaHatasi && err.message.startsWith("İç Duvar 1:")
  );

  const sonuc = calculateContainer({
    genislikMm: 2438,
    uzunlukMm: 6058,
    katYuksekligiMm: 2591,
    katSayisi: 1,
    duvarlar: duvarSeti(),
  });
  const sonucIcDuvarli = calculateContainer({
    genislikMm: 2438,
    uzunlukMm: 6058,
    katYuksekligiMm: 2591,
    katSayisi: 1,
    duvarlar: duvarSeti(),
    icDuvarlar: [icDuvar({ genislikMm: 2000 })],
  });
  assert.ok(sonucIcDuvarli.ozetDegerler.toplamDuvarAlaniM2 > sonuc.ozetDegerler.toplamDuvarAlaniM2);
});

test("konteyner: duvar/çatı/iç duvar yalıtım ve malzeme kalemleri doğru materialKey ile ve etiket önekiyle birleşiyor (stok/malzeme raporu için)", () => {
  const sonuc = calculateContainer({
    genislikMm: 2438,
    uzunlukMm: 6058,
    katYuksekligiMm: 2591,
    katSayisi: 1,
    duvarlar: duvarSeti({
      on: { yalitimVar: true, yalitimKalinlikMm: 100, yalitimMalzemeKey: "42" },
    }),
    icDuvarlar: [icDuvar({ yalitimVar: true, yalitimMalzemeKey: "43" })],
    catiVar: true,
    cati: cati(),
  });

  // Ön duvarın yalıtım kalemi, konteyner seviyesinde "Ön Duvar: " önekiyle ve orijinal
  // materialKey'i koruyarak görünmeli - stok düşümü/malzeme ihtiyacı hesabı bu materialKey'i
  // kullanarak Material'a bağlanır (bkz. fastenerMaterialAggregation.ts).
  const onDuvarYalitim = sonuc.baglantiKalemleri.find((k) => k.label === "Ön Duvar: Yalıtım (100 mm)");
  assert.ok(onDuvarYalitim, "Ön duvar yalıtım kalemi eksik");
  assert.equal(onDuvarYalitim!.materialKey, "42");
  assert.equal(onDuvarYalitim!.birim, "m²");

  const icDuvarYalitim = sonuc.baglantiKalemleri.find((k) => k.label === "İç Duvar 1: Yalıtım (50 mm)");
  assert.ok(icDuvarYalitim, "İç duvar yalıtım kalemi eksik");
  assert.equal(icDuvarYalitim!.materialKey, "43");

  // Diğer 3 dış duvarda yalıtım istenmedi - kalem oluşmamalı.
  assert.ok(!sonuc.baglantiKalemleri.some((k) => k.label === "Arka Duvar: Yalıtım (100 mm)"));

  // Çatının kendi malzeme kalemleri (mesnet plakası vb.) de aynı şekilde "Çatı: " önekiyle gelmeli.
  assert.ok(sonuc.baglantiKalemleri.some((k) => k.label.startsWith("Çatı: ")));
});
