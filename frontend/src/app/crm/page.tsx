import Link from "next/link";
import { CheckCircle, BarChart3, Users, Shield, Zap, Globe } from "lucide-react";

export default function PublicHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-gray-900">
                DEO<span className="text-brand-600">CRM</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/features" className="text-gray-700 hover:text-brand-600 transition-colors">
                Возможности
              </Link>
              <Link href="/pricing" className="text-gray-700 hover:text-brand-600 transition-colors">
                Тарифы
              </Link>
              <Link href="/integrations" className="text-gray-700 hover:text-brand-600 transition-colors">
                Интеграции
              </Link>
              <Link href="/blog" className="text-gray-700 hover:text-brand-600 transition-colors">
                Блог
              </Link>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-700 hover:text-brand-600 transition-colors"
              >
                Вход
              </Link>
              <Link
                href="/demo"
                className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 transition-colors font-medium"
              >
                Попробовать бесплатно
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4 max-w-7xl mx-auto">
        <div className="text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 tracking-tight">
            Управляйте клиентами и
            <span className="text-brand-600 block">ростом бизнеса</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Современная CRM-система для команд любого размера. Автоматизируйте продажи,
            улучшайте клиентский опыт и увеличивайте доход.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link
              href="/demo"
              className="bg-brand-600 text-white px-8 py-4 rounded-lg hover:bg-brand-700 transition-colors font-medium text-lg"
            >
              Начать 14-дневный пробный период
            </Link>
            <Link
              href="/demo-call"
              className="bg-white text-gray-800 border border-gray-300 px-8 py-4 rounded-lg hover:bg-gray-50 transition-colors font-medium text-lg"
            >
              Заказать демонстрацию
            </Link>
          </div>
          <p className="text-gray-500 text-sm pt-4">
            Без кредитной карты. Отмена в любой момент.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-12">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-gray-900">
                Всё, что нужно для роста
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                От управления лидами до аналитики продаж — все инструменты в одной платформе.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-gray-50 p-8 rounded-2xl hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-brand-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Управление клиентами</h3>
                <p className="text-gray-600 leading-relaxed">
                  Централизованная база клиентов, история взаимодействий, сегментация и автоматические напоминания.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-gray-50 p-8 rounded-2xl hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-6">
                  <BarChart3 className="w-6 h-6 text-brand-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Аналитика продаж</h3>
                <p className="text-gray-600 leading-relaxed">
                  Воронки продаж, KPI-отчеты, прогнозирование и визуализация данных в реальном времени.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-gray-50 p-8 rounded-2xl hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-6">
                  <Zap className="w-6 h-6 text-brand-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Автоматизация</h3>
                <p className="text-gray-600 leading-relaxed">
                  Рабочие процессы, триггерные email-рассылки, автоназначение задач и интеграция с мессенджерами.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-gray-50 p-8 rounded-2xl hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-6">
                  <Globe className="w-6 h-6 text-brand-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Интеграции</h3>
                <p className="text-gray-600 leading-relaxed">
                  Подключение к Telegram, WhatsApp, Email, 1C, МойСклад и другим популярным сервисам.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="bg-gray-50 p-8 rounded-2xl hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6 text-brand-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Безопасность</h3>
                <p className="text-gray-600 leading-relaxed">
                  Двухфакторная аутентификация, шифрование данных, аудит действий и ролевой доступ.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="bg-gray-50 p-8 rounded-2xl hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-6">
                  <CheckCircle className="w-6 h-6 text-brand-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Гибкая настройка</h3>
                <p className="text-gray-600 leading-relaxed">
                  Адаптация под ваш бизнес-процесс: настраиваемые поля, этапы сделок, отчеты и уведомления.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-brand-600 to-brand-700">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Готовы оптимизировать продажи?
          </h2>
          <p className="text-xl text-brand-100 mb-10">
            Присоединяйтесь к 1000+ компаний, которые уже используют DEO CRM.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-white text-brand-600 px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors font-medium text-lg"
            >
              Начать бесплатно
            </Link>
            <Link
              href="/contact"
              className="bg-transparent text-white border-2 border-white px-8 py-4 rounded-lg hover:bg-white/10 transition-colors font-medium text-lg"
            >
              Связаться с отделом продаж
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold">
                DEO<span className="text-brand-400">CRM</span>
              </h3>
              <p className="text-gray-400 text-sm">
                Современная CRM-система для роста вашего бизнеса.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Продукт</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/features" className="hover:text-white transition-colors">Возможности</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Тарифы</Link></li>
                <li><Link href="/integrations" className="hover:text-white transition-colors">Интеграции</Link></li>
                <li><Link href="/security" className="hover:text-white transition-colors">Безопасность</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Ресурсы</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/blog" className="hover:text-white transition-colors">Блог</Link></li>
                <li><Link href="/docs" className="hover:text-white transition-colors">Документация</Link></li>
                <li><Link href="/support" className="hover:text-white transition-colors">Поддержка</Link></li>
                <li><Link href="/status" className="hover:text-white transition-colors">Статус системы</Link></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Компания</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white transition-colors">О нас</Link></li>
                <li><Link href="/careers" className="hover:text-white transition-colors">Карьера</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Контакты</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Конфиденциальность</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-12 mt-12 border-t border-gray-800 text-center">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} DEO CRM. Все права защищены.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}