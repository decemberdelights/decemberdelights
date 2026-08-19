import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Menu | December Delights",
  description: "Explore the December Delights menu. Premium coffees, fresh food, and handcrafted beverages made with love in Hyderabad.",
  openGraph: {
    title: "Menu | December Delights",
    description: "Premium coffees, fresh food, and handcrafted beverages.",
    type: "website",
    locale: "en_IN",
  },
};

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
