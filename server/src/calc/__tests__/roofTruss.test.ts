import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateRoofTruss } from "../roofTruss";
import { HesaplamaHatasi } from "../units";

test("çatı kafesi: temel hesap doğru (Pisagor + kafes sayısı)", () => {
  const sonuc = calculateRoofTruss({
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
    kralKirisiProfilKey: "kral",
  });

  // yarı açıklık 3000, mahya yüksekliği = 3000*0.30 = 900
  assert.equal(sonuc.ozetDegerler.mahyaYuksekligiMm, 900);
  // üst başlık = sqrt(3000^2 + 900^2) ≈ 3132.09
  assert.equal(sonuc.ozetDegerler.ustBaslikUzunlukMm, 3132);

  // 9000/900 = 10 aralık -> 11 kafes
  assert.equal(sonuc.ozetDegerler.araliklarSayisi, 10);
  assert.equal(sonuc.ozetDegerler.kafesSayisi, 11);

  const ustBaslik = sonuc.parcalar.find((p) => p.label === "Üst başlık")!;
  assert.equal(ustBaslik.adet, 22); // 2 * 11

  const altBaslik = sonuc.parcalar.find((p) => p.label === "Alt başlık")!;
  assert.equal(altBaslik.uzunlukMm, 6000);
  assert.equal(altBaslik.adet, 11);

  const kralKirisi = sonuc.parcalar.find((p) => p.label === "Kral kirişi")!;
  assert.equal(kralKirisi.uzunlukMm, 900);
  assert.equal(kralKirisi.adet, 11);

  // Her kafes 2 mesnet noktası, plaka başına 4 ankraj
  assert.equal(sonuc.sacKalemleri[0].adet, 22);
  assert.equal(sonuc.baglantiKalemleri[0].adet, 88);
});

test("çatı kafesi: aşık profili verilirse aşık sıraları hesaplanır", () => {
  const sonuc = calculateRoofTruss({
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
    asikProfilKey: "asik",
    asikAraligiHedefMm: 1000,
  });

  // üst başlık ≈ 3132mm, bir yamaçta ceil(3132/1000)+1 = 5 sıra, iki yamaç = 10
  assert.equal(sonuc.ozetDegerler.asikSatirSayisi, 10);

  const asik = sonuc.parcalar.find((p) => p.label === "Aşık")!;
  assert.equal(asik.uzunlukMm, 9000);
  assert.equal(asik.adet, 10);
});

test("çatı kafesi: aşık profili verilmezse aşık parçası oluşmaz", () => {
  const sonuc = calculateRoofTruss({
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
  });
  assert.ok(!sonuc.parcalar.some((p) => p.label === "Aşık"));
  assert.equal(sonuc.ozetDegerler.asikSatirSayisi, 0);
});

test("çatı kafesi: varsayılan kaplama (trapez sac) sac kalemi ekler", () => {
  const sonuc = calculateRoofTruss({
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
  });
  const kaplama = sonuc.sacKalemleri.find((s) => s.label.includes("kaplaması"))!;
  assert.ok(kaplama);
  assert.equal(kaplama.enMm, 1000); // trapez sac faydalı panel genişliği
  assert.equal(kaplama.boyMm, 3133);
  assert.equal(kaplama.adet, 18); // 9 panel (9000/1000) x 2 yamaç
  assert.equal(sonuc.ozetDegerler.kaplamaFireYuzde, 8); // trapez sac tipik fire oranı
  assert.equal(kaplama.materialKey, undefined); // malzeme seçilmediyse bağlanmaz
});

test("çatı kafesi: kaplamaMalzemeKey verilirse kaplama sac kalemine materialKey olarak yansır", () => {
  const sonuc = calculateRoofTruss({
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
    kaplamaMalzemeKey: "42",
  });
  const kaplama = sonuc.sacKalemleri.find((s) => s.label.includes("kaplaması"))!;
  assert.equal(kaplama.materialKey, "42");
});

test("çatı kafesi: kaplamaTuru 'yok' verilirse sac kalemi eklenmez", () => {
  const sonuc = calculateRoofTruss({
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
    kaplamaTuru: "yok",
  });
  assert.ok(!sonuc.sacKalemleri.some((s) => s.label.includes("kaplaması")));
});

