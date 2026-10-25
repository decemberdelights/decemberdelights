"use client";

import dynamic from "next/dynamic";
import HeroSection from "@/components/sections/HeroSection";
import { useSiteSettings } from "@/lib/useSiteSettings";
import { useParallax } from "@/hooks/useParallax";

// `dynamic()` keeps each section code-split; SSR stays ON so crawlers and
// slow devices get real HTML below the hero instead of an empty shell.
// The minHeight placeholders preserve layout (CLS) while chunks load.
const ShopSection = dynamic(() => import("@/components/sections/ShopSection"), { loading: () => <div style={{ minHeight: "600px" }} /> });
const FranchiseSection = dynamic(() => import("@/components/sections/FranchiseSection"), { loading: () => <div style={{ minHeight: "400px" }} /> });
const MenuPreviewSection = dynamic(() => import("@/components/sections/MenuPreviewSection"), { loading: () => <div style={{ minHeight: "400px" }} /> });
const CareerSection = dynamic(() => import("@/components/sections/CareerSection"), { loading: () => <div style={{ minHeight: "400px" }} /> });
const AboutSection = dynamic(() => import("@/components/sections/AboutSection"), { loading: () => <div style={{ minHeight: "400px" }} /> });
const VisitSection = dynamic(() => import("@/components/sections/VisitSection"), { loading: () => <div style={{ minHeight: "400px" }} /> });

export default function Home() {
  const { shop_enabled } = useSiteSettings();
  useParallax();

  return (
    <div style={{ width: "100%", position: "relative", overflow: "hidden" }}>
      <HeroSection />
      <ShopSection shopEnabled={shop_enabled} />
      <FranchiseSection />
      <MenuPreviewSection />
      <CareerSection />
      <AboutSection />
      <VisitSection />
    </div>
  );
}
