import "server-only";

export const storeName = "Sandang";

const rupiahFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

function rupiah(amount: number): string {
  return `Rp ${rupiahFormatter.format(amount)}`;
}

export type OrderForEmail = {
  orderNumber: string;
  customerName: string;
  recipientName: string;
  street: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  lines: { productName: string; variantName: string; quantity: number; unitPrice: number }[];
};

function lineList(order: OrderForEmail): string[] {
  return order.lines.map(
    (line) =>
      `${line.productName}, ${line.variantName} × ${line.quantity}: ${rupiah(line.unitPrice * line.quantity)}`,
  );
}

function address(order: OrderForEmail): string[] {
  return [
    order.recipientName,
    order.street,
    `${order.district}, ${order.city}`,
    `${order.province} ${order.postalCode}`,
  ];
}

export function orderConfirmedEmail(order: OrderForEmail, orderUrl: string) {
  return {
    subject: `Order ${order.orderNumber} is confirmed`,
    body: [
      `Hello ${order.customerName},`,
      "",
      `We have received your payment for order ${order.orderNumber}. We pack paid orders within one working day and will email you when it ships.`,
      "",
      ...lineList(order),
      `Subtotal: ${rupiah(order.subtotal)}`,
      `Shipping fee: ${rupiah(order.shippingFee)}`,
      `Order total: ${rupiah(order.total)}`,
      "",
      "Delivering to:",
      ...address(order),
      "",
      `See your order: ${orderUrl}`,
      "",
      storeName,
    ].join("\n"),
  };
}

export function passwordResetEmail(name: string, resetUrl: string, minutes: number) {
  return {
    subject: `Reset your ${storeName} password`,
    body: [
      `Hello ${name},`,
      "",
      "Someone asked to reset the password of your account. If it was you, open this link to choose a new one:",
      "",
      resetUrl,
      "",
      `The link works once, for ${minutes} minutes. If you did not ask, ignore this email and your password stays the same.`,
      "",
      storeName,
    ].join("\n"),
  };
}

export function orderShippedEmail(order: OrderForEmail, orderUrl: string) {
  return {
    subject: `Order ${order.orderNumber} has shipped`,
    body: [
      `Hello ${order.customerName},`,
      "",
      `Order ${order.orderNumber} is on its way. Delivery usually takes two to three days in Java and Bali, and three to seven days elsewhere.`,
      "",
      ...lineList(order),
      "",
      "Delivering to:",
      ...address(order),
      "",
      `See your order: ${orderUrl}`,
      "",
      storeName,
    ].join("\n"),
  };
}