test("çatı kafesi: diyagonal profili verilirse tam zikzak ağı otomatik panel sayısıyla hesaplanır", () => {
  const sonuc = calculateRoofTruss({
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
    diyagonalProfilKey: "diyagonal",
  });
  // yarıAçıklık 3000 / hedef panel 900 -> round(3.33) -> 3 panel
  assert.equal(sonuc.ozetDegerler.diyagonalPanelSayisi, 3);

  const caprazlar = sonuc.parcalar.find((p) => p.label === "Çapraz destek (diyagonal ağ)")!;
  assert.ok(caprazlar);
  // 4 panel-segmenti/panel x 3 panel x 11 kafes
  assert.equal(caprazlar.adet, 132);
  assert.equal(caprazlar.uzunlukMm, 1128);
});

test("çatı kafesi: diyagonalSayisi verilirse panel sayısını (yaklaşık /4) geçersiz kılar", () => {
  const sonuc = calculateRoofTruss({
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
    diyagonalProfilKey: "diyagonal",
    diyagonalSayisi: 8,
  });
  assert.equal(sonuc.ozetDegerler.diyagonalPanelSayisi, 2);
});

test("çatı kafesi: direkler tek tek, artan yükseklik ve doğru konumla listelenir", () => {
  const sonuc = calculateRoofTruss({
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
    direkSayisi: 3,
    direkProfilKey: "direk",
  });

  const direk1 = sonuc.parcalar.find((p) => p.label === "Direk 1")!;
  const direk2 = sonuc.parcalar.find((p) => p.label === "Direk 2")!;
  const direk3 = sonuc.parcalar.find((p) => p.label === "Direk 3")!;
  assert.equal(direk1.uzunlukMm, 225);
  assert.equal(direk2.uzunlukMm, 450);
  assert.equal(direk3.uzunlukMm, 675);
  assert.ok(direk1.not?.includes("750"));
  assert.ok(direk2.not?.includes("1500"));
  assert.ok(direk3.not?.includes("2250"));
  assert.equal(direk1.adet, 22); // 2 yamaç x 11 kafes

  // direk varsa diyagonal panel sayısı direkSayisi+1 ile birebir aynı olmalı
  assert.equal(sonuc.ozetDegerler.direkSayisi, 3);
  assert.equal(sonuc.ozetDegerler.direkAralikMm, 750);
});

test("çatı kafesi: direk sayısı girilip profili girilmezse hata verir", () => {
  assert.throws(
    () =>
      calculateRoofTruss({
        acikligMm: 6000,
        egimYuzde: 30,
        catiUzunluguMm: 9000,
        kafesAraligiHedefMm: 900,
        ustBaslikProfilKey: "ust",
        altBaslikProfilKey: "alt",
        direkSayisi: 3,
      }),
    HesaplamaHatasi
  );
});

test("çatı kafesi: direk varsa diyagonal panel sayısı direk konumlarıyla birebir eşleşir", () => {
  const sonuc = calculateRoofTruss({
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
    direkSayisi: 3,
    direkProfilKey: "direk",
    diyagonalProfilKey: "diyagonal",
  });
  assert.equal(sonuc.ozetDegerler.diyagonalPanelSayisi, 4); // direkSayisi + 1
});

test("çatı kafesi: oluklu ise üst başlık oluk mesafesi kadar kısalır", () => {
  const sonuc = calculateRoofTruss({
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
    olukluMu: true,
    olukMesafesiMm: 300,
  });
  const ustBaslik = sonuc.parcalar.find((p) => p.label === "Üst başlık")!;
  assert.equal(ustBaslik.uzunlukMm, 2833);
});

test("çatı kafesi: oluksuz ise üst başlık çıkma payı kadar uzar", () => {
  const sonuc = calculateRoofTruss({
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
    cikmaPayiMm: 400,
  });
  const ustBaslik = sonuc.parcalar.find((p) => p.label === "Üst başlık")!;
  assert.equal(ustBaslik.uzunlukMm, 3533);
});

test("çatı kafesi: oluk mesafesi üst başlıktan büyükse hata verir", () => {
  assert.throws(
    () =>
      calculateRoofTruss({
        acikligMm: 6000,
        egimYuzde: 30,
        catiUzunluguMm: 9000,
        kafesAraligiHedefMm: 900,
        ustBaslikProfilKey: "ust",
        altBaslikProfilKey: "alt",
        olukluMu: true,
        olukMesafesiMm: 5000,
      }),
    HesaplamaHatasi
  );
});

