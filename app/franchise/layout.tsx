import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Franchise | December Delights",
  description: "Own a December Delights franchise. Apply to bring premium coffee and cuisine to your city. Low investment, high returns.",
  openGraph: {
    title: "Own a December Delights Franchise",
    description: "Apply to bring premium coffee and cuisine to your city.",
    type: "website",
    locale: "en_IN",
  },
};

export default function FranchiseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
