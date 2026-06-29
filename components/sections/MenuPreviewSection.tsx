"use client";

import { useRef } from "react";
import ScrollFloat from "@/components/ScrollFloat";
import Image from "next/image";
import Link from "next/link";

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
  const videoRef = useRef<HTMLVideoElement>(null);

  const allItems = mustTryItems;

  return (
    <>
      <style>{`
        .menu-section { position: relative; z-index: 25; background: #faf8f5; padding: 100px 80px; min-height: 100vh; display: flex; align-items: center; gap: 60px; isolation: isolate; }
        .menu-content { max-width: 750px; width: 100%; position: relative; z-index: 3; margin-left: auto; }
        .menu-featured { background: rgba(0,0,0,0.03); border: 1px solid rgba(9,75,61,0.1); border-radius: 12px; overflow: hidden; display: flex; }
        .menu-grid-equal { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .menu-card-vert { background: #094b3d; border: 1px solid rgba(9,75,61,0.2); border-radius: 12px; overflow: hidden; transition: transform 0.3s ease, border-color 0.3s ease; }
        .menu-card-vert:hover { transform: translateY(-4px); border-color: rgba(9,75,61,0.4); }
        .menu-video-bg { position: absolute; top: 5%; left: 2%; width: 45%; height: 85%; object-fit: contain; z-index: 1; opacity: 1; filter: brightness(1.3); mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%); mask-composite: intersect; -webkit-mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%); -webkit-mask-composite: source-in; }
        @media (max-width: 768px) {
          .menu-section { flex-direction: column; padding: 60px 24px; min-height: auto; gap: 30px; }
          .menu-content { margin-left: 0; max-width: 100%; }
          .menu-featured { flex-direction: column; }
          .menu-featured > div:first-child { width: 100% !important; height: 200px !important; }
          .menu-grid-equal { grid-template-columns: repeat(2, 1fr); }
          .menu-video-bg { position: relative; top: 0; left: 0; width: 100%; height: 200px; object-fit: cover; mask-image: none; -webkit-mask-image: none; mask-composite: unset; -webkit-mask-composite: unset; opacity: 0.6; border-radius: 12px; order: -1; }
        }
        @media (max-width: 480px) {
          .menu-section { padding: 40px 16px; }
        }
      `}</style>
      <div data-bg="light" className="menu-section">
        <video
          ref={videoRef}
          src="/DDespresso.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="menu-video-bg"
        />
        <div className="menu-content">
          <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "16px", fontWeight: 700, letterSpacing: "6px", textTransform: "uppercase", color: "#c8a97a", marginBottom: "20px", display: "block" }}>
            <ScrollFloat containerClassName="!my-0">What We Serve</ScrollFloat>
          </span>
          <div style={{ width: "60px", height: "3px", background: "#c8a97a", marginBottom: "32px" }} />
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(36px, 6vw, 90px)", fontWeight: 700, color: "#094b3d", marginBottom: "20px", lineHeight: 1.15 }}>
            <ScrollFloat containerClassName="!my-0" textClassName="pb-1">Must-Try Delights</ScrollFloat>
          </h2>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(16px, 2.5vw, 20px)", fontWeight: 400, fontStyle: "italic", lineHeight: 1.6, color: "#3d4a3e", maxWidth: "700px", marginBottom: "40px", position: "relative", paddingLeft: "24px", borderLeft: "3px solid rgba(200,169,122,0.4)" }}>
            Carefully crafted with the finest ingredients, every dish and drink is designed to delight your senses and create unforgettable moments.
          </p>
          <div style={{ marginBottom: "40px" }}>
            <div className="menu-grid-equal">
              {allItems.map((item, i) => (
                <div key={i} className="menu-card-vert">
                  <div style={{ width: "100%", height: "160px", position: "relative" }}>
                    <Image src={item.image} alt={item.name} fill loading="lazy" sizes="(max-width: 768px) 50vw, 33vw" style={{ objectFit: "cover" }} />
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
          <Link href="/menu" style={{ padding: "14px 40px", fontFamily: "'Montserrat', sans-serif", fontSize: "12px", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", color: "#fff", background: "#094b3d", border: "none", borderRadius: "999px", cursor: "pointer", textDecoration: "none", display: "inline-block" }}>
            View Full Menu
          </Link>
        </div>
      </div>
    </>
  );
}