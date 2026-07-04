"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import ScrollRevealProvider from "@/components/scroll-reveal-provider";
import { API } from "@/lib/api";

interface MenuItem {
  id: number; category: string; name: string; description: string;
  price: string; image_url: string; is_active: boolean; sort_order: number;
}

export default function MenuPage() {
  const [menuData, setMenuData] = useState<Record<string, MenuItem[]>>({});
  const [loading, setLoading] = useState(true);
  const categories = Object.keys(menuData);
  const [active, setActive] = useState("");

  useEffect(() => {
    fetch(`${API}/api/menu`)
      .then((r) => r.json())
      .then((data) => {
        setMenuData(data);
        const cats = Object.keys(data);
        if (cats.length > 0) setActive(cats[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const scrollToSection = (cat: string) => {
    setActive(cat);
    const el = document.getElementById(cat.replace(/[^a-zA-Z]/g, "-"));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <ScrollRevealProvider>
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", color: "var(--color-text-main)" }}>
      <style>{`
        .menu-card {
          transition: transform 0.3s var(--ease-smooth), box-shadow 0.3s var(--ease-smooth);
        }
        .menu-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .menu-card-img {
          width: 100%;
          height: 200px;
          object-fit: cover;
          border-radius: 24px 24px 0 0;
          transition: transform 0.5s var(--ease-smooth);
        }
        .menu-card:hover .menu-card-img {
          transform: scale(1.05);
        }
        .menu-img-wrapper {
          overflow: hidden;
          border-radius: 24px 24px 0 0;
          height: 200px;
        }
        .menu-layout { display: flex; max-width: 1400px; margin: 0 auto; gap: 4rem; padding: 4rem 2rem; }
        .menu-sidebar { width: 300px; position: sticky; top: 100px; flex-shrink: 0; maxHeight: calc(100vh - 120px); display: flex; flex-direction: column; }
        .menu-sidebar-list { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem; overflowY: auto; flex: 1; paddingRight: 8px; }
        .menu-sidebar-cat { text-align: left; letter-spacing: 0.05em; border: 1px solid transparent; border-radius: 15px; padding: 1rem 1.5rem; font-size: 1.1rem; font-weight: 600; background: transparent; cursor: pointer; transition: all 0.3s var(--ease-smooth); width: 100%; min-height: 44px; }
        .menu-sidebar-cat.active { color: var(--color-primary); border-color: var(--color-border); background: #fff; box-shadow: 0 10px 20px rgba(0,0,0,0.06); }
        .menu-sidebar-cat:not(.active) { color: var(--color-text-muted); }
        .menu-content { flex: 1; }
        @media (max-width: 768px) {
          .menu-layout { flex-direction: column; gap: 1.5rem; padding: 1.5rem 1rem; }
          .menu-sidebar { width: 100%; position: static; max-height: none; }
          .menu-sidebar-list { flex-direction: row; overflow-x: auto; overflow-y: hidden; gap: 0.5rem; padding-bottom: 0.5rem; flex-wrap: nowrap; }
          .menu-sidebar-cat { white-space: nowrap; padding: 0.9rem 1.2rem; font-size: 0.95rem; flex-shrink: 0; min-height: 44px; }
        }
      `}</style>

      {/* HERO */}
      <section
        data-bg="light"
        style={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
          minHeight: "40vh",
          padding: "120px 2rem 4rem",
        }}
      >
        <h1
          style={{
            color: "var(--color-primary)",
            fontFamily: "var(--font-noto-serif), serif",
            fontSize: "clamp(2rem, 8vw, 5rem)",
            fontWeight: 900,
            marginBottom: "1rem",
          }}
        >
          OUR FULL MENU
        </h1>
        <p
          style={{
            color: "var(--color-accent)",
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            fontSize: "clamp(0.7rem, 2.5vw, 1.2rem)",
            fontWeight: 700,
            marginBottom: "0.5rem",
          }}
        >
          HANDCRAFTED WITH LOVE FROM USA TO INDIA
        </p>
        <p
          style={{
            color: "var(--color-text-muted)",
            fontFamily: "var(--font-outfit), sans-serif",
            fontSize: "1rem",
            fontStyle: "italic",
          }}
        >
          *Menu offerings may vary by location
        </p>
      </section>

      {loading ? (
        <div style={{ textAlign: "center", padding: "6rem 2rem" }}>
          <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "var(--color-text-muted)", fontSize: "1rem" }}>Loading menu...</p>
        </div>
      ) : categories.length === 0 ? (
        <div style={{ textAlign: "center", padding: "6rem 2rem" }}>
          <p style={{ fontFamily: "var(--font-outfit), sans-serif", color: "var(--color-text-muted)", fontSize: "1rem" }}>Menu items coming soon. Check back later!</p>
          <Link href="/" style={{ display: "inline-block", marginTop: "1.5rem", padding: "0.9rem 2.5rem", borderRadius: "100px", background: "#1b3c33", color: "#fdf9f4", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 700, fontSize: "0.95rem", textDecoration: "none" }}>Back to Home</Link>
        </div>
      ) : (
        <div className="menu-layout">
          {/* SIDEBAR */}
          <div className="menu-sidebar">
            <div className="menu-sidebar-list">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => scrollToSection(cat)}
                  className={`menu-sidebar-cat ${active === cat ? "active" : ""}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <Link
              href="/"
              style={{ color: "var(--color-accent)", fontWeight: 700, display: "inline-block", marginTop: "2rem", textDecoration: "none" }}
            >
            &larr; Back to Home
          </Link>
        </div>

        {/* CONTENT */}
        <div className="menu-content">
          {categories.map((cat) => {
            const items = menuData[cat];
            return (
              <div
                key={cat}
                id={cat.replace(/[^a-zA-Z]/g, "-")}
                style={{ marginBottom: "4rem", scrollMarginTop: "100px" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "2rem",
                    paddingBottom: "1rem",
                    borderBottom: "2px solid var(--color-accent)",
                  }}
                >
                  <h2
                    style={{
                      color: "var(--color-primary)",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      fontSize: "clamp(1.5rem, 5vw, 2.5rem)",
                      fontWeight: 800,
                      fontFamily: "var(--font-noto-serif), serif",
                    }}
                  >
                    {cat}
                  </h2>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))",
                    gap: "1.5rem",
                  }}
                >
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="menu-card"
                      style={{
                        border: "1px solid var(--color-border)",
                        background: "#fff",
                        borderRadius: "24px",
                        overflow: "hidden",
                      }}
                    >
                      {item.image_url && (
                        <div className="menu-img-wrapper">
                          <Image
                            src={`${API}${item.image_url}`}
                            alt={item.name}
                            width={400}
                            height={300}
                            className="menu-card-img"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div style={{ padding: "1.25rem 1.5rem 1.5rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
                          <h3
                            style={{
                              color: "var(--color-primary)",
                              letterSpacing: "0.05em",
                              fontSize: "1.15rem",
                              fontWeight: 800,
                              marginBottom: "0.25rem",
                            }}
                          >
                            {item.name}
                          </h3>
                          {item.price && (
                            <span
                              style={{
                                background: "var(--color-surface)",
                                color: "var(--color-accent)",
                                borderRadius: "20px",
                                padding: "0.3rem 0.8rem",
                                fontSize: "0.85rem",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                              }}
                            >
                              &#8377;{item.price}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p
                            style={{
                              color: "var(--color-text-muted)",
                              fontSize: "0.9rem",
                              lineHeight: 1.5,
                              fontFamily: "var(--font-outfit), sans-serif",
                            }}
                          >
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

    </div>
    </ScrollRevealProvider>
  );
}
