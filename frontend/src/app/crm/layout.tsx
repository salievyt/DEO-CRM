import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cn } from "@/shared/utils/cn";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "DEO CRM — Современная CRM-система для роста бизнеса",
  description: "Автоматизируйте продажи, улучшайте клиентский опыт и увеличивайте доход с современной CRM-системой.",
  keywords: ["CRM система", "управление клиентами", "автоматизация продаж", "бизнес аналитика"],
  openGraph: {
    title: "DEO CRM",
    description: "Современная CRM-система для роста бизнеса",
    type: "website",
    locale: "ru_RU",
  },
};

export default function PublicCRMLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="scroll-smooth">
      <body className={cn(
        inter.className,
        "antialiased",
        "text-gray-900",
        "bg-white",
        "selection:bg-brand-600/20 selection:text-gray-900"
      )}>
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}