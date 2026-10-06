const rupiahFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export function formatRupiah(amount: number): string {
  return `Rp ${rupiahFormatter.format(amount)}`;
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

export function formatDateTime(value: string | Date): string {
  return `${dateTimeFormatter.format(new Date(value))} WIB`;
}

export function formatDate(value: string | Date): string {
  return dateFormatter.format(new Date(value));
}
