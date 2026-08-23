# Demirci Atölye Yönetimi

Demir doğrama, çelik konstrüksiyon, korkuluk, merdiven, sundurma, kapı ve ferforje işleri yapan
demirci atölyeleri için parça hesaplama, metraj, kesim optimizasyonu, stok, maliyet ve teklif
hazırlama yazılımı.

Ana mantık: **Ölçü → Parça → Malzeme → Kesim Planı → Fire → Maliyet → Teklif**

## Teknoloji Yığını

- **Backend:** Node.js + TypeScript + Express, PostgreSQL + Prisma ORM, Zod doğrulama, PDFKit (teklif PDF'i)
- **Frontend:** React + TypeScript + Vite, Tailwind CSS, react-router-dom
- **Hesaplama motoru:** UI ve veritabanından tamamen bağımsız, saf TypeScript fonksiyonları (`server/src/calc`), `node --test` ile birim testli

## Klasör Yapısı

```
server/
  prisma/schema.prisma      Veritabanı şeması
  prisma/seed.ts             Başlangıç verisi (ürün şablonları, malzeme kataloğu, ayarlar)
  src/calc/                  Hesaplama motoru (railing, stairs, canopy, door, cutting, costing, sheet...)
  src/calc/__tests__/        Birim testler
  src/routes/                REST API uç noktaları
  src/lib/                   Prisma client, hata yönetimi, fiyatlandırma yardımcıları
client/
  src/pages/                 Dashboard, Yeni İş, İşler, Ürünler, Malzemeler, Kesim Listeleri,
                              Teklifler, Stok, Müşteriler, Ayarlar
  src/components/            Layout, ortak UI bileşenleri, kesim şeması görselleştirme
  src/api/                   API istemcisi ve tip tanımları
```

## Kurulum

### Gereksinimler
- Node.js 20+
- PostgreSQL 14+ — yerel kurulum yerine [Supabase](https://supabase.com) gibi ücretsiz bir bulut
  PostgreSQL de kullanılabilir (kurulum gerektirmez). Supabase kullanırken proje ayarlarından
  **Connect → ORMs → Prisma** ile hem `DATABASE_URL` (havuzlu) hem `DIRECT_URL` (doğrudan,
  migration'lar için) adreslerini alıp `.env`'e ekleyin — `server/.env.example` içinde örneği var.

### Backend

```bash
cd server
npm install
cp .env.example .env        # DATABASE_URL'i kendi Postgres bilgilerinize göre düzenleyin
npx prisma migrate dev      # veritabanı şemasını oluşturur
npx tsx prisma/seed.ts      # ürün şablonları + örnek malzeme kataloğu + ayarları ekler
npm run dev                 # http://localhost:4000
```

Testleri çalıştırmak için: `npm test`

### Frontend

```bash
cd client
npm install
npm run dev                 # http://localhost:5173 (API isteklerini /api üzerinden 4000 portuna yönlendirir)
```

## MVP Kapsamı

Uygulanan (uçtan uca çalışır durumda):

1. Müşteri yönetimi ve iş geçmişi
2. Yeni iş sihirbazı (Müşteri → Ürün → Ölçüler/Malzeme → Hesapla → Kaydet)
3. Ürün şablonları: **Korkuluk, Merdiven, Sundurma, Kapı** (parametrik hesaplama) + **Manuel/Çelik Konstrüksiyon** (elle parça girişi)
4. Malzeme kütüphanesi (profil/sac/sarf/bağlantı elemanı), fiyat geçmişi, stok takibi
5. Sac hesaplama aracı (m², ağırlık, maliyet)
6. Profil kesim optimizasyonu (First Fit Decreasing bin-packing, kesim payı dahil) + görsel kesim şeması
7. Maliyet motoru: malzeme + fire + sarf + işçilik + boya + nakliye + montaj + diğer → genel gider → kâr (%/sabit TL) → KDV → teklif fiyatı
8. Teklif oluşturma, durum takibi (taslak/gönderildi/kabul/red), yazdırılabilir PDF çıktısı
9. Stok: iş onaylandığında kesim planına göre otomatik düşüm, stok hareketleri geçmişi, kritik stok uyarıları
10. Dashboard ve raporlar (aylık satış/kâr, en çok kullanılan profil, fire oranları, stok durumu)

### Sonraki Aşamalar (İlk sürüm kapsamı dışında bırakıldı)

- Kullanıcı/yetkilendirme sistemi (çoklu kullanıcı, roller)
- Tamamen dinamik/kullanıcı tanımlı ürün şablonu oluşturucu (şu an 5 şablon kod düzeyinde tanımlı;
  yeni şablon eklemek `server/src/calc` içine yeni bir hesaplama fonksiyonu eklemeyi gerektiriyor)
- Daha gelişmiş kesim optimizasyonu algoritmaları (ör. karışık uzunluklu stok, 2D nesting)

## Test Senaryosu Doğrulaması

`server/src/calc/__tests__/railing.test.ts` dosyası, spesifikasyondaki 12 metre / 1200mm yükseklik /
1500mm dikme aralığı test senaryosunu birebir doğrular (9 dikme, 8×1500mm üst/alt profil, doğru
metraj ve kesim planı).
