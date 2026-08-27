import { Router } from "express";
import { z } from "zod";
import { GoogleGenAI, ContentListUnion, ApiError as GeminiApiError } from "@google/genai";
import { asyncHandler, ApiHatasi } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { calculateByTemplateKey } from "../calc";
import { TEMPLATE_SCHEMAS, idToKey, malzemeSozlugu } from "./calc";
import { parcaAgirlikKg, sacKalemleriAgirlikKg, yuvarla1 } from "../calc/weight";
import { isletmeOzetiMetni } from "../lib/aiContext";

const router = Router();

const GEMINI_MODEL = "gemini-3.6-flash";

/** Gemini'den yapılandırılmış JSON yanıt alır ve verilen zod şemasıyla doğrular. Anahtar yoksa/istek başarısızsa ApiHatasi fırlatır. */
async function geminiJsonIste<T>(opts: {
  contents: ContentListUnion;
  systemInstruction: string;
  responseJsonSchema: unknown;
  zodSchema: z.ZodType<T>;
  hataBaglami: string;
}): Promise<T> {
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
      model: GEMINI_MODEL,
      contents: opts.contents,
      config: {
        systemInstruction: opts.systemInstruction,
        responseMimeType: "application/json",
        responseJsonSchema: opts.responseJsonSchema,
      },
    });
    metinYaniti = response.text;
  } catch (e) {
    console.error(`${opts.hataBaglami} hatası:`, e);
    if (e instanceof GeminiApiError && e.status === 429) {
      throw new ApiHatasi(
        429,
        "Günlük ücretsiz AI kullanım kotanız doldu. Yarın tekrar deneyebilir, veya Google AI Studio'da projenize faturalandırma ekleyerek kotayı yükseltebilirsiniz."
      );
    }
    throw new ApiHatasi(502, "Yapay zeka isteği başarısız oldu. Lütfen tekrar deneyin.");
  }

  if (!metinYaniti) {
    throw new ApiHatasi(502, "Yapay zeka yanıtı boş döndü. Lütfen tekrar deneyin.");
  }

  let ham: unknown;
  try {
    ham = JSON.parse(metinYaniti);
  } catch {
    throw new ApiHatasi(502, "Yapay zeka yanıtı anlaşılamadı. Lütfen tekrar deneyin.");
  }

  const sonuc = opts.zodSchema.safeParse(ham);
  if (!sonuc.success) {
    console.error(`${opts.hataBaglami}: AI çıktısı beklenen şemaya uymuyor:`, sonuc.error.issues);
    throw new ApiHatasi(502, "Yapay zeka yanıtı beklenen formatta değil. Lütfen tekrar deneyin.");
  }

  return sonuc.data;
}

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

// Her şablon için ayrı bir alt-nesne kullanılıyor (tek, ortak "alanlar" nesnesi yerine) — bu sayede
// modelin örn. wall'un yukseklikMm değerini yanlışlıkla truss'un catiUzunluguMm alanına yazması gibi
// şablonlar-arası alan karışıklıkları yapısal olarak imkansız hale geliyor.
const sablonAlanlari = {
  railing: {
    toplamUzunlukMm: z.number().nullish(),
    yukseklikMm: z.number().nullish(),
    dikmeAraligiHedefMm: z.number().nullish(),
    araKayitSayisi: z.number().nullish(),
  },
  stairs: {
    katYuksekligiMm: z.number().nullish(),
    genislikMm: z.number().nullish(),
    basamakYuksekligiHedefMm: z.number().nullish(),
    toplamDerinlikMm: z.number().nullish(),
    korkulukYuksekligiMm: z.number().nullish(),
  },
  canopy: {
    genislikMm: z.number().nullish(),
    boyMm: z.number().nullish(),
    yukseklikMm: z.number().nullish(),
    egimYuzde: z.number().nullish(),
    dikmeSayisi: z.number().nullish(),
  },
  door: {
    genislikMm: z.number().nullish(),
    yukseklikMm: z.number().nullish(),
    sacKalinlikMm: z.number().nullish(),
    menteseAdet: z.number().nullish(),
    kilitAdet: z.number().nullish(),
    kolAdet: z.number().nullish(),
  },
  wall: {
    genislikMm: z.number().nullish(),
    yukseklikMm: z.number().nullish(),
    dikmeAraligiHedefMm: z.number().nullish(),
    lentoTasmaMm: z.number().nullish(),
  },
  truss: {
    acikligMm: z.number().nullish(),
    egimYuzde: z.number().nullish(),
    catiUzunluguMm: z.number().nullish(),
    kafesAraligiHedefMm: z.number().nullish(),
    asikAraligiHedefMm: z.number().nullish(),
    diyagonalSayisi: z.number().nullish(),
  },
} as const;

