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
