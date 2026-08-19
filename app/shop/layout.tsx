import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop | December Delights",
  description: "Shop premium coffee beans, blends, and accessories from December Delights. Handpicked products delivered to your doorstep in Hyderabad.",
  openGraph: {
    title: "Shop Premium Coffee | December Delights",
    description: "Handpicked coffee beans, blends, and accessories delivered to your doorstep.",
    type: "website",
    locale: "en_IN",
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
