"use client";

import Image from "next/image";
import { API } from "@/lib/api";
import { formatPriceINR, productImages, imageSrc, isLocalUpload } from "@/lib/utils";

interface Product {
  id: number; name: string; description: string; price: number;
  original_price: number; category: string; image_url: string;
  extra_images?: string | string[];
  stock: number; offer: string;
  weight_grams: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const fontOutfit = "var(--font-outfit), sans-serif";
const fontBebas = "var(--font-bebas-neue), sans-serif";
const dark = "#1b3c33";
const accent = "#c8a97a";

interface ProductCardProps {
  product: Product;
  inCart?: CartItem;
  onAddToCart: (product: Product) => void;
  onUpdateQty: (productId: number, delta: number) => void;
  onView?: (product: Product) => void;
}

export default function ProductCard({ product, inCart, onAddToCart, onUpdateQty, onView }: ProductCardProps) {
  const hasDiscount = product.original_price > product.price;
  const discountPct = hasDiscount ? Math.round((1 - product.price / product.original_price) * 100) : 0;
  const photoCount = productImages(product).length;

  return (
    <div
      style={{ background: "#fff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 16px rgba(27,60,51,0.06)", transition: "transform 0.3s, box-shadow 0.3s", display: "flex", flexDirection: "column" }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(27,60,51,0.12)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 16px rgba(27,60,51,0.06)"; }}
    >
      <div onClick={() => onView?.(product)} title={onView ? "View full details" : undefined} style={{ position: "relative", height: "220px", overflow: "hidden", background: "#f5f3ef", cursor: onView ? "pointer" : "default" }}>
        {product.image_url ? (
          <Image src={imageSrc(product.image_url, API)} alt={product.name} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" style={{ objectFit: "cover" }} loading="lazy" unoptimized={isLocalUpload(product.image_url)} placeholder="blur" blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YwZWRlOCIvPjwvc3ZnPg==" />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #1b3c33 0%, #2d5a4a 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "3rem", opacity: 0.4 }}>&#9749;</span>
          </div>
        )}
        {hasDiscount && (
          <div style={{ position: "absolute", top: "0.75rem", left: "0.75rem", background: "#e74c3c", color: "#fff", padding: "0.25rem 0.65rem", borderRadius: "6px", fontFamily: fontOutfit, fontSize: "0.8rem", fontWeight: 800, letterSpacing: "0.05em" }}>
            {product.offer || `${discountPct}% OFF`}
          </div>
        )}
        {product.stock <= 0 && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: fontOutfit, color: "#e74c3c", fontWeight: 800, fontSize: "0.9rem", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Out of Stock</span>
          </div>
        )}
        {photoCount > 1 && (
          <div style={{ position: "absolute", bottom: "0.6rem", right: "0.6rem", display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(27,60,51,0.85)", color: "#fff", padding: "0.25rem 0.55rem", borderRadius: "999px", fontFamily: fontOutfit, fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.05em" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></svg>
            {photoCount}
          </div>
        )}
      </div>
      <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", flex: 1 }}>
        <p style={{ fontFamily: fontOutfit, color: accent, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: "0.25rem" }}>{product.category}</p>
        <h3 onClick={() => onView?.(product)} title={onView ? "View full details" : undefined} style={{ fontFamily: fontBebas, color: dark, fontSize: "1.15rem", marginBottom: "0.35rem", letterSpacing: "0.02em", cursor: onView ? "pointer" : "default" }}>{product.name}</h3>
        {product.description && <p style={{ fontFamily: fontOutfit, color: "#3d4a3e", fontSize: "0.8rem", lineHeight: 1.5, marginBottom: "0.75rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{product.description}</p>}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
            <span style={{ fontFamily: fontBebas, color: dark, fontSize: "1.35rem" }}>{formatPriceINR(product.price)}</span>
            {hasDiscount && <span style={{ fontFamily: fontOutfit, color: "#bbb", fontSize: "0.85rem", textDecoration: "line-through" }}>{formatPriceINR(product.original_price)}</span>}
          </div>
          {product.stock <= 10 && (
            <span style={{ fontFamily: fontOutfit, color: product.stock > 0 ? "#c05621" : "#e74c3c", fontSize: "0.85rem", fontWeight: 700 }}>
              {product.stock > 0 ? "Only a few left!" : "Out of Stock"}
            </span>
          )}
        </div>
        <div style={{ marginTop: "0.85rem" }}>
          {inCart ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <button type="button" aria-label="Decrease quantity" disabled={inCart.quantity <= 1} onClick={() => onUpdateQty(product.id, -1)} style={{ width: "44px", height: "44px", borderRadius: "10px", border: `1.5px solid ${dark}`, background: "#fff", color: dark, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", transition: "all 0.15s" }}>-</button>
                  <span style={{ fontFamily: fontOutfit, fontWeight: 700, fontSize: "0.95rem", minWidth: "28px", textAlign: "center" as const, color: dark }}>{inCart.quantity}</span>
                  <button type="button" aria-label="Increase quantity" onClick={() => onUpdateQty(product.id, 1)} disabled={inCart.quantity >= product.stock} style={{ width: "44px", height: "44px", borderRadius: "10px", border: "none", background: dark, color: "#fff", fontWeight: 700, cursor: inCart.quantity >= product.stock ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", opacity: inCart.quantity >= product.stock ? 0.4 : 1, transition: "all 0.15s" }}>+</button>
                </div>
                {inCart.quantity >= product.stock && <span style={{ fontFamily: fontOutfit, fontSize: "0.7rem", color: "#999", whiteSpace: "nowrap" }}>Stock limit reached</span>}
              </div>
              <span style={{ fontFamily: fontOutfit, fontWeight: 800, fontSize: "0.9rem", color: dark }}>{formatPriceINR(product.price * inCart.quantity)}</span>
            </div>
          ) : (
            <button type="button" onClick={() => onAddToCart(product)} disabled={product.stock <= 0} style={{ width: "100%", padding: "0.75rem", borderRadius: "12px", border: "none", background: product.stock > 0 ? dark : "#e0e0e0", color: "#fff", fontFamily: fontOutfit, fontWeight: 700, fontSize: "0.8rem", cursor: product.stock > 0 ? "pointer" : "not-allowed", letterSpacing: "0.03em", minHeight: "44px", transition: "all 0.2s" }}>
              {product.stock > 0 ? "Add to Cart" : "Sold Out"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
