import { homePhotos } from "./home-photos";

export type Photographer = { name: string; username: string };

export type PhotoCredit = {
  image: string;
  subject: string;
  group: "products" | "home";
  photographer: Photographer | null;
  source: string;
};

const referral = "utm_source=sandang&utm_medium=referral";

export function photographerProfile(photographer: Photographer): string {
  return `https://unsplash.com/@${photographer.username}?${referral}`;
}

export const unsplashHome = `https://unsplash.com/?${referral}`;

function credited(
  image: string,
  subject: string,
  photographer: Photographer,
  page: string,
  group: PhotoCredit["group"] = "products",
): PhotoCredit {
  return {
    image,
    subject,
    group,
    photographer,
    source: `https://unsplash.com/photos/${page}?${referral}`,
  };
}

function uncredited(
  image: string,
  subject: string,
  photoId: string,
  group: PhotoCredit["group"] = "products",
): PhotoCredit {
  return {
    image,
    subject,
    group,
    photographer: null,
    source: `https://images.unsplash.com/photo-${photoId}`,
  };
}

const mediamodifier = { name: "Mediamodifier", username: "mediamodifier" };
const toaHeftiba = { name: "Toa Heftiba", username: "heftiba" };
const enginAkyurt = { name: "engin akyurt", username: "enginakyurt" };
const arnoSenoner = { name: "Arno Senoner", username: "arnosenoner" };