const alanlarSchema = z.object({
  railing: z.object(sablonAlanlari.railing).partial(),
  stairs: z.object(sablonAlanlari.stairs).partial(),
  canopy: z.object(sablonAlanlari.canopy).partial(),
  door: z.object(sablonAlanlari.door).partial(),
  wall: z.object(sablonAlanlari.wall).partial(),
  truss: z.object(sablonAlanlari.truss).partial(),
});

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

/** Zod'daki sablonAlanlari ile aynı alanları JSON Schema `properties` biçiminde üretir. */
function sablonAlanJsonSchema(anahtarlar: string[]) {
  const properties: Record<string, unknown> = {};
  for (const k of anahtarlar) properties[k] = SAYI;
  return { type: "object", properties };
}

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
      description:
        "Sadece 'templateKey' ile seçtiğin şablonun alt nesnesini doldur (örn. templateKey=wall ise sadece alanlar.wall). Diğer 5 alt nesneyi tamamen boş {} bırak.",
      properties: {
        railing: sablonAlanJsonSchema(["toplamUzunlukMm", "yukseklikMm", "dikmeAraligiHedefMm", "araKayitSayisi"]),
        stairs: sablonAlanJsonSchema([
          "katYuksekligiMm",
          "genislikMm",
          "basamakYuksekligiHedefMm",
          "toplamDerinlikMm",
          "korkulukYuksekligiMm",
        ]),
        canopy: sablonAlanJsonSchema(["genislikMm", "boyMm", "yukseklikMm", "egimYuzde", "dikmeSayisi"]),
        door: sablonAlanJsonSchema(["genislikMm", "yukseklikMm", "sacKalinlikMm", "menteseAdet", "kilitAdet", "kolAdet"]),
        wall: sablonAlanJsonSchema(["genislikMm", "yukseklikMm", "dikmeAraligiHedefMm", "lentoTasmaMm"]),
        truss: sablonAlanJsonSchema([
          "acikligMm",
          "egimYuzde",
          "catiUzunluguMm",
          "kafesAraligiHedefMm",
          "asikAraligiHedefMm",
          "diyagonalSayisi",
        ]),
      },
      required: ["railing", "stairs", "canopy", "door", "wall", "truss"],
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

