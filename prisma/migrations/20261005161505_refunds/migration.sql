CREATE TYPE "RefundStatus" AS ENUM ('pending', 'succeeded', 'failed');

CREATE TABLE "refund" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "gateway_refund_key" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'pending',
    "failure_reason" TEXT,
    "requested_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "refund_gateway_refund_key_key" ON "refund"("gateway_refund_key");

CREATE INDEX "refund_payment_id_idx" ON "refund"("payment_id");

ALTER TABLE "refund" ADD CONSTRAINT "refund_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "refund" ADD CONSTRAINT "refund_amount_positive" CHECK ("amount" > 0);
