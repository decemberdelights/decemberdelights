const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

let razorpayScriptPromise: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${RAZORPAY_SCRIPT_URL}"]`,
  );
  const script = existing || document.createElement("script");
  const loadPromise = new Promise<boolean>((resolve) => {
    const cleanup = () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };
    const onLoad = () => {
      cleanup();
      script.dataset.loaded = "true";
      resolve(Boolean(window.Razorpay));
    };
    const onError = () => {
      cleanup();
      script.remove();
      resolve(false);
    };

    if (existing?.dataset.loaded === "true") {
      resolve(Boolean(window.Razorpay));
      return;
    }

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.src = RAZORPAY_SCRIPT_URL;
      script.async = true;
      document.head.appendChild(script);
    }
  });

  const sharedPromise = loadPromise.finally(() => {
    if (razorpayScriptPromise === sharedPromise) razorpayScriptPromise = null;
  });
  razorpayScriptPromise = sharedPromise;
  return sharedPromise;
}
