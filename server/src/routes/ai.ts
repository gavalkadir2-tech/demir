import { Router } from "express";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { asyncHandler, ApiHatasi } from "../lib/errors";

const router = Router();

const istekSchema = z.object({
  metin: z.string().min(3, "Metin çok kısa.").max(2000, "Metin çok uzun (maks. 2000 karakter)."),
});

const boslukSchema = z.object({
  etiket: z.string(),
  konumMm: z.number(),
  tabanYuksekligiMm: z.number(),
  genislikMm: z.number(),
  yukseklikMm: z.number(),
});

const alanlarSchema = z
  .object({
    // korkuluk (railing)
    toplamUzunlukMm: z.number().nullish(),
    yukseklikMm: z.number().nullish(),
    dikmeAraligiHedefMm: z.number().nullish(),
    araKayitSayisi: z.number().nullish(),
    // merdiven (stairs)
    katYuksekligiMm: z.number().nullish(),
    genislikMm: z.number().nullish(),
    basamakYuksekligiHedefMm: z.number().nullish(),
    basamakDerinligiMm: z.number().nullish(),
    korkulukYuksekligiMm: z.number().nullish(),
    // sundurma (canopy)
    boyMm: z.number().nullish(),
    egimYuzde: z.number().nullish(),
    dikmeSayisi: z.number().nullish(),
    kaplamaTuru: z.enum(["trapez_sac", "polikarbon", "yok"]).nullish(),
    // kapı (door)
    sacKalinlikMm: z.number().nullish(),
    menteseAdet: z.number().nullish(),
    kilitAdet: z.number().nullish(),
    kolAdet: z.number().nullish(),
    // duvar paneli (wall)
    lentoTasmaMm: z.number().nullish(),
    // çatı kafesi (truss)
    acikligMm: z.number().nullish(),
    catiUzunluguMm: z.number().nullish(),
    kafesAraligiHedefMm: z.number().nullish(),
    asikAraligiHedefMm: z.number().nullish(),
    diyagonalSayisi: z.number().nullish(),
  })
  .partial();

const aiCiktiSchema = z.object({
  templateKey: z.enum(["railing", "stairs", "canopy", "door", "wall", "truss"]),
  baslik: z.string(),
  musteriAdiTahmini: z.string().nullish(),
  guven: z.enum(["yuksek", "orta", "dusuk"]),
  belirsizlikler: z.array(z.string()),
  alanlar: alanlarSchema,
  bosluklar: z.array(boslukSchema).nullish(),
});

const SAYI = { type: "number" } as const;

const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    templateKey: { type: "string", enum: ["railing", "stairs", "canopy", "door", "wall", "truss"] },
    baslik: { type: "string" },
    musteriAdiTahmini: { type: "string" },
    guven: { type: "string", enum: ["yuksek", "orta", "dusuk"] },
    belirsizlikler: { type: "array", items: { type: "string" } },
    alanlar: {
      type: "object",
      properties: {
        toplamUzunlukMm: SAYI,
        yukseklikMm: SAYI,
        dikmeAraligiHedefMm: SAYI,
        araKayitSayisi: SAYI,
        katYuksekligiMm: SAYI,
        genislikMm: SAYI,
        basamakYuksekligiHedefMm: SAYI,
        basamakDerinligiMm: SAYI,
        korkulukYuksekligiMm: SAYI,
        boyMm: SAYI,
        egimYuzde: SAYI,
        dikmeSayisi: SAYI,
        kaplamaTuru: { type: "string", enum: ["trapez_sac", "polikarbon", "yok"] },
        sacKalinlikMm: SAYI,
        menteseAdet: SAYI,
        kilitAdet: SAYI,
        kolAdet: SAYI,
        lentoTasmaMm: SAYI,
        acikligMm: SAYI,
        catiUzunluguMm: SAYI,
        kafesAraligiHedefMm: SAYI,
        asikAraligiHedefMm: SAYI,
        diyagonalSayisi: SAYI,
      },
    },
    bosluklar: {
      type: "array",
      items: {
        type: "object",
        properties: {
          etiket: { type: "string" },
          konumMm: SAYI,
          tabanYuksekligiMm: SAYI,
          genislikMm: SAYI,
          yukseklikMm: SAYI,
        },
        required: ["etiket", "konumMm", "tabanYuksekligiMm", "genislikMm", "yukseklikMm"],
      },
    },
  },
  required: ["templateKey", "baslik", "guven", "belirsizlikler", "alanlar"],
};