test("çatı kafesi: diyagonal sayısı girilip profili girilmezse hata verir", () => {
  assert.throws(
    () =>
      calculateRoofTruss({
        acikligMm: 6000,
        egimYuzde: 30,
        catiUzunluguMm: 9000,
        kafesAraligiHedefMm: 900,
        ustBaslikProfilKey: "ust",
        altBaslikProfilKey: "alt",
        diyagonalSayisi: 2,
      }),
    HesaplamaHatasi
  );
});

test("çatı kafesi: geniş açıklıkta diyagonal yoksa uyarı üretir", () => {
  const sonuc = calculateRoofTruss({
    acikligMm: 10000,
    egimYuzde: 30,
    catiUzunluguMm: 5000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
  });
  assert.ok(sonuc.uyarilar.some((u) => u.includes("çapraz")));
});

test("çatı kafesi: sandviç panel kaplaması kendi varsayılan kalınlığını kullanır", () => {
  const sonuc = calculateRoofTruss({
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
    kaplamaTuru: "sandvic_panel",
  });
  const kaplama = sonuc.sacKalemleri.find((s) => s.label.includes("kaplaması"))!;
  assert.ok(kaplama.label.includes("sandviç panel"));
  assert.equal(kaplama.kalinlikMm, 40);
});

test("çatı kafesi: stabilite bağlantısı ilk açıklıkta yatay+düşey çapraz ekler", () => {
  const sonuc = calculateRoofTruss({
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
    stabiliteBaglantisiVar: true,
    stabiliteProfilKey: "L50",
  });

  const yatay = sonuc.parcalar.find((p) => p.label === "Stabilite bağlantısı (yatay)")!;
  assert.ok(yatay);
  assert.equal(yatay.uzunlukMm, 3259);
  assert.equal(yatay.adet, 4);

  const dusey = sonuc.parcalar.find((p) => p.label === "Stabilite bağlantısı (düşey)")!;
  assert.ok(dusey);
  assert.equal(dusey.uzunlukMm, 1273);
  assert.equal(dusey.adet, 2);
});

test("çatı kafesi: stabilite bağlantısı seçilip profili girilmezse hata verir", () => {
  assert.throws(
    () =>
      calculateRoofTruss({
        acikligMm: 6000,
        egimYuzde: 30,
        catiUzunluguMm: 9000,
        kafesAraligiHedefMm: 900,
        ustBaslikProfilKey: "ust",
        altBaslikProfilKey: "alt",
        stabiliteBaglantisiVar: true,
      }),
    HesaplamaHatasi
  );
});

test("çatı kafesi: geçersiz girdilerde hata fırlatır", () => {
  assert.throws(
    () =>
      calculateRoofTruss({
        acikligMm: -1,
        egimYuzde: 30,
        catiUzunluguMm: 9000,
        kafesAraligiHedefMm: 900,
        ustBaslikProfilKey: "ust",
        altBaslikProfilKey: "alt",
      }),
    HesaplamaHatasi
  );
});

test("çatı kafesi: çatı uzunluğu panel genişliğine tam bölünmezse ekstra yuvarlama firesi eklenir", () => {
  const sonuc = calculateRoofTruss({
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9200, // 1000mm panel ile tam bölünmüyor -> 10 panel gerekir (9000 değil)
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
  });
  const kaplama = sonuc.sacKalemleri.find((s) => s.label.includes("kaplaması"))!;
  assert.equal(kaplama.adet, 20); // 10 panel x 2 yamaç
  assert.ok(sonuc.ozetDegerler.kaplamaFireYuzde > 8); // yuvarlama firesi, tipik %8'in üzerinde
});

test("çatı kafesi: elle ayarlanmış kafesSayisiOverride otomatik hedef aralığı yerine geçer", () => {
  const sonuc = calculateRoofTruss({
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900, // otomatik hesapla 11 kafes verirdi
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
    kafesSayisiOverride: 7,
  });

  assert.equal(sonuc.ozetDegerler.kafesSayisi, 7);
  assert.equal(sonuc.ozetDegerler.araliklarSayisi, 6);
  assert.equal(sonuc.ozetDegerler.gercekAralikMm, 1500); // 9000/6

  const altBaslik = sonuc.parcalar.find((p) => p.label === "Alt başlık")!;
  assert.equal(altBaslik.adet, 7);
});

