import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.decemberdelights.in";

export const metadata: Metadata = {
  title: "Franchise",
  description: "Own a December Delights franchise. Apply to bring premium coffee and cuisine to your city. Low investment, high returns.",
  keywords: ["cafe franchise India", "December Delights franchise", "coffee shop franchise", "restaurant franchise opportunity", "franchise investment India"],
  openGraph: {
    title: "Own a December Delights Franchise",
    description: "Apply to bring premium coffee and cuisine to your city.",
    url: `${siteUrl}/franchise`,
    siteName: "December Delights",
    type: "website",
    locale: "en_IN",
    images: [{ url: "/logo.png", width: 1200, height: 630, alt: "December Delights Franchise" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Own a December Delights Franchise",
    description: "Apply to bring premium coffee and cuisine to your city.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: `${siteUrl}/franchise`,
  },
};

export default function FranchiseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
