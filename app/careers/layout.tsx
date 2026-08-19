import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers | December Delights",
  description: "Join the December Delights team. Explore open positions and apply to work at one of Hyderabad's finest coffee cafes.",
  openGraph: {
    title: "Careers at December Delights",
    description: "Explore open positions and join our growing team in Hyderabad.",
    type: "website",
    locale: "en_IN",
  },
};

export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
