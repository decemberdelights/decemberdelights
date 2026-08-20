"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer data-bg="light" style={{
      background: "#FFFFFF",
      borderTop: "1px solid rgba(0,0,0,0.06)",
      padding: "clamp(2rem, 5vw, 4rem) 5% clamp(1.5rem, 3vw, 2rem)",
      position: "relative",
      zIndex: 50,
      paddingBottom: "calc(clamp(1.5rem, 3vw, 2rem) + env(safe-area-inset-bottom, 0px))",
    }}>
      <div className="footer-grid">
        <div className="footer-brand">
          <Image src="/logo.png" alt="December Delights" width={300} height={140} sizes="300px" loading="lazy" style={{ height: "140px", width: "auto", marginBottom: "12px" }} />
        </div>

        {[
          { title: "Explore", links: [{ l: "Menu", h: "/menu" }, { l: "Story", h: "/#our-story" }, { l: "Contact", h: "/contact" }] },
          { title: "Company", links: [{ l: "Franchise", h: "/franchise" }, { l: "Careers", h: "/careers" }, { l: "Contact", h: "/contact" }] },
          { title: "Social", links: [{ l: "Instagram", h: "https://www.instagram.com/decemberdelights/" }, { l: "YouTube", h: "https://www.youtube.com/@Decemberdelights-Notjustacafe" }] },
        ].map((col) => (
          <div key={col.title}>
            <h4 style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: "0.85rem",
              fontWeight: 800,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#074134",
              marginBottom: "1rem",
            }}>{col.title}</h4>
            {col.links.map((link) => {
              const isExternal = link.h.startsWith("http");
              return isExternal ? (
                <a key={link.l} href={link.h} className="footer-link" target="_blank" rel="noopener noreferrer">{link.l}</a>
              ) : (
                <Link key={link.l} href={link.h} className="footer-link">{link.l}</Link>
              );
            })}
          </div>
        ))}
      </div>
    </footer>
  );
}
