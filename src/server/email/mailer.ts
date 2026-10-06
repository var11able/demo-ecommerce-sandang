import "server-only";
import type { Transaction } from "../db";

export type EmailKind = "order_confirmed" | "order_shipped" | "password_reset";

export type OutgoingEmail = {
  kind: EmailKind;
  dedupeKey: string;
  customerId: string;
  orderId: string | null;
  to: string;
  subject: string;
  body: string;
};

export interface Mailer {
  send(tx: Transaction, email: OutgoingEmail): Promise<void>;
}

export const outboxMailer: Mailer = {
  async send(tx, email) {
    await tx.emailMessage.createMany({
      data: [
        {
          kind: email.kind,
          dedupeKey: email.dedupeKey,
          customerId: email.customerId,
          orderId: email.orderId,
          toAddress: email.to,
          subject: email.subject,
          body: email.body,
        },
      ],
      skipDuplicates: true,
    });
  },
};
