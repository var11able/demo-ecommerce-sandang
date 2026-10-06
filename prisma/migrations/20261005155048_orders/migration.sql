CREATE TYPE "OrderStatus" AS ENUM ('awaiting_payment', 'paid', 'shipped', 'completed', 'cancelled', 'refunded');

CREATE TABLE "order" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "order_number" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'awaiting_payment',
    "subtotal" INTEGER NOT NULL,
    "shipping_fee" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "pay_by" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "shipped_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_line" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "product_name" TEXT NOT NULL,
    "variant_name" TEXT NOT NULL,
    "product_slug" TEXT NOT NULL,
    "image" TEXT,
    "unit_price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_line_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_order_number_key" ON "order"("order_number");

CREATE INDEX "order_customer_id_created_at_idx" ON "order"("customer_id", "created_at");

CREATE INDEX "order_status_pay_by_idx" ON "order"("status", "pay_by");

CREATE INDEX "order_line_order_id_idx" ON "order_line"("order_id");

ALTER TABLE "order" ADD CONSTRAINT "order_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_line" ADD CONSTRAINT "order_line_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_line" ADD CONSTRAINT "order_line_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE SEQUENCE "order_number_seq" START 1;

ALTER TABLE "order" ADD CONSTRAINT "order_amounts_not_negative" CHECK ("subtotal" >= 0 AND "shipping_fee" >= 0 AND "total" = "subtotal" + "shipping_fee");
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_unit_price_not_negative" CHECK ("unit_price" >= 0);
