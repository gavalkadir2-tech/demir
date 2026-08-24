-- CreateEnum
CREATE TYPE "ProfilSekli" AS ENUM ('BOX', 'ANGLE', 'CHANNEL', 'ROUND_SOLID', 'ROUND_PIPE', 'FLAT');

-- AlterTable
ALTER TABLE "materials" ADD COLUMN     "heightMm" DOUBLE PRECISION,
ADD COLUMN     "profilSekli" "ProfilSekli",
ADD COLUMN     "widthMm" DOUBLE PRECISION;
