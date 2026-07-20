"use client";

import { useState, useEffect, useRef } from "react";
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
  const [revealed, setRevealed] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API}/api/products`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setProducts(data.filter((p: Product) => p.stock > 0).slice(0, 6)))
      .catch((err) => { if (err.name !== "AbortError") {} })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        ref={sectionRef}
        data-bg="light"
        className={`shop-section-v2 ${revealed ? "revealed" : ""}`}
      >
        <div className="shop-inner-v2">
          <div className="shop-label-v2">Our Shop</div>
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
              <span>Explore All Products</span>
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
