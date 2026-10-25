import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPriceINR(price: number): string {
  const p = Math.max(0, Math.round(price));
  const s = p.toString();
  let lastThree = s.slice(-3);
  const other = s.slice(0, -3);
  if (other) lastThree = "," + lastThree;
  return "\u20B9" + other.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
}

/** All gallery images for a product: main + up to 3 extras (max 4). Raw URLs (may be relative /uploads/...). */
export function productImages(p: { image_url?: string; extra_images?: string | string[] | null }): string[] {
  const out: string[] = [];
  if (p.image_url) out.push(p.image_url);
  const ex = p.extra_images;
  if (Array.isArray(ex)) {
    for (const u of ex) if (typeof u === "string" && u && !out.includes(u)) out.push(u);
  } else if (typeof ex === "string" && ex) {
    try {
      const parsed: unknown = JSON.parse(ex);
      if (Array.isArray(parsed)) {
        for (const u of parsed) if (typeof u === "string" && u && !out.includes(u)) out.push(u);
      }
    } catch { /* old/empty value — ignore */ }
  }
  return out.slice(0, 4);
}

/** Prefix a raw image URL with API host unless absolute. */
export function imageSrc(url: string, apiBase: string): string {
  if (!url) return "";
  return url.startsWith("http") ? url : `${apiBase}${url}`;
}

/** True for Hostinger-disk photos (/uploads/...) served directly by nginx.
 *  These must skip Next's image optimizer (it 400s fetching them back
 *  through itself) — nginx already serves them with immutable 1yr cache. */
export function isLocalUpload(url: string): boolean {
  return typeof url === "string" && url.startsWith("/uploads/");
}

/** GST added at checkout on coffee bean shop orders (listed prices are pre-GST). */
export const GST_RATE = 0.05;
export const DELIVERY_CHARGE = 40;
export const FREE_DELIVERY_MIN_WEIGHT_GRAMS = 1000;

export function getProductWeightGrams(product: { weight_grams?: number }): number {
  const weight = Number(product.weight_grams);
  return Number.isSafeInteger(weight) && weight > 0 ? weight : 250;
}

/** Split a pre-GST subtotal into its checkout charges, rounded to paise. */
export function gstBill(subtotal: number, totalWeightGrams = 0): {
  subtotal: number;
  gst: number;
  delivery: number;
  total: number;
} {
  const s = Math.round(subtotal * 100) / 100;
  const gst = Math.round(s * GST_RATE * 100) / 100;
  const delivery = totalWeightGrams > 0 && totalWeightGrams < FREE_DELIVERY_MIN_WEIGHT_GRAMS ? DELIVERY_CHARGE : 0;
  const total = Math.round((s + gst + delivery) * 100) / 100;
  return { subtotal: s, gst, delivery, total };
}