const SISTEM_PROMPTU = `Sen bir demirci/çelik konstrüksiyon atölyesi için sipariş metni okuyup yapılandırılmış veri çıkaran bir asistansın. Kullanıcı (genellikle teknik olmayan bir usta) yapılacak işi serbest, günlük dille anlatır. Görevin: bu 6 ürün şablonundan hangisine uyduğunu belirlemek ve şablonun ilgili alanlarını doldurmak.

ŞABLONLAR:
1. railing (Korkuluk): Düz, bağımsız bir korkuluk/parmaklık. Alanlar: toplamUzunlukMm, yukseklikMm, dikmeAraligiHedefMm (dikmeler arası hedef mesafe), araKayitSayisi (üst-alt profil arasına eklenen yatay ara çıta sayısı).
2. stairs (Merdiven): Kat yüksekliği boyunca basamaklı merdiven, opsiyonel kendi korkuluğuyla. Alanlar: katYuksekligiMm, genislikMm (merdiven genişliği), basamakYuksekligiHedefMm, basamakDerinligiMm, korkulukYuksekligiMm (merdivenin kendi korkuluğu isteniyorsa).
3. canopy (Sundurma/Kanopi): Bir duvara/yapıya dayalı eğimli çatılı sundurma, örn. araba sundurması, giriş sundurması. Alanlar: genislikMm (en), boyMm (duvardan dışa çıkma/derinlik), yukseklikMm (ön dikme yüksekliği), egimYuzde, dikmeSayisi.
4. door (Kapı): TEK BAŞINA menteşeli/kanatlı bir kapı ürünü (kasa+kanat), bir duvarın parçası değil, kapının kendisi isteniyor. Alanlar: genislikMm, yukseklikMm, sacKalinlikMm, menteseAdet, kilitAdet, kolAdet.
5. wall (Çelik Duvar Paneli): Prefabrik ev/atölye/konteyner gibi yapılarda kullanılan, dikme + üst/alt raydan oluşan düz bir duvar paneli; içinde kapı ve/veya pencere boşlukları olabilir. "Duvar" veya "panel" kelimesi geçiyorsa, ya da bir kapı/pencere açıklığı bir duvarın parçası olarak tarif ediliyorsa bu şablonu kullan. Alanlar: genislikMm (duvar genişliği), yukseklikMm (duvar yüksekliği), dikmeAraligiHedefMm, lentoTasmaMm. Ayrıca varsa "bosluklar" dizisini doldur (aşağıya bak).
6. truss (Çatı Kafesi): Bir çatının taşıyıcı üçgen kafes sistemi (kral kirişi tipi), genellikle aşıklarla birlikte. Alanlar: acikligMm, egimYuzde, catiUzunluguMm, kafesAraligiHedefMm, asikAraligiHedefMm, diyagonalSayisi.

BOŞLUKLAR (sadece wall şablonu seçildiğinde doldurulur):
Duvardaki her kapı/pencere açıklığı için bir eleman: etiket ("Kapı" veya "Pencere" gibi), konumMm (duvarın SOL kenarından açıklığın sol kenarına mesafe — metinde belirtilmemişse mantıklı bir yerleşim tahmin et), tabanYuksekligiMm (kapı için 0, pencere için metinde başka bir değer yoksa 900mm tipik eşik yüksekliği), genislikMm, yukseklikMm.

KURALLAR:
- Metinde açıkça belirtilmeyen veya güçlü şekilde ima edilmeyen sayısal alanları "alanlar" nesnesine hiç ekleme (anahtarı tamamen atla) — uygulama zaten mantıklı varsayılan değerler kullanacak. Var olmayan bilgiyi uydurma.
- Ölçü birimi belirtilmemişse metre (m) varsayılır; ondalıklı/tam sayılar metre kabul edilir (örn. "3 metre" veya "3" → 3000 mm); "cm" belirtilmişse ×10 yap; "mm" olduğu gibi kullan.
- Sadece SEÇTİĞİN şablona ait alanları doldur; diğer şablonlara özgü alanları ekleme.
- baslik: kısa, açıklayıcı bir ürün/iş adı üret (örn. "Bahçe Korkuluğu", "Ön Cephe Duvar Paneli").
- musteriAdiTahmini: metinde bir müşteri/kişi/firma adı geçiyorsa döndür, yoksa bu alanı hiç ekleme.
- guven: metnin şablonu ve ana ölçüleri ne kadar net belirttiğine göre "yuksek" | "orta" | "dusuk".
- belirsizlikler: kullanıcının kontrol etmesi gereken varsayımların/eksik bilgilerin kısa Türkçe listesi (örn. "Dikme aralığı belirtilmediği için varsayılan kullanılacak."). Hiç belirsizlik yoksa boş dizi döndür.
- Yalnızca geçerli JSON döndür, verilen şemaya uy.`;

router.post(
  "/is-yorumla",
  asyncHandler(async (req, res) => {
    const { metin } = istekSchema.parse(req.body);

    if (!process.env.GEMINI_API_KEY) {
      throw new ApiHatasi(
        503,
        "AI özelliği şu anda kullanılamıyor: sunucuda GEMINI_API_KEY tanımlı değil. Lütfen yönetici ile iletişime geçin."
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let metinYaniti: string | undefined;
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: metin,
        config: {
          systemInstruction: SISTEM_PROMPTU,
          responseMimeType: "application/json",
          responseJsonSchema: RESPONSE_JSON_SCHEMA,
        },
      });
      metinYaniti = response.text;
    } catch (e) {
      console.error("AI is-yorumla hatası:", e);
      throw new ApiHatasi(502, "Yapay zeka isteği başarısız oldu. Lütfen tekrar deneyin.");
    }

    if (!metinYaniti) {
      throw new ApiHatasi(502, "Yapay zeka yanıtı boş döndü. Lütfen tekrar deneyin.");
    }

    let ham: unknown;
    try {
      ham = JSON.parse(metinYaniti);
    } catch {
      throw new ApiHatasi(502, "Yapay zeka yanıtı anlaşılamadı. Lütfen metni farklı şekilde ifade edip tekrar deneyin.");
    }

    const sonuc = aiCiktiSchema.safeParse(ham);
    if (!sonuc.success) {
      console.error("AI çıktısı beklenen şemaya uymuyor:", sonuc.error.issues);
      throw new ApiHatasi(502, "Yapay zeka yanıtı beklenen formatta değil. Lütfen tekrar deneyin.");
    }

    res.json(sonuc.data);
  })
);

export default router;
