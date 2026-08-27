-- Add publicToken columns as nullable first, backfill, then enforce NOT NULL + UNIQUE.
ALTER TABLE "projects" ADD COLUMN "publicToken" TEXT;
ALTER TABLE "quotes" ADD COLUMN "publicToken" TEXT;

UPDATE "projects" SET "publicToken" = gen_random_uuid()::text WHERE "publicToken" IS NULL;
UPDATE "quotes" SET "publicToken" = gen_random_uuid()::text WHERE "publicToken" IS NULL;

ALTER TABLE "projects" ALTER COLUMN "publicToken" SET NOT NULL;
ALTER TABLE "quotes" ALTER COLUMN "publicToken" SET NOT NULL;

CREATE UNIQUE INDEX "projects_publicToken_key" ON "projects"("publicToken");
CREATE UNIQUE INDEX "quotes_publicToken_key" ON "quotes"("publicToken");