export const photoCredits: PhotoCredit[] = [
  credited(
    "/catalogue/tee-white.jpg",
    "Boxy Tee, White",
    mediamodifier,
    "white-crew-neck-shirt-on-white-and-green-floral-textile-JskqEILt-ds",
  ),
  credited(
    "/catalogue/tee-white-worn.jpg",
    "Boxy Tee, White (worn)",
    { name: "Anomaly", username: "anomaly" },
    "man-wearing-white-crew-neck-t-shirts-WWesmHEgXDs",
  ),
  credited(
    "/catalogue/tee-sky.jpg",
    "Boxy Tee, Sky",
    { name: "Cristofer Maximilian", username: "cristofer" },
    "hanged-grey-shirt-on-white-wall-AqLIkOzWDAk",
  ),
  credited(
    "/catalogue/sweatshirt-white.jpg",
    "Crew Sweatshirt, White",
    mediamodifier,
    "white-crew-neck-long-sleeve-shirt-7cERndkOyDw",
  ),
  credited(
    "/catalogue/sweatshirt-marigold.jpg",
    "Crew Sweatshirt, Marigold",
    { name: "Matas Katinas", username: "matuxee" },
    "woman-wearing-orange-crew-neck-sweatshirt-standing-while-putting-right-hand-on-her-head-7ITfJfAxxY4",
  ),
  credited(
    "/catalogue/oxford-white.jpg",
    "Oxford Shirt, White",
    { name: "Benjamin R.", username: "dapperprofessional" },
    "man-in-white-dress-shirt-with-black-and-white-polka-dots-necktie-WdhmRPvMn7A",
  ),
  credited(
    "/catalogue/oxford-chambray.jpg",
    "Oxford Shirt, Chambray",
    { name: "Santhosh Kumar", username: "shivsantos" },
    "blue-heart-pattern-button-down-shirt-RqYTuWkTdEs",
  ),
  credited(
    "/catalogue/knit-oat.jpg",
    "Open-Knit Sweater, Oat",
    toaHeftiba,
    "a-sweater-hanging-on-a-hook-in-a-room-mavrg7cLwbA",
  ),
  credited(
    "/catalogue/jeans-indigo.jpg",
    "Straight Jeans, Indigo",
    { name: "Maude Frédérique Lavoie", username: "maudefl" },
    "person-holding-stack-of-denim-jeans-EDSTj4kCUcw",
  ),
  credited(
    "/catalogue/jeans-black.jpg",
    "Straight Jeans, Washed black",
    { name: "Matthew Moloney", username: "mattmoloney" },
    "blue-denim-jeans-on-white-textile-YeGao3uk8kI",
  ),
  credited(
    "/catalogue/chinos-khaki.jpg",
    "Tapered Chinos, Khaki",
    { name: "Redd Francisco", username: "reddfrancisco" },
    "man-wearing-brown-fitted-jeans-and-sneakers-standing-on-road-at-daytime-jC7nVH_Sw8k",
  ),
  credited(
    "/catalogue/joggers-blush.jpg",
    "Track Pants, Blush",
    enginAkyurt,
    "person-in-pink-pants-and-white-shoes-5raPrOhbKQo",
  ),
  credited(
    "/catalogue/joggers-marigold.jpg",
    "Track Pants, Marigold",
    { name: "Dom Hill", username: "domjewel" },
    "woman-in-yellow-tracksuit-standing-on-basketball-court-side-nimElTcTNyY",
  ),
  credited(
    "/catalogue/shirt-dress-chambray.jpg",
    "Shirt Dress, Chambray",
    enginAkyurt,
    "woman-in-blue-button-up-shirt-TDOClniEwmI",
  ),
  uncredited(
    "/catalogue/skirt-black.jpg",
    "Pleated Mini Skirt, Black",
    "1583496661160-fb5886a0aaaa",
  ),
  uncredited(
    "/catalogue/dress-red-floral.jpg",
    "Floral Wrap Dress, Red floral",
    "1572804013309-59a88b7e92f1",
  ),
  credited(
    "/catalogue/dress-white.jpg",
    "Off-Shoulder Mini Dress, White",
    { name: "gbarkz", username: "gbarkz" },
    "woman-walking-down-stair-under-clear-blue-sky-during-daytime-vqKnuG8GaQc",
  ),
  credited(
    "/catalogue/biker-black.jpg",
    "Biker Jacket, Black",
    { name: "Lea Øchel", username: "lealea_leaa" },
    "black-leather-zip-up-jacket-on-white-textile-nsRBbE6-YLs",
  ),
  uncredited("/catalogue/biker-brown.jpg", "Biker Jacket, Chestnut", "1487222477894-8943e31ef7b2"),
  credited(
    "/catalogue/bomber-rust.jpg",
    "Bomber Jacket, Rust",
    { name: "Tobias Tullius", username: "tobiastu" },
    "brown-bomber-jacket-on-hanger-Fg15LdqpWrs",
  ),
  credited(
    "/catalogue/utility-olive.jpg",
    "Utility Jacket, Olive",
    toaHeftiba,
    "woman-in-brown-jacket-with-white-inner-shirt-and-blue-denim-jeans-ua9ReZlzcIE",
  ),
  credited(
    "/catalogue/shearling-brown.jpg",
    "Shearling Collar Jacket, Tobacco",
    { name: "Marcel Strauß", username: "martzzl" },
    "woman-in-brown-coat-and-gray-knit-cap-hwLiTFTGJCY",
  ),
  credited(
    "/catalogue/tote-tangerine.jpg",
    "Woven Tote, Tangerine",
    arnoSenoner,
    "brown-leather-handbag-on-brown-wooden-table-ZT16YkAYueo",
  ),
  credited(
    "/catalogue/bag-red.jpg",
    "Top-Handle Bag, Red",
    arnoSenoner,
    "red-leather-handbag-on-white-table-oCXVxwTFwqE",
  ),
  credited(
    "/catalogue/backpack-navy.jpg",
    "Canvas Backpack, Navy",
    { name: "Sun Lingyan", username: "sunlingyan" },
    "black-backpack-on-white-floor-_H0fjILH5Vw",
  ),
  credited(
    "/catalogue/cap-white.jpg",
    "Trucker Cap, White",
    mediamodifier,
    "white-baseball-cap-on-white-surface-t8HiP3e5abg",
  ),
  credited(
    homePhotos.hero,
    "Home page, linen and knitwear on a rail",
    { name: "Alyssa Strohmann", username: "anotherlovely" },
    "hanged-top-on-brown-and-white-clothes-horse-TS--uNw-JqE",
    "home",
  ),
  uncredited(
    homePhotos.outerwear,
    "Home page, a man sitting beneath a round window",
    "1488161628813-04466f872be2",
    "home",
  ),
  credited(
    homePhotos.dresses,
    "Home page, a floral dress by the sea",
    { name: "Tamara Bellis", username: "tamarabellis" },
    "woman-walking-on-seaside-while-holding-woven-bag-68csPWTnafo",
    "home",
  ),
];
