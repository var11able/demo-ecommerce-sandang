import "server-only";
import type { PaymentGateway } from "./gateway";
import { createMidtransGateway } from "./midtrans";

let activeGateway: PaymentGateway | undefined;

export function getPaymentGateway(): PaymentGateway {
  activeGateway ??= createMidtransGateway();
  return activeGateway;
}

export function usePaymentGateway(gateway: PaymentGateway | undefined): void {
  activeGateway = gateway;
}
