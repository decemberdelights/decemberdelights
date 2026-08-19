"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSiteSettings } from "@/lib/useSiteSettings";

export default function Navbar() {
  const pathname = usePathname();
  const { shop_enabled } = useSiteSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkBg, setDarkBg] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [navVisible, setNavVisible] = useState(false);
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

    const timer = setTimeout(() => setNavVisible(true), 100);

    return () => { window.removeEventListener("scroll", check); cancelAnimationFrame(rafId); clearTimeout(timer); };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const links = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: "Careers", href: "/careers" },
    { label: "About Us", href: "/#our-story" },
    { label: "Contact", href: "/contact" },
    ...(shop_enabled ? [
      { label: "Track Order", href: "/track" },
    ] : []),
  ];

  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      <style>{`
        @keyframes navSlideIn {
          from { transform: translateY(-120%) scale(0.92); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes navPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(200,169,126,0); }
          50% { box-shadow: 0 0 0 4px rgba(200,169,126,0.08); }
        }
        @keyframes logoSpin {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        @keyframes hamburgerLine1 {
          0% { transform: rotate(0deg) translateY(0); }
          50% { transform: rotate(0deg) translateY(0); }
          100% { transform: rotate(45deg) translate(5px, 5px); }
        }
        @keyframes hamburgerLine2 {
          0% { opacity: 1; transform: scaleX(1); }
          50% { opacity: 0; transform: scaleX(0); }
          100% { opacity: 0; transform: scaleX(0); }
        }
        @keyframes hamburgerLine3 {
          0% { transform: rotate(0deg) translateY(0); }
          50% { transform: rotate(0deg) translateY(0); }
          100% { transform: rotate(-45deg) translate(5px, -5px); }
        }
        @keyframes mobileMenuFade {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(24px); }
        }
        @keyframes mobileLinkIn {
          from { opacity: 0; transform: translateY(24px) translateX(-12px); }
          to { opacity: 1; transform: translateY(0) translateX(0); }
        }

        .dd-nav {
          position: fixed;
          top: 12px; left: 16px; right: 16px;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 24px;
          border-radius: 999px;
          will-change: transform, opacity, backdrop-filter;
          transform: translateY(-120%) scale(0.92);
          opacity: 0;
          /* Liquid glass morphism */
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          backdrop-filter: blur(20px) saturate(180%);
          background: rgba(15, 30, 22, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow:
            0 4px 24px rgba(0, 0, 0, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          transition: background 0.5s cubic-bezier(0.22, 1, 0.36, 1),
                      border-color 0.5s cubic-bezier(0.22, 1, 0.36, 1),
                      box-shadow 0.5s cubic-bezier(0.22, 1, 0.36, 1),
                      backdrop-filter 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .dd-nav.nav-visible {
          animation: navSlideIn 1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .dd-nav.scrolled {
          transform: translateY(-2px) scale(0.97);
          background: rgba(15, 30, 22, 0.35);
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
        .dd-nav.nav-visible.scrolled {
          transform: translateY(-2px) scale(0.97);
        }
        .dd-nav.dark-bg {
          background: rgba(10, 22, 16, 0.22);
          border-color: rgba(255, 255, 255, 0.08);
          box-shadow:
            0 4px 24px rgba(0, 0, 0, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          backdrop-filter: blur(20px) saturate(180%);
        }
        .dd-nav:not(.dark-bg) {
          background: rgba(255, 255, 255, 0.22);
          border-color: rgba(255, 255, 255, 0.35);
          box-shadow:
            0 4px 24px rgba(0, 0, 0, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.5);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          backdrop-filter: blur(20px) saturate(180%);
        }
        .dd-nav.scrolled:not(.dark-bg) {
          background: rgba(255, 255, 255, 0.35);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
        }

        .dd-nav-links { display: contents; }
        .dd-nav-center {
          display: flex; align-items: center; gap: 2px;
          position: absolute; left: 50%; transform: translateX(-50%);
        }
        .dd-nav-links a {
          position: relative;
          font-size: 12px; font-weight: 800;
          letter-spacing: 1.8px;
          text-transform: uppercase;
          text-decoration: none;
          padding: 8px 14px;
          border-radius: 999px;
          transition: color 0.4s cubic-bezier(0.22, 1, 0.36, 1),
                      background 0.35s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
          z-index: 1;
          color: rgba(245, 240, 235, 0.9);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        .dd-nav:not(.dark-bg) .dd-nav-links a {
          color: rgba(15, 35, 28, 0.9);
          text-shadow: 0 1px 1px rgba(255, 255, 255, 0.3);
        }
        .dd-nav-links a:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.12);
          color: #f5f0eb;
        }
        .dd-nav:not(.dark-bg) .dd-nav-links a:hover {
          background: rgba(0, 0, 0, 0.07);
          color: #074134;
        }
        .dd-nav-links a.dd-cta {
          padding: 9px 24px;
          font-weight: 800;
          letter-spacing: 2px;
          margin-left: auto;
          margin-right: 0;
          flex-shrink: 0;
          transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .dd-nav.dark-bg .dd-nav-links a.dd-cta {
          color: #074134;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 2px 12px rgba(255, 255, 255, 0.15);
          text-shadow: none;
        }
        .dd-nav.dark-bg .dd-nav-links a.dd-cta:hover {
          background: #ffffff;
          box-shadow: 0 4px 20px rgba(255, 255, 255, 0.25);
          transform: translateY(-2px);
        }
        .dd-nav:not(.dark-bg) .dd-nav-links a.dd-cta {
          color: #ffffff;
          background: rgba(9, 75, 61, 0.92);
          box-shadow: 0 2px 12px rgba(9, 75, 61, 0.2);
          text-shadow: none;
        }
        .dd-nav:not(.dark-bg) .dd-nav-links a.dd-cta:hover {
          background: #074134;
          box-shadow: 0 4px 20px rgba(9, 75, 61, 0.3);
          transform: translateY(-2px);
        }
        .dd-nav-links a.dd-cta::before { display: none; }

        .dd-logo-icon {
          display: inline-block;
          flex-shrink: 0;
          transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
          perspective: 600px;
        }
        .dd-logo-icon:hover {
          animation: logoSpin 0.8s cubic-bezier(0.22, 1, 0.36, 1);
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
          min-height: 44px;
          min-width: 44px;
          align-items: center;
          justify-content: center;
        }
        .dd-hamburger span {
          display: block; width: 22px; height: 2px;
          border-radius: 2px;
          transition: all 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .dd-nav.dark-bg .dd-hamburger span { background: rgba(245, 240, 235, 0.8); }
        .dd-nav:not(.dark-bg) .dd-hamburger span { background: rgba(20, 30, 25, 0.8); }
        .dd-hamburger.open span { background: #ffffff !important; }
        .dd-hamburger.open span:nth-child(1) {
          transform: rotate(45deg) translate(5px, 5px);
        }
        .dd-hamburger.open span:nth-child(2) {
          opacity: 0;
          transform: scaleX(0);
        }
        .dd-hamburger.open span:nth-child(3) {
          transform: rotate(-45deg) translate(5px, -5px);
        }

        .dd-mobile-menu {
          position: fixed; inset: 0; z-index: 1001;
          background: rgba(9, 35, 28, 0.92);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          backdrop-filter: blur(24px) saturate(180%);
          display: flex; flex-direction: column;
          justify-content: center; align-items: center;
          gap: 0.5rem;
          opacity: 0; pointer-events: none;
          transition: opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1);
          padding: 2rem;
          padding-left: calc(2rem + env(safe-area-inset-left, 0px));
          padding-right: calc(2rem + env(safe-area-inset-right, 0px));
          padding-top: calc(2rem + env(safe-area-inset-top, 0px));
          padding-bottom: calc(2rem + env(safe-area-inset-bottom, 0px));
        }
        .dd-mobile-menu.open {
          opacity: 1; pointer-events: auto;
          animation: mobileMenuFade 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .dd-mobile-menu a {
          font-family: "Cormorant Garamond", serif;
          font-size: clamp(1.6rem, 7vw, 2.5rem);
          color: rgba(245, 240, 235, 0.85) !important;
          letter-spacing: 0.08em;
          opacity: 0;
          text-decoration: none;
          transform: translateY(24px) translateX(-12px);
          transition: color 0.35s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.6s cubic-bezier(0.22, 1, 0.36, 1),
                      opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1);
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.3rem 1rem;
        }
        .dd-mobile-menu.open a {
          opacity: 1; transform: translateY(0) translateX(0);
        }
        .dd-mobile-menu.open a:nth-child(1) { transition-delay: 0.05s; }
        .dd-mobile-menu.open a:nth-child(2) { transition-delay: 0.10s; }
        .dd-mobile-menu.open a:nth-child(3) { transition-delay: 0.15s; }
        .dd-mobile-menu.open a:nth-child(4) { transition-delay: 0.20s; }
        .dd-mobile-menu.open a:nth-child(5) { transition-delay: 0.25s; }
        .dd-mobile-menu.open a:nth-child(6) { transition-delay: 0.30s; }
        .dd-mobile-menu.open a:nth-child(7) { transition-delay: 0.35s; }
        .dd-mobile-menu a:hover {
          color: #c8a97e !important;
          transform: translateX(8px);
          opacity: 1;
        }

        .dd-mobile-divider {
          width: 40px; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(200,169,126,0.4), transparent);
          opacity: 0;
          transition: opacity 0.4s ease 0.3s;
          margin: 0.25rem 0;
        }
        .dd-mobile-menu.open .dd-mobile-divider { opacity: 1; }

        .dd-mobile-cta {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.4s,
                      transform 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.4s;
        }
        .dd-mobile-menu.open .dd-mobile-cta {
          opacity: 1;
          transform: translateY(0);
        }

        @media (max-width: 900px) {
          .dd-nav-links { display: none !important; }
          .dd-hamburger { display: flex !important; }
          .dd-mobile-logo { display: flex !important; }
          .dd-nav > .dd-logo-icon { display: inline-block !important; }
        }

        @media (max-width: 480px) {
          .dd-nav {
            top: 8px; left: 10px; right: 10px;
            padding: 8px 16px;
          }
          .dd-nav > .dd-logo-icon { height: 24px; width: auto; }
        }
      `}</style>

      <nav
        ref={navRef}
        className={`dd-nav ${navVisible ? "nav-visible" : ""} ${scrolled ? "scrolled" : ""} ${darkBg ? "dark-bg" : ""}`}
      >
        <div className="dd-nav-links">
          <Link href="/#hero" style={{ display: "flex", alignItems: "center", marginRight: "10px" }}>
            <Image
              className="dd-logo-icon"
              src="/logo-icon.png"
              alt="December Delights"
              width={30}
              height={30}
              priority
              style={{ width: "auto", height: "30px" }}
            />
          </Link>
          <div className="dd-nav-center">
            {links.map((link) => (
              <Link key={link.label} href={link.href}>{link.label}</Link>
            ))}
          </div>
          <Link className="dd-cta" href="/franchise">Franchise</Link>
        </div>

        <Link href="/#hero" className="dd-mobile-logo" style={{ display: "none", alignItems: "center" }}>
          <Image
            className="dd-logo-icon"
            src="/logo-icon.png"
            alt="December Delights"
            width={28}
            height={28}
            priority
            style={{ width: "auto", height: "28px" }}
          />
        </Link>

        <button
          className={`dd-hamburger ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <span /><span /><span />
        </button>
      </nav>

      <div className={`dd-mobile-menu ${menuOpen ? "open" : ""}`} role="dialog" aria-label="Navigation menu">
        <Image src="/logo-icon.png" alt="" width={48} height={48} style={{ height: "48px", width: "auto", marginBottom: "0.5rem", opacity: 0.9 }} />
        <div className="dd-mobile-divider" />
        {links.map((link) => (
          <Link key={link.label} href={link.href} onClick={() => setMenuOpen(false)}>
            {link.label}
          </Link>
        ))}
        <div className="dd-mobile-divider" />
        <Link
          href="/franchise"
          onClick={() => setMenuOpen(false)}
          className="dd-mobile-cta"
          style={{
            background: "linear-gradient(135deg, #c8a97e, #e0c9a6)",
            color: "#074134",
            padding: "14px 40px",
            borderRadius: "999px",
            fontWeight: 700,
            fontSize: "clamp(0.9rem, 3.5vw, 1.1rem)",
            fontFamily: "'Montserrat', sans-serif",
            letterSpacing: "0.12em",
            marginTop: "0.25rem",
            boxShadow: "0 4px 20px rgba(200,169,126,0.3)",
          }}
        >
          Franchise →
        </Link>
      </div>
    </>
  );
}
