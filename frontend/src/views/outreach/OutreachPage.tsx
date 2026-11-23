"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { PhoneCall, Upload, Users, RefreshCw, ArrowRight, CheckCircle2 } from "lucide-react";
import { api } from "@/shared/api/base";
import { useAuth } from "@/hooks/useAuth";

const base = "/outreach";
const labels: Record<string, string> = {
  new: "Новый",
  no_answer: "Не ответил",
  callback: "Перезвонить",
  rejected: "Отказ",
  wrong_number: "Неверный номер",
  interested: "Заинтересован",
  exhausted: "3 попытки без ответа",
};
const input =
  "w-full rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-sm dark:border-surface-700 dark:bg-surface-800";
const button =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50";
const panel =
  "rounded-2xl border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-800";
const template = `Компания: Название компании\nТелефон: +996700123456\nСфера: Чем занимается компания\nПредложение: Что мы предлагаем\nУТП: Почему это полезно именно этой компании\nНачало разговора: Текст для менеджера\nВозражения: Возможные возражения и ответы\n---\nКомпания: Следующая компания\nТелефон: +996700123457\nСфера: ...\nПредложение: ...\nУТП: ...\nНачало разговора: ...\nВозражения: ...`;
const prompt = `Подготовь подборку D2C (DEOCORE TO CLIENT) для импорта в CRM. Для каждой компании используй строго следующий шаблон. Разделяй компании отдельной строкой ---. Не добавляй вступление, Markdown или дополнительные поля. Телефон указывай с международным кодом страны. Не выдумывай контакты и факты о компании: используй только предоставленные или проверенные данные. Если телефон неизвестен, не включай компанию. Предложение и УТП адаптируй под компанию.\n\n${template}`;

type Member = { id: string; name: string; daily_limit: number; active: boolean };
type Settings = {
  is_supervisor: boolean;
  is_admin: boolean;
  supervisor: string | null;
  owner_is_head: boolean;
  head: { id: string; name: string } | null;
  daily_limit: number | null;
  members: Member[];
  users: { id: string; name: string; can_supervise: boolean }[];
};
type Call = {
  id: string;
  employee_name: string;
  outcome: string;
  notes: string;
  recording: string | null;
  recording_parts: number;
  recording_name: string;
  created_at: string;
};
type Contact = {
  id: string;
  company: string;
  phone: string;
  industry: string;
  offer: string;
  usp: string;
  script: string;
  objections: string;
  assigned_to: string | null;
  assigned_name: string;
  status: string;
  next_call_at: string | null;
  missed_attempts: number;
  lead: string | null;
  calls: Call[];
};
type Queue = {
  results: Contact[];
  count: number;
  working: boolean;
  today: string;
  unassigned: number | null;
};
type Preview = {
  rows: (Record<string, string> & { duplicate: boolean })[];
  duplicates: number;
  created: number;
};

