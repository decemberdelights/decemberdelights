"use client";

import dynamic from "next/dynamic";
import HeroSection from "@/components/sections/HeroSection";
import { useSiteSettings } from "@/lib/useSiteSettings";
import { useParallax } from "@/hooks/useParallax";

const ShopSection = dynamic(() => import("@/components/sections/ShopSection"), { ssr: false, loading: () => <div style={{ minHeight: "600px" }} /> });
const FranchiseSection = dynamic(() => import("@/components/sections/FranchiseSection"), { ssr: false, loading: () => <div style={{ minHeight: "400px" }} /> });
const MenuPreviewSection = dynamic(() => import("@/components/sections/MenuPreviewSection"), { ssr: false, loading: () => <div style={{ minHeight: "400px" }} /> });
const CareerSection = dynamic(() => import("@/components/sections/CareerSection"), { ssr: false, loading: () => <div style={{ minHeight: "400px" }} /> });
const AboutSection = dynamic(() => import("@/components/sections/AboutSection"), { ssr: false, loading: () => <div style={{ minHeight: "400px" }} /> });
const VisitSection = dynamic(() => import("@/components/sections/VisitSection"), { ssr: false, loading: () => <div style={{ minHeight: "400px" }} /> });

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
