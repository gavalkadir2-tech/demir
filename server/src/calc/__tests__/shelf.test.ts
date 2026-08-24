import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateShelf } from "../shelf";
import { HesaplamaHatasi } from "../units";

test("raf: temel hesap doğru (4 ayak, N seviye çerçeve)", () => {
  const sonuc = calculateShelf({
    genislikMm: 1000,
    derinlikMm: 400,
    yukseklikMm: 1800,
    rafSayisi: 4,
    ayakProfilKey: "ayak",
    rafCercevesiProfilKey: "cerceve",
  });

  const ayak = sonuc.parcalar.find((p) => p.label === "Dikme (ayak)")!;
  assert.equal(ayak.uzunlukMm, 1800);
  assert.equal(ayak.adet, 4);

  const genislikCerceve = sonuc.parcalar.find((p) => p.label === "Raf çerçevesi (genişlik yönü)")!;
  assert.equal(genislikCerceve.uzunlukMm, 1000);
  assert.equal(genislikCerceve.adet, 8); // 2 * 4 raf

  const derinlikCerceve = sonuc.parcalar.find((p) => p.label === "Raf çerçevesi (derinlik yönü)")!;
  assert.equal(derinlikCerceve.uzunlukMm, 400);
  assert.equal(derinlikCerceve.adet, 8);

  // 1800 / (4-1) = 600
  assert.equal(sonuc.ozetDegerler.rafAraligiMm, 600);
  assert.equal(sonuc.ozetDegerler.rafSayisi, 4);
  assert.equal(sonuc.ozetDegerler.tabanAlaniM2, 0.4);
  assert.equal(sonuc.ozetDegerler.toplamRafAlaniM2, 1.6); // 0.4 * 4
});

test("raf: varsayılan olarak sac raf plakası eklenir", () => {
  const sonuc = calculateShelf({
    genislikMm: 1000,
    derinlikMm: 400,
    yukseklikMm: 1800,
    rafSayisi: 3,
    ayakProfilKey: "ayak",
    rafCercevesiProfilKey: "cerceve",
  });
  const sac = sonuc.sacKalemleri.find((s) => s.label === "Raf plakası")!;
  assert.ok(sac);
  assert.equal(sac.adet, 3);
  assert.equal(sac.enMm, 1000);
  assert.equal(sac.boyMm, 400);
});

test("raf: rafSacKullan false ise sac eklenmez", () => {
  const sonuc = calculateShelf({
    genislikMm: 1000,
    derinlikMm: 400,
    yukseklikMm: 1800,
    rafSayisi: 3,
    ayakProfilKey: "ayak",
    rafCercevesiProfilKey: "cerceve",
    rafSacKullan: false,
  });
  assert.equal(sonuc.sacKalemleri.length, 0);
});

test("raf: çapraz profili verilirse arka stabilite çaprazı eklenir", () => {
  const sonuc = calculateShelf({
    genislikMm: 1000,
    derinlikMm: 400,
    yukseklikMm: 1800,
    rafSayisi: 3,
    ayakProfilKey: "ayak",
    rafCercevesiProfilKey: "cerceve",
    caprazProfilKey: "capraz",
  });
  const capraz = sonuc.parcalar.find((p) => p.label === "Çapraz (arka stabilite)")!;
  assert.ok(capraz);
  // sqrt(1800^2 + 1000^2) = 2059.13 -> ceil 2060
  assert.equal(capraz.uzunlukMm, 2060);
  assert.equal(capraz.adet, 2);
});

test("raf: raf sayısı 2'den azsa hata verir", () => {
  assert.throws(
    () =>
      calculateShelf({
        genislikMm: 1000,
        derinlikMm: 400,
        yukseklikMm: 1800,
        rafSayisi: 1,
        ayakProfilKey: "ayak",
        rafCercevesiProfilKey: "cerceve",
      }),
    HesaplamaHatasi
  );
});

test("raf: profil seçilmezse hata verir", () => {
  assert.throws(
    () =>
      calculateShelf({
        genislikMm: 1000,
        derinlikMm: 400,
        yukseklikMm: 1800,
        rafSayisi: 3,
        ayakProfilKey: "",
        rafCercevesiProfilKey: "cerceve",
      }),
    HesaplamaHatasi
  );
});

test("raf: geçersiz ölçülerde hata verir", () => {
  assert.throws(
    () =>
      calculateShelf({
        genislikMm: -100,
        derinlikMm: 400,
        yukseklikMm: 1800,
        rafSayisi: 3,
        ayakProfilKey: "ayak",
        rafCercevesiProfilKey: "cerceve",
      }),
    HesaplamaHatasi
  );
});