const SABLON_ACIKLAMALARI = `ŞABLONLAR:
1. railing (Korkuluk): Düz, bağımsız bir korkuluk/parmaklık. Alanlar: toplamUzunlukMm, yukseklikMm, dikmeAraligiHedefMm (dikmeler arası hedef mesafe), araKayitSayisi (üst-alt profil arasına eklenen yatay ara çıta sayısı).
2. stairs (Merdiven): Kat yüksekliği boyunca basamaklı merdiven, opsiyonel kendi korkuluğuyla. Alanlar: katYuksekligiMm, genislikMm (merdiven genişliği), basamakYuksekligiHedefMm, toplamDerinlikMm (merdivenin toplam yatay uzunluğu/boşluğu), korkulukYuksekligiMm (merdivenin kendi korkuluğu isteniyorsa).
3. canopy (Sundurma/Kanopi): Bir duvara/yapıya dayalı eğimli çatılı sundurma, örn. araba sundurması, giriş sundurması. Alanlar: genislikMm (en), boyMm (duvardan dışa çıkma/derinlik), yukseklikMm (ön dikme yüksekliği), egimYuzde, dikmeSayisi.
4. door (Kapı): TEK BAŞINA menteşeli/kanatlı bir kapı ürünü (kasa+kanat), bir duvarın parçası değil, kapının kendisi isteniyor. Alanlar: genislikMm, yukseklikMm, sacKalinlikMm, menteseAdet, kilitAdet, kolAdet.
5. wall (Çelik Duvar Paneli): Prefabrik ev/atölye/konteyner gibi yapılarda kullanılan, dikme + üst/alt raydan oluşan düz bir duvar paneli; içinde kapı ve/veya pencere boşlukları olabilir. "Duvar" veya "panel" kelimesi geçiyorsa, ya da bir kapı/pencere açıklığı bir duvarın parçası olarak tarif ediliyorsa bu şablonu kullan. Alanlar: genislikMm (duvar genişliği), yukseklikMm (duvar yüksekliği), dikmeAraligiHedefMm, lentoTasmaMm. Ayrıca varsa "bosluklar" dizisini doldur (aşağıya bak).
6. truss (Çatı Kafesi): Bir çatının taşıyıcı üçgen kafes sistemi (kral kirişi tipi), genellikle aşıklarla birlikte. Alanlar: acikligMm, egimYuzde, catiUzunluguMm, kafesAraligiHedefMm, asikAraligiHedefMm, diyagonalSayisi.

BOŞLUKLAR (sadece wall şablonu seçildiğinde doldurulur):
Duvardaki her kapı/pencere açıklığı için bir eleman: etiket ("Kapı" veya "Pencere" gibi), konumMm (duvarın SOL kenarından açıklığın sol kenarına mesafe — belirtilmemişse mantıklı bir yerleşim tahmin et), tabanYuksekligiMm (kapı için 0, pencere için başka bir değer yoksa 900mm tipik eşik yüksekliği), genislikMm, yukseklikMm.

"alanlar" nesnesinin yapısı: her şablon için ayrı bir alt nesne var (alanlar.railing, alanlar.stairs, alanlar.canopy, alanlar.door, alanlar.wall, alanlar.truss). templateKey olarak SEÇTİĞİN şablona karşılık gelen TEK bir alt nesneyi doldur (örn. templateKey="wall" ise sadece alanlar.wall'u doldur), DİĞER 5 alt nesneyi tamamen boş {} bırak. Bir alt nesnenin alanlarını başka bir alt nesneye YAZMA — örneğin wall'un yükseklik değerini asla alanlar.truss.catiUzunluguMm gibi başka bir şablonun alanına yazma, sadece alanlar.wall.yukseklikMm'e yaz.`;

const ORTAK_KURALLAR = `- Açıkça belirtilmeyen veya güçlü şekilde ima edilmeyen sayısal alanları hiç ekleme (anahtarı tamamen atla) — uygulama zaten mantıklı varsayılan değerler kullanacak. Var olmayan bilgiyi uydurma.
- Ölçü birimi belirtilmemişse metre (m) varsayılır; ondalıklı/tam sayılar metre kabul edilir (örn. "3 metre" veya "3" → 3000 mm); "cm" belirtilmişse ×10 yap; "mm" olduğu gibi kullan.
- baslik: kısa, açıklayıcı bir ürün/iş adı üret (örn. "Bahçe Korkuluğu", "Ön Cephe Duvar Paneli").
- musteriAdiTahmini: bir müşteri/kişi/firma adı geçiyorsa döndür, yoksa bu alanı hiç ekleme.
- guven: şablonun ve ana ölçülerin ne kadar net belirlendiğine göre "yuksek" | "orta" | "dusuk".
- belirsizlikler: kullanıcının kontrol etmesi gereken varsayımların/eksik bilgilerin kısa Türkçe listesi. Hiç belirsizlik yoksa boş dizi döndür.
- Yalnızca geçerli JSON döndür, verilen şemaya uy.`;

const SISTEM_PROMPTU = `Sen bir demirci/çelik konstrüksiyon atölyesi için sipariş metni okuyup yapılandırılmış veri çıkaran bir asistansın. Kullanıcı (genellikle teknik olmayan bir usta) yapılacak işi serbest, günlük dille anlatır. Görevin: bu 6 ürün şablonundan hangisine uyduğunu belirlemek ve şablonun ilgili alanlarını doldurmak.

${SABLON_ACIKLAMALARI}

KURALLAR:
${ORTAK_KURALLAR}`;

