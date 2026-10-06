import "server-only";

export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
}

export function maskName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1)}***`)
    .join(" ");
}

export function maskPhone(phone: string): string {
  return phone.length <= 6 ? "***" : `${phone.slice(0, 5)}****${phone.slice(-3)}`;
}

export function maskText(text: string): string {
  return text.length === 0 ? text : "***";
}

export type Viewer = { id: string; role: "customer" | "admin" | "demo_admin" };

export function shouldMask(
  viewer: Viewer,
  subject: { isSeeded: boolean; role: string } | null,
): boolean {
  if (viewer.role !== "demo_admin") {
    return false;
  }
  return !(subject?.isSeeded && subject.role === "customer");
}
