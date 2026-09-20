"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import Image from "next/image";
import Link from "next/link";

export default function RootPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("access_token");

    // Даем время для индексации SEO контента
    const timer = setTimeout(() => {
      router.replace(token ? "/dashboard" : "/crm");
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <>
      {/* SEO-оптимизированный контент для поисковых систем */}
      <div className="sr-only" aria-hidden="true">
        <h1>DEO CRM - CRM-система для управления студией разработки, дизайна и маркетинга</h1>
        <p>Автоматизация бизнес-процессов, управление проектами, клиентами и задачами в одной системе.</p>

        <h2>Ключевые возможности DEO CRM</h2>
        <ul>
          <li>Управление проектами и задачами</li>
          <li>Ведение клиентской базы</li>
          <li>Автоматизация продаж и маркетинга</li>
          <li>Интеграция с мессенджерами и соцсетями</li>
          <li>Аналитика и отчетность</li>
          <li>Командная работа и коллаборация</li>
        </ul>

        <h2>Для кого подходит DEO CRM</h2>
        <p>Студии разработки, дизайн-агентства, маркетинговые агентства, IT-компании, фрилансеры и стартапы.</p>

        <h2>Преимущества системы</h2>
        <ul>
          <li>Интуитивный интерфейс</li>
          <li>Гибкие настройки под ваш бизнес</li>
          <li>Интеграция с популярными сервисами</li>
          <li>Мобильный доступ и уведомления</li>
          <li>Безопасное хранение данных</li>
        </ul>
      </div>

      {/* Основной интерфейс */}
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-surface-50 via-white to-brand-50/30 dark:from-surface-900 dark:via-surface-950 dark:to-brand-900/10">
        <div className="text-center max-w-2xl px-6">
          {/* Логотип */}
          <div className="mb-8 flex items-center justify-center">
            <Image
              src="/images/DEOCORE_LOGO_OPTIMIZED.svg"
              alt="DEO CRM Logo - CRM система для управления студией разработки"
              width={120}
              height={120}
              className="h-24 w-24 sm:h-28 sm:w-28 object-contain"
              priority
            />
            <div className="ml-4 text-left">
              <h1 className="text-3xl sm:text-4xl font-bold text-surface-900 dark:text-white mb-1">
                DEO CRM
              </h1>
              <p className="text-base sm:text-lg text-surface-600 dark:text-surface-300 font-medium">
                Управление студией разработки
              </p>
            </div>
          </div>

          {/* Заголовок для пользователей */}
          <h2 className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-white mb-4">
            CRM-система нового поколения
          </h2>

          <p className="text-lg text-surface-600 dark:text-surface-300 mb-8 max-w-xl mx-auto">
            Автоматизируйте бизнес-процессы, управляйте проектами и клиентами в одной системе
          </p>

          {/* Лоадер */}
          <div className="mb-8 flex flex-col items-center justify-center">
            <div className="mb-6">
              <LoadingSpinner size="lg" />
            </div>
            <p className="text-sm text-surface-500 dark:text-surface-400 animate-pulse">
              Загрузка системы...
            </p>
          </div>

          {/* SEO ссылки (скрытые от пользователей) */}
          <div className="sr-only">
            <nav aria-label="Навигация по сайту">
              <Link href="/crm" title="DEO CRM панель">CRM Панель</Link>
              <Link href="/login" title="Вход в DEO CRM">Вход в систему</Link>
              <Link href="/register" title="Регистрация в DEO CRM">Регистрация</Link>
              <Link href="/dashboard" title="Дашборд DEO CRM">Дашборд</Link>
              <Link href="/dashboard/projects" title="Проекты в DEO CRM">Проекты</Link>
              <Link href="/dashboard/clients" title="Клиенты в DEO CRM">Клиенты</Link>
              <Link href="/dashboard/tasks" title="Задачи в DEO CRM">Задачи</Link>
              <Link href="/dashboard/analytics" title="Аналитика DEO CRM">Аналитика</Link>
            </nav>
          </div>

          {/* Футер с SEO текстом */}
          <div className="mt-12 pt-6 border-t border-surface-200/50 dark:border-surface-700/30">
            <p className="text-xs text-surface-500 dark:text-surface-400">
              DEO CRM © 2024-2026. Все права защищены.
              <span className="block sm:inline"> CRM система для управления студией разработки, дизайна и маркетинга.</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}