const FOTO_SISTEM_PROMPTU = `Sen bir demirci/çelik konstrüksiyon atölyesi için, kullanıcının yüklediği bir fotoğrafı (elle çizilmiş bir kroki/plan, ölçüleri not edilmiş bir kağıt, veya var olan bir yapının fotoğrafı olabilir) okuyup yapılandırılmış veri çıkaran bir asistansın. Görevin: fotoğraftaki elemanları ve varsa üzerine yazılmış ölçüleri okuyarak, bu 6 ürün şablonundan hangisine uyduğunu belirlemek ve şablonun ilgili alanlarını doldurmak.

${SABLON_ACIKLAMALARI}

KURALLAR:
${ORTAK_KURALLAR}
- Fotoğraftaki el yazısı rakamları dikkatlice oku; okuyamadığın veya emin olamadığın bir ölçüyü uydurmak yerine boş bırak ve bunu belirsizlikler listesine ekle.
- Fotoğraf net değilse, ölçüler eksikse veya birden fazla şablona uyabilecek belirsiz bir çizimse guven="dusuk" döndür ve neden emin olamadığını belirsizlikler listesinde açıkla.
- Bu gerçek bir fotogrametri/lazer ölçüm değildir — sadece görsel bir yorumlama ve okumadır; kullanıcı sonuçları mutlaka kontrol etmelidir (bu zaten uygulama tarafında ayrıca vurgulanacak).`;

router.post(
  "/is-yorumla",
  asyncHandler(async (req, res) => {
    const { metin } = istekSchema.parse(req.body);

    const sonuc = await geminiJsonIste({
      contents: metin,
      systemInstruction: SISTEM_PROMPTU,
      responseJsonSchema: RESPONSE_JSON_SCHEMA,
      zodSchema: aiCiktiSchema,
      hataBaglami: "AI is-yorumla",
    });

    const { alanlar, ...geri } = sonuc;
    res.json({ ...geri, alanlar: alanlar[sonuc.templateKey] });
  })
);

const IZIN_VERILEN_RESIM_TURLERI = new Set(["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"]);
const MAKS_BASE64_UZUNLUK = 12_000_000; // ~9 MB ham veri

const planIstekSchema = z.object({
  imageBase64: z.string().min(1, "Fotoğraf verisi eksik."),
  mimeType: z.string(),
  not: z.string().max(500).optional(),
});

router.post(
  "/plan-yorumla",
  asyncHandler(async (req, res) => {
    const { imageBase64, mimeType, not } = planIstekSchema.parse(req.body);

    if (!IZIN_VERILEN_RESIM_TURLERI.has(mimeType)) {
      throw new ApiHatasi(400, "Desteklenmeyen dosya türü. Lütfen bir fotoğraf (JPEG/PNG/WEBP) yükleyin.");
    }
    const ham = imageBase64.includes(",") ? imageBase64.slice(imageBase64.indexOf(",") + 1) : imageBase64;
    if (ham.length > MAKS_BASE64_UZUNLUK) {
      throw new ApiHatasi(413, "Fotoğraf çok büyük. Lütfen daha küçük boyutlu bir fotoğraf yükleyin (maks. ~9 MB).");
    }

    const contents: ContentListUnion = [
      { text: not?.trim() ? `Kullanıcının notu: ${not.trim()}` : "Bu fotoğraftaki planı/krokiyi yorumla." },
      { inlineData: { mimeType, data: ham } },
    ];

    const sonuc = await geminiJsonIste({
      contents,
      systemInstruction: FOTO_SISTEM_PROMPTU,
      responseJsonSchema: RESPONSE_JSON_SCHEMA,
      zodSchema: aiCiktiSchema,
      hataBaglami: "AI plan-yorumla",
    });

    const { alanlar, ...geri } = sonuc;
    res.json({ ...geri, alanlar: alanlar[sonuc.templateKey] });
  })
);

const danismanIstekSchema = z.object({
  templateKey: z.enum(["railing", "stairs", "canopy", "door", "wall", "truss"]),
  params: z.record(z.string(), z.unknown()),
});

const danismanCiktiSchema = z.object({
  degerlendirme: z.string(),
  malzemeUygunlugu: z.enum(["yeterli", "sinirda", "yetersiz"]),
  onerilenAlternatif: z.string().nullish(),
  tahminiTasimaKapasitesiKg: z.number().nullish(),
  tasimaKapasitesiAciklamasi: z.string(),
  oneriler: z.array(z.string()),
  sarfMalzemeOnerileri: z.array(z.string()),
});

