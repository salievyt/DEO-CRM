"use client";

import { useState } from "react";
import { BookOpen, Clock, Shield, Bell, CalendarDays, FileText, Plus, Search, ChevronDown, ChevronRight, GripVertical, Pencil, Trash2, Check, X } from "lucide-react";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { cn } from "@/shared/utils/formatters";

interface Rule {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "high" | "medium" | "low";
  updated_at: string;
}

const RULE_CATEGORIES = [
  {
    name: "Рабочий график",
    icon: Clock,
    color: "text-brand-600 dark:text-brand-400",
    bgColor: "bg-surface-100 dark:bg-surface-700",
    borderColor: "border-surface-200 dark:border-surface-700",
    rules: [
      {
        id: "1",
        title: "Рабочее время",
        description: "Стандартный рабочий день: с 10:00 до 19:00 (пн-пт). Обеденный перерыв: 13:00-14:00. Возможен гибкий график по согласованию с руководителем.",
        priority: "high" as const,
      },
      {
        id: "2",
        title: "Удалённая работа",
        description: "Допускается до 3 дней в неделю. Необходимо уведомить руководителя и быть на связи в рабочее время. Для новых сотрудников — первые 2 недели в офисе.",
        priority: "medium" as const,
      },
      {
        id: "3",
        title: "Опоздания и отсутствия",
        description: "При опоздании более 15 минут — уведомить руководителя. Отсутствие по болезни подтверждается справкой при отсутствии более 3 дней.",
        priority: "medium" as const,
      },
    ],
  },
  {
    name: "Внутренние коммуникации",
    icon: Bell,
    color: "text-surface-600 dark:text-surface-300",
    bgColor: "bg-surface-100 dark:bg-surface-700",
    borderColor: "border-surface-200 dark:border-surface-700",
    rules: [
      {
        id: "4",
        title: "Каналы связи",
        description: "Основной канал — корпоративный мессенджер. Для срочных вопросов — телефон. Email используется для внешней переписки и документов.",
        priority: "high" as const,
      },
      {
        id: "5",
        title: "Тайм-менеджмент встреч",
        description: "Встречи по умолчанию — 30 минут. Повестка отправляется за 24 часа. Опоздание на встречу более 5 минут без предупреждения не допускается.",
        priority: "medium" as const,
      },
      {
        id: "6",
        title: "Обратная связь",
        description: "На сообщения в рабочее время отвечать в течение 2 часов. Еженедельный статус-митинг с командой в понедельник в 11:00.",
        priority: "low" as const,
      },
    ],
  },
  {
    name: "Документооборот",
    icon: FileText,
    color: "text-brand-600 dark:text-brand-400",
    bgColor: "bg-surface-100 dark:bg-surface-700",
    borderColor: "border-surface-200 dark:border-surface-700",
    rules: [
      {
        id: "7",
        title: "Оформление документов",
        description: "Все документы оформляются в корпоративном шаблоне. Названия файлов: \"Проект_ТипДокумента_Дата_vВерсия\". Использование облачного хранилища обязательно.",
        priority: "high" as const,
      },
      {
        id: "8",
        title: "Согласование",
        description: "Документы на согласование отправляются не позднее чем за 2 рабочих дня до дедлайна. Срок согласования — 1 рабочий день.",
        priority: "medium" as const,
      },
      {
        id: "9",
        title: "Архивация",
        description: "Завершённые проекты архивируются в течение 5 рабочих дней. Срок хранения документов — 3 года после завершения проекта.",
        priority: "low" as const,
      },
    ],
  },
  {
    name: "Безопасность",
    icon: Shield,
    color: "text-brand-600 dark:text-brand-400",
    bgColor: "bg-surface-100 dark:bg-surface-700",
    borderColor: "border-surface-200 dark:border-surface-700",
    rules: [
      {
        id: "10",
        title: "Доступ к данным",
        description: "Доступ к проектам и данным предоставляется строго по ролям. Запрещено передавать пароли и доступы третьим лицам. Использовать двухфакторную аутентификацию.",
        priority: "high" as const,
      },
      {
        id: "11",
        title: "Конфиденциальность",
        description: "Не разглашать информацию о проектах, клиентах и внутренних процессах за пределами компании. NDA подписывается при трудоустройстве.",
        priority: "high" as const,
      },
      {
        id: "12",
        title: "Использование устройств",
        description: "Корпоративные устройства используются только для рабочих задач. Личные устройства подключаются к корпоративной сети только через VPN.",
        priority: "medium" as const,
      },
    ],
  },
  {
    name: "Отпуска и отгулы",
    icon: CalendarDays,
    color: "text-brand-600 dark:text-brand-400",
    bgColor: "bg-surface-100 dark:bg-surface-700",
    borderColor: "border-surface-200 dark:border-surface-700",
    rules: [
      {
        id: "13",
        title: "Планирование отпуска",
        description: "Отпуск планируется не менее чем за 2 недели. График отпусков утверждается на квартал. Одновременно в отпуске не более 30% команды.",
        priority: "medium" as const,
      },
      {
        id: "14",
        title: "Отгулы",
        description: "Отгул согласовывается за 3 дня. Возможен срочный отгул по семейным обстоятельствам — уведомить руководителя до 10:00 текущего дня.",
        priority: "low" as const,
      },
      {
        id: "15",
        title: "Больничный",
        description: "При больничном — уведомить руководителя и HR до 10:00 в первый день отсутствия. Предоставить справку при выходе на работу.",
        priority: "medium" as const,
      },
    ],
  },
];

