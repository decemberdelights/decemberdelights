"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { API } from "@/lib/api";
import { imageSrc } from "@/lib/utils";
import { ProductCardSkeleton } from "@/components/Skeleton";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  original_price: number;
  category: string;
  image_url: string;
  extra_images?: string | string[];
  stock: number;
  offer: string;
}

export default function ShopSection({ shopEnabled = true }: { shopEnabled?: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(!shopEnabled ? false : true);
  const [revealed, setRevealed] = useState(false);
  const [productCardsRevealed, setProductCardsRevealed] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const carouselDragRef = useRef<{ pointerId: number; pointerX: number; startOffset: number } | null>(null);
  const carouselOffsetRef = useRef(0);

  function generateParticles() {
    return Array.from({ length: 20 }, (_, i) => ({
      left: `${(i * 37) % 100}%`,
      top: `${(i * 53) % 100}%`,
      width: `${4 + (i % 7)}px`,
      height: `${4 + (i % 7)}px`,
      animationDelay: `${(i * 3) % 8}s`,
      animationDuration: `${8 + (i % 12)}s`,
    }));
  }
  const particles = useMemo(() => shopEnabled ? generateParticles() : [], [shopEnabled]);

  useEffect(() => {
    if (!shopEnabled) return;
    const controller = new AbortController();
    fetch(`${API}/api/products`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setProducts(data.filter((p: Product) => p.stock > 0).slice(0, 6)))
      .catch((err) => { if (err.name !== "AbortError") {} })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [shopEnabled]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    let fallbackTimer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.unobserve(el);
          window.clearTimeout(fallbackTimer);
        }
      },
      { threshold: 0.02, rootMargin: "0px 0px 140px 0px" }
    );
    observer.observe(el);
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 150 && rect.bottom > -150) {
      setRevealed(true);
      observer.disconnect();
    } else {
      fallbackTimer = window.setTimeout(() => {
        setRevealed(true);
        observer.disconnect();
      }, 900);
    }
    return () => {
      observer.disconnect();
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    if (!shopEnabled || loading || products.length === 0) return;

    let firstFrame = 0;
    const secondFrame = window.requestAnimationFrame(() => {
      firstFrame = window.requestAnimationFrame(() => setProductCardsRevealed(true));
    });
    return () => {
      window.cancelAnimationFrame(secondFrame);
      window.cancelAnimationFrame(firstFrame);
    };
  }, [shopEnabled, loading, products.length]);

  // Parallax scroll effect on product cards
  useEffect(() => {
    if (!shopEnabled || loading || products.length === 0) return;
    const grid = gridRef.current;
    if (!grid) return;

    const handleScroll = () => {
      const cards = grid.querySelectorAll<HTMLElement>(".shop-card-3d-wrap");
      cards.forEach((card, i) => {
        const rect = card.getBoundingClientRect();
        const viewH = window.innerHeight;
        const center = rect.top + rect.height / 2;
        const offset = ((center - viewH / 2) / viewH) * (15 + (i % 3) * 8);
        card.style.setProperty("--card-parallax-y", `${offset}px`);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [shopEnabled, loading, products.length, productCardsRevealed]);

  useEffect(() => {
    if (!shopEnabled || loading || products.length < 2 || !productCardsRevealed) return;
    const track = carouselRef.current;
    if (!track) return;

    let frameId = 0;
    let previousTime = 0;
    const animate = (time: number) => {
      const group = track.querySelector<HTMLElement>(".shop-carousel-group");
      const loopWidth = group?.getBoundingClientRect().width ?? 0;
      if (!carouselDragRef.current && loopWidth > 0) {
        const elapsed = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
        carouselOffsetRef.current -= elapsed * 40;
        if (carouselOffsetRef.current <= -loopWidth) carouselOffsetRef.current += loopWidth;
        track.style.transform = `translate3d(${carouselOffsetRef.current}px, 0, 0)`;
      }
      previousTime = time;
      frameId = window.requestAnimationFrame(animate);
    };

    const mediaQuery = window.matchMedia("(max-width: 480px) and (prefers-reduced-motion: no-preference)");
    const syncAnimation = () => {
      if (mediaQuery.matches && !frameId) {
        previousTime = 0;
        frameId = window.requestAnimationFrame(animate);
      } else if (!mediaQuery.matches && frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
        previousTime = 0;
      }
    };

    syncAnimation();
    window.addEventListener("resize", syncAnimation);
    mediaQuery.addEventListener("change", syncAnimation);
    return () => {
      window.removeEventListener("resize", syncAnimation);
      mediaQuery.removeEventListener("change", syncAnimation);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [shopEnabled, loading, products.length, productCardsRevealed]);

  const handleCarouselPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" || !carouselRef.current) return;
    carouselDragRef.current = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      startOffset: carouselOffsetRef.current,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleCarouselPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = carouselDragRef.current;
    const track = carouselRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !track) return;

    const group = track.querySelector<HTMLElement>(".shop-carousel-group");
    const loopWidth = group?.getBoundingClientRect().width ?? 0;
    if (!loopWidth) return;

    let offset = drag.startOffset + event.clientX - drag.pointerX;
    offset = ((offset % loopWidth) + loopWidth) % loopWidth - loopWidth;
    carouselOffsetRef.current = offset;
    track.style.transform = `translate3d(${offset}px, 0, 0)`;
  };

  const handleCarouselPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (carouselDragRef.current?.pointerId !== event.pointerId) return;
    carouselDragRef.current = null;
  };

  // 3D card tilt on mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
  }, []);

  return (
    <div
      ref={sectionRef}
      data-bg="dark"
      className={`shop-section-3d ${revealed ? "revealed" : ""}`}
    >
      {/* Floating particles */}
      <div className="shop-particles">
        {particles.map((p, i) => (
          <div
            key={i}
            className="shop-particle"
            style={{
              left: p.left,
              top: p.top,
              width: p.width,
              height: p.height,
              animationDelay: p.animationDelay,
              animationDuration: p.animationDuration,
            }}
          />
        ))}
      </div>

      {/* 3D floating orbs */}
      <div className="shop-orbs">
        <div className="shop-orb shop-orb-1" />
        <div className="shop-orb shop-orb-2" />
        <div className="shop-orb shop-orb-3" />
      </div>

      <div className="shop-inner-3d">
        {/* Header with 3D text */}
        <div className="shop-header-3d">
          <div className="shop-label-3d">
            <span className="shop-label-line" />
            <span>Our Collection</span>
            <span className="shop-label-line" />
          </div>
          <h2 className="shop-heading-3d">
            Premium Products
          </h2>
          <p className="shop-desc-3d">
            Discover our carefully curated collection of premium coffee, artisanal chocolates, and cafe essentials. Crafted with passion and delivered fresh.
          </p>
        </div>

        {/* Product grid with 3D cards */}
        {!shopEnabled ? (
          <div style={{ textAlign: "center", padding: "4rem 0" }}>
            <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(3rem, 8vw, 6rem)", color: "#074134", letterSpacing: "0.1em", margin: 0 }}>BREWING SOON</p>
          </div>
        ) : loading ? (
          <div className="shop-grid-3d">
            {[1, 2, 3].map((i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 0" }}>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(1.5rem, 3vw, 2.5rem)", color: "#fdf9f4", letterSpacing: "0.08em", margin: 0 }}>Brewing Soon</h3>
          </div>
        ) : (
          <div
            ref={gridRef}
            className={`shop-grid-3d ${products.length > 1 ? "shop-carousel-active" : ""} ${productCardsRevealed ? "shop-products-revealed" : ""}`}
            onPointerDown={handleCarouselPointerDown}
            onPointerMove={handleCarouselPointerMove}
            onPointerUp={handleCarouselPointerEnd}
            onPointerCancel={handleCarouselPointerEnd}
          >
            <div ref={carouselRef} className="shop-carousel-track">
              {[0, 1].map((groupIndex) => (
                <div key={groupIndex} className="shop-carousel-group" aria-hidden={groupIndex === 1}>
                  {products.map((product, idx) => (
              <Link
                key={`${groupIndex}-${product.id}`}
                href="/shop"
                aria-label={`Shop ${product.name}`}
                tabIndex={groupIndex === 1 ? -1 : undefined}
                style={{ color: "inherit", cursor: "pointer", textDecoration: "none" }}
              >
                <div
                  className="shop-card-3d-wrap"
                >
                  <div
                    className="shop-card-3d"
                    style={{ transitionDelay: `${idx * 0.04}s` }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="shop-card-glow" />

                  <div className="shop-card-img-3d">
                    {product.image_url ? (
                      <Image
                        src={imageSrc(product.image_url, API)}
                        alt={product.name}
                        fill
                        loading={idx < 2 ? "eager" : "lazy"}
                        sizes="(max-width: 768px) 100vw, 33vw"
                        style={{ objectFit: "contain" }}
                      />
                    ) : (
                      <div className="shop-card-placeholder">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
                          <path d="M18 8h1a4 4 0 010 8h-1" />
                          <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
                          <line x1="6" y1="1" x2="6" y2="4" />
                          <line x1="10" y1="1" x2="10" y2="4" />
                          <line x1="14" y1="1" x2="14" y2="4" />
                        </svg>
                      </div>
                    )}
                    {/* Shine overlay */}
                    <div className="shop-card-shine" />
                  </div>
                  
                  <div className="shop-card-body-3d">
                    <p className="shop-card-cat-3d">{product.category}</p>
                    <h3 className="shop-card-name-3d">{product.name}</h3>
                    <p className="shop-card-desc-3d">{product.description}</p>
                    <div className="shop-card-footer-3d">
                      <span className="shop-card-price-3d">&#8377;{product.price}</span>
                      <span className="shop-card-btn-3d">
                        View
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
                </div>
              </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="shop-cta-3d">
          <Link href="/shop" className="shop-cta-btn-3d">
            <span>Explore All Products</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