const DANISMAN_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    degerlendirme: { type: "string" },
    malzemeUygunlugu: { type: "string", enum: ["yeterli", "sinirda", "yetersiz"] },
    onerilenAlternatif: { type: "string" },
    tahminiTasimaKapasitesiKg: { type: "number" },
    tasimaKapasitesiAciklamasi: { type: "string" },
    oneriler: { type: "array", items: { type: "string" } },
    sarfMalzemeOnerileri: { type: "array", items: { type: "string" } },
  },
  required: ["degerlendirme", "malzemeUygunlugu", "tasimaKapasitesiAciklamasi", "oneriler", "sarfMalzemeOnerileri"],
};

const DANISMAN_SISTEM_PROMPTU = `Sen bir çelik konstrüksiyon/demirci atölyesi için deneyimli bir teknik danışmansın. Sana bir ürünün hesaplanmış ölçüleri, kullanılan profil/malzeme bilgileri, sac/kaplama kalemleri, zaten hesaba dahil edilen bağlantı elemanları ve toplam ağırlığı verilecek. Görevin, bu seçimleri teknik açıdan kısaca değerlendirmek ve kullanıcıya (genellikle teknik olmayan bir usta) anlaşılır, pratik bir görüş sunmak.

ÇOK ÖNEMLİ - SORUMLULUK REDDİ: Verdiğin taşıma kapasitesi tahmini KESİN BİR MÜHENDİSLİK HESABI DEĞİLDİR, sadece kabaca fikir vermek içindir. Merdiven, çatı, korkuluk gibi can güvenliği içeren yapılarda gerçek yük hesabı; kesit modülü, malzeme akma dayanımı, burkulma, emniyet katsayısı gibi faktörleri içeren resmi bir statik hesap gerektirir. "tasimaKapasitesiAciklamasi" alanında bunu HER ZAMAN açıkça belirt ve kritik/ağır yük durumlarında bir statik mühendisinden onay alınmasını öner.

Değerlendirirken dikkat et:
- malzemeUygunlugu: verilen ölçüler/açıklık için seçilen profil kesiti ve kalınlığı genel tecrübeye göre "yeterli" mi, "sinirda" mı (biraz büyütülmesi önerilir), yoksa "yetersiz" mi (mutlaka değiştirilmeli)?
- onerilenAlternatif: malzemeUygunlugu "sinirda" veya "yetersiz" ise hangi profil kesiti/kalınlığının daha uygun olacağını öner (örn. "120x120x4 Kutu Profil"). "yeterli" ise bu alanı hiç ekleme.
- tahminiTasimaKapasitesiKg: ürün tipine uygun tipik bir kullanım senaryosu için (korkulukta yatay itme yükü, merdivende yayılı yaşam yükü, çatıda kar+rüzgar yükü vb.) kabaca bir sayısal tahmin ver.
- oneriler: montaj, korozyon koruması, bakım gibi pratik ek öneriler, en fazla 4 madde.
- sarfMalzemeOnerileri: kaynak/montaj için gereken SARF MALZEMELERİNİ somut olarak öner - örn. kaynak elektrotu türü ve yaklaşık tüketimi (profil kesit kalınlığına göre E6013/E7018 gibi), sac/panel kaplaması varsa hangi tür vida (self-drilling sac vidası, sandviç panel vidası vb.) ve yaklaşık adedi (m² başına tipik 6-8 adet), korozyon koruması için astar+son kat boya veya galvaniz spreyi, gerekiyorsa silikon/conta bandı. Kaplama türüne göre uyarla (örn. etermit için özel etermit vidası ve contası, polikarbon için ısı genleşmeli özel vida). En fazla 5 madde.

Kısa, anlaşılır, teknik jargonu gerekirse kısaca açıklayarak yaz. Türkçe yanıt ver, yalnızca geçerli JSON döndür.`;

const SABLON_TURKCE: Record<string, string> = {
  railing: "Korkuluk",
  stairs: "Merdiven",
  canopy: "Sundurma/Kanopi",
  door: "Kapı",
  wall: "Çelik Duvar Paneli",
  truss: "Çatı Kafesi",
};

