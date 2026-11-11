import type { Metadata } from "next";

// Invitation links are personal: keep them out of search indexes.
export const metadata: Metadata = {
  title: "Анкета",
  robots: { index: false, follow: false },
};

export default function PublicFormLayout({ children }: { children: React.ReactNode }) {
  return children;
}
