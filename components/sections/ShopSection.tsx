"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ScrollFloat from "@/components/ScrollFloat";
import Image from "next/image";
import { API } from "@/lib/api";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  original_price: number;
  category: string;
  image_url: string;
  stock: number;
  offer: string;
}

export default function ShopSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/products`)
      .then((r) => r.json())
      .then((data) => setProducts(data.filter((p: Product) => p.stock > 0).slice(0, 6)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div data-bg="light" style={{ position: "relative", zIndex: 25, marginTop: "100vh", background: "linear-gradient(180deg, #faf8f5 0%, #f0ebe4 50%, #faf8f5 100%)", minHeight: "100vh", display: "flex", justifyContent: "flex-start", alignItems: "center", overflow: "hidden" }}>
      {/* Paper grain texture */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.35, pointerEvents: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "200px 200px" }} />
      {/* Decorative background shapes */}
      <div style={{ position: "absolute", top: "-120px", right: "-80px", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(200,169,122,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-100px", left: "-60px", width: "350px", height: "350px", borderRadius: "50%", background: "radial-gradient(circle, rgba(9,75,61,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "50%", left: "60%", width: "250px", height: "250px", borderRadius: "50%", background: "radial-gradient(circle, rgba(200,169,122,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "20%", left: "10%", width: "180px", height: "180px", borderRadius: "50%", border: "1px solid rgba(200,169,122,0.1)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "15%", right: "15%", width: "120px", height: "120px", borderRadius: "50%", border: "1px solid rgba(9,75,61,0.08)", pointerEvents: "none" }} />
      <style>{`
        .shop-section { padding: 100px 60px; }
        .shop-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 48px; }
        .shop-grid > a { display: flex; flex-direction: column; }
        .shop-grid > a > div { flex: 1; display: flex; flex-direction: column; }
        .shop-heading { font-family: 'Cormorant Garamond', serif; font-size: clamp(28px, 6vw, 90px); font-weight: 700; color: #094b3d; margin-bottom: 20px; line-height: 1.15; }
        @media (max-width: 900px) {
          .shop-section { padding: 80px 40px; }
          .shop-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
        }
        @media (max-width: 768px) {
          .shop-section { padding: 60px 24px; }
        }
        @media (max-width: 480px) {
          .shop-section { padding: 40px 16px; }
          .shop-grid { grid-template-columns: 1fr; gap: 16px; }
        }
      `}</style>
      <div className="shop-section" style={{ maxWidth: "1600px", width: "100%", margin: "0 auto" }}>
        <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "16px", fontWeight: 700, letterSpacing: "6px", textTransform: "uppercase", color: "#c8a97a", marginBottom: "20px", display: "block" }}>Our Shop</span>
        <div style={{ width: "60px", height: "3px", background: "#c8a97a", marginBottom: "32px" }} />
        <h2 className="shop-heading">
          <ScrollFloat containerClassName="!my-0" textClassName="pb-1">Premium Products</ScrollFloat>
        </h2>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 700, fontStyle: "italic", lineHeight: 1.7, color: "#3d4a3e", marginBottom: "48px" }}>
          Discover our carefully curated collection of premium coffee, artisanal chocolates, and café essentials. Crafted with passion and delivered fresh to bring the authentic café experience to your home.
        </p>

        {loading ? (
          <div className="shop-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ background: "#fff", borderRadius: "16px", height: "320px", opacity: 0.5 }} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", color: "#094b3d", marginBottom: "8px" }}>Coming Soon</p>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "14px", color: "#3d4a3e" }}>Our premium products will be available here shortly.</p>
          </div>
        ) : (
          <div className="shop-grid">
            {products.map((product) => (
              <Link key={product.id} href="/shop" style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ background: "#fff", borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)", transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s ease", cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-8px)"; e.currentTarget.style.boxShadow = "0 20px 50px rgba(0,0,0,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div style={{ position: "relative", height: "260px", overflow: "hidden" }}>
                    {product.image_url ? (
                      <Image src={`${API}${product.image_url}`} alt={product.name} fill loading="lazy" sizes="(max-width: 768px) 100vw, 33vw" style={{ objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #094b3d, #2d5a4a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: "3rem", opacity: 0.4 }}>&#9749;</span>
                      </div>
                    )}
                  </div>
                <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
                  <div>
                    <p style={{ fontFamily: "'Montserrat', sans-serif", color: "#c8a97a", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.category}</p>
                    <h3 style={{ fontFamily: "'Cormorant Garamond', serif", color: "#094b3d", fontSize: "22px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.name}</h3>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: "12px", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                    <span style={{ fontFamily: "'Montserrat', sans-serif", color: "#094b3d", fontSize: "16px", fontWeight: 800 }}>&#8377;{product.price}</span>
                    <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#fff", background: "#094b3d", padding: "8px 18px", borderRadius: "999px", cursor: "pointer", transition: "background 0.3s ease" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#073a2e"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#094b3d"; }}
                    >Add to Cart</span>
                  </div>
                </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div style={{ textAlign: "center" }}>
          <Link href="/shop" style={{ display: "inline-block", padding: "16px 48px", fontFamily: "'Montserrat', sans-serif", fontSize: "12px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#fff", background: "#094b3d", border: "none", borderRadius: "999px", cursor: "pointer", textDecoration: "none", transition: "all 0.3s ease", boxShadow: "0 8px 24px rgba(9,75,61,0.3)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#073a2e"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(9,75,61,0.4)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#094b3d"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(9,75,61,0.3)"; }}
          >
            Explore All Products
          </Link>
        </div>
      </div>
    </div>
  );
}
