export type SnapConfig = { scriptUrl: string; clientKey: string };

type SnapCallbacks = {
  onSuccess?: () => void;
  onPending?: () => void;
  onError?: () => void;
  onClose?: () => void;
};

type Snap = { pay: (token: string, callbacks: SnapCallbacks) => void };

declare global {
  interface Window {
    snap?: Snap;
  }
}

let loading: Promise<Snap> | undefined;

export function loadSnap(config: SnapConfig): Promise<Snap> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Snap runs only in the browser"));
  }
  if (window.snap) {
    return Promise.resolve(window.snap);
  }
  loading ??= new Promise<Snap>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = config.scriptUrl;
    script.dataset.clientKey = config.clientKey;
    script.async = true;
    script.onload = () => (window.snap ? resolve(window.snap) : reject(new Error("Snap missing")));
    script.onerror = () => {
      loading = undefined;
      script.remove();
      reject(new Error("Snap could not load"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export async function openSnap(
  config: SnapConfig,
  payment: { token: string; redirectUrl?: string },
  onFinished: () => void,
): Promise<void> {
  try {
    const snap = await loadSnap(config);
    snap.pay(payment.token, {
      onSuccess: onFinished,
      onPending: onFinished,
      onError: onFinished,
      onClose: onFinished,
    });
  } catch {
    if (payment.redirectUrl) {
      window.location.assign(payment.redirectUrl);
    } else {
      onFinished();
    }
  }
}