test("çatı tipi: catiTipi verilmezse varsayılan 'acik_besik' ile aynı sonucu üretir", () => {
  const girdiOrtak = {
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
  };
  const varsayilan = calculateRoofTruss(girdiOrtak);
  const acikca = calculateRoofTruss({ ...girdiOrtak, catiTipi: "acik_besik" as const });
  assert.deepEqual(varsayilan.ozetDegerler, acikca.ozetDegerler);
  assert.deepEqual(varsayilan.parcalar, acikca.parcalar);
});

test("çatı tipi 'duz': eğim yok sayılır, tek yüzey (mahya yok)", () => {
  const sonuc = calculateRoofTruss({
    catiTipi: "duz",
    acikligMm: 6000,
    egimYuzde: 30, // yok sayılmalı
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
  });

  assert.equal(sonuc.ozetDegerler.mahyaYuksekligiMm, 0);
  assert.equal(sonuc.ozetDegerler.egimDerece, 0);
  // Tek yüzey: üst başlık uzunluğu doğrudan açıklığa eşit.
  assert.equal(sonuc.ozetDegerler.ustBaslikUzunlukMm, 6000);
  // Tek yamaç -> çatı alanı = açıklık x uzunluk (iki eğimli gibi 2 katı değil).
  assert.equal(sonuc.ozetDegerler.catiAlaniM2, 54);

  const ustBaslik = sonuc.parcalar.find((p) => p.label === "Üst başlık")!;
  assert.equal(ustBaslik.adet, 11); // 1 yamaç x 11 kafes (2 değil)

  assert.ok(sonuc.uyarilar.some((u) => u.includes("eğim dikkate alınmaz")));
});

test("çatı tipi 'sundurma': tek eğimli, açıklığın tamamı tek yamaç", () => {
  const sonuc = calculateRoofTruss({
    catiTipi: "sundurma",
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
    kralKirisiProfilKey: "kral",
  });

  // Tam açıklık (6000) x eğim (%30) üzerinden hesaplanan yükseklik.
  assert.equal(sonuc.ozetDegerler.mahyaYuksekligiMm, 1800);
  const beklenenUstBaslik = Math.round(Math.sqrt(6000 ** 2 + 1800 ** 2));
  assert.equal(sonuc.ozetDegerler.ustBaslikUzunlukMm, beklenenUstBaslik);

  const ustBaslik = sonuc.parcalar.find((p) => p.label === "Üst başlık")!;
  assert.equal(ustBaslik.adet, 11); // 1 yamaç x 11 kafes

  // Mahya yerine "yüksek uç dikmesi" olarak etiketlenmeli.
  assert.ok(sonuc.parcalar.some((p) => p.label === "Yüksek uç dikmesi"));
  assert.ok(!sonuc.parcalar.some((p) => p.label === "Kral kirişi"));
});

test("çatı tipi 'catikati': diz duvarı (kneewall) dikmesi ek parça olarak eklenir", () => {
  const sonuc = calculateRoofTruss({
    catiTipi: "catikati",
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
    dikmeYuksekligiMm: 900,
    dikmeDuvarProfilKey: "dizduvari",
  });

  const dizDuvari = sonuc.parcalar.find((p) => p.label === "Çatı katı diz duvarı dikmesi")!;
  assert.ok(dizDuvari);
  assert.equal(dizDuvari.uzunlukMm, 900);
  assert.equal(dizDuvari.adet, 22); // 2 yamaç x 11 kafes (açık beşik gibi iki eğimli)
  assert.equal(dizDuvari.profilKey, "dizduvari");

  // Geometri açık beşik ile aynı kalmalı (sadece ek diz duvarı eklendi).
  assert.equal(sonuc.ozetDegerler.mahyaYuksekligiMm, 900);
});

test("çatı tipi 'catikati': diz duvarı yüksekliği girilip profili verilmezse hata fırlatır", () => {
  assert.throws(
    () =>
      calculateRoofTruss({
        catiTipi: "catikati",
        acikligMm: 6000,
        egimYuzde: 30,
        catiUzunluguMm: 9000,
        kafesAraligiHedefMm: 900,
        ustBaslikProfilKey: "ust",
        altBaslikProfilKey: "alt",
        dikmeYuksekligiMm: 900,
      }),
    HesaplamaHatasi
  );
});

