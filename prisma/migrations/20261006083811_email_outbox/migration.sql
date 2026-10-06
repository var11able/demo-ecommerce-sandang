CREATE TYPE "EmailKind" AS ENUM ('order_confirmed', 'order_shipped', 'password_reset');

CREATE TYPE "EmailStatus" AS ENUM ('recorded', 'sent', 'failed');

CREATE TABLE "email_message" (
    "id" UUID NOT NULL,
    "kind" "EmailKind" NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "order_id" UUID,
    "to_address" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'recorded',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_message_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_message_dedupe_key_key" ON "email_message"("dedupe_key");

CREATE INDEX "email_message_created_at_idx" ON "email_message"("created_at");

CREATE INDEX "email_message_customer_id_idx" ON "email_message"("customer_id");

CREATE INDEX "email_message_order_id_idx" ON "email_message"("order_id");

ALTER TABLE "email_message" ADD CONSTRAINT "email_message_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "email_message" ADD CONSTRAINT "email_message_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
