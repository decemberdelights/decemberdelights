import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.decemberdelights.in";

export const metadata: Metadata = {
  title: "Careers",
  description: "Join the December Delights team. Explore open positions and apply to work at one of Hyderabad's finest coffee cafes.",
  keywords: ["cafe jobs Hyderabad", "December Delights careers", "coffee shop jobs", "restaurant jobs India", "barista jobs Hyderabad"],
  openGraph: {
    title: "Careers at December Delights",
    description: "Explore open positions and join our growing team in Hyderabad.",
    url: `${siteUrl}/careers`,
    siteName: "December Delights",
    type: "website",
    locale: "en_IN",
    images: [{ url: "/logo.png", width: 1200, height: 630, alt: "Careers at December Delights" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Careers at December Delights",
    description: "Explore open positions and join our growing team in Hyderabad.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: `${siteUrl}/careers`,
  },
};

export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
