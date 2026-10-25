import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.decemberdelights.in";

export const metadata: Metadata = {
  title: "Track Order",
  description: "Track your December Delights order in real time. Enter your phone number to see order status and delivery updates.",
  openGraph: {
    title: "Track Your Order | December Delights",
    description: "Enter your phone number to see order status and delivery updates.",
    url: `${siteUrl}/track`,
    siteName: "December Delights",
    type: "website",
    locale: "en_IN",
    images: [{ url: "/logo.png", width: 1200, height: 630, alt: "Track Your Order" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Track Your Order | December Delights",
    description: "Enter your phone number to see order status and delivery updates.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: `${siteUrl}/track`,
  },
  robots: { index: false, follow: true },
};

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
