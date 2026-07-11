"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { API } from "@/lib/api";
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
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", customer_address: "" });
  const [formError, setFormError] = useState("");
  const redirectTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setCart(loadCart()); }, []);

  useEffect(() => { saveCart(cart); }, [cart]);

  useEffect(() => {
    fetch(`${API}/api/products`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setProducts(data); setLoading(false); })
      .catch(() => { setFetchError(true); setLoading(false); });
    fetch(`${API}/api/products/categories`)
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  const filtered = activeCategory ? products.filter((p) => p.category === activeCategory) : products;
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const cartTotal = cart.reduce((s, c) => s + c.product.price * c.quantity, 0);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((c) => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { product, quantity: 1 }];
    });
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
    if (cart.length === 0) {
      setFormError("Your cart is empty");
      return;
    }
    setSaving(true);
    setFormError("");
    const r = await fetch(`${API}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
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
      setForm({ customer_name: "", customer_phone: "", customer_address: "" });
      redirectTimer.current = setTimeout(() => {
        router.push(`/track?phone=${encodeURIComponent(phone)}`);
      }, 3000);
    } else {
      setFormError(data.error || "Order failed");
    }
    setSaving(false);
  };

  useEffect(() => {
    return () => { if (redirectTimer.current) clearTimeout(redirectTimer.current); };
  }, []);

  if (orderSuccess) {
    return (
      <>
        <style>{`@keyframes successPop { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } } @keyframes successPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(39,174,96,0.3); } 50% { box-shadow: 0 0 0 16px rgba(39,174,96,0); } } @keyframes fadeSlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } } @keyframes checkDraw { from { stroke-dashoffset: 30; } to { stroke-dashoffset: 0; } }`}</style>
        <main style={{ minHeight: "100vh", background: "#faf8f5", padding: "8rem 0 4rem" }}>
          <div style={{ maxWidth: "500px", margin: "0 auto", padding: "4rem 2rem", textAlign: "center" }}>
            <div style={{ width: "100px", height: "100px", borderRadius: "50%", background: "#27ae60", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 2rem", animation: "successPop 0.5s ease forwards, successPulse 2s ease infinite 0.5s" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "checkDraw 0.6s ease 0.3s both" }}>
                <polyline points="20 6 9 17 4 12" strokeDasharray="30" strokeDashoffset="30" style={{ animation: "checkDraw 0.4s ease 0.5s forwards" }} />
              </svg>
            </div>
            <h1 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "2.5rem", marginBottom: "0.5rem", animation: "fadeSlideUp 0.5s ease 0.3s both" }}>Order Placed!</h1>
            <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#586159", fontSize: "1rem", lineHeight: 1.7, marginBottom: "0.5rem", animation: "fadeSlideUp 0.5s ease 0.4s both" }}>
              Your order <strong style={{ color: "#1b3c33" }}>#{orderId}</strong> has been placed successfully.
            </p>
            <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", fontSize: "0.85rem", marginBottom: "2rem", animation: "fadeSlideUp 0.5s ease 0.5s both" }}>
              Redirecting to order tracking in a few seconds...
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", animation: "fadeSlideUp 0.5s ease 0.6s both" }}>
              <button onClick={() => { if (redirectTimer.current) clearTimeout(redirectTimer.current); router.push(`/track?phone=${encodeURIComponent(orderPhone)}`); }} style={{ padding: "0.85rem 2rem", borderRadius: "100px", border: "none", background: "#1b3c33", color: "#fff", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", transition: "background 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#153229"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#1b3c33"; }}
              >Track Now</button>
              <button onClick={() => { if (redirectTimer.current) clearTimeout(redirectTimer.current); setOrderSuccess(false); }} style={{ padding: "0.85rem 2rem", borderRadius: "100px", border: "1.5px solid #ddd", background: "#fff", color: "#586159", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", transition: "border-color 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1b3c33"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#ddd"; }}
              >Continue Shopping</button>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <main data-bg="light" style={{ minHeight: "100vh", background: "#fff", padding: "8rem 0 4rem" }}>
        <section data-bg="dark" style={{ background: "#1b3c33", color: "#fdf9f4", padding: "5rem 5%", textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#c8a97a", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Shop</p>
          <h1 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", fontSize: "clamp(1.8rem, 6vw, 4.5rem)", color: "#fdf9f4" }}>Premium Coffee & Products</h1>
          <p style={{ fontFamily: "var(--font-outfit), sans-serif", fontSize: "1.1rem", color: "#e8e5e0", maxWidth: "500px", margin: "1rem auto 0" }}>
            Handpicked coffee beans, blends, and accessories delivered to your doorstep.
          </p>
        </section>

        <div data-bg="light" style={{ maxWidth: "1200px", margin: "0 auto", padding: "3rem 5%", background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
            {categories.length > 0 && (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button onClick={() => setActiveCategory("")} style={{ padding: "0.65rem 1.5rem", borderRadius: "100px", border: !activeCategory ? "2px solid #1b3c33" : "1.5px solid #ddd", background: !activeCategory ? "#1b3c33" : "#fff", color: !activeCategory ? "#fff" : "#586159", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", minHeight: "44px" }}>All</button>
                {categories.map((cat) => (
                  <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: "0.65rem 1.5rem", borderRadius: "100px", border: activeCategory === cat ? "2px solid #1b3c33" : "1.5px solid #ddd", background: activeCategory === cat ? "#1b3c33" : "#fff", color: activeCategory === cat ? "#fff" : "#586159", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", minHeight: "44px" }}>{cat}</button>
                ))}
              </div>
            )}
            <button onClick={() => setShowCart(true)} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.7rem 1.2rem", borderRadius: "12px", border: "1.5px solid #e8e5e0", background: "#fff", color: "#1b3c33", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", position: "relative", transition: "all 0.2s", minHeight: "44px" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1b3c33"; e.currentTarget.style.background = "#faf8f5"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e8e5e0"; e.currentTarget.style.background = "#fff"; }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
              Cart
              {cartCount > 0 && <span style={{ background: "#1b3c33", color: "#fff", width: "20px", height: "20px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 800 }}>{cartCount}</span>}
            </button>
          </div>

          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))", gap: "1.5rem" }}>
              {[1, 2, 3, 4, 5, 6].map((i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : fetchError ? (
            <div style={{ textAlign: "center", padding: "4rem" }}>
              <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#e74c3c", fontSize: "1rem", marginBottom: "1rem" }}>Failed to load products.</p>
              <button onClick={() => window.location.reload()} style={{ padding: "0.7rem 2rem", borderRadius: "100px", border: "none", background: "#1b3c33", color: "#fff", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem" }}>
              <p style={{ fontFamily: "var(--font-bebas-neue), sans-serif", fontSize: "1.5rem", color: "#1b3c33", marginBottom: "0.5rem" }}>Coming Soon</p>
              <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#586159" }}>Our premium products will be available here shortly.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))", gap: "1.5rem" }}>
              {filtered.map((product) => {
                const inCart = cart.find((c) => c.product.id === product.id);
                const hasDiscount = product.original_price > product.price;
                const discountPct = hasDiscount ? Math.round(((product.original_price - product.price) / product.original_price) * 100) : 0;
                return (
                  <div key={product.id} style={{ background: "#fff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 16px rgba(27,60,51,0.06)", transition: "transform 0.3s, box-shadow 0.3s" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(27,60,51,0.12)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 16px rgba(27,60,51,0.06)"; }}>
                    <div style={{ position: "relative", height: "220px", overflow: "hidden", background: "#f5f3ef" }}>
                      {product.image_url ? (
                        <Image src={product.image_url?.startsWith("http") ? product.image_url : `${API}${product.image_url}`} alt={product.name} fill style={{ objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #1b3c33 0%, #2d5a4a 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: "3rem" }}>&#9749;</span>
                        </div>
                      )}
                      {hasDiscount && (
                        <div style={{ position: "absolute", top: "0.75rem", left: "0.75rem", background: "#1b3c33", color: "#fff", padding: "0.25rem 0.65rem", borderRadius: "4px", fontFamily: "var(--font-outfit), sans-serif", fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.05em" }}>
                          {product.offer || `${discountPct}% OFF`}
                        </div>
                      )}
                      {product.stock <= 0 && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#e74c3c", fontWeight: 800, fontSize: "0.9rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Out of Stock</span>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "1.25rem" }}>
                      <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#c8a97a", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.25rem" }}>{product.category}</p>
                      <h3 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.15rem", marginBottom: "0.35rem", letterSpacing: "0.02em" }}>{product.name}</h3>
                      {product.description && <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#3d4a3e", fontSize: "0.8rem", lineHeight: 1.5, marginBottom: "0.75rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{product.description}</p>}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                          <span style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.35rem" }}>&#8377;{product.price}</span>
                          {hasDiscount && <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#bbb", fontSize: "0.78rem", textDecoration: "line-through" }}>&#8377;{product.original_price}</span>}
                        </div>
                        {product.stock > 0 && <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#888", fontSize: "0.72rem" }}>{product.stock} in stock</span>}
                      </div>
                      <div style={{ marginTop: "0.85rem" }}>
                        {inCart ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <button onClick={() => updateQty(product.id, -1)} style={{ width: "40px", height: "40px", borderRadius: "8px", border: "1.5px solid #1b3c33", background: "#fff", color: "#1b3c33", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>-</button>
                            <span style={{ fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.9rem", minWidth: "24px", textAlign: "center" }}>{inCart.quantity}</span>
                            <button onClick={() => updateQty(product.id, 1)} disabled={inCart.quantity >= product.stock} style={{ width: "40px", height: "40px", borderRadius: "8px", border: "1.5px solid #1b3c33", background: "#1b3c33", color: "#fff", fontWeight: 700, cursor: inCart.quantity >= product.stock ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>+</button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(product)} disabled={product.stock <= 0} style={{ width: "100%", padding: "0.75rem", borderRadius: "10px", border: "none", background: product.stock > 0 ? "#1b3c33" : "#e0e0e0", color: "#fff", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.8rem", cursor: product.stock > 0 ? "pointer" : "not-allowed", letterSpacing: "0.03em", minHeight: "44px" }}>
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

        {showCart && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setShowCart(false)} />
            <div style={{ marginLeft: "auto", width: "420px", maxWidth: "100%", height: "100%", background: "#fff", position: "relative", display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.25)", overflow: "hidden", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
              <div style={{ padding: "1.5rem", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <h2 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.5rem" }}>Your Cart ({cartCount})</h2>
                <button onClick={() => setShowCart(false)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#586159" }}>&times;</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.5rem" }}>
                {cart.length === 0 ? (
                  <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#999", textAlign: "center", padding: "3rem 0" }}>Your cart is empty</p>
                ) : cart.map((item) => (
                  <div key={item.product.id} style={{ display: "flex", gap: "1rem", padding: "1rem 0", borderBottom: "1px solid #f0f0f0" }}>
                    <div style={{ width: "60px", height: "60px", borderRadius: "10px", overflow: "hidden", flexShrink: 0, background: "#f5f5f5", position: "relative" }}>
                      {item.product.image_url ? <Image src={item.product.image_url?.startsWith("http") ? item.product.image_url : `${API}${item.product.image_url}`} alt={item.product.name} width={60} height={60} style={{ objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>&#9749;</div>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#1b3c33", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.3rem" }}>{item.product.name}</h4>
                      <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#1b3c33", fontSize: "0.85rem", fontWeight: 700 }}>&#8377;{item.product.price * item.quantity}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                        <button onClick={() => updateQty(item.product.id, -1)} style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "0.8rem" }}>-</button>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>{item.quantity}</span>
                        <button onClick={() => updateQty(item.product.id, 1)} disabled={item.quantity >= item.product.stock} style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid #ddd", background: "#1b3c33", color: "#fff", cursor: item.quantity >= item.product.stock ? "not-allowed" : "pointer", fontSize: "0.8rem", opacity: item.quantity >= item.product.stock ? 0.4 : 1 }}>+</button>
                        <button onClick={() => removeFromCart(item.product.id)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#e74c3c", fontSize: "0.75rem", cursor: "pointer", fontFamily: "var(--font-outfit), sans-serif" }}>Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {cart.length > 0 && (
                <div style={{ padding: "1.5rem", borderTop: "1px solid #eee", flexShrink: 0, background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <span style={{ fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, color: "#1b3c33" }}>Total</span>
                    <span style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.3rem" }}>&#8377;{cartTotal}</span>
                  </div>
                  <button onClick={() => { setShowCart(false); setShowCheckout(true); }} style={{ width: "100%", padding: "0.9rem", borderRadius: "100px", border: "none", background: "#1b3c33", color: "#fff", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}>Proceed to Checkout</button>
                </div>
              )}
            </div>
          </div>
        )}

        {showCheckout && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setShowCheckout(false)} />
              <div style={{ background: "#fff", borderRadius: "20px", padding: "2rem", width: "460px", maxWidth: "95%", position: "relative", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}>
              <button onClick={() => setShowCheckout(false)} style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#586159" }}>&times;</button>
              <h2 style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#1b3c33", fontSize: "1.5rem", marginBottom: "1.5rem" }}>Checkout</h2>

              <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#faf8f5", borderRadius: "12px" }}>
                {cart.map((item) => (
                  <div key={item.product.id} style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-outfit), sans-serif", fontSize: "0.85rem", marginBottom: "0.5rem", color: "#1a1a1a" }}>
                    <span>{item.product.name} x{item.quantity}</span>
                    <span style={{ fontWeight: 700, color: "#1b3c33" }}>&#8377;{item.product.price * item.quantity}</span>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid #e8e5e0", marginTop: "0.5rem", paddingTop: "0.5rem", display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                  <span style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#1b3c33" }}>Total</span>
                  <span style={{ fontFamily: "var(--font-bebas-neue), sans-serif", fontSize: "1.2rem", color: "#1b3c33" }}>&#8377;{cartTotal}</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#1b3c33", marginBottom: "0.3rem", fontFamily: "var(--font-outfit), sans-serif" }}>Full Name *</label>
                  <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} style={{ width: "100%", padding: "0.7rem 1rem", borderRadius: "10px", border: "1.5px solid #ddd", fontFamily: "var(--font-outfit), sans-serif", fontSize: "0.9rem", outline: "none", color: "#1b3c33", background: "#fff", boxSizing: "border-box" as const }} placeholder="Your name" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#1b3c33", marginBottom: "0.3rem", fontFamily: "var(--font-outfit), sans-serif" }}>Mobile Number *</label>
                  <input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} style={{ width: "100%", padding: "0.7rem 1rem", borderRadius: "10px", border: "1.5px solid #ddd", fontFamily: "var(--font-outfit), sans-serif", fontSize: "0.9rem", outline: "none", color: "#1b3c33", background: "#fff", boxSizing: "border-box" as const }} placeholder="10-digit mobile number" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#1b3c33", marginBottom: "0.3rem", fontFamily: "var(--font-outfit), sans-serif" }}>Address *</label>
                  <textarea value={form.customer_address} onChange={(e) => setForm({ ...form, customer_address: e.target.value })} rows={3} style={{ width: "100%", padding: "0.7rem 1rem", borderRadius: "10px", border: "1.5px solid #ddd", fontFamily: "var(--font-outfit), sans-serif", fontSize: "0.9rem", outline: "none", resize: "vertical" as const, color: "#1b3c33", background: "#fff", boxSizing: "border-box" as const }} placeholder="Delivery address or pickup details" />
                </div>
              </div>

              {formError && <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "#e74c3c", fontSize: "0.85rem", marginTop: "1rem" }}>{formError}</p>}

              <button onClick={handleOrder} disabled={saving} style={{ width: "100%", padding: "0.9rem", borderRadius: "100px", border: "none", background: saving ? "#999" : "#1b3c33", color: "#fff", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.9rem", cursor: saving ? "not-allowed" : "pointer", marginTop: "1.5rem" }}>{saving ? "Placing Order..." : "Place Order"}</button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
