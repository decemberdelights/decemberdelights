import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | December Delights",
  description: "Get in touch with December Delights cafe in Hyderabad. Visit us, call us, or send a message. We would love to hear from you.",
  openGraph: {
    title: "Contact December Delights",
    description: "Visit us at our cafe, give us a call, or send us a message.",
    type: "website",
    locale: "en_IN",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
