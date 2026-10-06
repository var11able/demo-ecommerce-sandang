ALTER TABLE "product" RENAME COLUMN "origin" TO "material";

ALTER TABLE "product" ADD COLUMN "colour_hex" TEXT,
ADD COLUMN "colour_name" TEXT,
ADD COLUMN "style_group" TEXT;

CREATE INDEX "product_style_group_idx" ON "product"("style_group");
