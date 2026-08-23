-- CreateEnum
CREATE TYPE "ProjectCategory" AS ENUM ('RAILING', 'STAIRS', 'CANOPY', 'ROOF', 'DOOR', 'FORGE', 'STEEL_STRUCTURE', 'CHASSIS', 'SHELF', 'TABLE', 'WORKBENCH', 'CUSTOM', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'CALCULATED', 'QUOTE_READY', 'QUOTE_SENT', 'APPROVED', 'IN_PRODUCTION', 'INSTALLING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LaborMode" AS ENUM ('PER_METER', 'PER_HOUR', 'FIXED');

-- CreateEnum
CREATE TYPE "ProfitMode" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "MaterialCategory" AS ENUM ('PROFILE', 'SHEET', 'CONSUMABLE', 'FASTENER', 'OTHER');

-- CreateEnum
CREATE TYPE "MaterialUnit" AS ENUM ('M', 'KG', 'ADET', 'M2');

-- CreateEnum
CREATE TYPE "LaborType" AS ENUM ('WELDING', 'CUTTING', 'ASSEMBLY', 'PAINTING', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('TRANSPORT', 'INSTALLATION', 'PAINT', 'CONSUMABLE', 'OTHER');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "QuoteItemType" AS ENUM ('MATERIAL', 'LABOR', 'EXPENSE', 'PRODUCT');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "companyName" TEXT NOT NULL DEFAULT 'Atölyem',
    "logoUrl" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "taxNumber" TEXT,
    "defaultVatPercent" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "defaultProfitPercent" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "quoteValidityDays" INTEGER NOT NULL DEFAULT 15,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "category" "ProjectCategory" NOT NULL DEFAULT 'OTHER',
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "laborMode" "LaborMode" NOT NULL DEFAULT 'PER_HOUR',
    "laborRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overheadPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profitMode" "ProfitMode" NOT NULL DEFAULT 'PERCENT',
    "profitValue" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "vatPercent" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "validityDays" INTEGER NOT NULL DEFAULT 15,
    "stockDeducted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_templates" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "product_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_items" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "templateId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "paramsJson" JSONB NOT NULL,
    "resultJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" "MaterialCategory" NOT NULL DEFAULT 'PROFILE',
    "section" TEXT,
    "thicknessMm" DOUBLE PRECISION,
    "standardLengthM" DOUBLE PRECISION,
    "sheetWidthMm" DOUBLE PRECISION,
    "sheetHeightMm" DOUBLE PRECISION,
    "unit" "MaterialUnit" NOT NULL DEFAULT 'M',
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitWeightKgPerM" DOUBLE PRECISION,
    "kgPerM2" DOUBLE PRECISION,
    "kerfMm" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "stockQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minStockQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "supplier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_prices" (
    "id" SERIAL NOT NULL,
    "materialId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "projectItemId" INTEGER,
    "materialId" INTEGER NOT NULL,
    "label" TEXT,
    "lengthMm" DOUBLE PRECISION NOT NULL,
    "qty" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" SERIAL NOT NULL,
    "materialId" INTEGER NOT NULL,
    "projectId" INTEGER,
    "qtyDelta" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cutting_lists" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "standardLengthMm" DOUBLE PRECISION NOT NULL,
    "kerfMm" DOUBLE PRECISION NOT NULL,
    "barsJson" JSONB NOT NULL,
    "totalBars" INTEGER NOT NULL,
    "totalWasteMm" DOUBLE PRECISION NOT NULL,
    "wastePercent" DOUBLE PRECISION NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cutting_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labor_items" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "type" "LaborType" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "hours" DOUBLE PRECISION,
    "rate" DOUBLE PRECISION,
    "fixedAmount" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "labor_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "type" "ExpenseType" NOT NULL DEFAULT 'OTHER',
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "materialCost" DOUBLE PRECISION NOT NULL,
    "wasteCost" DOUBLE PRECISION NOT NULL,
    "consumableCost" DOUBLE PRECISION NOT NULL,
    "laborCost" DOUBLE PRECISION NOT NULL,
    "paintCost" DOUBLE PRECISION NOT NULL,
    "transportCost" DOUBLE PRECISION NOT NULL,
    "installCost" DOUBLE PRECISION NOT NULL,
    "otherCost" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "profitAmount" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "vatPercent" DOUBLE PRECISION NOT NULL,
    "vatAmount" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_items" (
    "id" SERIAL NOT NULL,
    "quoteId" INTEGER NOT NULL,
    "type" "QuoteItemType" NOT NULL,
    "description" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "lineTotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "product_templates_key_key" ON "product_templates"("key");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_quoteNumber_key" ON "quotes"("quoteNumber");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_items" ADD CONSTRAINT "project_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_items" ADD CONSTRAINT "project_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "product_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_prices" ADD CONSTRAINT "material_prices_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parts" ADD CONSTRAINT "parts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parts" ADD CONSTRAINT "parts_projectItemId_fkey" FOREIGN KEY ("projectItemId") REFERENCES "project_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parts" ADD CONSTRAINT "parts_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cutting_lists" ADD CONSTRAINT "cutting_lists_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cutting_lists" ADD CONSTRAINT "cutting_lists_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_items" ADD CONSTRAINT "labor_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
