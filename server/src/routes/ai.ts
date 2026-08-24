import { Router } from "express";
import { z as z3 } from "zod";
import { z } from "zod/v4";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { asyncHandler } from "../lib/errors";
import { ApiHatasi } from "../lib/errors";

const router = Router();

const istekSchema = z3.object({
  metin: z3.string().min(3, "Metin çok kısa.").max(2000, "Metin çok uzun (maks. 2000 karakter)."),
});

const boslukSchema = z.object({
  etiket: z.string(),
  konumMm: z.number(),
  tabanYuksekligiMm: z.number(),
  genislikMm: z.number(),
  yukseklikMm: z.number(),
});

const alanlarSchema = z.object({
  // korkuluk (railing)
  toplamUzunlukMm: z.number().nullable(),
  yukseklikMm: z.number().nullable(),
  dikmeAraligiHedefMm: z.number().nullable(),
  araKayitSayisi: z.number().nullable(),
  // merdiven (stairs)
  katYuksekligiMm: z.number().nullable(),
  genislikMm: z.number().nullable(),
  basamakYuksekligiHedefMm: z.number().nullable(),
  basamakDerinligiMm: z.number().nullable(),
  korkulukYuksekligiMm: z.number().nullable(),
  // sundurma (canopy)
  boyMm: z.number().nullable(),
  egimYuzde: z.number().nullable(),
  dikmeSayisi: z.number().nullable(),
  kaplamaTuru: z.enum(["trapez_sac", "polikarbon", "yok"]).nullable(),
  // kapı (door)
  sacKalinlikMm: z.number().nullable(),
  menteseAdet: z.number().nullable(),
  kilitAdet: z.number().nullable(),
  kolAdet: z.number().nullable(),
  // duvar paneli (wall)
  lentoTasmaMm: z.number().nullable(),
  // çatı kafesi (truss)
  acikligMm: z.number().nullable(),
  catiUzunluguMm: z.number().nullable(),
  kafesAraligiHedefMm: z.number().nullable(),
  asikAraligiHedefMm: z.number().nullable(),
  diyagonalSayisi: z.number().nullable(),
});

const aiCiktiSchema = z.object({
  templateKey: z.enum(["railing", "stairs", "canopy", "door", "wall", "truss"]),
  baslik: z.string(),
  musteriAdiTahmini: z.string().nullable(),
  guven: z.enum(["yuksek", "orta", "dusuk"]),
  belirsizlikler: z.array(z.string()),
  alanlar: alanlarSchema,
  bosluklar: z.array(boslukSchema).nullable(),
});

