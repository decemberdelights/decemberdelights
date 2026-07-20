"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ScrollFloat from "@/components/ScrollFloat";
import Image from "next/image";
import { API } from "@/lib/api";
import { ProductCardSkeleton } from "@/components/Skeleton";

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
    const controller = new AbortController();
    fetch(`${API}/api/products`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setProducts(data.filter((p: Product) => p.stock > 0).slice(0, 6)))
      .catch((err) => { if (err.name !== "AbortError") {} })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <>
      <style>{`
        .shop-section-v2 {
          position: relative;
          z-index: 25;
          margin-top: 100vh;
          background: linear-gradient(180deg, #faf8f5 0%, #f0ebe4 50%, #faf8f5 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          overflow: hidden;
          padding: 100px 60px;
        }
        .shop-section-v2::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: 0.35;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 200px 200px;
        }
        .shop-inner-v2 {
          position: relative;
          z-index: 2;
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
        }
        .shop-heading-v2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(28px, 6vw, 90px);
          font-weight: 700;
          color: #094b3d;
          margin-bottom: 20px;
          line-height: 1.15;
        }
        .shop-desc-v2 {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px;
          font-weight: 700;
          font-style: italic;
          line-height: 1.7;
          color: #3d4a3e;
          margin-bottom: 48px;
          max-width: 700px;
        }
        .shop-grid-v2 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 48px;
        }
        .shop-card-v2 {
          background: #fff;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(0,0,0,0.04);
          transition: transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s ease;
          cursor: pointer;
        }
        .shop-card-v2:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 50px rgba(0,0,0,0.1);
        }
        .shop-card-v2-img {
          position: relative;
          width: 100%;
          height: 280px;
          overflow: hidden;
        }
        .shop-card-v2-img img,
        .shop-card-v2-img div {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s cubic-bezier(0.22,1,0.36,1);
        }
        .shop-card-v2:hover .shop-card-v2-img img,
        .shop-card-v2:hover .shop-card-v2-img div {
          transform: scale(1.05);
        }
        .shop-card-v2-body {
          padding: 22px 24px;
          display: flex;
          flex-direction: column;
        }
        .shop-card-v2-cat {
          font-family: 'Montserrat', sans-serif;
          color: #c8a97a;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 8px;
        }
        .shop-card-v2-name {
          font-family: 'Cormorant Garamond', serif;
          color: #094b3d;
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 16px;
        }
        .shop-card-v2-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
          padding-top: 14px;
          border-top: 1px solid rgba(0,0,0,0.06);
        }
        .shop-card-v2-price {
          font-family: 'Montserrat', sans-serif;
          color: #094b3d;
          font-size: 16px;
          font-weight: 800;
        }
        .shop-card-v2-btn {
          font-family: 'Montserrat', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #fff;
          background: #094b3d;
          padding: 10px 20px;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          transition: background 0.3s ease;
          text-decoration: none;
          display: inline-block;
        }
        .shop-card-v2-btn:hover {
          background: #073a2e;
        }
        .shop-cta-v2 {
          text-align: center;
        }
        .shop-cta-v2 a {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 16px 48px;
          font-family: 'Montserrat', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #094b3d;
          background: transparent;
          border: 1.5px solid #094b3d;
          border-radius: 999px;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.22,1,0.36,1);
        }
        .shop-cta-v2 a:hover {
          background: #094b3d;
          color: #fff;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(9,75,61,0.25);
        }
        @media (max-width: 900px) {
          .shop-section-v2 { padding: 80px 40px; }
          .shop-grid-v2 { grid-template-columns: repeat(2, 1fr); gap: 16px; }
        }
        @media (max-width: 768px) {
          .shop-section-v2 { padding: 60px 24px; }
        }
        @media (max-width: 480px) {
          .shop-section-v2 { padding: 40px 16px; }
          .shop-grid-v2 { grid-template-columns: 1fr; gap: 16px; }
        }
      `}</style>

      <div data-bg="light" className="shop-section-v2">
        <div className="shop-inner-v2">
          <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "16px", fontWeight: 700, letterSpacing: "6px", textTransform: "uppercase", color: "#c8a97a", marginBottom: "20px", display: "block" }}>Our Shop</span>
          <div style={{ width: "60px", height: "3px", background: "#c8a97a", marginBottom: "32px" }} />
          <h2 className="shop-heading-v2">
            <ScrollFloat containerClassName="!my-0" textClassName="pb-1">Premium Products</ScrollFloat>
          </h2>
          <p className="shop-desc-v2">
            Discover our carefully curated collection of premium coffee, artisanal chocolates, and café essentials. Crafted with passion and delivered fresh.
          </p>

          {loading ? (
            <div className="shop-grid-v2">
              {[1, 2, 3].map((i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", color: "#094b3d", marginBottom: "8px" }}>Coming Soon</p>
              <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "14px", color: "#3d4a3e" }}>Our premium products will be available here shortly.</p>
            </div>
          ) : (
            <div className="shop-grid-v2">
              {products.map((product, idx) => (
                <Link key={product.id} href="/shop" style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="shop-card-v2">
                    <div className="shop-card-v2-img">
                      {product.image_url ? (
                        <Image
                          src={product.image_url?.startsWith("http") ? product.image_url : `${API}${product.image_url}`}
                          alt={product.name}
                          fill
                          priority={idx < 3}
                          loading={idx < 3 ? "eager" : "lazy"}
                          sizes="(max-width: 768px) 100vw, 33vw"
                          style={{ objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #094b3d, #2d5a4a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: "3rem", opacity: 0.4 }}>&#9749;</span>
                        </div>
                      )}
                    </div>
                    <div className="shop-card-v2-body">
                      <p className="shop-card-v2-cat">{product.category}</p>
                      <h3 className="shop-card-v2-name">{product.name}</h3>
                      <div className="shop-card-v2-footer">
                        <span className="shop-card-v2-price">&#8377;{product.price}</span>
                        <span className="shop-card-v2-btn">View Product</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="shop-cta-v2">
            <Link href="/shop">
              Explore All Products
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