function errorText(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (data)
      {return typeof data === "string"
        ? "Не удалось выполнить запрос."
        : JSON.stringify(data).replace(/[{}\[\]"]/g, "");}
  }
  return error instanceof Error ? error.message : "Не удалось выполнить запрос.";
}
function date(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    timeZone: "Asia/Bishkek",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OutreachPage() {
  const client = useQueryClient();
  const userId = useAuth((state) => state.user?.id);
  const [tab, setTab] = useState("queue");
  const [mode, setMode] = useState("today");
  const [search, setSearch] = useState("");
  const [user, setUser] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const settings = useQuery({
    queryKey: ["outreach", userId, "settings"],
    queryFn: async () => (await api.get<Settings>(`${base}/settings/`)).data,
    retry: false,
    enabled: !!userId,
  });
  const queue = useQuery({
    queryKey: ["outreach", userId, "queue", mode, search, user, page],
    queryFn: async () =>
      (await api.post<Queue>(`${base}/queue/`, {}, { params: { mode, search, user, page } })).data,
    enabled: !!settings.data,
    refetchInterval: 60000,
  });
  const detail = useQuery({
    queryKey: ["outreach", userId, "contact", selected],
    queryFn: async () => (await api.get<Contact>(`${base}/contacts/${selected}/`)).data,
    enabled: !!selected && !!settings.data,
  });
  useEffect(() => {
    setSelected(new URLSearchParams(window.location.search).get("contact"));
  }, []);
  const refresh = () => client.invalidateQueries({ queryKey: ["outreach"] });
  if (settings.isPending) {return <p className="p-8">Загружаем отдел продаж…</p>;}
  if (settings.error || !settings.data)
    {return (
      <div className={panel}>
        <h1 className="text-xl font-semibold">D2C · Отдел продаж</h1>
        <p className="mt-3" role="alert">
          {errorText(settings.error)} Если доступ ещё не выдан, руководитель должен добавить вас в
          состав отдела.
        </p>
        <button className={`${button} mt-4`} onClick={() => settings.refetch()}>
          Повторить
        </button>
      </div>
    );}
  const s = settings.data;
  const active = detail.data;
  return (
    <div className="space-y-6 text-surface-900 dark:text-surface-100">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-brand-600">
            DEOCORE TO CLIENT
          </p>
          <h1 className="mt-2 text-3xl font-semibold">D2C · Обзвон</h1>
          <p className="mt-2 text-sm text-surface-500">
            Пн–пт · 09:00–19:00 · Бишкек. Перезвоны — первыми и сверх дневной нормы.
          </p>
        </div>
        <button className={button} onClick={() => refresh()} disabled={queue.isFetching}>
          <RefreshCw size={16} /> Обновить
        </button>
      </header>
      {!s.head && (
        <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Назначьте управляющего менеджера во вкладке «Команда», чтобы заинтересованные контакты
          можно было передавать в лиды.
        </p>
      )}
      <nav aria-label="Разделы D2C" className="flex flex-wrap gap-2">
        {[
          ["queue", "Очередь звонков", PhoneCall],
          ...(s.is_supervisor ? [["import", "Импорт D2C", Upload]] : []),
          ...(s.is_supervisor || s.is_admin ? [["team", "Команда", Users]] : []),
        ].map(([id, name, Icon]) => {
          const I = Icon as typeof PhoneCall;
          return (
            <button
              key={String(id)}
              onClick={() => setTab(String(id))}
              aria-pressed={tab === id}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${tab === id ? "bg-brand-600 text-white" : "bg-surface-100 dark:bg-surface-700"}`}
            >
              <I size={16} />
              {String(name)}
            </button>
          );
        })}
      </nav>
      {tab === "import" && <ImportPanel onSaved={refresh} />}
      {tab === "team" && <TeamPanel settings={s} onSaved={refresh} />}
      {tab === "queue" && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={panel}>
              <p className="text-sm text-surface-500">
                {mode === "today" ? "В очереди на сегодня" : "Всего найдено"}
              </p>
              <p className="mt-2 text-3xl font-semibold">{queue.data?.count ?? "—"}</p>
            </div>
            <div className={panel}>
              <p className="text-sm text-surface-500">
                {s.is_supervisor ? "В резерве без назначения" : "Моя дневная норма"}
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {s.is_supervisor ? (queue.data?.unassigned ?? "—") : (s.daily_limit ?? "—")}
              </p>
            </div>
            <div className={panel}>
              <p className="text-sm text-surface-500">Расписание выдачи</p>
              <p className="mt-2 text-lg font-medium">
                {queue.data?.working ? "Рабочее время" : "Следующий рабочий день"}
              </p>
              <p className="mt-1 text-xs text-surface-500">
                Результаты и записи доступны в любое время
              </p>
            </div>
          </div>
          {!s.is_supervisor && s.daily_limit !== null && (
            <LimitEditor
              value={s.daily_limit}
              onSave={async (daily_limit) => {
                await api.patch(`${base}/settings/`, { daily_limit });
                await refresh();
              }}
            />
          )}
          <div className="flex flex-wrap gap-3">
            <input
              aria-label="Поиск компании или телефона"
              className={`${input} sm:max-w-xs`}
              placeholder="Компания или телефон"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <select
              aria-label="Период"
              className={`${input} sm:w-auto`}
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setPage(1);
              }}
            >
              <option value="today">На сегодня</option>
              <option value="all">Все контакты и история</option>
            </select>
            {s.is_supervisor && (
              <select
                aria-label="Сотрудник"
                className={`${input} sm:w-auto`}
                value={user}
                onChange={(e) => {
                  setUser(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Весь отдел</option>
                {s.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          {queue.error && (
            <p role="alert" className="text-red-600">
              {errorText(queue.error)}
            </p>
          )}
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(280px,1fr)_minmax(0,1.6fr)]">
            <section className="space-y-3" aria-label="Контакты">
              {queue.isPending ? (
                <p>Загрузка контактов…</p>
              ) : queue.data?.results.length === 0 ? (
                <div className={panel}>
                  <CheckCircle2 className="mb-3 text-brand-600" />
                  <h2 className="font-semibold">Контактов пока нет</h2>
                  <p className="mt-2 text-sm text-surface-500">
                    {mode === "today"
                      ? "Новые контакты выдаются в рабочее время. Будущие перезвоны и завершённые звонки доступны в истории."
                      : "Измените поиск или добавьте подборку D2C."}
                  </p>
                </div>
              ) : (
                queue.data?.results.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                    className={`${panel} w-full text-left transition-colors ${selected === c.id ? "ring-2 ring-brand-500" : "hover:border-brand-400"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-semibold">{c.company}</h2>
                      <span
                        className={`rounded-lg px-2 py-1 text-xs ${c.status === "callback" ? "bg-amber-100 text-amber-900" : "bg-surface-100 text-surface-600"}`}
                      >
                        {labels[c.status]}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-sm">{c.phone}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-surface-500">{c.offer}</p>
                    <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-surface-500">
                      <span>{c.assigned_name}</span>
                      {c.next_call_at && <span>{date(c.next_call_at)}</span>}
                    </div>
                  </button>
                ))
              )}
              {(queue.data?.count ?? 0) > 50 && (
                <div className="flex items-center justify-between">
                  <button
                    className={button}
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Назад
                  </button>
                  <span>
                    {page} / {Math.ceil((queue.data?.count ?? 0) / 50)}
                  </span>
                  <button
                    className={button}
                    disabled={page * 50 >= (queue.data?.count ?? 0)}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Далее
                  </button>
                </div>
              )}
            </section>
            <section>
              {detail.isFetching && <p className="mb-3 text-sm">Обновляем карточку…</p>}
              {detail.error && <p role="alert">{errorText(detail.error)}</p>}
              {active ? (
                <ContactPanel key={active.id} contact={active} settings={s} onSaved={refresh} />
              ) : (
                <div className={`${panel} py-16 text-center text-surface-500`}>
                  <PhoneCall className="mx-auto mb-3" />
                  <p>Выберите компанию для звонка</p>
                  <p className="mt-2 text-sm">Предложение, УТП и история будут здесь</p>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function LimitEditor({
  value,
  onSave,
  minimum = 20,
}: {
  value: number;
  onSave: (_value: number) => Promise<unknown>;
  minimum?: number;
}) {
  const [limit, setLimit] = useState(value);
  const save = useMutation({ mutationFn: () => onSave(limit) });
  return (
    <form
      className="flex flex-wrap items-center gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <label className="text-sm">
        Контактов в день{" "}
        <input
          className={`${input} ml-2 !w-20`}
          type="number"
          min={minimum}
          max={40}
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          required
        />
      </label>
      <button className={button} disabled={save.isPending}>
        Сохранить норму
      </button>
      {save.error && (
        <span role="alert" className="text-sm text-red-600">
          {errorText(save.error)}
        </span>
      )}
      {save.isSuccess && <span className="text-sm text-emerald-600">Сохранено</span>}
    </form>
  );
}

function ImportPanel({ onSaved }: { onSaved: () => Promise<unknown> }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState("");
  const run = useMutation({
    mutationFn: async (commit: boolean) => {
      const { data } = await api.post<Preview>(`${base}/import/`, { text, commit });
      if (commit) {
        setMessage(`Добавлено: ${data.created}. Пропущено повторов: ${data.duplicates}.`);
        setText("");
        setPreview(null);
        await onSaved();
      } else {
        setPreview(data);
        setMessage("");
      }
    },
  });
  return (
    <section className={`${panel} space-y-4`}>
      <h2 className="text-xl font-semibold">Подборка D2C</h2>
      <p className="text-sm text-surface-500">
        Вставьте готовый текст от ИИ. До 500 компаний за один импорт. Повторяющиеся телефоны будут
        пропущены.
      </p>
      <details>
        <summary className="cursor-pointer text-sm font-medium text-brand-600">
          Шаблон и инструкция для ИИ
        </summary>
        <textarea
          readOnly
          aria-label="Инструкция для ИИ"
          className={`${input} mt-3 h-64 font-mono`}
          value={prompt}
        />
        <button
          className={`${button} mt-2`}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(prompt);
              setMessage("Инструкция скопирована.");
            } catch {
              setMessage("Выделите и скопируйте инструкцию вручную.");
            }
          }}
        >
          Скопировать инструкцию
        </button>
      </details>
      <textarea
        aria-label="Текст подборки D2C"
        className={`${input} min-h-72 font-mono`}
        placeholder={template}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setPreview(null);
          setMessage("");
        }}
      />
      <button
        className={button}
        disabled={!text.trim() || run.isPending}
        onClick={() => run.mutate(false)}
      >
        Проверить подборку <ArrowRight size={16} />
      </button>
      {run.error && (
        <p role="alert" className="text-red-600">
          {errorText(run.error)}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-emerald-600">
          {message}
        </p>
      )}
      {preview && (
        <div className="space-y-3">
          <p className="font-medium">
            Новых: {preview.rows.length - preview.duplicates} · Повторов: {preview.duplicates}
          </p>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {preview.rows.map((r, i) => (
              <div key={i} className="rounded-xl bg-surface-50 p-3 text-sm dark:bg-surface-900">
                <b>{r.company}</b> · {r.phone}{" "}
                {r.duplicate && <span className="text-amber-600">— повтор, пропустим</span>}
                <p className="mt-1">{r.offer}</p>
                <p className="mt-1 text-surface-500">УТП: {r.usp || "—"}</p>
              </div>
            ))}
          </div>
          <button
            className={button}
            disabled={run.isPending || preview.rows.length === preview.duplicates}
            onClick={() => run.mutate(true)}
          >
            Добавить {preview.rows.length - preview.duplicates} контактов
          </button>
        </div>
      )}
    </section>
  );
}

function TeamPanel({
  settings: s,
  onSaved,
}: {
  settings: Settings;
  onSaved: () => Promise<unknown>;
}) {
  const [boss, setBoss] = useState(s.supervisor ?? "");
  const [employee, setEmployee] = useState("");
  const update = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      await api.patch(`${base}/settings/`, data);
      await onSaved();
    },
  });
  return (
    <div className="space-y-5">
      {s.is_admin && (
        <section className={`${panel} space-y-3`}>
          <h2 className="text-lg font-semibold">Владелец — управляющий менеджер</h2>
          <p className="text-sm text-surface-500">
            По умолчанию владелец сам руководит отделом продаж: видит весь отдел, импортирует
            контакты и получает заинтересованные лиды. Отключите, чтобы передать это сотруднику с
            ролью «Управляющий менеджер». Настройки отдела остаются у владельца в любом случае.
          </p>
          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={s.owner_is_head}
              disabled={update.isPending}
              onChange={(e) => update.mutate({ owner_is_head: e.target.checked })}
            />
            Владелец выполняет роль управляющего менеджера
          </label>
        </section>
      )}
      <section className={`${panel} space-y-3`}>
        <h2 className="text-lg font-semibold">Управляющий менеджер</h2>
        <p className="text-sm text-surface-500">
          Все заинтересованные лиды передаются этому сотруднику. Сейчас:{" "}
          <strong>{s.head?.name ?? "не назначен"}</strong>. Если не выбрать вручную, лиды получает
          владелец (когда настройка выше включена), иначе — сотрудник с ролью «Управляющий
          менеджер».
        </p>
        <select
          aria-label="Руководитель отдела"
          className={input}
          value={boss}
          onChange={(e) => setBoss(e.target.value)}
          disabled={!s.is_admin}
        >
          <option value="">Автоматически</option>
          {s.users
            .filter((u) => u.can_supervise)
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
        </select>
        {s.is_admin && (
          <button
            className={button}
            disabled={boss === (s.supervisor ?? "") || update.isPending}
            onClick={() => update.mutate({ supervisor: boss || null })}
          >
            Сохранить
          </button>
        )}
      </section>
      <section className={`${panel} space-y-4`}>
        <h2 className="text-lg font-semibold">Менеджеры обзвона</h2>
        <p className="text-sm text-surface-500">
          Контакты распределяются поровну с учётом дневной нормы. При паузе новые контакты не
          выдаются; оставшиеся можно передать другому менеджеру.
        </p>
        <div className="flex flex-wrap gap-3">
          <select
            aria-label="Добавить менеджера"
            className={`${input} sm:max-w-sm`}
            value={employee}
            onChange={(e) => setEmployee(e.target.value)}
          >
            <option value="">Выберите сотрудника</option>
            {s.users
              .filter((u) => !s.members.some((m) => m.id === u.id))
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
          </select>
          <button
            className={button}
            disabled={!employee || update.isPending}
            onClick={() => {
              update.mutate({ user: employee, daily_limit: 25, active: true });
              setEmployee("");
            }}
          >
            Добавить в отдел
          </button>
        </div>
        {s.members.map((m) => (
          <div
            key={m.id}
            className="space-y-3 border-t border-surface-200 pt-4 dark:border-surface-700"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-medium">{m.name}</h3>
              <button
                className="text-sm text-brand-600"
                disabled={update.isPending}
                onClick={() =>
                  update.mutate({ user: m.id, daily_limit: m.daily_limit, active: !m.active })
                }
              >
                {m.active ? "Поставить на паузу" : "Возобновить"}
              </button>
            </div>
            <p className="text-xs text-surface-500">
              {m.active ? "Участвует в распределении" : "На паузе"}
            </p>
            <LimitEditor
              key={`${m.id}-${m.daily_limit}`}
              value={m.daily_limit}
              minimum={1}
              onSave={async (daily_limit) => {
                await api.patch(`${base}/settings/`, { user: m.id, daily_limit });
                await onSaved();
              }}
            />
          </div>
        ))}
      </section>
      {update.error && (
        <p role="alert" className="text-red-600">
          {errorText(update.error)}
        </p>
      )}
    </div>
  );
}

function ContactPanel({
  contact: c,
  settings: s,
  onSaved,
}: {
  contact: Contact;
  settings: Settings;
  onSaved: () => Promise<unknown>;
}) {
  const [outcome, setOutcome] = useState("no_answer");
  const [notes, setNotes] = useState("");
  const [scheduled, setScheduled] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [recording, setRecording] = useState<string | null>(null);
  const [target, setTarget] = useState(c.assigned_to ?? "");
  const finished = ["interested", "rejected", "wrong_number", "exhausted"].includes(c.status);
  const needsRecording = !["no_answer", "wrong_number"].includes(outcome);
  const save = useMutation({
    mutationFn: async () => {
      let recordingId = recording;
      if (file && !recordingId) {
        if (file.size > 30 * 1024 * 1024) {throw new Error("Запись должна быть не больше 30 МБ.");}
        const { data } = await api.post<{ id: string; parts: number; chunk_size: number }>(
          `${base}/recordings/`,
          { name: file.name, size: file.size }
        );
        for (let i = 0; i < data.parts; i++) {
          setProgress(`Загружаем запись: ${Math.round((i / data.parts) * 100)}%`);
          const body = new FormData();
          body.append("file", file.slice(i * data.chunk_size, (i + 1) * data.chunk_size), "part");
          await api.put(`${base}/recordings/${data.id}/parts/${i}/`, body, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
        recordingId = data.id;
        setRecording(data.id);
      }
      setProgress("Сохраняем результат…");
      await api.post(`${base}/contacts/${c.id}/outcome/`, {
        outcome,
        notes,
        recording: recordingId,
        next_call_at: outcome === "callback" ? `${scheduled}:00+06:00` : null,
        request_id: requestId,
      });
      setProgress(
        outcome === "interested" ? "Лид создан и передан руководителю." : "Результат сохранён."
      );
      setFile(null);
      setRecording(null);
      setNotes("");
      setRequestId(crypto.randomUUID());
      await onSaved();
    },
    onError: () => setProgress(""),
  });
  const reassign = useMutation({
    mutationFn: async () => {
      await api.patch(`${base}/contacts/${c.id}/`, { assigned_to: target });
      await onSaved();
    },
  });
  return (
    <div className={`${panel} space-y-6`}>
      <div>
        <div className="flex flex-wrap justify-between gap-2">
          <h2 className="text-2xl font-semibold">{c.company}</h2>
          <span className="text-sm text-brand-600">{labels[c.status]}</span>
        </div>
        <a
          className="mt-3 inline-flex items-center gap-2 text-lg font-medium text-brand-600"
          href={`tel:${c.phone}`}
        >
          <PhoneCall size={18} />
          {c.phone}
        </a>
        <p className="mt-2 text-sm text-surface-500">
          {c.industry} · {c.assigned_name}
        </p>
        {c.next_call_at && (
          <p className="mt-2 text-sm">Следующий звонок: {date(c.next_call_at)} · Бишкек</p>
        )}
      </div>
      <div className="space-y-4">
        {[
          ["Что предлагаем", c.offer],
          ["УТП", c.usp],
          ["Начало разговора", c.script],
          ["Ответы на возражения", c.objections],
        ].map(([title, text]) => (
          <div key={title}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-surface-500">
              {title}
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
              {text || "Не указано"}
            </p>
          </div>
        ))}
      </div>
      {s.is_supervisor && !finished && (
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Передать контакт сотруднику"
            className={`${input} flex-1`}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="">Выберите менеджера</option>
            {s.members
              .filter((m) => m.active)
              .map((m) => (
                <option value={m.id} key={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
          <button
            className={button}
            disabled={!target || target === c.assigned_to || reassign.isPending}
            onClick={() => reassign.mutate()}
          >
            Передать
          </button>
          {reassign.error && <p role="alert">{errorText(reassign.error)}</p>}
        </div>
      )}
      {c.lead && (
        <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          Лид передан руководителю.
          {s.is_supervisor && (
            <Link className="ml-2 underline" href={`/leads/${c.lead}`}>
              Открыть лид
            </Link>
          )}
        </p>
      )}
      {!finished && (
        <form
          className="space-y-4 border-t border-surface-200 pt-5 dark:border-surface-700"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <h3 className="font-semibold">Результат звонка</h3>
          <fieldset disabled={save.isPending} className="space-y-4">
            <label className="block text-sm">
              Результат
              <select
                className={`${input} mt-1`}
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
              >
                {["no_answer", "callback", "rejected", "wrong_number", "interested"].map((v) => (
                  <option key={v} value={v}>
                    {labels[v]}
                  </option>
                ))}
              </select>
            </label>
            {outcome === "callback" && (
              <label className="block text-sm">
                Когда перезвонить · время Бишкека
                <input
                  className={`${input} mt-1`}
                  type="datetime-local"
                  required
                  value={scheduled}
                  onChange={(e) => setScheduled(e.target.value)}
                />
              </label>
            )}
            <label className="block text-sm">
              Комментарий
              <textarea
                className={`${input} mt-1`}
                rows={3}
                maxLength={10000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Запись разговора {needsRecording ? "· обязательно" : "· необязательно"}
              <input
                key={requestId}
                className={`${input} mt-1`}
                type="file"
                accept=".mp3,.m4a,.wav,.ogg,.aac,.webm,.amr,.3gp"
                required={needsRecording && !recording}
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setRecording(null);
                }}
              />
              <span className="mt-1 block text-xs text-surface-500">
                До 30 МБ. Запись загружается при сохранении результата.
              </span>
            </label>
            <button
              className={`${button} w-full`}
              disabled={save.isPending || (outcome === "interested" && !s.head)}
            >
              {save.isPending
                ? "Сохраняем…"
                : outcome === "interested"
                  ? "Создать лид и передать руководителю"
                  : "Сохранить результат"}
            </button>
          </fieldset>
        </form>
      )}
      {save.error && (
        <p role="alert" className="text-sm text-red-600">
          {errorText(save.error)}
        </p>
      )}
      {progress && (
        <p role="status" className="text-sm text-brand-600">
          {progress}
        </p>
      )}
      <section className="space-y-3 border-t border-surface-200 pt-5 dark:border-surface-700">
        <h3 className="font-semibold">История звонков · {c.calls.length}</h3>
        {c.calls.length === 0 && <p className="text-sm text-surface-500">Звонков пока нет</p>}
        {c.calls.map((call) => (
          <div key={call.id} className="rounded-xl bg-surface-50 p-3 dark:bg-surface-900">
            <p className="text-sm font-medium">
              {labels[call.outcome]} · {date(call.created_at)}
            </p>
            <p className="mt-1 text-xs text-surface-500">{call.employee_name}</p>
            {call.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{call.notes}</p>}
            {call.recording && <RecordingPlayer call={call} />}
          </div>
        ))}
      </section>
    </div>
  );
}

function RecordingPlayer({ call }: { call: Call }) {
  const [url, setUrl] = useState("");
  useEffect(
    () => () => {
      if (url) {URL.revokeObjectURL(url);}
    },
    [url]
  );
  const load = useMutation({
    mutationFn: async () => {
      const chunks: BlobPart[] = [];
      for (let i = 0; i < call.recording_parts; i++)
        {chunks.push(
          (
            await api.get<ArrayBuffer>(`${base}/recordings/${call.recording}/parts/${i}/`, {
              responseType: "arraybuffer",
            })
          ).data
        );}
      const ext = call.recording_name.split(".").pop()?.toLowerCase() ?? "";
      const mime: Record<string, string> = {
        mp3: "audio/mpeg",
        m4a: "audio/mp4",
        wav: "audio/wav",
        ogg: "audio/ogg",
        webm: "audio/webm",
        aac: "audio/aac",
        amr: "audio/amr",
        "3gp": "audio/3gpp",
      };
      setUrl(
        URL.createObjectURL(new Blob(chunks, { type: mime[ext] ?? "application/octet-stream" }))
      );
    },
  });
  return (
    <div className="mt-3">
      {url ? (
        <>
          <audio controls preload="metadata" src={url} className="w-full" />
          <a
            className="mt-2 inline-block text-xs text-brand-600 underline"
            href={url}
            download={call.recording_name}
          >
            Скачать запись
          </a>
        </>
      ) : (
        <button
          className="text-sm text-brand-600 underline"
          disabled={load.isPending}
          onClick={() => load.mutate()}
        >
          {load.isPending ? "Загружаем…" : "Прослушать запись"}
        </button>
      )}
      {load.error && (
        <p role="alert" className="text-sm text-red-600">
          {errorText(load.error)}
        </p>
      )}
    </div>
  );
}
