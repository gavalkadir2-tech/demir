import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateFerforjePanel } from "../ferforjePanel";
import { HesaplamaHatasi } from "../units";

test("ferforje panel: temel hesap doğru (çerçeve + dikey çubuk)", () => {
  const sonuc = calculateFerforjePanel({
    genislikMm: 1200,
    yukseklikMm: 1500,
    cerceveProfilKey: "cerceve",
    dikeyCubukProfilKey: "cubuk",
  });

  const cerceveYatay = sonuc.parcalar.find((p) => p.label === "Çerçeve (üst + alt)")!;
  assert.equal(cerceveYatay.adet, 2);
  assert.equal(cerceveYatay.uzunlukMm, 1200);

  const cerceveDikey = sonuc.parcalar.find((p) => p.label === "Çerçeve (sol + sağ)")!;
  assert.equal(cerceveDikey.adet, 2);
  assert.equal(cerceveDikey.uzunlukMm, 1500);

  // 1200 / 120 = 10 aralık -> 11 dikey çubuk
  const dikeyCubuk = sonuc.parcalar.find((p) => p.label === "Dikey çubuk")!;
  assert.equal(dikeyCubuk.adet, 11);
  assert.equal(dikeyCubuk.uzunlukMm, 1500);
  assert.equal(sonuc.ozetDegerler.dikeyCubukSayisi, 11);
});

test("ferforje panel: geniş aralıkta güvenlik uyarısı verir", () => {
  const sonuc = calculateFerforjePanel({
    genislikMm: 1200,
    yukseklikMm: 1500,
    cerceveProfilKey: "cerceve",
    dikeyCubukProfilKey: "cubuk",
    dikeyCubukAraligiHedefMm: 300,
  });
  assert.ok(sonuc.uyarilar.some((u) => u.includes("güvenlik")));
});

test("ferforje panel: yatay ara kayıt eklenebilir", () => {
  const sonuc = calculateFerforjePanel({
    genislikMm: 1200,
    yukseklikMm: 1500,
    cerceveProfilKey: "cerceve",
    dikeyCubukProfilKey: "cubuk",
    yatayAraKayitSayisi: 2,
    yatayAraKayitProfilKey: "araKayit",
  });
  const araKayit = sonuc.parcalar.find((p) => p.label === "Yatay ara kayıt")!;
  assert.equal(araKayit.adet, 2);
  assert.equal(araKayit.uzunlukMm, 1200);
});

test("ferforje panel: yatay ara kayıt sayısı girilip profil seçilmezse hata verir", () => {
  assert.throws(
    () =>
      calculateFerforjePanel({
        genislikMm: 1200,
        yukseklikMm: 1500,
        cerceveProfilKey: "cerceve",
        dikeyCubukProfilKey: "cubuk",
        yatayAraKayitSayisi: 2,
      }),
    HesaplamaHatasi
  );
});

test("ferforje panel: süsleme eklenirse kaba malzeme tahmini parçası oluşur", () => {
  const sonuc = calculateFerforjePanel({
    genislikMm: 1200,
    yukseklikMm: 1500,
    cerceveProfilKey: "cerceve",
    dikeyCubukProfilKey: "cubuk",
    susVar: true,
    susProfilKey: "sus",
    susSayisi: 4,
    susBirimUzunlukMm: 350,
  });
  const sus = sonuc.parcalar.find((p) => p.label.includes("Süsleme"))!;
  assert.equal(sus.adet, 4);
  assert.equal(sus.uzunlukMm, 350);
});

test("ferforje panel: süsleme var ama profil/sayı eksikse hata verir", () => {
  assert.throws(
    () =>
      calculateFerforjePanel({
        genislikMm: 1200,
        yukseklikMm: 1500,
        cerceveProfilKey: "cerceve",
        dikeyCubukProfilKey: "cubuk",
        susVar: true,
      }),
    HesaplamaHatasi
  );
});

test("ferforje panel: geçersiz girdilerde hata fırlatır", () => {
  assert.throws(
    () =>
      calculateFerforjePanel({
        genislikMm: 0,
        yukseklikMm: 1500,
        cerceveProfilKey: "cerceve",
        dikeyCubukProfilKey: "cubuk",
      }),
    HesaplamaHatasi
  );
});