router.post(
  "/malzeme-danismani",
  asyncHandler(async (req, res) => {
    const { templateKey, params } = danismanIstekSchema.parse(req.body);

    const schema = TEMPLATE_SCHEMAS[templateKey];
    const parsed = schema.parse(params);
    const girdi = idToKey(parsed as Record<string, unknown>);
    const sonuc = calculateByTemplateKey(templateKey, girdi);
    const malzemeler = await malzemeSozlugu(sonuc);

    let profilAgirlikKg = 0;
    let eksikAgirlikVerisi = false;
    const malzemeSatirlari: string[] = [];
    for (const ozet of sonuc.profilOzet) {
      const malzeme = malzemeler[ozet.profilKey];
      if (!malzeme) continue;
      if (malzeme.unitWeightKgPerM) {
        profilAgirlikKg += parcaAgirlikKg(ozet.toplamMetre * 1000, 1, malzeme.unitWeightKgPerM);
      } else {
        eksikAgirlikVerisi = true;
      }
      malzemeSatirlari.push(
        `- ${malzeme.name}${malzeme.section ? ` (${malzeme.section})` : ""}: ${ozet.toplamMetre} m kullanılıyor, ${
          malzeme.unitWeightKgPerM ? `${malzeme.unitWeightKgPerM} kg/m` : "ağırlık bilgisi girilmemiş"
        }`
      );
    }

    const sacAgirlikKg = sacKalemleriAgirlikKg(sonuc.sacKalemleri);

    const toplamAgirlikKg = yuvarla1(profilAgirlikKg + sacAgirlikKg);

    const olculer = Object.entries(sonuc.ozetDegerler)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");

    const sacSatirlari = sonuc.sacKalemleri
      .map((s) => `- ${s.label}: ${s.enMm}x${s.boyMm}mm, ${s.kalinlikMm ?? "?"}mm kalınlık, ${s.adet} adet`)
      .join("\n");
    const baglantiSatirlari = sonuc.baglantiKalemleri.map((b) => `- ${b.label}: ${b.adet} ${b.birim}`).join("\n");

    const girdiMetni = `Ürün tipi: ${SABLON_TURKCE[templateKey] ?? templateKey}
Hesaplanan ara değerler: ${olculer || "yok"}
Kullanılan profil malzemeler:
${malzemeSatirlari.join("\n") || "- (profil bulunamadı)"}
Sac/panel/kaplama kalemleri:
${sacSatirlari || "- yok"}
Zaten hesaba dahil edilen bağlantı elemanları:
${baglantiSatirlari || "- yok"}
Hesaplanan toplam ağırlık: ${toplamAgirlikKg} kg
Hesaplama motorunun ürettiği uyarılar: ${sonuc.uyarilar.length > 0 ? sonuc.uyarilar.join("; ") : "yok"}`;

    const aiSonuc = await geminiJsonIste({
      contents: girdiMetni,
      systemInstruction: DANISMAN_SISTEM_PROMPTU,
      responseJsonSchema: DANISMAN_RESPONSE_JSON_SCHEMA,
      zodSchema: danismanCiktiSchema,
      hataBaglami: "AI malzeme-danismani",
    });

    res.json({
      ...aiSonuc,
      hesaplananAgirlikKg: toplamAgirlikKg,
      agirlikNotu: eksikAgirlikVerisi
        ? "Bazı malzemeler için kg/m ağırlık bilgisi girilmediğinden toplam ağırlık eksik hesaplanmış olabilir."
        : null,
    });
  })
);

const gunlukOzetIstekSchema = z.object({
  gecikmisIsler: z.array(z.object({ baslik: z.string(), musteri: z.string(), kacGunGecikti: z.number() })),
  yaklasanIsler: z.array(z.object({ baslik: z.string(), musteri: z.string(), kacGunKaldi: z.number() })),
  kritikStoklar: z.array(z.object({ ad: z.string(), stok: z.number(), minStok: z.number(), birim: z.string() })),
  bekleyenTeklifSayisi: z.number(),
  aktifIsSayisi: z.number(),
});

const gunlukOzetCiktiSchema = z.object({
  ozet: z.string(),
  oncelikler: z.array(z.string()),
});

