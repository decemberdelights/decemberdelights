import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.decemberdelights.in";

export const metadata: Metadata = {
  title: "Shop",
  description: "Shop premium coffee beans, blends, and accessories from December Delights. Handpicked products delivered to your doorstep in Hyderabad.",
  keywords: ["buy coffee beans Hyderabad", "premium coffee blends", "coffee accessories online", "December Delights shop", "order coffee online"],
  openGraph: {
    title: "Shop Premium Coffee | December Delights",
    description: "Handpicked coffee beans, blends, and accessories delivered to your doorstep.",
    url: `${siteUrl}/shop`,
    siteName: "December Delights",
    type: "website",
    locale: "en_IN",
    images: [{ url: "/logo.png", width: 1200, height: 630, alt: "December Delights Shop" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop Premium Coffee | December Delights",
    description: "Handpicked coffee beans, blends, and accessories delivered to your doorstep.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: `${siteUrl}/shop`,
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
