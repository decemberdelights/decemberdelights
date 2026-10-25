import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.decemberdelights.in";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Share your feedback with December Delights cafe in Hyderabad. We value your thoughts and would love to hear from you.",
  keywords: ["contact December Delights", "cafe feedback Hyderabad", "reach us", "December Delights contact"],
  openGraph: {
    title: "Contact Us | December Delights",
    description: "Visit us at our cafe, give us a call, or send us a message.",
    url: `${siteUrl}/contact`,
    siteName: "December Delights",
    type: "website",
    locale: "en_IN",
    images: [{ url: "/logo.png", width: 1200, height: 630, alt: "Contact December Delights" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Us | December Delights",
    description: "Visit us at our cafe, give us a call, or send us a message.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: `${siteUrl}/contact`,
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
