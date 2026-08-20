"use client";

import { useState } from "react";
import { AppleButton, AppleSecondaryButton } from "@/shared/ui/apple/apple-button";
import { AppleProductTile } from "@/shared/ui/apple/apple-product-tile";
import { AppleGlobalNav } from "@/shared/ui/apple/apple-navigation";
import { AppleStoreCard } from "@/shared/ui/apple/apple-card";
import { AppleContactForm } from "@/shared/ui/apple/apple-contact-form";

const SERVICE_MAP: Record<string, string> = {
  crm: "web-development",
  mobile: "mobile-development",
  design: "design",
};

export default function StudioHomePage() {
  const [contactOpen, setContactOpen] = useState(false);
  const [contactService, setContactService] = useState<string | undefined>();

  const openContact = (service?: string) => {
    setContactService(service ? SERVICE_MAP[service] : undefined);
    setContactOpen(true);
  };

  return (
    <div className="min-h-screen bg-apple-canvas text-apple-ink">
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-apple-primary focus:text-white focus:rounded-sm"
      >
        Перейти к содержанию
      </a>

      <main id="main-content">
        {/* Global Navigation */}
        <AppleGlobalNav />

        {/* Hero Section */}
        <section className="pt-20 pb-32 px-4 max-w-7xl mx-auto">
          <div className="text-center space-y-8">
            <div className="space-y-6">
              <h1 className="font-sf-display text-apple-hero font-semibold leading-tight tracking-tight">
                DEO Core Codes
              </h1>
              <p className="font-sf-display text-apple-lead max-w-3xl mx-auto leading-relaxed">
                Мы создаём цифровые продукты с душой Apple — минималистичные, интуитивные и безупречные в деталях.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <AppleButton variant="store-hero" size="large" onClick={() => openContact()}>
                Обсудить проект
              </AppleButton>
              <AppleSecondaryButton size="large" onClick={() => {
                document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
              }}>
                Услуги
              </AppleSecondaryButton>
            </div>
          </div>
        </section>

        {/* Product Tiles */}
        <div className="space-y-0">
          <AppleProductTile
            variant="light"
            title="CRM-системы"
            description="Полный цикл разработки CRM для бизнеса любого масштаба"
            imageSrc="/images/crm-showcase.jpg"
            imageAlt="CRM System Interface"
            actions={[
              { label: "Узнать больше", variant: "primary", onClick: () => openContact("crm") },
              { label: "Демо", variant: "secondary-pill", onClick: () => openContact("crm") },
            ]}
          />

          <AppleProductTile
            variant="dark"
            title="Мобильные приложения"
            description="Нативные iOS/Android приложения с безупречным UX"
            imageSrc="/images/mobile-apps.jpg"
            imageAlt="Mobile Applications"
            actions={[
              { label: "Портфолио", variant: "primary", onClick: () => openContact("mobile") },
              { label: "Процесс", variant: "secondary-pill", onClick: () => openContact("mobile") },
            ]}
          />

          <AppleProductTile
            variant="parchment"
            title="Дизайн-системы"
            description="Компонентные библиотеки и UI-киты в стиле Apple"
            imageSrc="/images/design-system.jpg"
            imageAlt="Design System"
            actions={[
              { label: "Посмотреть", variant: "primary", onClick: () => openContact("design") },
              { label: "Скачать", variant: "secondary-pill", onClick: () => openContact("design") },
            ]}
          />
        </div>

        {/* Services Grid */}
        <section id="services" className="py-32 px-4 max-w-7xl mx-auto">
          <div className="text-center space-y-12">
            <div className="space-y-4">
              <h2 className="font-sf-display text-apple-display-lg font-semibold">
                Услуги студии
              </h2>
              <p className="font-sf-text text-apple-body max-w-2xl mx-auto text-apple-inkMuted80">
                Полный цикл разработки — от идеи до запуска и поддержки
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <AppleStoreCard
                title="Веб-разработка"
                description="Современные React/Next.js приложения"
                price="от 300 000 ₽"
                imageSrc="/images/web-dev.jpg"
              />
              <AppleStoreCard
                title="Мобильная разработка"
                description="Flutter и нативные приложения"
                price="от 500 000 ₽"
                imageSrc="/images/mobile-dev.jpg"
              />
              <AppleStoreCard
                title="UI/UX дизайн"
                description="Дизайн-системы и прототипы"
                price="от 150 000 ₽"
                imageSrc="/images/ui-ux.jpg"
              />
              <AppleStoreCard
                title="Техническая консультация"
                description="Архитектура и аудит проектов"
                price="от 100 000 ₽"
                imageSrc="/images/consulting.jpg"
              />
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-32 px-4 bg-apple-tile-1 text-apple-bodyOnDark">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="font-sf-display text-apple-display-lg font-semibold">
              Философия студии
            </h2>
            <div className="space-y-6 font-sf-text text-apple-body leading-relaxed">
              <p>
                Мы верим, что отличный продукт начинается с безупречного опыта.
                Каждая деталь — от типографики до микроанимаций — продумана до мелочей.
              </p>
              <p>
                Наш подход сочетает Apple-дизайн с современными технологиями:
                React 18, Next.js 14, TypeScript и лучшие практики разработки.
              </p>
            </div>
            <div className="pt-8">
              <AppleButton variant="dark-utility" onClick={() => openContact()}>
                Связаться с командой
              </AppleButton>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-32 px-4 max-w-3xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h2 className="font-sf-display text-apple-display-lg font-semibold">
              Начните проект
            </h2>
            <p className="font-sf-text text-apple-body text-apple-inkMuted80">
              Расскажите о вашем проекте — мы свяжемся с вами в течение дня
            </p>
          </div>
          <AppleContactForm />
        </section>

        {/* Footer */}
        <footer className="bg-apple-parchment text-apple-inkMuted80 py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
              <div className="space-y-4">
                <h3 className="font-sf-text text-apple-caption-strong font-semibold text-apple-ink">
                  DEO Core Codes
                </h3>
                <p className="font-sf-text text-apple-fine-print leading-relaxed">
                  Студия цифровых продуктов в стиле Apple.
                  Создаём минималистичные и интуитивные решения.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-sf-text text-apple-caption-strong font-semibold text-apple-ink">
                  Услуги
                </h4>
                <ul className="font-sf-text text-apple-body space-y-2">
                  <li><a href="#services" className="hover:text-apple-primary transition-colors">Веб-разработка</a></li>
                  <li><a href="#services" className="hover:text-apple-primary transition-colors">Мобильные приложения</a></li>
                  <li><a href="#services" className="hover:text-apple-primary transition-colors">UI/UX дизайн</a></li>
                  <li><a href="#services" className="hover:text-apple-primary transition-colors">Консультации</a></li>
                </ul>
              </div>

              <div className="space-y-4">
                <h4 className="font-sf-text text-apple-caption-strong font-semibold text-apple-ink">
                  Проекты
                </h4>
                <ul className="font-sf-text text-apple-body space-y-2">
                  <li><a href="#" className="hover:text-apple-primary transition-colors">CRM системы</a></li>
                  <li><a href="#" className="hover:text-apple-primary transition-colors">E-commerce</a></li>
                  <li><a href="#" className="hover:text-apple-primary transition-colors">SaaS платформы</a></li>
                  <li><a href="#" className="hover:text-apple-primary transition-colors">Мобильные MVP</a></li>
                </ul>
              </div>

              <div className="space-y-4">
                <h4 className="font-sf-text text-apple-caption-strong font-semibold text-apple-ink">
                  Контакты
                </h4>
                <ul className="font-sf-text text-apple-body space-y-2">
                  <li>
                    <a href="mailto:hello@deocore.codes" className="hover:text-apple-primary transition-colors">
                      hello@deocore.codes
                    </a>
                  </li>
                  <li>
                    <a href="tel:+79991234567" className="hover:text-apple-primary transition-colors">
                      +7 999 123-45-67
                    </a>
                  </li>
                  <li className="text-apple-fine-print mt-4">Москва, ул. Apple Design, 1</li>
                </ul>
              </div>
            </div>

            <div className="pt-12 mt-12 border-t border-apple-hairline text-center">
              <p className="font-sf-text text-apple-fine-print text-apple-inkMuted48">
                &copy; {new Date().getFullYear()} DEO Core Codes. Все права защищены.
              </p>
            </div>
          </div>
        </footer>
      </main>

      {/* Contact Modal */}
      {contactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setContactOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8">
            <button
              onClick={() => setContactOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-apple-inkMuted48 hover:text-apple-ink"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="font-sf-display text-apple-display-md font-semibold text-apple-ink mb-2">
              Обсудим ваш проект?
            </h2>
            <p className="font-sf-text text-apple-body text-apple-inkMuted80 mb-8">
              Заполните форму и мы свяжемся с вами в течение рабочего дня
            </p>
            <AppleContactForm
              defaultService={contactService}
              onClose={() => setContactOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
