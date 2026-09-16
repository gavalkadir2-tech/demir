-- Fire (kesim artığı) maliyeti artık malzeme maliyetine dahil ediliyor, ayrı bir kalem değil.
-- Mevcut tekliflerin geçmiş verisini kaybetmemek için önce wasteCost, materialCost'a eklenir.
UPDATE "quotes" SET "materialCost" = "materialCost" + "wasteCost";

-- AlterTable
ALTER TABLE "quotes" DROP COLUMN "wasteCost";

-- AlterTable
-- PERCENT kâr modunun tabanı artık ara toplam değil, doğrudan malzeme maliyeti (fire dahil);
-- varsayılan %50 = "kârı malzeme fiyatının yarısı olarak baz al" kuralına karşılık gelir. Mevcut
-- projelerin kendi profitValue'su değişmez, sadece yeni oluşturulan projelerin varsayılanı değişir.
ALTER TABLE "projects" ALTER COLUMN "profitValue" SET DEFAULT 50;
