import { describe, expect, it } from "vitest";
import { formatRupiah } from "@/lib/format";

describe("formatRupiah", () => {
  it("writes rupiah with dots between thousands", () => {
    expect(formatRupiah(98000)).toBe("Rp 98.000");
    expect(formatRupiah(1250000)).toBe("Rp 1.250.000");
    expect(formatRupiah(0)).toBe("Rp 0");
  });
});
