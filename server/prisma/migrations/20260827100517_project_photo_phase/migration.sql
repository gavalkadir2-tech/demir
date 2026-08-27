-- CreateEnum
CREATE TYPE "PhotoPhase" AS ENUM ('KESIF', 'URETIM', 'BOYA', 'MONTAJ', 'SON_HALI', 'DIGER');

-- AlterTable
ALTER TABLE "project_photos" ADD COLUMN     "phase" "PhotoPhase" NOT NULL DEFAULT 'DIGER';
