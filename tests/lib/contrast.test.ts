import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tokens = Object.fromEntries(
  [
    ...readFileSync("src/styles/tokens.css", "utf8").matchAll(
      /--color-([a-z-]+):\s*(#[0-9a-f]{6});/gi,
    ),
  ].map((match) => [match[1]!, match[2]!]),
);

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r, g, b] = channels.map((value) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(tokens[foreground]!), luminance(tokens[background]!)].sort(
    (a, b) => b - a,
  );
  return (light! + 0.05) / (dark! + 0.05);
}

const textPairs: [string, string][] = [
  ["ink", "page"],
  ["ink", "surface"],
  ["ink", "fog"],
  ["ink-soft", "page"],
  ["ink-soft", "surface"],
  ["ink-soft", "fog"],
  ["muted", "page"],
  ["muted", "surface"],
  ["muted", "fog"],
  ["surface", "ink"],
  ["surface", "ink-soft"],
  ["surface", "success"],
  ["surface", "warning"],
  ["surface", "danger"],
  ["success", "surface"],
  ["warning", "surface"],
  ["danger", "surface"],
  ["danger", "page"],
];

describe("colour contrast", () => {
  it("reads every colour token", () => {
    expect(Object.keys(tokens)).toEqual(
      expect.arrayContaining(["page", "ink", "ink-soft", "muted", "surface", "fog", "line"]),
    );
  });

  it.each(textPairs)("%s text on %s meets 4.5:1", (foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps interactive borders (Ink) at 3:1 or more against the page and surfaces", () => {
    expect(contrast("ink", "page")).toBeGreaterThanOrEqual(3);
    expect(contrast("ink", "surface")).toBeGreaterThanOrEqual(3);
    expect(contrast("ink", "fog")).toBeGreaterThanOrEqual(3);
  });
});