const GUNLUK_OZET_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    ozet: { type: "string" },
    oncelikler: { type: "array", items: { type: "string" } },
  },
  required: ["ozet", "oncelikler"],
};

const GUNLUK_OZET_SISTEM_PROMPTU = `Sen bir demirci/çelik konstrüksiyon atölyesinin sahibine her sabah günlük durumu özetleyen bir asistansın. Sana atölyenin o anki geciken işleri, yaklaşan teslim tarihleri, kritik stok seviyesindeki malzemeleri, bekleyen teklif ve aktif iş sayılarını vereceğim. Görevin, bunları samimi ve kısa bir Türkçe paragrafta ("ozet") özetlemek ve bugün öncelikli yapılması gerekenleri madde madde ("oncelikler", en fazla 5 madde) listelemek. Abartılı/resmi olma, işletme sahibiyle konuşur gibi doğal bir dil kullan. Hiçbir sorun yoksa bunu olumlu şekilde belirt ve kısa tut.`;

router.post(
  "/gunluk-ozet",
  asyncHandler(async (req, res) => {
    const girdi = gunlukOzetIstekSchema.parse(req.body);

    const girdiMetni = `Geciken işler (${girdi.gecikmisIsler.length}): ${
      girdi.gecikmisIsler.map((i) => `${i.baslik} (${i.musteri}, ${i.kacGunGecikti} gün gecikti)`).join("; ") || "yok"
    }
Yaklaşan teslimler (${girdi.yaklasanIsler.length}): ${
      girdi.yaklasanIsler.map((i) => `${i.baslik} (${i.musteri}, ${i.kacGunKaldi} gün kaldı)`).join("; ") || "yok"
    }
Kritik stoktaki malzemeler (${girdi.kritikStoklar.length}): ${
      girdi.kritikStoklar.map((m) => `${m.ad} (${m.stok}/${m.minStok} ${m.birim})`).join("; ") || "yok"
    }
Bekleyen teklif sayısı: ${girdi.bekleyenTeklifSayisi}
Aktif iş sayısı: ${girdi.aktifIsSayisi}`;

    const sonuc = await geminiJsonIste({
      contents: girdiMetni,
      systemInstruction: GUNLUK_OZET_SISTEM_PROMPTU,
      responseJsonSchema: GUNLUK_OZET_RESPONSE_JSON_SCHEMA,
      zodSchema: gunlukOzetCiktiSchema,
      hataBaglami: "AI gunluk-ozet",
    });

    res.json(sonuc);
  })
);

const raporDegerlendirmeIstekSchema = z.object({
  toplamIsSayisi: z.number(),
  toplamSatis: z.number(),
  toplamMaliyet: z.number(),
  toplamKar: z.number(),
  aylikOzet: z.array(z.object({ ay: z.string(), satis: z.number(), kar: z.number() })),
  fireOranlari: z.array(z.object({ materialName: z.string(), ortalamaFireYuzde: z.number() })),
  kritikStokSayisi: z.number(),
});

const raporDegerlendirmeCiktiSchema = z.object({
  degerlendirme: z.string(),
  dikkatEdilmesiGerekenler: z.array(z.string()),
});

const RAPOR_DEGERLENDIRME_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    degerlendirme: { type: "string" },
    dikkatEdilmesiGerekenler: { type: "array", items: { type: "string" } },
  },
  required: ["degerlendirme", "dikkatEdilmesiGerekenler"],
};

const RAPOR_DEGERLENDIRME_SISTEM_PROMPTU = `Sen bir demirci/çelik konstrüksiyon atölyesi için işletme verilerini yorumlayan bir mali/işletme danışmanısın. Sana toplam iş sayısı, toplam satış/maliyet/kâr, aylık satış-kâr trendi, malzeme fire oranları ve kritik stok sayısı verilecek. Görevin: bu verileri kısa, anlaşılır bir Türkçe paragrafta ("degerlendirme") yorumlamak - kâr marjı sağlıklı mı, trend nasıl, fire oranları normal mi vb. - ve işletme sahibinin dikkat etmesi gereken somut noktaları ("dikkatEdilmesiGerekenler", en fazla 5 madde) listelemek. Teknik jargon yerine sade dil kullan, veriye dayan, veri azsa/yetersizse bunu belirt.`;

