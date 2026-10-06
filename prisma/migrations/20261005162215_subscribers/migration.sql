CREATE TABLE "subscriber" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "unsubscribe_token" TEXT NOT NULL,
    "subscribed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscriber_email_key" ON "subscriber"("email");

CREATE UNIQUE INDEX "subscriber_unsubscribe_token_key" ON "subscriber"("unsubscribe_token");
