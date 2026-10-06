import "server-only";
import { readEnvironment } from "../env";

export type StoreSettings = {
  origin: string;
  demoMode: boolean;
  sandboxPayments: boolean;
  snap: { scriptUrl: string; clientKey: string };
};

export function getStoreSettings(): StoreSettings {
  const environment = readEnvironment();
  return {
    origin: environment.APP_ORIGIN.replace(/\/$/, ""),
    demoMode: environment.DEMO_MODE,
    sandboxPayments: !environment.MIDTRANS_IS_PRODUCTION,
    snap: {
      scriptUrl: environment.NEXT_PUBLIC_MIDTRANS_SNAP_URL,
      clientKey: environment.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
    },
  };
}

export const flatShippingFee = 20000;
