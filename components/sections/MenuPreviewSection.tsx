"use client";

import ScrollFloat from "@/components/ScrollFloat";
import Image from "next/image";
import Link from "next/link";
import LazyVideo from "@/components/LazyVideo";

const mustTryItems = [
  {
    name: "Classic Espresso",
    description: "Rich, bold, and perfectly extracted single-origin espresso",
    image: "/items/espresso.jpg",
  },
  {
    name: "Tiramisu",
    description: "Layers of coffee-soaked ladyfingers and mascarpone cream",
    image: "/items/tiramisu.jpg",
  },
  {
    name: "Basque Burnt Cheesecake",
    description: "Caramelized outside, creamy inside — the perfect indulgence",
    image: "/items/basque-cheesecake.jpg",
  },
  {
    name: "Fudge Brownie",
    description: "Dense, gooey, and loaded with rich dark chocolate",
    image: "/items/fudge-brownie.jpg",
  },
  {
    name: "Marry Me Chicken",
    description: "Creamy sun-dried tomato pasta that wins hearts",
    image: "/items/marry-me-chicken.jpg",
  },
  {
    name: "Bubble Tea",
    description: "Refreshing milk tea with chewy tapioca pearls",
    image: "/items/bubble-tea.jpg",
  },
];

export default function MenuPreviewSection() {
  return (
    <>
      <div data-bg="light" className="menu-section">
        <LazyVideo
          src="/DDespresso.mp4"
          className="menu-video-bg"
        />
        <div className="menu-content">
          <span data-reveal="fade-up" style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "16px", fontWeight: 700, letterSpacing: "6px", textTransform: "uppercase", color: "#c8a97a", marginBottom: "20px", display: "block" }}>
            <ScrollFloat containerClassName="!my-0">What We Serve</ScrollFloat>
          </span>
          <div data-reveal="fade-up" className="delay-1" style={{ width: "60px", height: "3px", background: "#c8a97a", marginBottom: "32px" }} />
          <h2 data-reveal="fade-up" className="delay-2" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(36px, 6vw, 90px)", fontWeight: 700, color: "#094b3d", marginBottom: "20px", lineHeight: 1.15 }}>
            <ScrollFloat containerClassName="!my-0" textClassName="whitespace-nowrap">Must-Try Delights</ScrollFloat>
          </h2>
          <p data-reveal="fade-up" className="delay-3" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(16px, 2.5vw, 20px)", fontWeight: 400, fontStyle: "italic", lineHeight: 1.6, color: "#3d4a3e", maxWidth: "700px", marginBottom: "40px", position: "relative", paddingLeft: "24px", borderLeft: "3px solid rgba(200,169,122,0.4)" }}>
            Carefully crafted with the finest ingredients, every dish and drink is designed to delight your senses and create unforgettable moments.
          </p>
          <div style={{ marginBottom: "40px" }}>
            <div className="menu-grid-equal">
              {mustTryItems.map((item, i) => (
                <div key={i} data-reveal="scale-up" className={`menu-card-vert delay-${Math.min(i + 2, 8)}`}>
                  <div style={{ width: "100%", height: "160px", position: "relative", overflow: "hidden" }}>
                    <Image src={item.image} alt={item.name} fill loading="lazy" sizes="(max-width: 768px) 50vw, 33vw" style={{ objectFit: "cover", transition: "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }} />
                  </div>
                  <div style={{ padding: "14px 16px" }}>
                    <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", fontWeight: 700, color: "#c8a97a", marginBottom: "4px" }}>
                      {item.name}
                    </h3>
                    <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "11px", fontWeight: 400, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div data-reveal="fade-up" className="delay-5">
            <Link href="/menu" className="hover-lift" style={{ padding: "14px 40px", fontFamily: "'Montserrat', sans-serif", fontSize: "12px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "#fff", background: "#094b3d", border: "none", borderRadius: "999px", cursor: "pointer", textDecoration: "none", display: "inline-block" }}>
              View Full Menu
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
