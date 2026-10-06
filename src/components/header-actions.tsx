import Link from "next/link";
import { copy } from "@/lib/copy";
import { durations } from "@/lib/motion-presets";
import { SwapText } from "./motion/swap";
import { navPillClasses } from "./ui/nav-pill";

export function HeaderActions({ loggedIn, cartCount }: { loggedIn: boolean; cartCount: number }) {
  return (
    <>
      <Link href={loggedIn ? "/account" : "/login"} className={navPillClasses(false)}>
        {loggedIn ? copy.nav.account : copy.nav.logIn}
      </Link>
      <Link
        href="/cart"
        aria-label={copy.cart.countLabel(cartCount)}
        className={navPillClasses(cartCount > 0)}
      >
        <span className="tabular">
          <SwapText swapKey={String(cartCount)} duration={durations.quick}>
            {copy.cart.count(cartCount)}
          </SwapText>
        </span>
      </Link>
    </>
  );
}