test("çatı tipi 'kirma': köşe kırma kirişleri ve ara dikmeler (jack rafter) eklenir", () => {
  const sonuc = calculateRoofTruss({
    catiTipi: "kirma",
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
  });

  const kirmaKirisi = sonuc.parcalar.find((p) => p.label === "Kırma (pah) kirişi")!;
  assert.ok(kirmaKirisi);
  assert.equal(kirmaKirisi.adet, 4);
  const beklenenKirmaUzunluk = Math.ceil(Math.sqrt(2 * 3000 ** 2 + 900 ** 2));
  assert.equal(kirmaKirisi.uzunlukMm, beklenenKirmaUzunluk);
  assert.equal(kirmaKirisi.profilKey, "ust"); // verilmezse üst başlık profili kullanılır

  const jackRafter = sonuc.parcalar.find((p) => p.label.includes("jack rafter"))!;
  assert.ok(jackRafter);
  assert.equal(jackRafter.adet, 6);
});

test("çatı tipi 'kirma': çatı uzunluğu açıklıktan küçük/eşitse hata fırlatır", () => {
  assert.throws(
    () =>
      calculateRoofTruss({
        catiTipi: "kirma",
        acikligMm: 6000,
        egimYuzde: 30,
        catiUzunluguMm: 6000, // açıklığa eşit, kırma başları için yer yok
        kafesAraligiHedefMm: 900,
        ustBaslikProfilKey: "ust",
        altBaslikProfilKey: "alt",
      }),
    HesaplamaHatasi
  );
});

test("çatı kafesi: alt başlık profili verilmezse alt başlık parçası eklenmez, hata fırlatmaz", () => {
  const sonuc = calculateRoofTruss({
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
  });

  assert.ok(!sonuc.parcalar.some((p) => p.label === "Alt başlık"));
  assert.ok(sonuc.parcalar.some((p) => p.label === "Üst başlık"));
});

test("çatı kafesi: üst başlık profili verilmezse hata fırlatır", () => {
  assert.throws(
    () =>
      calculateRoofTruss({
        acikligMm: 6000,
        egimYuzde: 30,
        catiUzunluguMm: 9000,
        kafesAraligiHedefMm: 900,
        ustBaslikProfilKey: "",
      }),
    HesaplamaHatasi
  );
});

test("çatı kafesi: kafesPozisyonlariOverrideMm verilirse elle yerleştirilen pozisyonlar aynen kullanılır", () => {
  const sonuc = calculateRoofTruss({
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 3000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    altBaslikProfilKey: "alt",
    kafesPozisyonlariOverrideMm: [0, 1000, 2000, 3000], // eşit aralıklı değil (900 hedefine göre), elle yerleştirilmiş
  });

  assert.equal(sonuc.ozetDegerler.kafesSayisi, 4);
  const altBaslik = sonuc.parcalar.find((p) => p.label === "Alt başlık")!;
  assert.equal(altBaslik.adet, 4);
  // Uçlarda kafes var, en büyük boşluk (1000mm) hedefin (900mm) %150'sini (1350mm) aşmıyor -> uyarı yok.
  assert.equal(sonuc.uyarilar.length, 0);
});

test("çatı kafesi: kafesPozisyonlariOverrideMm ile uç boşluğu/aşırı aralık uyarısı verir", () => {
  const sonuc = calculateRoofTruss({
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    kafesPozisyonlariOverrideMm: [500, 3000, 9000], // sol uçta kafes yok + 2500mm boşluk (900*1.5=1350 sınırını aşıyor)
  });

  assert.ok(sonuc.uyarilar.some((u) => u.includes("bir ucunda kafes yok")));
  assert.ok(sonuc.uyarilar.some((u) => u.includes("boşluk var")));
});

test("çatı kafesi: kafesPozisyonlariOverrideMm tekrarlı/sırasız pozisyonları temizler", () => {
  const sonuc = calculateRoofTruss({
    acikligMm: 6000,
    egimYuzde: 30,
    catiUzunluguMm: 9000,
    kafesAraligiHedefMm: 900,
    ustBaslikProfilKey: "ust",
    kafesPozisyonlariOverrideMm: [9000, 0, 4500, 0, 4500.4], // sırasız + yakın tekrar (yuvarlanınca eşit)
  });

  assert.equal(sonuc.ozetDegerler.kafesSayisi, 3); // 0, 4500 (veya 4500.4->4500), 9000
});