const priorityConfig = {
  high: { label: "Важное", variant: "danger" as const },
  medium: { label: "Среднее", variant: "warning" as const },
  low: { label: "Информация", variant: "default" as const },
};

export function EmployeeRulesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    RULE_CATEGORIES.map((c) => c.name)
  );

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) =>
      prev.includes(name)
        ? prev.filter((n) => n !== name)
        : [...prev, name]
    );
  };

  const filteredCategories = RULE_CATEGORIES.map((cat) => ({
    ...cat,
    rules: cat.rules.filter(
      (r) =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.rules.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Правила для сотрудников"
        description="Внутренние регламенты, политики и процедуры студии"
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по правилам..."
                className="input pl-10 w-64"
              />
            </div>
            <Button>
              <Plus className="h-4 w-4" />
              Добавить правило
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-5">
        {RULE_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <Card key={cat.name} className="text-center">
              <div className={cn("mx-auto flex h-10 w-10 items-center justify-center rounded-xl", cat.bgColor)}>
                <Icon className={cn("h-5 w-5", cat.color)} />
              </div>
              <p className="mt-2 text-lg font-bold text-surface-900 dark:text-white">
                {cat.rules.length}
              </p>
              <p className="text-xs text-surface-500">{cat.name}</p>
            </Card>
          );
        })}
      </div>

      {/* Rules by Categories */}
      <div className="space-y-4">
        {filteredCategories.map((category) => {
          const CategoryIcon = category.icon;
          const isExpanded = expandedCategories.includes(category.name);

          return (
            <Card key={category.name} className="overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category.name)}
                className="flex w-full items-center justify-between p-4 transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", category.bgColor)}>
                    <CategoryIcon className={cn("h-5 w-5", category.color)} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-surface-900 dark:text-white">
                      {category.name}
                    </h3>
                    <p className="text-xs text-surface-500">
                      {category.rules.length} {category.rules.length === 1 ? "правило" : "правил"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">
                    {category.rules.filter((r) => r.priority === "high").length} важных
                  </Badge>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-surface-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-surface-400" />
                  )}
                </div>
              </button>

              {/* Rules list */}
              {isExpanded && (
                <div className="divide-y divide-surface-100 border-t border-surface-100 dark:divide-surface-700 dark:border-surface-700">
                  {category.rules.map((rule) => {
                    const priority = priorityConfig[rule.priority];
                    return (
                      <div
                        key={rule.id}
                        className="group relative p-4 transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/30"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium text-surface-900 dark:text-white">
                                {rule.title}
                              </h4>
                              <Badge variant={priority.variant} className="text-[10px]">
                                {priority.label}
                              </Badge>
                            </div>
                            <p className="mt-1.5 text-sm text-surface-500 leading-relaxed">
                              {rule.description}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button className="rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-700">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button className="rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-red-900/20">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <Card>
          <div className="flex flex-col items-center py-12 text-center">
            <BookOpen className="mb-3 h-10 w-10 text-surface-300" />
            <h3 className="text-sm font-medium text-surface-500">
              Правила не найдены
            </h3>
            <p className="mt-1 text-xs text-surface-400">
              Попробуйте изменить поисковый запрос
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
