"use client";

import ScrollFloat from "@/components/ScrollFloat";
import Image from "next/image";
import Link from "next/link";
import LazyVideo from "@/components/LazyVideo";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const mustTryItems = [
  { name: "Classic Espresso", description: "Rich, bold, and perfectly extracted single-origin espresso", image: "/items/espresso.jpg" },
  { name: "Tiramisu", description: "Layers of coffee-soaked ladyfingers and mascarpone cream", image: "/items/tiramisu.jpg" },
  { name: "Basque Burnt Cheesecake", description: "Caramelized outside, creamy inside — the perfect indulgence", image: "/items/basque-cheesecake.jpg" },
  { name: "Fudge Brownie", description: "Dense, gooey, and loaded with rich dark chocolate", image: "/items/fudge-brownie.jpg" },
  { name: "Marry Me Chicken", description: "Creamy sun-dried tomato pasta that wins hearts", image: "/items/marry-me-chicken.jpg" },
  { name: "Bubble Tea", description: "Refreshing milk tea with chewy tapioca pearls", image: "/items/bubble-tea.jpg" },
];

export default function MenuPreviewSection() {
  const revealRef = useScrollReveal(0.02, "0px 0px 240px 0px", { animation: "slideUp3D", duration: 0.4, stagger: 0.02 });
  return (
    <>
      <div data-bg="light" className="menu-section">
        <LazyVideo src="/DDespresso.mp4" className="menu-video-bg" data-parallax="0.15" />
        <div ref={revealRef} className="menu-content section-reveal" data-parallax="-0.08">
          <span style={{ fontFamily: "var(--font-montserrat)", fontSize: "13px", fontWeight: 700, letterSpacing: "5px", textTransform: "uppercase", color: "#c8a97a", marginBottom: "20px", display: "block" }}>
            <ScrollFloat animation="slideUp3D" containerClassName="!my-0">What We Serve</ScrollFloat>
          </span>
          <div style={{ width: "60px", height: "3px", background: "#c8a97a", marginBottom: "32px" }} />
          <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(32px, 5vw, 64px)", fontWeight: 700, color: "#074134", marginBottom: "24px", lineHeight: 1.05, textTransform: "uppercase" }}>
            Must-Try Delights
          </h2>
          <p data-reveal-child style={{ fontFamily: "var(--font-montserrat)", fontSize: "16px", fontWeight: 400, lineHeight: 1.75, color: "#3d4a3e", maxWidth: "700px", marginBottom: "40px", position: "relative", paddingLeft: "24px", borderLeft: "3px solid rgba(200,169,122,0.4)" }}>
            Carefully crafted with the finest ingredients, every dish and drink is designed to delight your senses and create unforgettable moments.
          </p>
          <div style={{ marginBottom: "40px" }}>
            <div className="menu-grid-equal">
              {mustTryItems.map((item, i) => (
                <div key={i} className="menu-card-vert" data-reveal-child>
                  <div className="menu-vert-img">
                    <Image src={item.image} alt={item.name} fill loading="lazy" sizes="(max-width: 768px) 50vw, 33vw" style={{ objectFit: "cover" }} />
                  </div>
                  <div className="menu-card-vert-body" style={{ padding: "14px 16px" }}>
                    <h3 className="menu-vert-title" style={{ fontFamily: "var(--font-cormorant)", fontSize: "18px", fontWeight: 700, color: "#c8a97a", marginBottom: "4px" }}>{item.name}</h3>
                    <p className="menu-vert-desc" style={{ fontFamily: "var(--font-montserrat)", fontSize: "11px", fontWeight: 400, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Link href="/menu" style={{ padding: "14px 40px", fontFamily: "var(--font-montserrat)", fontSize: "12px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "#fff", background: "#074134", border: "none", borderRadius: "999px", cursor: "pointer", textDecoration: "none", display: "inline-block" }}>
            View Full Menu
          </Link>
        </div>
      </div>
    </>
  );
}
