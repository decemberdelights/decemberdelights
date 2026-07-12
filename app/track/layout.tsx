import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track Order | December Delights",
  description: "Track your December Delights order in real time. Enter your phone number to see order status and delivery updates.",
  openGraph: {
    title: "Track Your Order | December Delights",
    description: "Enter your phone number to see order status and delivery updates.",
    type: "website",
    locale: "en_IN",
  },
};

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
