import { test } from "node:test";
import assert from "node:assert/strict";
import { calculatePergola } from "../pergola";
import { HesaplamaHatasi } from "../units";

test("pergola: 4 kolonlu temel hesap doğru", () => {
  const sonuc = calculatePergola({
    genislikMm: 4000,
    boyMm: 3000,
    yukseklikMm: 2400,
    kolonSayisi: 4,
    kolonProfilKey: "kolon",
    kirisProfilKey: "kiris",
    lataProfilKey: "lata",
  });

  const kolon = sonuc.parcalar.find((p) => p.label === "Kolon")!;
  assert.equal(kolon.adet, 4);
  assert.equal(kolon.uzunlukMm, 2400);

  const kenarKirisi = sonuc.parcalar.find((p) => p.label.includes("Kenar kirişi"))!;
  assert.equal(kenarKirisi.adet, 2);
  assert.equal(kenarKirisi.uzunlukMm, 4000);

  const baglantiKirisi = sonuc.parcalar.find((p) => p.label.includes("Bağlantı kirişi"))!;
  assert.equal(baglantiKirisi.adet, 2); // kolonSiraAdedi = 4/2 = 2
  assert.equal(baglantiKirisi.uzunlukMm, 3000);

  // Varsayılan lataYonu "genislik": lata uzunluğu genislikMm, boy ekseninde dizilir (3000/200 = 15 aralık -> 16 lata)
  const lata = sonuc.parcalar.find((p) => p.label.includes("Lata"))!;
  assert.equal(lata.uzunlukMm, 4000);
  assert.equal(lata.adet, 16);
  assert.equal(sonuc.ozetDegerler.lataSayisi, 16);
});

test("pergola: lataYonu 'boy' verilirse latalar boy yönünde uzanır", () => {
  const sonuc = calculatePergola({
    genislikMm: 4000,
    boyMm: 3000,
    yukseklikMm: 2400,
    kolonSayisi: 4,
    kolonProfilKey: "kolon",
    kirisProfilKey: "kiris",
    lataProfilKey: "lata",
    lataYonu: "boy",
  });
  const lata = sonuc.parcalar.find((p) => p.label.includes("Lata"))!;
  assert.equal(lata.uzunlukMm, 3000);
  // 4000/200 = 20 aralık -> 21 lata
  assert.equal(lata.adet, 21);
});

test("pergola: 6 kolonlu (ara kolonlu) yapıda bağlantı kirişi 3 adet olur", () => {
  const sonuc = calculatePergola({
    genislikMm: 8000,
    boyMm: 3000,
    yukseklikMm: 2400,
    kolonSayisi: 6,
    kolonProfilKey: "kolon",
    kirisProfilKey: "kiris",
    lataProfilKey: "lata",
  });
  const kolon = sonuc.parcalar.find((p) => p.label === "Kolon")!;
  assert.equal(kolon.adet, 6);
  const baglantiKirisi = sonuc.parcalar.find((p) => p.label.includes("Bağlantı kirişi"))!;
  assert.equal(baglantiKirisi.adet, 3);
  assert.equal(sonuc.ozetDegerler.kolonSiraAdedi, 3);
});

test("pergola: taş plakası ve ankraj kolon sayısına göre hesaplanır", () => {
  const sonuc = calculatePergola({
    genislikMm: 4000,
    boyMm: 3000,
    yukseklikMm: 2400,
    kolonSayisi: 4,
    kolonProfilKey: "kolon",
    kirisProfilKey: "kiris",
    lataProfilKey: "lata",
  });
  const plaka = sonuc.sacKalemleri.find((s) => s.label === "Taban plakası")!;
  assert.equal(plaka.adet, 4);
  const ankraj = sonuc.baglantiKalemleri.find((b) => b.label.includes("Ankraj"))!;
  assert.equal(ankraj.adet, 16); // 4 kolon x 4 ankraj
});

test("pergola: tek sayı kolon sayısında hata verir", () => {
  assert.throws(
    () =>
      calculatePergola({
        genislikMm: 4000,
        boyMm: 3000,
        yukseklikMm: 2400,
        kolonSayisi: 5,
        kolonProfilKey: "kolon",
        kirisProfilKey: "kiris",
        lataProfilKey: "lata",
      }),
    HesaplamaHatasi
  );
});

test("pergola: geçersiz girdilerde hata fırlatır", () => {
  assert.throws(
    () =>
      calculatePergola({
        genislikMm: 0,
        boyMm: 3000,
        yukseklikMm: 2400,
        kolonSayisi: 4,
        kolonProfilKey: "kolon",
        kirisProfilKey: "kiris",
        lataProfilKey: "lata",
      }),
    HesaplamaHatasi
  );
  assert.throws(
    () =>
      calculatePergola({
        genislikMm: 4000,
        boyMm: 3000,
        yukseklikMm: 2400,
        kolonSayisi: 4,
        kolonProfilKey: "",
        kirisProfilKey: "kiris",
        lataProfilKey: "lata",
      }),
    HesaplamaHatasi
  );
});
