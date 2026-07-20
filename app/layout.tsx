import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Montserrat, Outfit, Bebas_Neue } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import LoadingScreen from "@/components/LoadingScreen";
import ScrollRevealProvider from "@/components/scroll-reveal-provider";
import { cn } from "@/lib/utils";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas-neue",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DecemberDelights | Fine Coffee & Cuisine",
  description: "December Delights — fine coffee and cuisine in Hyderabad. Est. 2024.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DD",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#094b3d",
  userScalable: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(cormorant.variable, montserrat.variable, outfit.variable, bebasNeue.variable, "font-sans")}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preload" as="image" href="/logo-icon.png" />
      </head>
      <body className={cn(cormorant.variable, montserrat.variable, outfit.variable, bebasNeue.variable, "font-sans")} style={{ margin: 0, padding: 0 }}>
        <LoadingScreen />
        <Navbar />
        <ScrollRevealProvider>
          {children}
        </ScrollRevealProvider>
        <Footer />
      </body>
    </html>
  );
}
