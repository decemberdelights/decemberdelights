import { afterEach, describe, expect, it } from "vitest";
import { loadRazorpayScript } from "./razorpay";

const scriptUrl = "https://checkout.razorpay.com/v1/checkout.js";

afterEach(() => {
  document.head.querySelectorAll(`script[src="${scriptUrl}"]`).forEach((script) => script.remove());
  Reflect.deleteProperty(window, "Razorpay");
});

describe("loadRazorpayScript", () => {
  it("waits for an existing script to finish loading", async () => {
    const script = document.createElement("script");
    script.src = scriptUrl;
    document.head.appendChild(script);

    const loaded = loadRazorpayScript();
    let resolved = false;
    void loaded.then(() => { resolved = true; });
    await Promise.resolve();
    expect(resolved).toBe(false);

    Object.defineProperty(window, "Razorpay", { configurable: true, value: function Razorpay() {} });
    script.dispatchEvent(new Event("load"));

    await expect(loaded).resolves.toBe(true);
  });

  it("shares an in-flight script load and allows retry after failure", async () => {
    const first = loadRazorpayScript();
    const second = loadRazorpayScript();
    expect(first).toBe(second);

    const script = document.head.querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`);
    expect(script).not.toBeNull();
    script?.dispatchEvent(new Event("error"));
    await expect(first).resolves.toBe(false);

    const retry = loadRazorpayScript();
    const retryScript = document.head.querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`);
    expect(retryScript).not.toBeNull();
    Object.defineProperty(window, "Razorpay", { configurable: true, value: function Razorpay() {} });
    retryScript?.dispatchEvent(new Event("load"));
    await expect(retry).resolves.toBe(true);
  });
});
