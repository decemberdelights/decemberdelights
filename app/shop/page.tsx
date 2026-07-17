"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { API } from "@/lib/api";
import { formatPriceINR } from "@/lib/utils";
import { ProductCardSkeleton } from "@/components/Skeleton";

interface Product {
  id: number; name: string; description: string; price: number;
  original_price: number; category: string; image_url: string;
  stock: number; offer: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const CART_KEY = "dd_cart";

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCart(cart: CartItem[]) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* ignore */ }
}

const fontOutfit = "var(--font-outfit), sans-serif";
const fontBebas = "var(--font-bebas-neue), sans-serif";
const dark = "#1b3c33";
const accent = "#c8a97a";
const muted = "#586159";

export default function ShopPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState(0);
  const [orderPhone, setOrderPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", customer_email: "", customer_address: "" });
  const [formError, setFormError] = useState("");
  const [addedId, setAddedId] = useState<number | null>(null);
  const redirectTimer = useRef<NodeJS.Timeout | null>(null);
  const cartBadgeTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setCart(loadCart()); }, []);

  useEffect(() => {
    const timer = setTimeout(() => { saveCart(cart); }, 300);
    return () => clearTimeout(timer);
  }, [cart]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API}/api/products`, { signal: controller.signal, cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setProducts(data); setLoading(false); })
      .catch((err) => { if (err.name !== "AbortError") { setFetchError(true); setLoading(false); } });
    fetch(`${API}/api/products/categories`, { signal: controller.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setCategories(data))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (products.length === 0) return;
    setCart((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        const fresh = products.find((p) => p.id === item.product.id);
        if (!fresh) { changed = true; return null; }
        if (fresh.price !== item.product.price || fresh.stock !== item.product.stock) {
          changed = true;
          return { ...item, product: fresh, quantity: Math.min(item.quantity, fresh.stock) };
        }
        return item;
      }).filter(Boolean) as CartItem[];
      return changed ? next : prev;
    });
  }, [products]);

  const filtered = useMemo(() => activeCategory ? products.filter((p) => p.category === activeCategory) : products, [activeCategory, products]);
  const cartCount = useMemo(() => cart.reduce((s, c) => s + c.quantity, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((s, c) => s + c.product.price * c.quantity, 0), [cart]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((c) => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { product, quantity: 1 }];
    });
    setAddedId(product.id);
    if (cartBadgeTimer.current) clearTimeout(cartBadgeTimer.current);
    cartBadgeTimer.current = setTimeout(() => setAddedId(null), 800);
  };

  const updateQty = (productId: number, delta: number) => {
    setCart((prev) => prev.map((c) => {
      if (c.product.id !== productId) return c;
      const newQty = c.quantity + delta;
      if (newQty <= 0) return null;
      if (newQty > c.product.stock) return c;
      return { ...c, quantity: newQty };
    }).filter(Boolean) as CartItem[]);
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  };

  const handleOrder = async () => {
    if (!form.customer_name || !form.customer_phone || !form.customer_address) {
      setFormError("All fields are required");
      return;
    }
    const cleanedPhone = form.customer_phone.replace(/[\s\-+]/g, "");
    if (!/^\d{7,15}$/.test(cleanedPhone)) {
      setFormError("Please enter a valid phone number (7-15 digits)");
      return;
    }
    if (form.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email)) {
      setFormError("Please enter a valid email address");
      return;
    }
    if (cart.length === 0) {
      setFormError("Your cart is empty");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const r = await fetch(`${API}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: form.customer_name,
          customer_phone: form.customer_phone,
          customer_email: form.customer_email,
          customer_address: form.customer_address,
          items: JSON.stringify(cart.map((c) => ({ id: c.product.id, name: c.product.name, price: c.product.price, quantity: c.quantity }))),
          total: cartTotal,
        }),
      });
      const data = await r.json();
      if (r.ok) {
        const phone = form.customer_phone;
        setOrderId(data.id);
        setOrderPhone(phone);
        setOrderSuccess(true);
        setCart([]);
        setShowCheckout(false);
        setShowCart(false);
        setForm({ customer_name: "", customer_phone: "", customer_email: "", customer_address: "" });
        fetch(`${API}/api/products`, { cache: "no-store" })
          .then((r2) => r2.json())
          .then((fresh) => setProducts(fresh))
          .catch(() => {});
        redirectTimer.current = setTimeout(() => {
          router.push(`/track?phone=${encodeURIComponent(phone)}`);
        }, 4000);
      } else {
        setFormError(data.detail || "Order failed. Please try again.");
      }
    } catch {
      setFormError("Network error. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    return () => { if (redirectTimer.current) clearTimeout(redirectTimer.current); };
  }, []);

  if (orderSuccess) {
    return (
      <>
        <main data-bg="light" style={{ minHeight: "100vh", background: "#fff", padding: "8rem 0 4rem" }}>
          <section data-bg="dark" style={{ background: dark, color: "#fdf9f4", padding: "5rem 5%", textAlign: "center" }}>
            <p style={{ fontFamily: fontOutfit, color: accent, fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Shop</p>
            <h1 style={{ fontFamily: fontBebas, fontSize: "clamp(1.8rem, 6vw, 4.5rem)", color: "#fdf9f4" }}>Premium Coffee & Products</h1>
            <p style={{ fontFamily: fontOutfit, fontSize: "1.1rem", color: "#e8e5e0", maxWidth: "500px", margin: "1rem auto 0" }}>
              Handpicked coffee beans, blends, and accessories delivered to your doorstep.
            </p>
          </section>
        </main>
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => { if (redirectTimer.current) clearTimeout(redirectTimer.current); setOrderSuccess(false); }} />
          <div style={{ background: "#fff", borderRadius: "24px", padding: "3rem 2rem", width: "440px", maxWidth: "92vw", position: "relative", boxShadow: "0 25px 60px rgba(0,0,0,0.35)", textAlign: "center" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: dark, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", animation: "successPop 0.5s ease forwards, successPulse 2s ease infinite 0.5s" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "checkDraw 0.6s ease 0.3s both" }}>
                <polyline points="20 6 9 17 4 12" strokeDasharray="30" strokeDashoffset="30" style={{ animation: "checkDraw 0.4s ease 0.5s forwards" }} />
              </svg>
            </div>
            <h2 style={{ fontFamily: fontBebas, fontSize: "clamp(1.5rem, 4vw, 2rem)", color: dark, letterSpacing: "0.05em", marginBottom: "0.5rem", animation: "fadeSlideUp 0.5s ease 0.3s both" }}>Order Accepted!</h2>
            <p style={{ fontFamily: fontOutfit, color: muted, fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "0.5rem", animation: "fadeSlideUp 0.5s ease 0.4s both" }}>
              Your order <strong style={{ color: dark }}>#{orderId}</strong> has been placed successfully.
            </p>
            <p style={{ fontFamily: fontOutfit, color: "#999", fontSize: "0.8rem", marginBottom: "1.5rem", animation: "fadeSlideUp 0.5s ease 0.45s both" }}>
              Redirecting to tracking in a few seconds...
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap", animation: "fadeSlideUp 0.5s ease 0.5s both" }}>
              <button onClick={() => { if (redirectTimer.current) clearTimeout(redirectTimer.current); router.push(`/track?phone=${encodeURIComponent(orderPhone)}`); }} style={{ padding: "0.85rem 2rem", borderRadius: "100px", border: "none", background: dark, color: "#fff", fontFamily: fontOutfit, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", transition: "background 0.2s" }}>Track Now</button>
              <button onClick={() => { if (redirectTimer.current) clearTimeout(redirectTimer.current); setOrderSuccess(false); }} style={{ padding: "0.85rem 2rem", borderRadius: "100px", border: "1.5px solid #ddd", background: "#fff", color: muted, fontFamily: fontOutfit, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>Continue Shopping</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <main data-bg="light" style={{ minHeight: "100vh", background: "#fff", padding: "8rem 0 4rem" }}>
        <section data-bg="dark" style={{ background: dark, color: "#fdf9f4", padding: "5rem 5%", textAlign: "center" }}>
          <p style={{ fontFamily: fontOutfit, color: accent, fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Shop</p>
          <h1 style={{ fontFamily: fontBebas, fontSize: "clamp(1.8rem, 6vw, 4.5rem)", color: "#fdf9f4" }}>Premium Coffee & Products</h1>
          <p style={{ fontFamily: fontOutfit, fontSize: "1.1rem", color: "#e8e5e0", maxWidth: "500px", margin: "1rem auto 0" }}>
            Handpicked coffee beans, blends, and accessories delivered to your doorstep.
          </p>
        </section>

        <div data-bg="light" style={{ maxWidth: "1200px", margin: "0 auto", padding: "3rem 5%", background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
            {categories.length > 0 && (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button onClick={() => setActiveCategory("")} style={{ padding: "0.65rem 1.5rem", borderRadius: "100px", border: !activeCategory ? `2px solid ${dark}` : "1.5px solid #ddd", background: !activeCategory ? dark : "#fff", color: !activeCategory ? "#fff" : muted, fontFamily: fontOutfit, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", minHeight: "44px", transition: "all 0.2s" }}>All</button>
                {categories.map((cat) => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: "0.65rem 1.5rem", borderRadius: "100px", border: activeCategory === cat ? `2px solid ${dark}` : "1.5px solid #ddd", background: activeCategory === cat ? dark : "#fff", color: activeCategory === cat ? "#fff" : muted, fontFamily: fontOutfit, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", minHeight: "44px", transition: "all 0.2s" }}>{cat}</button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))", gap: "1.5rem" }}>
              {[1, 2, 3, 4, 5, 6].map((i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : fetchError ? (
            <div style={{ textAlign: "center", padding: "4rem" }}>
              <p style={{ fontFamily: fontOutfit, color: "#e74c3c", fontSize: "1rem", marginBottom: "1rem" }}>Failed to load products.</p>
              <button onClick={() => window.location.reload()} style={{ padding: "0.7rem 2rem", borderRadius: "100px", border: "none", background: dark, color: "#fff", fontFamily: fontOutfit, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem" }}>
              <p style={{ fontFamily: fontBebas, fontSize: "1.5rem", color: dark, marginBottom: "0.5rem" }}>Coming Soon</p>
              <p style={{ fontFamily: fontOutfit, color: muted }}>Our premium products will be available here shortly.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))", gap: "1.5rem" }}>
              {filtered.map((product) => {
                const inCart = cart.find((c) => c.product.id === product.id);
                const hasDiscount = product.original_price > product.price;
                const discountPct = hasDiscount ? Math.round(((product.original_price - product.price) / product.original_price) * 100) : 0;
                return (
                  <div key={product.id} style={{ background: "#fff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 16px rgba(27,60,51,0.06)", transition: "transform 0.3s, box-shadow 0.3s", display: "flex", flexDirection: "column" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(27,60,51,0.12)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 16px rgba(27,60,51,0.06)"; }}>
                    <div style={{ position: "relative", height: "220px", overflow: "hidden", background: "#f5f3ef" }}>
                      {product.image_url ? (
                        <Image src={product.image_url?.startsWith("http") ? product.image_url : `${API}${product.image_url}`} alt={product.name} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" style={{ objectFit: "cover" }} loading="lazy" placeholder="blur" blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YwZWRlOCIvPjwvc3ZnPg==" />
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
                    </div>
                    <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", flex: 1 }}>
                      <p style={{ fontFamily: fontOutfit, color: accent, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: "0.25rem" }}>{product.category}</p>
                      <h3 style={{ fontFamily: fontBebas, color: dark, fontSize: "1.15rem", marginBottom: "0.35rem", letterSpacing: "0.02em" }}>{product.name}</h3>
                      {product.description && <p style={{ fontFamily: fontOutfit, color: "#3d4a3e", fontSize: "0.8rem", lineHeight: 1.5, marginBottom: "0.75rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{product.description}</p>}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                          <span style={{ fontFamily: fontBebas, color: dark, fontSize: "1.35rem" }}>{formatPriceINR(product.price)}</span>
                          {hasDiscount && <span style={{ fontFamily: fontOutfit, color: "#bbb", fontSize: "0.85rem", textDecoration: "line-through" }}>{formatPriceINR(product.original_price)}</span>}
                        </div>
                        {product.stock > 0 && <span style={{ fontFamily: fontOutfit, color: "#999", fontSize: "0.85rem" }}>{product.stock} in stock</span>}
                      </div>
                      <div style={{ marginTop: "0.85rem" }}>
                        {inCart ? (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <button onClick={() => updateQty(product.id, -1)} style={{ width: "36px", height: "36px", borderRadius: "10px", border: `1.5px solid ${dark}`, background: "#fff", color: dark, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", transition: "all 0.15s" }}>-</button>
                                <span style={{ fontFamily: fontOutfit, fontWeight: 700, fontSize: "0.95rem", minWidth: "28px", textAlign: "center" as const, color: dark }}>{inCart.quantity}</span>
                                <button onClick={() => updateQty(product.id, 1)} disabled={inCart.quantity >= product.stock} style={{ width: "36px", height: "36px", borderRadius: "10px", border: "none", background: dark, color: "#fff", fontWeight: 700, cursor: inCart.quantity >= product.stock ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", opacity: inCart.quantity >= product.stock ? 0.4 : 1, transition: "all 0.15s" }}>+</button>
                              </div>
                              {inCart.quantity >= product.stock && <span style={{ fontFamily: fontOutfit, fontSize: "0.7rem", color: "#999", whiteSpace: "nowrap" }}>Max {product.stock} available</span>}
                            </div>
                            <span style={{ fontFamily: fontOutfit, fontWeight: 800, fontSize: "0.9rem", color: dark }}>{formatPriceINR(product.price * inCart.quantity)}</span>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(product)} disabled={product.stock <= 0} style={{ width: "100%", padding: "0.75rem", borderRadius: "12px", border: "none", background: product.stock > 0 ? dark : "#e0e0e0", color: "#fff", fontFamily: fontOutfit, fontWeight: 700, fontSize: "0.8rem", cursor: product.stock > 0 ? "pointer" : "not-allowed", letterSpacing: "0.03em", minHeight: "44px", transition: "all 0.2s" }}>
                            {product.stock > 0 ? "Add to Cart" : "Sold Out"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <button
          onClick={() => setShowCart(true)}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 900,
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "1rem 1.5rem",
            borderRadius: "100px",
            border: "none",
            background: dark,
            color: "#fff",
            fontFamily: fontOutfit,
            fontWeight: 700,
            fontSize: "0.9rem",
            cursor: "pointer",
            boxShadow: "0 8px 32px rgba(27,60,51,0.35)",
            transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)",
            transform: addedId ? "scale(1.08)" : "scale(1)",
            animation: "fadeSlideUp 0.4s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 12px 40px rgba(27,60,51,0.45)"; e.currentTarget.style.transform = "translateY(-2px) scale(1.02)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 8px 32px rgba(27,60,51,0.35)"; e.currentTarget.style.transform = "scale(1)"; }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
          <span>View Cart</span>
          <span style={{ background: "#fff", color: dark, width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 800 }}>{cartCount}</span>
        </button>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", transition: "opacity 0.3s" }} onClick={() => setShowCart(false)} />
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(420px, 100%)", background: "#fff", display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(0,0,0,0.15)", animation: "slideInRight 0.35s cubic-bezier(0.22,1,0.36,1)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            {/* Header */}
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f0ede4", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: "#fff" }}>
              <div>
                <h2 style={{ fontFamily: fontBebas, color: dark, fontSize: "1.5rem", margin: 0 }}>Your Cart</h2>
                <p style={{ fontFamily: fontOutfit, color: "#999", fontSize: "0.85rem", margin: "2px 0 0" }}>{cartCount} {cartCount === 1 ? "item" : "items"}</p>
              </div>
              <button onClick={() => setShowCart(false)} style={{ width: "40px", height: "40px", borderRadius: "50%", border: "1px solid #eee", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", color: muted, transition: "all 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f3ef"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}>&times;</button>
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem 1.5rem" }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                  <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#f5f3ef", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
                  </div>
                  <p style={{ fontFamily: fontBebas, color: dark, fontSize: "1.1rem", marginBottom: "0.4rem" }}>Your cart is empty</p>
                  <p style={{ fontFamily: fontOutfit, color: "#999", fontSize: "0.85rem", marginBottom: "1.25rem" }}>Add some delicious items to get started</p>
                  <button onClick={() => setShowCart(false)} style={{ padding: "0.7rem 2rem", borderRadius: "100px", border: `1.5px solid ${dark}`, background: "#fff", color: dark, fontFamily: fontOutfit, fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = dark; e.currentTarget.style.color = "#fff"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = dark; }}>Browse Menu</button>
                </div>
              ) : cart.map((item) => (
                <div key={item.product.id} style={{ display: "flex", gap: "1rem", padding: "1rem 0", borderBottom: "1px solid #f5f3ef" }}>
                  <div style={{ width: "72px", height: "72px", borderRadius: "12px", overflow: "hidden", flexShrink: 0, background: "#f5f3ef", position: "relative" }}>
                    {item.product.image_url ? (
                      <Image src={item.product.image_url?.startsWith("http") ? item.product.image_url : `${API}${item.product.image_url}`} alt={item.product.name} width={72} height={72} style={{ objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", background: "linear-gradient(135deg, #1b3c33, #2d5a4a)" }}>&#9749;</div>
                    )}
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontFamily: fontOutfit, color: dark, fontSize: "0.85rem", fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{item.product.name}</h4>
                        <p style={{ fontFamily: fontOutfit, color: "#999", fontSize: "0.85rem", margin: "2px 0 0" }}>{formatPriceINR(item.product.price)} each</p>
                      </div>
                      <button onClick={() => removeFromCart(item.product.id)} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", padding: "4px", fontSize: "1rem", lineHeight: 1, flexShrink: 0, transition: "color 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.color = "#e74c3c"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#ccc"; }}>&times;</button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
                        <button onClick={() => updateQty(item.product.id, -1)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid #e8e5e0", background: "#fff", cursor: "pointer", fontSize: "0.85rem", color: dark, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, transition: "all 0.15s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = dark; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e8e5e0"; }}>-</button>
                        <span style={{ fontFamily: fontOutfit, fontWeight: 700, fontSize: "0.85rem", minWidth: "36px", textAlign: "center" as const, color: dark }}>{item.quantity}</span>
                        <button onClick={() => updateQty(item.product.id, 1)} disabled={item.quantity >= item.product.stock} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", background: dark, color: "#fff", cursor: item.quantity >= item.product.stock ? "not-allowed" : "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, opacity: item.quantity >= item.product.stock ? 0.4 : 1, transition: "all 0.15s" }}>+</button>
                      </div>
                       <span style={{ fontFamily: fontOutfit, fontWeight: 800, fontSize: "0.9rem", color: dark }}>{formatPriceINR(item.product.price * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid #f0ede4", flexShrink: 0, background: "#fff", paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <span style={{ fontFamily: fontOutfit, fontWeight: 600, color: muted, fontSize: "0.9rem" }}>Total</span>
                  <span style={{ fontFamily: fontBebas, color: dark, fontSize: "1.5rem" }}>{formatPriceINR(cartTotal)}</span>
                </div>
                <button onClick={() => { setShowCart(false); setShowCheckout(true); }} style={{ width: "100%", padding: "1rem", borderRadius: "14px", border: "none", background: dark, color: "#fff", fontFamily: fontOutfit, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 16px rgba(27,60,51,0.2)" }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(27,60,51,0.3)"; e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(27,60,51,0.2)"; e.currentTarget.style.transform = "none"; }}>
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setShowCheckout(false)} />
          <div style={{ background: "#fff", borderRadius: "20px", padding: "2rem", width: "460px", maxWidth: "95vw", position: "relative", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}>
            <button onClick={() => setShowCheckout(false)} style={{ position: "absolute", top: "1rem", right: "1rem", width: "36px", height: "36px", borderRadius: "50%", border: "1px solid #eee", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", color: muted }}>&times;</button>
            <h2 style={{ fontFamily: fontBebas, color: dark, fontSize: "1.5rem", marginBottom: "1.5rem" }}>Checkout</h2>

            <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#faf8f5", borderRadius: "12px" }}>
              {cart.map((item) => (
                <div key={item.product.id} style={{ display: "flex", justifyContent: "space-between", fontFamily: fontOutfit, fontSize: "0.85rem", marginBottom: "0.5rem", color: "#1a1a1a" }}>
                  <span>{item.product.name} x{item.quantity}</span>
                  <span style={{ fontWeight: 700, color: dark }}>{formatPriceINR(item.product.price * item.quantity)}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid #e8e5e0", marginTop: "0.5rem", paddingTop: "0.5rem", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                <span style={{ fontFamily: fontOutfit, color: dark }}>Total</span>
                <span style={{ fontFamily: fontBebas, fontSize: "1.2rem", color: dark }}>{formatPriceINR(cartTotal)}</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: dark, marginBottom: "0.3rem", fontFamily: fontOutfit }}>Full Name *</label>
                <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} style={{ width: "100%", padding: "0.7rem 1rem", borderRadius: "10px", border: "1.5px solid #ddd", fontFamily: fontOutfit, fontSize: "0.9rem", outline: "none", color: dark, background: "#fff", boxSizing: "border-box" as const }} placeholder="Your name" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: dark, marginBottom: "0.3rem", fontFamily: fontOutfit }}>Mobile Number *</label>
                <input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} style={{ width: "100%", padding: "0.7rem 1rem", borderRadius: "10px", border: "1.5px solid #ddd", fontFamily: fontOutfit, fontSize: "0.9rem", outline: "none", color: dark, background: "#fff", boxSizing: "border-box" as const }} inputMode="tel" placeholder="10-digit mobile number" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: dark, marginBottom: "0.3rem", fontFamily: fontOutfit }}>Email (for order confirmation)</label>
                <input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} style={{ width: "100%", padding: "0.7rem 1rem", borderRadius: "10px", border: "1.5px solid #ddd", fontFamily: fontOutfit, fontSize: "0.9rem", outline: "none", color: dark, background: "#fff", boxSizing: "border-box" as const }} placeholder="your@email.com" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: dark, marginBottom: "0.3rem", fontFamily: fontOutfit }}>Address *</label>
                <textarea value={form.customer_address} onChange={(e) => setForm({ ...form, customer_address: e.target.value })} rows={3} style={{ width: "100%", padding: "0.7rem 1rem", borderRadius: "10px", border: "1.5px solid #ddd", fontFamily: fontOutfit, fontSize: "0.9rem", outline: "none", resize: "vertical" as const, color: dark, background: "#fff", boxSizing: "border-box" as const }} placeholder="Delivery address or pickup details" />
              </div>
            </div>

            {formError && <p style={{ fontFamily: fontOutfit, color: "#e74c3c", fontSize: "0.85rem", marginTop: "1rem" }}>{formError}</p>}

            <button onClick={handleOrder} disabled={saving} style={{ width: "100%", padding: "1rem", borderRadius: "14px", border: "none", background: saving ? "#999" : dark, color: "#fff", fontFamily: fontOutfit, fontWeight: 700, fontSize: "0.95rem", cursor: saving ? "not-allowed" : "pointer", marginTop: "1.5rem", boxShadow: saving ? "none" : "0 4px 16px rgba(27,60,51,0.2)" }}>{saving ? "Placing Order..." : "Place Order"}</button>
          </div>
        </div>
      )}
    </>
  );
}
