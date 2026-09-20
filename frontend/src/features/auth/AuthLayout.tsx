"use client";

import Image from "next/image";
import {
  BarChart3,
  FolderKanban,
  MessageSquare,
  MoveRight,
  Sparkles,
  Users,
} from "lucide-react";

const FEATURES = [
  {
    icon: FolderKanban,
    title: "Проекты и задачи",
    text: "Канбан-доски, приоритеты и дедлайны для всей команды",
  },
  {
    icon: Users,
    title: "Клиенты и сделки",
    text: "Воронка продаж и история взаимодействия с каждым клиентом",
  },
  {
    icon: MessageSquare,
    title: "Встроенный мессенджер",
    text: "Чаты, уведомления и статусы прочтения без переключения сервисов",
  },
  {
    icon: BarChart3,
    title: "Живая аналитика",
    text: "Бизнес-показатели и отчёты в реальном времени",
  },
];

const STATS = [
  { value: "10+", label: "модулей CRM" },
  { value: "2×", label: "быстрее команда" },
  { value: "24/7", label: "поддержка" },
];

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* ===== Brand panel ===== */}
      <aside className="relative hidden w-[46%] overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-indigo-950 lg:flex xl:w-[44%]">
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-brand-400/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 -left-32 h-[26rem] w-[26rem] rounded-full bg-violet-500/25 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-300/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.14),transparent_55%)]" />

        <div className="relative z-10 flex h-full w-full flex-col justify-between p-10 xl:p-14">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 shadow-lg shadow-black/10 ring-1 ring-white/20 backdrop-blur">
              <Image
                src="/images/DEOCORE_LOGO.svg"
                alt="DEO CRM"
                width={30}
                height={30}
                className="h-7 w-7 object-contain"
              />
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight text-white">
                DEO Studio
              </p>
              <p className="text-xs text-white/60">CRM</p>
            </div>
          </div>

          {/* Headline + features */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              CRM для студий разработки и дизайна
            </span>

            <h1 className="mt-6 text-3xl font-semibold leading-tight tracking-tight text-white xl:text-[2.6rem] xl:leading-[1.15]">
              Вся работа студии
              <br />
              под контролем —{" "}
              <span className="bg-gradient-to-r from-amber-200 via-orange-200 to-amber-300 bg-clip-text text-transparent">
                в одном окне
              </span>
            </h1>

            <ul className="mt-8 space-y-4">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex items-start gap-3.5">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15 backdrop-blur">
                    <Icon className="h-5 w-5 text-white/90" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-0.5 text-sm text-white/65">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Stats + CTA */}
          <div>
            <div className="grid grid-cols-3 gap-4 border-t border-white/15 pt-6">
              {STATS.map(({ value, label }) => (
                <div key={label}>
                  <p className="text-2xl font-semibold text-white">{value}</p>
                  <p className="mt-0.5 text-xs text-white/60">{label}</p>
                </div>
              ))}
            </div>

            <a
              href="https://deocore.com"
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              Узнать больше о DEO Studio
              <MoveRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </aside>

      {/* ===== Form area ===== */}
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 sm:px-8">
        <div className="pointer-events-none absolute -left-32 top-1/4 h-80 w-80 rounded-full bg-brand-400/10 blur-3xl dark:bg-brand-500/10" />
        <div className="pointer-events-none absolute -right-32 bottom-1/4 h-80 w-80 rounded-full bg-violet-400/10 blur-3xl dark:bg-violet-500/10" />

        <div className="relative w-full max-w-sm animate-fade-in-up">
          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 shadow-lg shadow-brand-600/25 ring-4 ring-white/60 dark:ring-surface-900">
              <Image
                src="/images/DEOCORE_LOGO.svg"
                alt="DEO CRM"
                width={44}
                height={44}
                className="h-10 w-10 object-contain"
              />
            </div>
            <p className="text-xl font-bold tracking-tight text-surface-900 dark:text-white">
              DEO Studio CRM
            </p>
          </div>

          {children}

          <p className="mt-8 text-center text-xs text-surface-400 dark:text-surface-500">
            © {new Date().getFullYear()} DEO STUDIO CRM. Все права защищены.
          </p>
        </div>
      </main>
    </div>
  );
}