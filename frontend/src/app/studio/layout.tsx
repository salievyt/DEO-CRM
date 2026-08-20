import type { Metadata } from "next";
import { cn } from "@/shared/utils/cn";

export const metadata: Metadata = {
  title: "DEO Core Codes — Студия цифровых продуктов в стиле Apple",
  description: "Создаём минималистичные, интуитивные и безупречные цифровые продукты с подходом Apple.",
  keywords: ["веб-разработка", "мобильные приложения", "UI/UX дизайн", "Apple дизайн", "CRM системы"],
  openGraph: {
    title: "DEO Core Codes",
    description: "Студия цифровых продуктов в стиле Apple",
    type: "website",
    locale: "ru_RU",
  },
};

export default function StudioLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={cn(
      "antialiased",
      "text-apple-ink",
      "bg-apple-canvas",
      "selection:bg-apple-primary/20 selection:text-apple-ink"
    )}>
      {children}
    </div>
  );
}