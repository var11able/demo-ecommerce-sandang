import "server-only";

export type SeedVariant = { name: string; price: number; stock: number; weightGrams: number };

export type SeedProduct = {
  slug: string;
  name: string;
  material: string;
  colour?: { name: string; hex: string };
  styleGroup?: string;
  description: string;
  images: string[];
  addedDaysAgo: number;
  variants: SeedVariant[];
};

export type SeedCategory = { slug: string; name: string; products: SeedProduct[] };

const photo = (file: string) => `/catalogue/${file}.jpg`;

const sizeNames = ["XS", "S", "M", "L", "XL"] as const;

function sizes(price: number, weightGrams: number, stock: readonly number[]): SeedVariant[] {
  return sizeNames.map((name, index) => ({
    name,
    price,
    stock: stock[index] ?? 0,
    weightGrams,
  }));
}

function oneSize(price: number, weightGrams: number, stock: number): SeedVariant[] {
  return [{ name: "One size", price, stock, weightGrams }];
}

export const demoCatalogue: SeedCategory[] = [
  {
    slug: "tops",
    name: "Tops",
    products: [
      {
        slug: "boxy-tee-white",
        name: "Boxy Tee",
        material: "100% organic cotton jersey, 220 gsm",
        colour: { name: "White", hex: "#f4f4f2" },
        styleGroup: "boxy-tee",
        description:
          "A heavyweight tee with a boxy body, dropped shoulders, and a close ribbed neck. Cut a little short so it sits right over high-waisted trousers.",
        images: [photo("tee-white"), photo("tee-white-worn")],
        addedDaysAgo: 2,
        variants: sizes(179000, 220, [20, 35, 40, 30, 15]),
      },
      {
        slug: "boxy-tee-sky",
        name: "Boxy Tee",
        material: "100% organic cotton jersey, 220 gsm",
        colour: { name: "Sky", hex: "#a9c1d9" },
        styleGroup: "boxy-tee",
        description:
          "A heavyweight tee with a boxy body, dropped shoulders, and a close ribbed neck, garment-dyed a washed sky blue.",
        images: [photo("tee-sky")],
        addedDaysAgo: 2,
        variants: sizes(179000, 220, [10, 18, 22, 14, 6]),
      },
      {
        slug: "crew-sweatshirt-white",
        name: "Crew Sweatshirt",
        material: "Brushed-back cotton fleece, 380 gsm",
        colour: { name: "White", hex: "#f2f1ec" },
        styleGroup: "crew-sweatshirt",
        description:
          "A relaxed crewneck in soft brushed fleece with ribbed cuffs and hem. Warm enough for air-conditioned offices, light enough for evenings.",
        images: [photo("sweatshirt-white")],
        addedDaysAgo: 12,
        variants: sizes(349000, 450, [8, 15, 20, 15, 8]),
      },
      {
        slug: "crew-sweatshirt-marigold",
        name: "Crew Sweatshirt",
        material: "Brushed-back cotton fleece, 380 gsm",
        colour: { name: "Marigold", hex: "#e08a2c" },
        styleGroup: "crew-sweatshirt",
        description:
          "A relaxed crewneck in soft brushed fleece with ribbed cuffs and hem, in a warm marigold that brightens plain denim.",
        images: [photo("sweatshirt-marigold")],
        addedDaysAgo: 12,
        variants: sizes(349000, 450, [5, 10, 12, 8, 4]),
      },
      {
        slug: "oxford-shirt-white",
        name: "Oxford Shirt",
        material: "Cotton oxford cloth",
        colour: { name: "White", hex: "#f7f7f5" },
        styleGroup: "oxford-shirt",
        description:
          "A button-down oxford with a soft collar roll and a single chest pocket. Washed after sewing, so it feels broken in from the first wear.",
        images: [photo("oxford-white")],
        addedDaysAgo: 40,
        variants: sizes(329000, 250, [10, 20, 25, 20, 10]),
      },
      {
        slug: "oxford-shirt-chambray",
        name: "Oxford Shirt",
        material: "Cotton chambray",
        colour: { name: "Chambray", hex: "#6f8fb3" },
        styleGroup: "oxford-shirt",
        description:
          "The oxford shirt in light chambray: a soft, faded blue that pairs with everything from chinos to linen shorts.",
        images: [photo("oxford-chambray")],
        addedDaysAgo: 40,
        variants: sizes(349000, 250, [6, 12, 14, 10, 6]),
      },
      {
        slug: "open-knit-sweater-oat",
        name: "Open-Knit Sweater",
        material: "Cotton and linen blend",
        colour: { name: "Oat", hex: "#cbb89a" },
        description:
          "A loose, airy knit with a wide neck and slightly cropped sleeves. Breathable enough for a tropical evening.",
        images: [photo("knit-oat")],
        addedDaysAgo: 65,
        variants: sizes(459000, 500, [0, 1, 2, 1, 0]),
      },
    ],
  },
  {
    slug: "bottoms",
    name: "Bottoms",
    products: [
      {
        slug: "straight-jeans-indigo",
        name: "Straight Jeans",
        material: "13 oz cotton denim",
        colour: { name: "Indigo", hex: "#2f3f5c" },
        styleGroup: "straight-jeans",
        description:
          "A mid-rise straight leg in rigid denim that softens and fades with wear. Five pockets, button fly, a full-length leg to cuff or crop.",
        images: [photo("jeans-indigo")],
        addedDaysAgo: 8,
        variants: sizes(499000, 650, [8, 15, 20, 15, 8]),
      },
      {
        slug: "straight-jeans-black",
        name: "Straight Jeans",
        material: "13 oz cotton denim",
        colour: { name: "Washed black", hex: "#2b2b2d" },
        styleGroup: "straight-jeans",
        description:
          "The straight jeans in a washed black that fades to charcoal. Mid rise, button fly, full-length leg.",
        images: [photo("jeans-black")],
        addedDaysAgo: 8,
        variants: sizes(499000, 650, [6, 12, 15, 12, 6]),
      },
      {
        slug: "tapered-chinos-khaki",
        name: "Tapered Chinos",
        material: "Cotton twill with a little stretch",
        colour: { name: "Khaki", hex: "#b59f78" },
        description:
          "Clean chinos with a tapered leg and a slim ankle. Smart enough for the office, easy enough for the weekend.",
        images: [photo("chinos-khaki")],
        addedDaysAgo: 50,
        variants: sizes(389000, 450, [6, 14, 18, 14, 6]),
      },
      {
        slug: "track-pants-blush",
        name: "Track Pants",
        material: "Recycled polyester tricot",
        colour: { name: "Blush", hex: "#e2b5a6" },
        styleGroup: "track-pants",
        description:
          "Lightweight track pants with an elastic waist, a drawcord, and gathered cuffs. Made from recycled bottles.",
        images: [photo("joggers-blush")],
        addedDaysAgo: 20,
        variants: sizes(299000, 350, [8, 12, 14, 10, 5]),
      },
      {
        slug: "track-pants-marigold",
        name: "Track Pants",
        material: "Recycled polyester tricot",
        colour: { name: "Marigold", hex: "#e8b21f" },
        styleGroup: "track-pants",
        description:
          "The track pants in bright marigold. Elastic waist, drawcord, gathered cuffs; wear them with the matching jacket or a plain white tee.",
        images: [photo("joggers-marigold")],
        addedDaysAgo: 20,
        variants: sizes(299000, 350, [4, 8, 10, 8, 4]),
      },
    ],
  },
  {
    slug: "dresses-and-skirts",
    name: "Dresses & Skirts",
    products: [
      {
        slug: "shirt-dress-chambray",
        name: "Shirt Dress",
        material: "Cotton chambray",
        colour: { name: "Chambray", hex: "#7f9bbd" },
        description:
          "A button-through dress with short sleeves, a gathered skirt, and a self-tie belt. Light, washable, and easy to wear all day.",
        images: [photo("shirt-dress-chambray")],
        addedDaysAgo: 5,
        variants: sizes(529000, 350, [5, 10, 12, 8, 4]),
      },
      {
        slug: "pleated-skirt-black",
        name: "Pleated Mini Skirt",
        material: "Polyester crepe",
        colour: { name: "Black", hex: "#1a1a1a" },
        description:
          "A high-waisted mini skirt with soft knife pleats that hold their shape through the wash. Concealed side zip.",
        images: [photo("skirt-black")],
        addedDaysAgo: 30,
        variants: sizes(289000, 250, [6, 12, 15, 10, 5]),
      },
      {
        slug: "wrap-dress-red-floral",
        name: "Floral Wrap Dress",
        material: "Viscose crepe",
        colour: { name: "Red floral", hex: "#c23a33" },
        description:
          "A knee-length dress with short flutter sleeves, a waist that ties, and a full skirt that moves well. Printed with small white flowers on red.",
        images: [photo("dress-red-floral")],
        addedDaysAgo: 15,
        variants: sizes(599000, 380, [4, 8, 10, 6, 3]),
      },
      {
        slug: "off-shoulder-dress-white",
        name: "Off-Shoulder Mini Dress",
        material: "Cotton poplin",
        colour: { name: "White", hex: "#f6f5f1" },
        description:
          "A short dress with an elasticated off-shoulder neckline and a tiered skirt. Crisp cotton that stays cool in the heat.",
        images: [photo("dress-white")],
        addedDaysAgo: 70,
        variants: sizes(459000, 300, [5, 9, 10, 7, 3]),
      },
    ],
  },
  {
    slug: "outerwear",
    name: "Outerwear",
    products: [
      {
        slug: "biker-jacket-black",
        name: "Biker Jacket",
        material: "Vegetable-tanned leather, cotton lining",
        colour: { name: "Black", hex: "#141414" },
        styleGroup: "biker-jacket",
        description:
          "A classic asymmetric biker with a notched collar, zip cuffs, and a belted hem. The leather softens and takes on character over the years.",
        images: [photo("biker-black")],
        addedDaysAgo: 4,
        variants: sizes(1290000, 1500, [2, 4, 5, 4, 2]),
      },
      {
        slug: "biker-jacket-brown",
        name: "Biker Jacket",
        material: "Vegetable-tanned leather, cotton lining",
        colour: { name: "Chestnut", hex: "#6b4532" },
        styleGroup: "biker-jacket",
        description:
          "The biker jacket in chestnut brown leather. Asymmetric zip, notched collar, zip cuffs, and a belted hem.",
        images: [photo("biker-brown")],
        addedDaysAgo: 4,
        variants: sizes(1290000, 1500, [1, 3, 4, 3, 1]),
      },
      {
        slug: "bomber-jacket-rust",
        name: "Bomber Jacket",
        material: "Nylon shell, polyester lining",
        colour: { name: "Rust", hex: "#b5643c" },
        description:
          "A light bomber with a ribbed collar, cuffs, and hem. Water-repellent shell for sudden afternoon rain.",
        images: [photo("bomber-rust")],
        addedDaysAgo: 25,
        variants: sizes(699000, 700, [4, 8, 10, 8, 4]),
      },
      {
        slug: "utility-jacket-olive",
        name: "Utility Jacket",
        material: "Washed cotton canvas",
        colour: { name: "Olive", hex: "#6b6a4b" },
        description:
          "A field jacket with four patch pockets, a drawcord waist, and a stand collar. Washed canvas that already feels worn in.",
        images: [photo("utility-olive")],
        addedDaysAgo: 45,
        variants: sizes(749000, 800, [3, 6, 8, 6, 3]),
      },
      {
        slug: "shearling-jacket-brown",
        name: "Shearling Collar Jacket",
        material: "Suede-effect cotton, faux shearling collar",
        colour: { name: "Tobacco", hex: "#7a5236" },
        description:
          "A boxy jacket with a warm faux-shearling collar and lining. Sold out for now; more are on the way.",
        images: [photo("shearling-brown")],
        addedDaysAgo: 110,
        variants: sizes(1490000, 1600, [0, 0, 0, 0, 0]),
      },
    ],
  },
  {
    slug: "accessories",
    name: "Accessories",
    products: [
      {
        slug: "woven-tote-tangerine",
        name: "Woven Tote",
        material: "Hand-woven rattan, leather handles",
        colour: { name: "Tangerine", hex: "#e2702b" },
        description:
          "A structured tote woven by hand from rattan, with leather handles and a clasp. The small holds a phone and a wallet; the large takes a laptop.",
        images: [photo("tote-tangerine")],
        addedDaysAgo: 6,
        variants: [
          { name: "Small", price: 449000, stock: 12, weightGrams: 500 },
          { name: "Large", price: 549000, stock: 8, weightGrams: 700 },
        ],
      },
      {
        slug: "top-handle-bag-red",
        name: "Top-Handle Bag",
        material: "Smooth leather",
        colour: { name: "Red", hex: "#c8302b" },
        description:
          "A small, structured bag with a top handle, a turn-lock, and a detachable strap to wear across the body.",
        images: [photo("bag-red")],
        addedDaysAgo: 18,
        variants: oneSize(899000, 800, 10),
      },
      {
        slug: "canvas-backpack-navy",
        name: "Canvas Backpack",
        material: "Waxed cotton canvas",
        colour: { name: "Navy", hex: "#283651" },
        description:
          "A simple daypack with a padded laptop sleeve, a front pocket, and a water-resistant waxed finish.",
        images: [photo("backpack-navy")],
        addedDaysAgo: 55,
        variants: oneSize(449000, 700, 15),
      },
      {
        slug: "trucker-cap-white",
        name: "Trucker Cap",
        material: "Cotton twill front, polyester mesh back",
        colour: { name: "White", hex: "#f5f5f3" },
        description:
          "A six-panel cap with a curved brim and a snap back that fits most heads. Plain, with no logo.",
        images: [photo("cap-white")],
        addedDaysAgo: 35,
        variants: oneSize(149000, 120, 40),
      },
    ],
  },
];
