const clothingSizes = new Set(["XS", "S", "M", "L", "XL"]);

export function usesClothingSizes(variantNames: string[]): boolean {
  return variantNames.some((name) => clothingSizes.has(name));
}
