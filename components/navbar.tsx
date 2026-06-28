"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkBg, setDarkBg] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const bgElsRef = useRef<Element[]>([]);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const scan = () => {
      if (navRef.current) {
        bgElsRef.current = Array.from(navRef.current.parentElement?.querySelectorAll("[data-bg]") || []);
      }
    };
    scan();

    let ticking = false;
    let rafId = 0;
    const check = () => {
      if (ticking) return;
      ticking = true;
      rafId = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 60);
        const navCenterY = 40;
        let isDark = true;
        bgElsRef.current.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.top <= navCenterY && rect.bottom >= navCenterY) {
            isDark = el.getAttribute("data-bg") === "dark";
          }
        });
        setDarkBg(isDark);
        ticking = false;
      });
    };
    window.addEventListener("scroll", check, { passive: true });
    check();
    return () => { window.removeEventListener("scroll", check); cancelAnimationFrame(rafId); };
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const links = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop/" },
    { label: "About Us", href: "/#our-story" },
    { label: "Careers", href: "/careers/" },
    { label: "Contact", href: "/contact/" },
    { label: "Track Order", href: "/track/" },
  ];

  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <style>{`
        .dd-nav {
          position: fixed;
          top: 12px; left: 16px; right: 16px;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 24px;
          border-radius: 999px;
          transition: transform 0.4s cubic-bezier(0.16,1,0.3,1), background 0.5s ease, border-color 0.5s ease, box-shadow 0.5s ease, backdrop-filter 0.5s ease;
          will-change: transform, background;
          transform: translateZ(0);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.25);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(255, 255, 255, 0.08);
        }
        .dd-nav.scrolled {
          transform: translateZ(0) scale(0.97) translateY(-2px);
        }
        .dd-nav.dark-bg {
          background: rgba(0, 0, 0, 0.35);
          border-color: rgba(255, 255, 255, 0.15);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(24px) saturate(200%);
          -webkit-backdrop-filter: blur(24px) saturate(200%);
        }
        .dd-nav:not(.dark-bg) {
          background: rgba(255, 255, 255, 0.65);
          border-color: rgba(255, 255, 255, 0.7);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(255, 255, 255, 0.1);
        }

        .dd-nav-links { display: contents; }
        .dd-nav-center {
          display: flex; align-items: center; gap: 2px;
          position: absolute; left: 50%; transform: translateX(-50%);
        }
        .dd-nav-links a {
          position: relative;
          font-size: 12.5px; font-weight: 800;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          text-decoration: none;
          padding: 8px 13px;
          border-radius: 999px;
          transition: color 0.6s ease, background 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 1;
          color: #f5f0eb;
        }
        .dd-nav:not(.dark-bg) .dd-nav-links a {
          color: #111111;
        }
        .dd-nav-links a:hover { transform: translateY(-1px); background: rgba(255,255,255,0.15); }
        .dd-nav:not(.dark-bg) .dd-nav-links a:hover { background: rgba(0,0,0,0.08); }
        .dd-nav-links a.dd-cta {
          padding: 9px 22px;
          font-weight: 700;
          margin-left: auto;
          margin-right: 0;
          flex-shrink: 0;
          transition: color 0.6s ease, background 0.6s ease;
        }
        .dd-nav.dark-bg .dd-nav-links a.dd-cta {
          color: #094b3d;
          background: #ffffff;
        }
        .dd-nav:not(.dark-bg) .dd-nav-links a.dd-cta {
          color: #ffffff;
          background: #111111;
        }
        .dd-nav-links a.dd-cta::before { display: none; }

        @keyframes dd-flip {
          0%, 100% { transform: rotateY(0deg); }
          50% { transform: rotateY(180deg); }
        }
        .dd-logo-icon {
          animation: dd-flip 2s ease-in-out infinite;
          display: inline-block;
          flex-shrink: 0;
        }

        .dd-hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          cursor: pointer;
          padding: 10px;
          background: none;
          border: none;
          z-index: 110;
          position: relative;
        }
        .dd-hamburger span {
          display: block; width: 22px; height: 2px;
          background: #f5f0eb;
          transition: background 0.6s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
        }
        .dd-nav:not(.dark-bg) .dd-hamburger span {
          background: #111111;
        }
        .dd-hamburger.open span { background: #ffffff !important; }
        .dd-hamburger.open span:nth-child(1) { transform: rotate(45deg) translate(4.5px, 4.5px); }
        .dd-hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
        .dd-hamburger.open span:nth-child(3) { transform: rotate(-45deg) translate(4.5px, -4.5px); }

        .dd-mobile-menu {
          position: fixed; inset: 0; z-index: 105;
          background: rgba(26,15,10,0.97);
          display: flex; flex-direction: column;
          justify-content: center; align-items: center;
          gap: 1.5rem;
          opacity: 0; pointer-events: none;
          transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          padding: 2rem;
        }
        .dd-mobile-menu.open { opacity: 1; pointer-events: auto; }
        .dd-mobile-menu a {
          font-family: "Cormorant Garamond", serif;
          font-size: clamp(1.8rem, 7vw, 2.5rem);
          color: #f5f0eb;
          letter-spacing: 0.08em;
          opacity: 0;
          text-decoration: none;
          transform: translateY(20px);
          transition: color 0.4s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease;
        }
        .dd-mobile-menu.open a { opacity: 0.8; transform: translateY(0); }
        .dd-mobile-menu.open a:nth-child(1) { transition-delay: 0.05s; }
        .dd-mobile-menu.open a:nth-child(2) { transition-delay: 0.10s; }
        .dd-mobile-menu.open a:nth-child(3) { transition-delay: 0.15s; }
        .dd-mobile-menu.open a:nth-child(4) { transition-delay: 0.20s; }
        .dd-mobile-menu.open a:nth-child(5) { transition-delay: 0.25s; }
        .dd-mobile-menu.open a:nth-child(6) { transition-delay: 0.30s; }
        .dd-mobile-menu.open a:nth-child(7) { transition-delay: 0.35s; }
        .dd-mobile-menu a:hover { color: #c8a97a; transform: translateX(8px); opacity: 1; }

        .dd-mobile-divider {
          width: 40px; height: 1px;
          background: rgba(200,169,122,0.3);
          opacity: 0;
          transition: opacity 0.4s ease 0.3s;
        }
        .dd-mobile-menu.open .dd-mobile-divider { opacity: 1; }

        @media (max-width: 900px) {
          .dd-nav-links { display: none !important; }
          .dd-hamburger { display: flex !important; }
          .dd-nav > .dd-logo-icon { display: inline-block !important; }
        }

        @media (max-width: 480px) {
          .dd-nav {
            top: 8px; left: 10px; right: 10px;
            padding: 8px 16px;
          }
          .dd-nav > .dd-logo-icon { height: 24px; width: 24px; }
        }
      `}</style>

      <nav
        ref={navRef}
        className={`dd-nav ${scrolled ? "scrolled" : ""} ${darkBg ? "dark-bg" : ""}`}
      >
        <div className="dd-nav-links">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="dd-logo-icon"
            src="/logo-icon.png"
            alt="December Delights"
            style={{ height: "30px", width: "30px", marginRight: "10px", pointerEvents: "none" }}
          />
          <div className="dd-nav-center">
            {links.map((link) => (
              <a key={link.label} href={link.href}>{link.label}</a>
            ))}
          </div>
          <a className="dd-cta" href="/franchise/">Franchise</a>
        </div>

        {/* Logo visible on mobile (left side) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="dd-logo-icon"
          src="/logo-icon.png"
          alt="December Delights"
          style={{
            height: "28px", width: "28px",
            pointerEvents: "none",
            display: "none",
          }}
          // shown via CSS below
        />

        <button
          className={`dd-hamburger ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* Mobile menu */}
      <div className={`dd-mobile-menu ${menuOpen ? "open" : ""}`} role="dialog" aria-label="Navigation menu">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon.png" alt="" style={{ height: "48px", width: "48px", marginBottom: "0.5rem", opacity: 0.9 }} />
        <div className="dd-mobile-divider" />
        {links.map((link) => (
          <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)}>
            {link.label}
          </a>
        ))}
        <a
          href="/franchise/"
          onClick={() => setMenuOpen(false)}
          style={{
            background: "linear-gradient(135deg, #f4b954, #f5d9aa)",
            color: "#094b3d",
            padding: "12px 36px",
            borderRadius: "999px",
            fontWeight: 700,
            fontSize: "clamp(1rem, 4vw, 1.2rem)",
            fontFamily: "'Montserrat', sans-serif",
            letterSpacing: "0.1em",
            marginTop: "0.5rem",
          }}
        >
          Franchise →
        </a>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .dd-logo-icon { display: inline-block !important; }
          .dd-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  );
}