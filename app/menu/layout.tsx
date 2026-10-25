import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.decemberdelights.in";

export const metadata: Metadata = {
  title: "Menu",
  description: "Explore the December Delights menu. Premium coffees, fresh food, and handcrafted beverages made with love in Hyderabad.",
  keywords: ["cafe menu Hyderabad", "coffee menu", "December Delights menu", "handcrafted beverages", "fresh food cafe"],
  openGraph: {
    title: "Menu | December Delights",
    description: "Premium coffees, fresh food, and handcrafted beverages.",
    url: `${siteUrl}/menu`,
    siteName: "December Delights",
    type: "website",
    locale: "en_IN",
    images: [{ url: "/logo.png", width: 1200, height: 630, alt: "December Delights Menu" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Menu | December Delights",
    description: "Premium coffees, fresh food, and handcrafted beverages.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: `${siteUrl}/menu`,
  },
};

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
