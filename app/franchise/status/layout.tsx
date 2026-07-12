import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Franchise Status | December Delights",
  description: "Check the status of your December Delights franchise application. Log in with your phone number and password.",
};

export default function FranchiseStatusLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