router.post(
  "/rapor-degerlendir",
  asyncHandler(async (req, res) => {
    const girdi = raporDegerlendirmeIstekSchema.parse(req.body);

    const karMarji = girdi.toplamSatis > 0 ? ((girdi.toplamKar / girdi.toplamSatis) * 100).toFixed(1) : "0";
    const girdiMetni = `Toplam iş sayısı: ${girdi.toplamIsSayisi}
Toplam satış: ${girdi.toplamSatis} TL
Toplam maliyet: ${girdi.toplamMaliyet} TL
Toplam kâr: ${girdi.toplamKar} TL (kâr marjı: %${karMarji})
Aylık satış/kâr: ${girdi.aylikOzet.map((a) => `${a.ay}: satış ${a.satis} TL, kâr ${a.kar} TL`).join("; ") || "veri yok"}
Ortalama fire oranları: ${girdi.fireOranlari.map((f) => `${f.materialName}: %${f.ortalamaFireYuzde}`).join("; ") || "veri yok"}
Kritik stok seviyesindeki malzeme sayısı: ${girdi.kritikStokSayisi}`;

    const sonuc = await geminiJsonIste({
      contents: girdiMetni,
      systemInstruction: RAPOR_DEGERLENDIRME_SISTEM_PROMPTU,
      responseJsonSchema: RAPOR_DEGERLENDIRME_RESPONSE_JSON_SCHEMA,
      zodSchema: raporDegerlendirmeCiktiSchema,
      hataBaglami: "AI rapor-degerlendir",
    });

    res.json(sonuc);
  })
);

const soruCevapIstekSchema = z.object({
  soru: z.string().min(3, "Soru çok kısa.").max(500, "Soru çok uzun (maks. 500 karakter)."),
});

const soruCevapCiktiSchema = z.object({
  cevap: z.string(),
  yetersizVeri: z.boolean(),
});

const SORU_CEVAP_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    cevap: { type: "string" },
    yetersizVeri: {
      type: "boolean",
      description: "Verilen işletme durumu verisi, soruyu tam olarak cevaplamak için yetersizse true.",
    },
  },
  required: ["cevap", "yetersizVeri"],
};

const SORU_CEVAP_SISTEM_PROMPTU = `Sen bir demirci/çelik konstrüksiyon atölyesinin işletme sahibinin sorularını cevaplayan bir asistansın. Sana atölyenin o anki durumunu özetleyen bir metin verilecek (aktif işler, geciken işler, satış/maliyet/kâr, aylık trend, iş türüne göre kârlılık, müşteri alacakları, kritik stok). Görevin, kullanıcının serbest sorusunu SADECE bu verilen bilgiye dayanarak cevaplamak.

KURALLAR:
- Sadece verilen veriye dayan, uydurma. Verilen veri soruyu cevaplamaya yetmiyorsa "yetersizVeri" alanını true yap ve "cevap" alanında ne tür bir veri eksik olduğunu dürüstçe belirt (örn. "bu soruyu cevaplamak için X verisi sistemde henüz tutulmuyor").
- Sayısal analiz gerektiren sorularda (örn. "neden kârımız düştü?") verilen aylık trend ve kategori verilerini karşılaştırarak somut, sayılara dayalı bir açıklama yap.
- Kısa, doğrudan, samimi bir dille cevap ver - işletme sahibiyle konuşur gibi. Gereksiz uzatma.
- Türkçe cevap ver, yalnızca geçerli JSON döndür.`;

router.post(
  "/soru-cevap",
  asyncHandler(async (req, res) => {
    const { soru } = soruCevapIstekSchema.parse(req.body);
    const ozet = await isletmeOzetiMetni();

    const sonuc = await geminiJsonIste({
      contents: `${ozet}\n\n[SORU]: ${soru}`,
      systemInstruction: SORU_CEVAP_SISTEM_PROMPTU,
      responseJsonSchema: SORU_CEVAP_RESPONSE_JSON_SCHEMA,
      zodSchema: soruCevapCiktiSchema,
      hataBaglami: "AI soru-cevap",
    });

    res.json(sonuc);
  })
);

export default router;
