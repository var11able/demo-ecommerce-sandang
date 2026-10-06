CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'failed', 'expired', 'partially_refunded', 'refunded');

CREATE TABLE "payment" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "gateway" TEXT NOT NULL,
    "gateway_reference" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "amount" INTEGER NOT NULL,
    "method" TEXT,
    "snap_token" TEXT,
    "redirect_url" TEXT,
    "expires_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "review_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_notification" (
    "id" UUID NOT NULL,
    "payment_id" UUID,
    "gateway_reference" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_body" TEXT NOT NULL,
    "signature_valid" BOOLEAN NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "outcome" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_gateway_reference_key" ON "payment"("gateway_reference");

CREATE INDEX "payment_status_expires_at_idx" ON "payment"("status", "expires_at");

CREATE UNIQUE INDEX "payment_order_id_attempt_key" ON "payment"("order_id", "attempt");

CREATE INDEX "payment_notification_payment_id_idx" ON "payment_notification"("payment_id");

ALTER TABLE "payment" ADD CONSTRAINT "payment_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payment_notification" ADD CONSTRAINT "payment_notification_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payment" ADD CONSTRAINT "payment_amount_positive" CHECK ("amount" > 0);
CREATE UNIQUE INDEX "payment_one_paid_per_order" ON "payment" ("order_id") WHERE "status" IN ('paid', 'partially_refunded', 'refunded') AND "needs_review" = false;
