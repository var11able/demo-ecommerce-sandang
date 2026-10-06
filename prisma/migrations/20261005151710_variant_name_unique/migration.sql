DROP INDEX "variant_product_id_idx";

CREATE UNIQUE INDEX "variant_product_id_name_key" ON "variant"("product_id", "name");
