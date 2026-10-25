import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/navbar";
import AdminFooterGuard from "@/components/AdminFooterGuard";
import LoadingScreenClient from "@/components/LoadingScreenClient";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import Analytics from "@/components/Analytics";
import { LocalBusinessJsonLd, OrganizationJsonLd, WebsiteJsonLd } from "@/components/JsonLd";
import { fontVariables } from "./fonts";
import { MotionProvider } from "@/components/MotionProvider";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.decemberdelights.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "December Delights | Fine Coffee & Cuisine",
    template: "%s | December Delights",
  },
  description: "December Delights — premium coffee and cuisine in Hyderabad. Est. 2024. Experience handcrafted beverages, fresh food, and a cozy café vibe.",
  keywords: ["coffee cafe Hyderabad", "December Delights", "fine coffee", "cafe restaurant Hyderabad", "premium coffee beans", "franchise opportunity", "cafe franchise India"],
  authors: [{ name: "December Delights" }],
  creator: "December Delights",
  publisher: "December Delights",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: "December Delights",
    title: "December Delights | Fine Coffee & Cuisine",
    description: "Premium coffee and cuisine in Hyderabad. Experience handcrafted beverages, fresh food, and a cozy café vibe.",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "December Delights — Fine Coffee & Cuisine",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "December Delights | Fine Coffee & Cuisine",
    description: "Premium coffee and cuisine in Hyderabad. Handcrafted beverages, fresh food, and a cozy café vibe.",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/logo-icon.png",
    apple: "/logo.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
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
  themeColor: "#074134",
  userScalable: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body style={{ margin: 0, padding: 0 }}>
        <Analytics />
        <LocalBusinessJsonLd />
        <OrganizationJsonLd />
        <WebsiteJsonLd />
        <SmoothScrollProvider>
          <MotionProvider>
            <LoadingScreenClient />
            <Navbar />
            {children}
            <AdminFooterGuard />
          </MotionProvider>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
