"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { API } from "@/lib/api";
import { formatPriceINR, productImages, imageSrc, isLocalUpload } from "@/lib/utils";
import PhotoZoom from "@/components/shop/PhotoZoom";

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

interface ProductDetailModalProps {
  product: Product;
  inCart?: CartItem;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  onUpdateQty: (productId: number, delta: number) => void;
  showPurchaseActions?: boolean;
}

const fontOutfit = "var(--font-outfit), sans-serif";
const fontBebas = "var(--font-bebas-neue), sans-serif";
const dark = "#1b3c33";
const accent = "#c8a97a";
const subscribeToMount = () => () => {};
const getClientMounted = () => true;
const getServerMounted = () => false;

export default function ProductDetailModal({ product, inCart, onClose, onAddToCart, onUpdateQty, showPurchaseActions = true }: ProductDetailModalProps) {
  const hasDiscount = product.original_price > product.price;
  const discountPct = hasDiscount ? Math.round((1 - product.price / product.original_price) * 100) : 0;
  const gallery = productImages(product);
  const [idx, setIdx] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const portalReady = useSyncExternalStore(subscribeToMount, getClientMounted, getServerMounted);
  const tapMoved = useRef(false);
  const touchX = useRef<number | null>(null);
  const go = (d: number) => setIdx((i) => (i + d + gallery.length) % Math.max(gallery.length, 1));
  const rawSrc = gallery.length > 0 ? gallery[Math.min(idx, gallery.length - 1)] : "";
  const imgSrc = imageSrc(rawSrc, API);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!portalReady) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    // Lock BOTH html and body — body-only lock fails on mobile Safari and
    // does nothing while Lenis smooth-scroll (desktop) is running.
    // (Do NOT call the engine's stop() here: the shared engine exposes no
    // matching start(), so the scroll loop would stay frozen after close.)
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    // Touch guard: a swipe starting on the dark backdrop must not scroll the page behind.
    const overlay = overlayRef.current;
    const onTouchMove = (e: TouchEvent) => {
      if (e.target === overlay) e.preventDefault();
    };
    overlay?.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
      overlay?.removeEventListener("touchmove", onTouchMove);
    };
  }, [onClose, portalReady]);

  if (!portalReady) return null;

  return createPortal(
    <div ref={overlayRef} className="pdm-overlay" data-lenis-prevent onClick={onClose} role="dialog" aria-modal="true" aria-label={product.name}>
      <style>{`
        .pdm-overlay { position: fixed; inset: 0; z-index: 1100; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 16px; animation: fadeSlideUp 0.25s ease; overscroll-behavior: contain; }
        .pdm-card { background: #fff; border-radius: 24px; width: 880px; max-width: 100%; height: min(720px, 90vh); max-height: 90dvh; overflow: hidden; position: relative; display: flex; box-shadow: 0 25px 60px rgba(0,0,0,0.35); }
        .pdm-img { width: 46%; position: relative; background: #f5f3ef; flex-shrink: 0; min-height: 100%; }
        .pdm-body { display: flex; flex-direction: column; flex: 1; min-width: 0; min-height: 0; overflow: hidden; }
        .pdm-scroll { flex: 1 1 auto; min-height: 0; overflow-x: hidden; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; touch-action: pan-y; padding: 2rem 2rem 1rem; }
        .pdm-footer { border-top: 1px solid rgba(0,0,0,0.07); padding: 1rem 2rem calc(1rem + env(safe-area-inset-bottom, 0px)); background: #fff; }
        .pdm-close { position: absolute; top: 12px; right: 12px; width: 44px; height: 44px; border-radius: 50%; border: none; background: rgba(27,60,51,0.9); color: #fff; font-size: 1.2rem; cursor: pointer; z-index: 2; display: flex; align-items: center; justify-content: center; }
        @media (max-width: 640px) {
          .pdm-overlay { padding: 0; align-items: flex-end; }
          .pdm-card { flex-direction: column; border-radius: 24px 24px 0 0; height: 92vh; height: 92dvh; max-height: 92dvh; width: 100%; }
          .pdm-img { width: 100%; min-height: 0; height: 30vh; height: 30dvh; flex-shrink: 0; }
          .pdm-scroll { padding: 1.25rem 1.25rem 0.75rem; }
          .pdm-footer { padding: 0.85rem 1.25rem calc(0.85rem + env(safe-area-inset-bottom, 0px)); }
        }
      `}</style>
      <div className="pdm-card" data-lenis-prevent onClick={(e) => e.stopPropagation()}>
        <button type="button" className="pdm-close" onClick={onClose} aria-label="Close">✕</button>
        <div
          className="pdm-img"
          onClick={() => { if (tapMoved.current) { tapMoved.current = false; return; } if (imgSrc) setZoomOpen(true); }}
          title="Tap to zoom"
          style={{ cursor: imgSrc ? "zoom-in" : "default" }}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > 40 && gallery.length > 1) { tapMoved.current = true; go(dx < 0 ? 1 : -1); }
          }}
        >
          {imgSrc ? (
            <Image key={imgSrc} src={imgSrc} alt={product.name} fill sizes="(max-width: 640px) 100vw, 400px" style={{ objectFit: "contain" }} priority unoptimized={isLocalUpload(rawSrc)} />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1b3c33 0%, #2d5a4a 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "4rem", opacity: 0.4 }}>☕</span>
            </div>
          )}
          {hasDiscount && (
            <div style={{ position: "absolute", top: "1rem", left: "1rem", background: "#e74c3c", color: "#fff", padding: "0.3rem 0.8rem", borderRadius: "8px", fontFamily: fontOutfit, fontSize: "0.85rem", fontWeight: 800 }}>
              {product.offer || `${discountPct}% OFF`}
            </div>
          )}
          {imgSrc && (
            <div style={{ position: "absolute", bottom: "0.75rem", right: "0.75rem", display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.55)", color: "#fff", padding: "0.3rem 0.65rem", borderRadius: 999, fontFamily: fontOutfit, fontSize: "0.7rem", fontWeight: 700, pointerEvents: "none" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
              Tap to zoom
            </div>
          )}
          {gallery.length > 1 && (
            <>
              <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Previous photo" style={{ position: "absolute", left: "0.6rem", top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", border: "none", background: "rgba(27,60,51,0.85)", color: "#fff", fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Next photo" style={{ position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", border: "none", background: "rgba(27,60,51,0.85)", color: "#fff", fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
              <div style={{ position: "absolute", bottom: "0.75rem", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.35)", padding: "6px 10px", borderRadius: 999 }}>
                {gallery.map((_, i) => (
                  <span key={i} onClick={(e) => { e.stopPropagation(); setIdx(i); }} style={{ width: i === idx ? 18 : 7, height: 7, borderRadius: 999, background: i === idx ? "#c8a97a" : "rgba(255,255,255,0.6)", cursor: "pointer", transition: "width 0.25s" }} />
                ))}
              </div>
              <div style={{ position: "absolute", top: "1rem", right: "4.2rem", background: "rgba(0,0,0,0.5)", color: "#fff", fontFamily: fontOutfit, fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: 999 }}>
                {idx + 1} / {gallery.length}
              </div>
            </>
          )}
        </div>
        <div className="pdm-body">
          <div className="pdm-scroll" data-lenis-prevent tabIndex={0}>
            <p style={{ fontFamily: fontOutfit, color: accent, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 0.25rem" }}>{product.category}</p>
            <h2 style={{ fontFamily: fontBebas, color: dark, fontSize: "clamp(1.6rem, 4vw, 2.2rem)", letterSpacing: "0.02em", margin: "0 0 0.75rem", paddingRight: "2rem" }}>{product.name}</h2>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", marginBottom: "1rem" }}>
              <span style={{ fontFamily: fontBebas, color: dark, fontSize: "1.8rem" }}>{formatPriceINR(product.price)}</span>
              {hasDiscount && <span style={{ fontFamily: fontOutfit, color: "#bbb", fontSize: "1rem", textDecoration: "line-through" }}>{formatPriceINR(product.original_price)}</span>}
            </div>
            {product.description ? (
              <p style={{ fontFamily: fontOutfit, color: "#3d4a3e", fontSize: "0.95rem", lineHeight: 1.75, margin: 0, whiteSpace: "pre-wrap" }}>{product.description}</p>
            ) : (
              <p style={{ fontFamily: fontOutfit, color: "#999", fontSize: "0.9rem", margin: 0 }}>No description available for this product.</p>
            )}
          </div>
          {showPurchaseActions && <div className="pdm-footer">
            {product.stock <= 10 && (
              <p style={{ fontFamily: fontOutfit, color: product.stock > 0 ? "#c05621" : "#e74c3c", fontSize: "0.85rem", fontWeight: 700, margin: "0 0 0.6rem" }}>
                {product.stock > 0 ? "Selling fast — order soon!" : "Out of Stock"}
              </p>
            )}
            {inCart ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <button type="button" onClick={() => onUpdateQty(product.id, -1)} style={{ width: "48px", height: "48px", borderRadius: "12px", border: `1.5px solid ${dark}`, background: "#fff", color: dark, fontWeight: 700, cursor: "pointer", fontSize: "1.1rem" }} aria-label={`Decrease quantity of ${product.name}`}>-</button>
                <span style={{ fontFamily: fontOutfit, fontWeight: 700, fontSize: "1.1rem", minWidth: "32px", textAlign: "center", color: dark }}>{inCart.quantity}</span>
                <button type="button" onClick={() => onUpdateQty(product.id, 1)} disabled={inCart.quantity >= product.stock} style={{ width: "48px", height: "48px", borderRadius: "12px", border: "none", background: dark, color: "#fff", fontWeight: 700, cursor: inCart.quantity >= product.stock ? "not-allowed" : "pointer", fontSize: "1.1rem", opacity: inCart.quantity >= product.stock ? 0.4 : 1 }} aria-label={`Increase quantity of ${product.name}`}>+</button>
                <span style={{ fontFamily: fontOutfit, fontWeight: 800, fontSize: "1rem", color: dark, marginLeft: "auto" }}>{formatPriceINR(product.price * inCart.quantity)}</span>
              </div>
            ) : (
              <button type="button" onClick={() => { onAddToCart(product); onClose(); }} disabled={product.stock <= 0} style={{ width: "100%", padding: "1rem", borderRadius: "14px", border: "none", background: product.stock > 0 ? dark : "#e0e0e0", color: "#fff", fontFamily: fontOutfit, fontWeight: 700, fontSize: "0.9rem", cursor: product.stock > 0 ? "pointer" : "not-allowed", minHeight: "52px" }}>
                {product.stock > 0 ? "Add to Cart" : "Sold Out"}
              </button>
            )}
          </div>}
        </div>
      </div>
      {zoomOpen && imgSrc && (
        <PhotoZoom photos={gallery} index={Math.min(idx, gallery.length - 1)} onIndex={setIdx} onClose={() => setZoomOpen(false)} />
      )}
    </div>,
    document.body
  );
}