const SISTEM_PROMPTU = `Sen bir demirci/çelik konstrüksiyon atölyesi için sipariş metni okuyup yapılandırılmış veri çıkaran bir asistansın. Kullanıcı (genellikle teknik olmayan bir usta) yapılacak işi serbest, günlük dille anlatır. Görevin: bu 6 ürün şablonundan hangisine uyduğunu belirlemek ve şablonun ilgili alanlarını doldurmak.

ŞABLONLAR:
1. railing (Korkuluk): Düz, bağımsız bir korkuluk/parmaklık. Alanlar: toplamUzunlukMm, yukseklikMm, dikmeAraligiHedefMm (dikmeler arası hedef mesafe), araKayitSayisi (üst-alt profil arasına eklenen yatay ara çıta sayısı).
2. stairs (Merdiven): Kat yüksekliği boyunca basamaklı merdiven, opsiyonel kendi korkuluğuyla. Alanlar: katYuksekligiMm, genislikMm (merdiven genişliği), basamakYuksekligiHedefMm, basamakDerinligiMm, korkulukYuksekligiMm (merdivenin kendi korkuluğu isteniyorsa).
3. canopy (Sundurma/Kanopi): Bir duvara/yapıya dayalı eğimli çatılı sundurma, örn. araba sundurması, giriş sundurması. Alanlar: genislikMm (en), boyMm (duvardan dışa çıkma/derinlik), yukseklikMm (ön dikme yüksekliği), egimYuzde, dikmeSayisi, kaplamaTuru ("trapez_sac" | "polikarbon" | "yok").
4. door (Kapı): TEK BAŞINA menteşeli/kanatlı bir kapı ürünü (kasa+kanat), bir duvarın parçası değil, kapının kendisi isteniyor. Alanlar: genislikMm, yukseklikMm, sacKalinlikMm, menteseAdet, kilitAdet, kolAdet.
5. wall (Çelik Duvar Paneli): Prefabrik ev/atölye/konteyner gibi yapılarda kullanılan, dikme + üst/alt raydan oluşan düz bir duvar paneli; içinde kapı ve/veya pencere boşlukları olabilir. "Duvar" veya "panel" kelimesi geçiyorsa, ya da bir kapı/pencere açıklığı bir duvarın parçası olarak tarif ediliyorsa bu şablonu kullan. Alanlar: genislikMm (duvar genişliği), yukseklikMm (duvar yüksekliği), dikmeAraligiHedefMm, lentoTasmaMm. Ayrıca varsa "bosluklar" dizisini doldur (aşağıya bak).
6. truss (Çatı Kafesi): Bir çatının taşıyıcı üçgen kafes sistemi (kral kirişi tipi), genellikle aşıklarla birlikte. Alanlar: acikligMm, egimYuzde, catiUzunluguMm, kafesAraligiHedefMm, asikAraligiHedefMm, diyagonalSayisi, kaplamaTuru.

BOŞLUKLAR (sadece wall şablonu seçildiğinde doldurulur):
Duvardaki her kapı/pencere açıklığı için bir eleman: etiket ("Kapı" veya "Pencere" gibi), konumMm (duvarın SOL kenarından açıklığın sol kenarına mesafe — metinde belirtilmemişse mantıklı bir yerleşim tahmin et), tabanYuksekligiMm (kapı için 0, pencere için metinde başka bir değer yoksa 900mm tipik eşik yüksekliği), genislikMm, yukseklikMm.

KURALLAR:
- Metinde açıkça belirtilmeyen veya güçlü şekilde ima edilmeyen sayısal alanları null bırak — uygulama zaten mantıklı varsayılan değerler kullanacak. Var olmayan bilgiyi uydurma.
- Ölçü birimi belirtilmemişse metre (m) varsayılır; ondalıklı/tam sayılar metre kabul edilir (örn. "3 metre" veya "3" → 3000 mm); "cm" belirtilmişse ×10 yap; "mm" olduğu gibi kullan.
- Sadece SEÇTİĞİN şablona ait alanları doldur; diğer şablonlara özgü alanları null bırak.
- baslik: kısa, açıklayıcı bir ürün/iş adı üret (örn. "Bahçe Korkuluğu", "Ön Cephe Duvar Paneli").
- musteriAdiTahmini: metinde bir müşteri/kişi/firma adı geçiyorsa döndür, yoksa null.
- guven: metnin şablonu ve ana ölçüleri ne kadar net belirttiğine göre "yuksek" | "orta" | "dusuk".
- belirsizlikler: kullanıcının kontrol etmesi gereken varsayımların/eksik bilgilerin kısa Türkçe listesi (örn. "Dikme aralığı belirtilmediği için varsayılan kullanılacak."). Hiç belirsizlik yoksa boş dizi döndür.`;

router.post(
  "/is-yorumla",
  asyncHandler(async (req, res) => {
    const { metin } = istekSchema.parse(req.body);

    if (!process.env.ANTHROPIC_API_KEY) {
      throw new ApiHatasi(
        503,
        "AI özelliği şu anda kullanılamıyor: sunucuda ANTHROPIC_API_KEY tanımlı değil. Lütfen yönetici ile iletişime geçin."
      );
    }

    const client = new Anthropic();

    let response;
    try {
      response = await client.messages.parse({
        model: "claude-opus-5",
        max_tokens: 4096,
        output_config: {
          format: zodOutputFormat(aiCiktiSchema),
          effort: "medium",
        },
        system: SISTEM_PROMPTU,
        messages: [{ role: "user", content: metin }],
      });
    } catch (e) {
      console.error("AI is-yorumla hatası:", e);
      throw new ApiHatasi(502, "Yapay zeka isteği başarısız oldu. Lütfen tekrar deneyin.");
    }

    if (!response.parsed_output) {
      throw new ApiHatasi(502, "Yapay zeka yanıtı anlaşılamadı. Lütfen metni farklı şekilde ifade edip tekrar deneyin.");
    }

    res.json(response.parsed_output);
  })
);

export default router;
