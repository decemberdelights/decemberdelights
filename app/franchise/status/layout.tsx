import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.decemberdelights.in";

export const metadata: Metadata = {
  title: "Franchise Status",
  description: "Check the status of your December Delights franchise application. Log in with your phone number and date of birth.",
  openGraph: {
    title: "Franchise Status | December Delights",
    description: "Track your franchise application status in real time.",
    url: `${siteUrl}/franchise/status`,
    siteName: "December Delights",
    type: "website",
    locale: "en_IN",
    images: [{ url: "/logo.png", width: 1200, height: 630, alt: "Franchise Status" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Franchise Status | December Delights",
    description: "Track your franchise application status in real time.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: `${siteUrl}/franchise/status`,
  },
  robots: { index: false, follow: true },
};

export default function FranchiseStatusLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
