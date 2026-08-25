import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateSteelFrame } from "../steelFrame";
import { HesaplamaHatasi } from "../units";

test("kolon-kiriş: tek açıklıklı temel hesap doğru", () => {
  const sonuc = calculateSteelFrame({
    acikligMm: 6000,
    uzunlukMm: 9000,
    yukseklikMm: 3000,
    kolonProfilKey: "kolon",
    kirisProfilKey: "kiris",
  });

  // 9000/3000 = 3 aralık -> 4 çerçeve
  assert.equal(sonuc.ozetDegerler.cerceveSayisi, 4);
  assert.equal(sonuc.ozetDegerler.kolonSayisiPerCerceve, 2); // acikSayisi=1 -> 2 kolon
  assert.equal(sonuc.ozetDegerler.kolonToplamAdet, 8);

  const kolon = sonuc.parcalar.find((p) => p.label === "Kolon")!;
  assert.equal(kolon.adet, 8);
  assert.equal(kolon.uzunlukMm, 3000);

  const kiris = sonuc.parcalar.find((p) => p.label.includes("Kiriş"))!;
  assert.equal(kiris.adet, 4); // cerceveSayisi(4) * acikSayisi(1)
  assert.equal(kiris.uzunlukMm, 6000);
});

test("kolon-kiriş: 2 açıklıklı yapıda ara kolon ve ekstra kiriş eklenir", () => {
  const sonuc = calculateSteelFrame({
    acikligMm: 5000,
    uzunlukMm: 9000,
    yukseklikMm: 3000,
    acikSayisi: 2,
    kolonProfilKey: "kolon",
    kirisProfilKey: "kiris",
  });
  assert.equal(sonuc.ozetDegerler.kolonSayisiPerCerceve, 3);
  const kiris = sonuc.parcalar.find((p) => p.label.includes("Kiriş"))!;
  assert.equal(kiris.adet, 4 * 2); // cerceveSayisi(4) * acikSayisi(2)
});

test("kolon-kiriş: bağlantı kirişi verilirse eklenir", () => {
  const sonuc = calculateSteelFrame({
    acikligMm: 6000,
    uzunlukMm: 9000,
    yukseklikMm: 3000,
    kolonProfilKey: "kolon",
    kirisProfilKey: "kiris",
    baglantiKirisiProfilKey: "baglanti",
  });
  const baglanti = sonuc.parcalar.find((p) => p.label.includes("Bağlantı kirişi"))!;
  assert.equal(baglanti.adet, 2); // kolonSayisiPerCerceve
  assert.equal(baglanti.uzunlukMm, 9000);
});

test("kolon-kiriş: stabilite çaprazı verilirse eklenir", () => {
  const sonuc = calculateSteelFrame({
    acikligMm: 6000,
    uzunlukMm: 9000,
    yukseklikMm: 3000,
    kolonProfilKey: "kolon",
    kirisProfilKey: "kiris",
    stabiliteBaglantisiVar: true,
    stabiliteProfilKey: "capraz",
  });
  const capraz = sonuc.parcalar.find((p) => p.label.includes("Stabilite çaprazı"))!;
  assert.equal(capraz.adet, 2);
  // sqrt(6000^2+3000^2) = 6708
  assert.equal(capraz.uzunlukMm, 6709);
});

test("kolon-kiriş: stabilite var ama profil seçilmezse hata verir", () => {
  assert.throws(
    () =>
      calculateSteelFrame({
        acikligMm: 6000,
        uzunlukMm: 9000,
        yukseklikMm: 3000,
        kolonProfilKey: "kolon",
        kirisProfilKey: "kiris",
        stabiliteBaglantisiVar: true,
      }),
    HesaplamaHatasi
  );
});

test("kolon-kiriş: taban plakası ve ankraj kolon sayısına göre hesaplanır", () => {
  const sonuc = calculateSteelFrame({
    acikligMm: 6000,
    uzunlukMm: 9000,
    yukseklikMm: 3000,
    kolonProfilKey: "kolon",
    kirisProfilKey: "kiris",
  });
  const plaka = sonuc.sacKalemleri.find((s) => s.label === "Taban plakası")!;
  assert.equal(plaka.adet, 8);
  const ankraj = sonuc.baglantiKalemleri.find((b) => b.label.includes("Ankraj"))!;
  assert.equal(ankraj.adet, 32); // 8 kolon x 4 ankraj
});

test("kolon-kiriş: geçersiz girdilerde hata fırlatır", () => {
  assert.throws(
    () =>
      calculateSteelFrame({
        acikligMm: 0,
        uzunlukMm: 9000,
        yukseklikMm: 3000,
        kolonProfilKey: "kolon",
        kirisProfilKey: "kiris",
      }),
    HesaplamaHatasi
  );
  assert.throws(
    () =>
      calculateSteelFrame({
        acikligMm: 6000,
        uzunlukMm: 9000,
        yukseklikMm: 3000,
        kolonProfilKey: "",
        kirisProfilKey: "kiris",
      }),
    HesaplamaHatasi
  );
});
