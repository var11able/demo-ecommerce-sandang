export type HelpTable = {
  caption: string;
  columns: string[];
  rows: { label: string; cells: string[] }[];
};

export type HelpSection = {
  heading: string;
  paragraphs: string[];
  list?: string[];
  table?: HelpTable;
};

export type HelpPage = {
  slug: "shipping-and-returns" | "size-guide" | "how-to-pay" | "contact" | "privacy";
  title: string;
  intro: string;
  sections: HelpSection[];
};

export const storeEmail = "hello@sandang.example";

export const helpPages: HelpPage[] = [
  {
    slug: "shipping-and-returns",
    title: "Shipping and returns",
    intro: "We pack every order by hand in Jakarta and send it anywhere in Indonesia.",
    sections: [
      {
        heading: "Where we ship",
        paragraphs: [
          "We deliver to every province in Indonesia. We do not ship outside the country yet.",
        ],
      },
      {
        heading: "Shipping fee",
        paragraphs: [
          "Every order pays one flat Shipping fee of Rp 20.000, wherever it goes and however much it weighs. You see it in your cart before you check out.",
        ],
      },
      {
        heading: "How long it takes",
        paragraphs: [
          "We pack paid orders within one working day. Delivery usually takes two to three days in Java and Bali, and three to seven days elsewhere.",
          "When your order leaves us, its status changes to Shipped on your order page.",
        ],
      },
      {
        heading: "Returns and exchanges",
        paragraphs: [
          "Changed your mind, or the size is wrong? Send unworn, unwashed clothes back with their tags within 14 days of delivery. Email us your order number first and we will tell you where to send them.",
          "For a different size, say which one in your email. We send it as soon as the return reaches us, with no second Shipping fee. If that size has sold out, we refund you instead.",
          "If something arrives damaged or wrong, email us within seven days with a photo and we will replace or refund it and pay for the return.",
          "Refunds go back to the method you paid with. Some methods take a few working days to show the money.",
        ],
      },
    ],
  },
  {
    slug: "size-guide",
    title: "Size guide",
    intro:
      "Our sizes are made to body measurements, not garment measurements. Find your size from the table, then check the fit notes on the product page.",
    sections: [
      {
        heading: "Body measurements",
        paragraphs: [
          "If you fall between two sizes, take the larger for a relaxed fit or the smaller for a closer one.",
        ],
        table: {
          caption: "Body measurements in centimetres",
          columns: ["Size", "Chest", "Waist", "Hips"],
          rows: [
            { label: "XS", cells: ["80–84", "62–66", "86–90"] },
            { label: "S", cells: ["86–90", "68–72", "92–96"] },
            { label: "M", cells: ["92–96", "74–78", "98–102"] },
            { label: "L", cells: ["98–104", "80–86", "104–110"] },
            { label: "XL", cells: ["106–112", "88–94", "112–118"] },
          ],
        },
      },
      {
        heading: "How to measure",
        paragraphs: [
          "Use a soft tape measure over light clothing, keeping it level and snug but not tight.",
        ],
        list: [
          "Chest: around the fullest part of your chest, under the arms",
          "Waist: around your natural waist, the narrowest part of your body",
          "Hips: around the fullest part of your hips, with your feet together",
        ],
      },
      {
        heading: "Bags and caps",
        paragraphs: [
          "These come in one size, or in the sizes named on the product page, with their dimensions in the description.",
        ],
      },
    ],
  },
  {
    slug: "how-to-pay",
    title: "How to pay",
    intro:
      "Payments go through Midtrans, a licensed Indonesian payment gateway. Your card details never reach us.",
    sections: [
      {
        heading: "Ways to pay",
        paragraphs: ["When you place an order, the Midtrans window opens. Choose one of:"],
        list: [
          "QRIS, from any banking or e-wallet app",
          "GoPay, ShopeePay, OVO, or DANA",
          "Bank transfer to a virtual account (BCA, BNI, BRI, Mandiri, Permata, and others)",
          "Credit or debit card",
          "Alfamart or Indomaret counters",
        ],
      },
      {
        heading: "After you pay",
        paragraphs: [
          "Card and e-wallet payments are confirmed in seconds. Bank transfers and counter payments are confirmed when the money reaches Midtrans, which can take a few minutes. Your order page updates by itself; you do not need to keep it open.",
          "You will never be asked to pay twice. If a payment is still being checked, wait for it before trying again.",
        ],
      },
      {
        heading: "If a payment expires",
        paragraphs: [
          "Each payment has one hour to complete. If it runs out, open your order and choose Pay again. You have 24 hours from placing the order; after that it is cancelled and the items go back into stock.",
        ],
      },
    ],
  },
  {
    slug: "contact",
    title: "Contact",
    intro: "Questions about an order, a product, or anything else.",
    sections: [
      {
        heading: "Email",
        paragraphs: [
          `Write to ${storeEmail}. Put your order number in the subject if you have one.`,
          "We reply within one working day, Monday to Friday, 09.00 to 17.00 WIB.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy",
    intro: "What we collect, why, and how to have it removed.",
    sections: [
      {
        heading: "What we collect",
        paragraphs: ["Only what an order or a sign-up needs:"],
        list: [
          "Your name, email address, and password (stored only as a one-way hash) when you create an account",
          "The recipient's name, mobile number, and delivery address for each order",
          "Your email address if you sign up for news about new products",
        ],
      },
      {
        heading: "What we do not collect",
        paragraphs: [
          "Card numbers and banking details go straight to Midtrans and never reach us. We do not use advertising trackers.",
        ],
      },
      {
        heading: "Why we keep it",
        paragraphs: [
          "To deliver your orders, to show you your order history, and to tell you about new products if you asked us to. We do not sell or share your details, except with the courier who delivers your order and with Midtrans to take your payment.",
        ],
      },
      {
        heading: "Removing your details",
        paragraphs: [
          `Every newsletter email has an unsubscribe link. To have your account and orders deleted, email ${storeEmail} from the address on your account. We do it within 14 days, except for records the law requires us to keep.`,
        ],
      },
    ],
  },
];

export const sandboxPaymentDetails: HelpSection = {
  heading: "Test payment details for this demo",
  paragraphs: [
    "This store runs on the Midtrans sandbox. No real money moves, and nothing will be delivered. To try a purchase, use these:",
  ],
  list: [
    "Card: 4811 1111 1111 1114, any future expiry date, CVV 123. If asked for an OTP, enter 112233.",
    "Bank transfer: choose any bank, copy the virtual account number, and pay it on the Midtrans payment simulator at simulator.sandbox.midtrans.com.",
    "QRIS or GoPay: open the QR code image link from the Midtrans window and paste it into the QRIS simulator on the same site.",
  ],
};

export function findHelpPage(slug: string): HelpPage | undefined {
  return helpPages.find((page) => page.slug === slug);
}

export const helpLinks = helpPages.map((page) => ({
  href: page.slug === "privacy" ? "/privacy" : `/help/${page.slug}`,
  label: page.title,
}));
