import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feedback | December Delights",
  description: "Share your feedback with December Delights cafe in Hyderabad. We value your thoughts and would love to hear from you.",
  openGraph: {
    title: "Feedback - December Delights",
    description: "Visit us at our cafe, give us a call, or send us a message.",
    type: "website",
    locale: "en_IN",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
