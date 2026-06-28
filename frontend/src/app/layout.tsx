import type { Metadata } from "next";
import "@styles/globals.css";
import { Providers } from "./providers";

const fontClass = "font-sans antialiased";

export const metadata: Metadata = {
  title: "DEO STUDIO CRM",
  description: "CRM-система для управления студией разработки, дизайна и маркетинга",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={fontClass}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
