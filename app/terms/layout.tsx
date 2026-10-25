import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.decemberdelights.in";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Read the Terms & Conditions for December Delights franchise applications. Learn about our application process, fees, and policies.",
  keywords: ["December Delights terms", "franchise terms and conditions", "cafe franchise policy"],
  openGraph: {
    title: "Terms & Conditions | December Delights",
    description: "Read the Terms & Conditions for December Delights franchise applications.",
    url: `${siteUrl}/terms`,
    siteName: "December Delights",
    type: "website",
    locale: "en_IN",
    images: [{ url: "/logo.png", width: 1200, height: 630, alt: "Terms & Conditions" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms & Conditions | December Delights",
    description: "Read the Terms & Conditions for December Delights franchise applications.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: `${siteUrl}/terms`,
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
