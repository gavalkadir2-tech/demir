import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateContainer } from "../container";
import { HesaplamaHatasi } from "../units";

test("konteyner: temel hesap (boşluksuz, kaplamasız, tek kat) doğru", () => {
  const sonuc = calculateContainer({
    genislikMm: 2438,
    uzunlukMm: 6058,
    katYuksekligiMm: 2591,
    katSayisi: 1,
  });

  assert.equal(sonuc.parcalar.length, 0);
  assert.equal(sonuc.ozetDegerler.pencereSayisi, 0);
  assert.equal(sonuc.ozetDegerler.kapiSayisi, 0);
  assert.equal(sonuc.ozetDegerler.toplamBoslukSayisi, 0);
  assert.equal(sonuc.ozetDegerler.tabanAlaniM2, Math.round((2438 / 1000) * (6058 / 1000) * 100) / 100);
  assert.equal(sonuc.ozetDegerler.toplamAlanM2, sonuc.ozetDegerler.tabanAlaniM2);
});

test("konteyner: pencere/kapı boşluk çerçevesi doğru hesaplanıyor", () => {
  const sonuc = calculateContainer({
    genislikMm: 2438,
    uzunlukMm: 6058,
    katYuksekligiMm: 2591,
    katSayisi: 1,
    cerceveProfilKey: "40x40x2",
    cerceveTasmaMm: 50,
    bosluklar: [
      { etiket: "Pencere 1", tipi: "pencere", katNo: 1, konumMm: 500, genislikMm: 1000, yukseklikMm: 1200, tabanYuksekligiMm: 900 },
      { etiket: "Giriş Kapısı", tipi: "kapi", katNo: 1, konumMm: 3000, genislikMm: 900, yukseklikMm: 2000 },
    ],
  });

  assert.equal(sonuc.ozetDegerler.pencereSayisi, 1);
  assert.equal(sonuc.ozetDegerler.kapiSayisi, 1);
  assert.equal(sonuc.ozetDegerler.toplamBoslukSayisi, 2);

  const pencereUstAlt = sonuc.parcalar.find((p) => p.label === "Boşluk çerçevesi (üst+alt) - Pencere 1")!;
  assert.equal(pencereUstAlt.uzunlukMm, 1000 + 2 * 50);
  assert.equal(pencereUstAlt.adet, 2);

  const pencereYan = sonuc.parcalar.find((p) => p.label === "Boşluk çerçevesi (sol+sağ) - Pencere 1")!;
  assert.equal(pencereYan.uzunlukMm, 1200 + 2 * 50);
  assert.equal(pencereYan.adet, 2);

  const kapiUstAlt = sonuc.parcalar.find((p) => p.label === "Boşluk çerçevesi (üst+alt) - Giriş Kapısı")!;
  assert.equal(kapiUstAlt.uzunlukMm, 900 + 2 * 50);
});

test("konteyner: boşluk eklenip çerçeve profili seçilmezse hata verir", () => {
  assert.throws(
    () =>
      calculateContainer({
        genislikMm: 2438,
        uzunlukMm: 6058,
        katYuksekligiMm: 2591,
        katSayisi: 1,
        bosluklar: [{ etiket: "Pencere 1", tipi: "pencere", katNo: 1, konumMm: 500, genislikMm: 1000, yukseklikMm: 1200, tabanYuksekligiMm: 900 }],
      }),
    HesaplamaHatasi
  );
});

test("konteyner: boşluklar çakışırsa hata verir", () => {
  assert.throws(
    () =>
      calculateContainer({
        genislikMm: 2438,
        uzunlukMm: 6058,
        katYuksekligiMm: 2591,
        katSayisi: 1,
        cerceveProfilKey: "40x40x2",
        bosluklar: [
          { etiket: "Pencere 1", tipi: "pencere", katNo: 1, konumMm: 500, genislikMm: 1000, yukseklikMm: 1200, tabanYuksekligiMm: 900 },
          { etiket: "Pencere 2", tipi: "pencere", katNo: 1, konumMm: 1200, genislikMm: 800, yukseklikMm: 1200, tabanYuksekligiMm: 900 },
        ],
      }),
    HesaplamaHatasi
  );
});

test("konteyner: 2. kata boşluk eklenip kat sayısı 1 ise hata verir", () => {
  assert.throws(
    () =>
      calculateContainer({
        genislikMm: 2438,
        uzunlukMm: 6058,
        katYuksekligiMm: 2591,
        katSayisi: 1,
        cerceveProfilKey: "40x40x2",
        bosluklar: [{ etiket: "Pencere 1", tipi: "pencere", katNo: 2, konumMm: 500, genislikMm: 1000, yukseklikMm: 1200, tabanYuksekligiMm: 900 }],
      }),
    HesaplamaHatasi
  );
});

test("konteyner: dış kaplama alanı ve panel sayısı doğru hesaplanıyor", () => {
  const sonuc = calculateContainer({
    genislikMm: 2438,
    uzunlukMm: 6058,
    katYuksekligiMm: 2591,
    katSayisi: 2,
    kaplamaTuru: "trapez_sac",
  });

  const kaplama = sonuc.sacKalemleri.find((s) => s.label.includes("kaplaması"))!;
  const toplamYukseklikMm = 2591 * 2;
  const cevreMm = 2 * (2438 + 6058);
  const netAlanM2 = (toplamYukseklikMm / 1000) * (cevreMm / 1000);
  assert.ok(Math.abs(sonuc.ozetDegerler.kaplamaSiparisAlaniM2 - netAlanM2) < netAlanM2 * 0.15); // fire payı dahil, makul aralıkta
  assert.ok(kaplama.adet > 0);
});

test("konteyner: 2 katlı + merdiven + platform korkuluğu + 2. kat iskeleti birlikte doğru birleşiyor", () => {
  const sonuc = calculateContainer({
    genislikMm: 2438,
    uzunlukMm: 6058,
    katYuksekligiMm: 2591,
    katSayisi: 2,
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
      }),
    HesaplamaHatasi
  );
});
