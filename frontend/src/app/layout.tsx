import type { Metadata } from "next";
import "@styles/globals.css";
import { Providers } from "./providers";
import StructuredData from "@/components/StructuredData";

const fontClass = "font-sans antialiased";

export const metadata: Metadata = {
  // Базовые метаданные
  title: {
    default: "DEO CRM - Управление студией разработки | CRM система",
    template: "%s | DEO CRM"
  },
  description: "CRM-система для управления студией разработки, дизайна и маркетинга. Автоматизация бизнеса, управление проектами, клиентами и задачами.",
  keywords: ["CRM", "система CRM", "управление проектами", "студия разработки", "автоматизация бизнеса", "DEO CRM", "управление клиентами", "маркетинг", "дизайн", "задачи"],
  authors: [{ name: "DEO Studio", url: "https://deo-core.codes" }],
  creator: "DEO Studio",
  publisher: "DEO Studio",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  metadataBase: new URL("https://crm.deo-core.codes"),
  alternates: {
    canonical: "/",
  },

  // Open Graph (Facebook, LinkedIn, etc.)
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "https://crm.deo-core.codes",
    siteName: "DEO CRM",
    title: "DEO CRM - Управление студией разработки",
    description: "CRM-система для управления студией разработки, дизайна и маркетинга. Автоматизация бизнеса и управление проектами.",
    images: [
      {
        url: "/images/DEO_CRM_LOGO.png",
        width: 657,
        height: 128,
        alt: "DEO CRM Logo - Управление студией разработки",
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "DEO CRM - Управление студией разработки",
    description: "CRM-система для управления студией разработки, дизайна и маркетинга",
    images: ["/images/DEO_CRM_LOGO.png"],
    creator: "@deostudio",
  },

  // Иконки
  icons: {
    icon: [
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/favicon/safari-pinned-tab.svg",
        color: "#F08331",
      },
    ],
  },

  // Manifest
  manifest: "/favicon/manifest.json",

  // Другие метаданные
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  themeColor: "#F08331",
  colorScheme: "light dark",

  // Формат-детектирование
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  // Apple Web App
  appleWebApp: {
    capable: true,
    title: "DEO CRM",
    statusBarStyle: "default",
  },
};

// Основные structured data для SEO
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://crm.deo-core.codes/#organization",
      "name": "DEO CRM",
      "url": "https://crm.deo-core.codes",
      "logo": {
        "@type": "ImageObject",
        "url": "https://crm.deo-core.codes/images/DEO_CRM_LOGO.png",
        "width": 657,
        "height": 128
      },
      "description": "CRM-система для управления студией разработки, дизайна и маркетинга",
      "founder": {
        "@type": "Person",
        "name": "DEO Studio"
      },
      "foundingDate": "2024",
      "sameAs": [
        "https://twitter.com/deostudio",
        "https://github.com/deo-core"
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://crm.deo-core.codes/#website",
      "url": "https://crm.deo-core.codes",
      "name": "DEO CRM",
      "description": "CRM-система для управления студией разработки, дизайна и маркетинга",
      "publisher": {
        "@id": "https://crm.deo-core.codes/#organization"
      },
      "potentialAction": [
        {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://crm.deo-core.codes/search?q={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        }
      ],
      "inLanguage": "ru-RU"
    },
    {
      "@type": "WebPage",
      "@id": "https://crm.deo-core.codes/#webpage",
      "url": "https://crm.deo-core.codes",
      "name": "DEO CRM - Управление студией разработки",
      "description": "CRM-система для управления студией разработки, дизайна и маркетинга",
      "isPartOf": {
        "@id": "https://crm.deo-core.codes/#website"
      },
      "about": {
        "@id": "https://crm.deo-core.codes/#organization"
      },
      "primaryImageOfPage": {
        "@type": "ImageObject",
        "url": "https://crm.deo-core.codes/images/DEO_CRM_LOGO.png",
        "width": 657,
        "height": 128
      },
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Главная",
            "item": "https://crm.deo-core.codes"
          }
        ]
      },
      "inLanguage": "ru-RU"
    }
  ]
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Structured Data для поисковых систем */}
        <StructuredData data={structuredData} />

        {/* Preconnect для оптимизации загрузки */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Preload для критических ресурсов */}
        <link rel="preload" href="/images/DEO_CRM_LOGO.png" as="image" type="image/png" />

        {/* Дополнительные метатеги */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={fontClass}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
