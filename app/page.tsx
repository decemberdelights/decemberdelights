"use client";

import dynamic from "next/dynamic";
import HeroSection from "@/components/sections/HeroSection";
import AboutSection from "@/components/sections/AboutSection";

const MenuPreviewSection = dynamic(() => import("@/components/sections/MenuPreviewSection"));
const ShopSection = dynamic(() => import("@/components/sections/ShopSection"));
const VisitSection = dynamic(() => import("@/components/sections/VisitSection"));
const FranchiseSection = dynamic(() => import("@/components/sections/FranchiseSection"));
const CareerSection = dynamic(() => import("@/components/sections/CareerSection"));

export default function Home() {
  return (
    <div style={{ width: "100%", position: "relative", overflow: "hidden" }}>
      <HeroSection />
      <ShopSection />
      <FranchiseSection />
      <MenuPreviewSection />
      <CareerSection />
      <AboutSection />
      <VisitSection />
    </div>
  );
}
