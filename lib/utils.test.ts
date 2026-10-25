import { describe, expect, it } from "vitest";
import { getProductWeightGrams, gstBill, imageSrc, isLocalUpload } from "./utils";

describe("product image URLs", () => {
  it("uses the backend host for relative paths and bypasses Next optimization for VPS uploads", () => {
    const path = "/uploads/public/products/coffee.png";
    expect(imageSrc(path, "https://api.example.com")).toBe(`https://api.example.com${path}`);
    expect(isLocalUpload(path)).toBe(true);
  });

  it("leaves remote image URLs unchanged and optimized normally", () => {
    const url = "https://cdn.example.com/coffee.png";
    expect(imageSrc(url, "https://api.example.com")).toBe(url);
    expect(isLocalUpload(url)).toBe(false);
  });
});

describe("shop delivery charge", () => {
  it("charges delivery below 1 kg", () => {
    const weightGrams = getProductWeightGrams({ weight_grams: 250 }) * 3;
    expect(gstBill(1000, weightGrams).delivery).toBe(40);
  });

  it("waives delivery at and above 1 kg", () => {
    expect(gstBill(1000, getProductWeightGrams({ weight_grams: 250 }) * 4).delivery).toBe(0);
    expect(gstBill(1000, getProductWeightGrams({ weight_grams: 5000 })).delivery).toBe(0);
  });

  it("uses the explicit package weight and falls back for legacy product data", () => {
    expect(getProductWeightGrams({ weight_grams: 500 })).toBe(500);
    expect(getProductWeightGrams({})).toBe(250);
  });
});
