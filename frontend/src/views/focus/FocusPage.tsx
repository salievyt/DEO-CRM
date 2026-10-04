"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Check,
  Flame,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Square,
  StickyNote,
  Target,
  Timer,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { api } from "@/shared/api/base";
import {
  focusApi,
  FocusSession,
  FocusSettings,
  Phase,
  RunningTimer,
  remaining,
  timeLabel,
  phaseLabels,
  focusError,
} from "@/features/focus/api";
import { FocusLogo } from "@/features/focus/FocusLogo";
import "./focus.css";

const PHASE_TONE: Record<Phase, { text: string; orb: string; stroke: string }> = {
  work: {
    text: "text-brand-600 dark:text-brand-400",
    orb: "bg-brand-500/25",
    stroke: "#6366f1",
  },
  short_break: {
    text: "text-success-600 dark:text-success-400",
    orb: "bg-success-500/25",
    stroke: "#22c55e",
  },
  long_break: {
    text: "text-warning-600 dark:text-warning-400",
    orb: "bg-warning-500/25",
    stroke: "#f59e0b",
  },
};

const TABS: { id: string; label: string; icon: typeof Target }[] = [
  { id: "tasks", label: "Задачи", icon: Target },
  { id: "notes", label: "Заметки", icon: StickyNote },
  { id: "stats", label: "Прогресс", icon: BarChart3 },
];

export function FocusPage() {
  const client = useQueryClient();
  const root = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const previous = useRef<FocusSession | null>(null);
  const starting = useRef(false);
  const channel = useRef<BroadcastChannel | null>(null);

  const [now, setNow] = useState(Date.now());
  const [phase, setPhase] = useState<Phase>("work");
  const [task, setTask] = useState("");
  const [goal, setGoal] = useState("");
  const [tab, setTab] = useState("tasks");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [zen, setZen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<FocusSettings | null>(null);
  const [resultSession, setResultSession] = useState<FocusSession | null>(null);
  const [result, setResult] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const state = useQuery({
    queryKey: ["focus", "state"],
    queryFn: focusApi.state,
    refetchInterval: 5000,
    retry: false,
  });
  const settings = useQuery({ queryKey: ["focus", "settings"], queryFn: focusApi.settings });
  const stats = useQuery({
    queryKey: ["focus", "stats"],
    queryFn: focusApi.stats,
    refetchInterval: 30000,
  });
  const notes = useQuery({ queryKey: ["focus", "notes"], queryFn: focusApi.notes });
  const history = useQuery({
    queryKey: ["focus", "history", historyPage],
    queryFn: () => focusApi.history(historyPage),
  });
  const tasks = useQuery({
    queryKey: ["focus", "tasks"],
    queryFn: async () => {
      let next: string | null = "/tasks/my/?page_size=100";
      const rows: { id: string; title: string; status_name?: string }[] = [];
      const seen = new Set<string>();
      while (next && !seen.has(next)) {
        seen.add(next);
        const {
          data,
        }: {
          data:
            | { id: string; title: string; status_name?: string }[]
            | {
                results: { id: string; title: string; status_name?: string }[];
                next: string | null;
              };
        } = await api.get(next);
        rows.push(...(Array.isArray(data) ? data : (data.results ?? [])));
        next = Array.isArray(data) ? null : data.next;
      }
      return rows;
    },
  });
  const active = state.data?.active ?? null;
  const profile = settings.data;
  const displayPhase = active?.phase ?? phase;
  const tone = PHASE_TONE[displayPhase];
  const duration = profile
    ? profile[
        {
          work: "work_minutes",
          short_break: "short_break_minutes",
          long_break: "long_break_minutes",
        }[displayPhase] as "work_minutes"
      ]
    : 25;
  const seconds = active
    ? remaining(
        active,
        state.data ? Date.parse(state.data.server_time) - state.dataUpdatedAt : 0,
        now
      )
    : duration * 60;
  const percent = active ? 1 - seconds / active.planned_seconds : 0;
  const refresh = useCallback(async () => {
    await client.invalidateQueries({ queryKey: ["focus"] });
    client.invalidateQueries({ queryKey: ["tasks"] });
  }, [client]);
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") { return; }
    const bus = new BroadcastChannel("deo-focus");
    channel.current = bus;
    bus.onmessage = (event) => {
      if (event.data?.type === "focus-changed") {
        void client.invalidateQueries({ queryKey: ["focus"] });
      }
    };
    return () => { bus.close(); channel.current = null; };
  }, [client]);
  const broadcast = useCallback(() => {
    channel.current?.postMessage({ type: "focus-changed" });
  }, []);
  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
      broadcast();
    } catch (e) {
      setError(focusError(e));
    } finally {
      setBusy(false);
    }
  }, [broadcast, refresh]);
  const start = useCallback(async (nextPhase: Phase = phase) => {
    if (starting.current) { return null; }
    starting.current = true;
    try {
      return await focusApi.start({ phase: nextPhase, task: task || null, goal });
    } finally {
      starting.current = false;
    }
  }, [phase, task, goal]);
  const toggleZen = useCallback(() => {
    const next = !zen;
    setZen(next);
    if (next) {
      root.current?.requestFullscreen?.().catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [zen]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (active) {
      setTask(active.task ?? "");
      setPhase(active.phase);
      setGoal(active.goal);
    }
  }, [active]); // server restores session after navigation
  useEffect(() => {
    if (state.isFetching) {return;}
    const old = previous.current;
    previous.current = active;
    if (
      old &&
      !active &&
      state.data?.last_session?.id === old.id &&
      state.data.last_session.status === "completed"
    ) {
      if (old.phase === "work") {
        setResultSession(state.data.last_session);
        setResult(state.data.last_session.result);
      }
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Сессия завершена", { body: old.phase === "work" ? "Время сделать перерыв." : "Готовы вернуться к фокусу?" });
      }
      void focusApi
        .stats()
        .then((fresh) => {
          const next: Phase =
            old.phase === "work"
              ? fresh.today_sessions % (profile?.cycles ?? 4) === 0
                ? "long_break"
                : "short_break"
              : "work";
          setPhase(next);
          if (profile?.auto_advance) {void run(() => start(next));}
        })
        .catch((e) => setError(focusError(e)));
      if (audio.current) {audio.current.pause();}
      setSoundOn(false);
    }
  }, [active, state.data, state.isFetching, profile?.auto_advance, profile?.cycles, run, start]);
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "default") { return; }
    const ask = () => void Notification.requestPermission();
    window.addEventListener("pointerdown", ask, { once: true });
    return () => window.removeEventListener("pointerdown", ask);
  }, []);
  useEffect(() => {
    if (active?.status === "running" && seconds === 0 && !state.isFetching) {void state.refetch();}
  }, [seconds, active?.status, state]);
  // Escape exits fullscreen at the OS level; keep the overlay state in sync.
  useEffect(() => {
    const sync = () => {
      if (!document.fullscreenElement) {setZen(false);}
    };
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  useEffect(() => {
    return () => {
      audio.current?.pause();
    };
  }, []);
  async function toggleSound() {
    if (soundOn) {
      audio.current?.pause();
      setSoundOn(false);
      return;
    }
    const sound = profile?.sound === "none" ? "rain" : (profile?.sound ?? "rain");
    audio.current?.pause();
    const player = new Audio(`/focus/sounds/${sound}.wav`);
    player.loop = true;
    player.volume = 0.3;
    audio.current = player;
    try {
      await player.play();
      setSoundOn(true);
    } catch {
      setError("Браузер не смог включить звук. Попробуйте ещё раз.");
    }
  }
  function settingsButton() {
    setDraft(profile ? { ...profile } : null);
    setSettingsOpen(true);
  }
  const summary = stats.data;
  const runningTimer = state.data?.running_timer ?? null;
  const stopTimer = () =>
    run(async () => {
      await focusApi.stopRunningTimer();
    });
  const timerBanner = (timer: RunningTimer | null, wide = false) =>
    timer ? (
      <div
        role="status"
        className={`flex flex-wrap items-center justify-center gap-3 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800 dark:border-warning-900 dark:bg-warning-950/40 dark:text-warning-200 ${wide ? "" : "mx-auto max-w-xl"}`}
      >
        <Timer size={16} className="shrink-0" />
        <span>
          Идёт таймер задачи <strong className="font-semibold">{timer.task_title}</strong> — завершите
          его, чтобы начать фокус.
        </span>
        <button onClick={stopTimer} disabled={busy} className="btn-secondary px-3 py-1.5 text-xs">
          <Square size={13} /> Остановить таймер
        </button>
      </div>
    ) : null;
  const alertBlock = (error || state.isError || settings.isError) && (
    <div
      role="alert"
      className="flex items-start justify-between gap-4 rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700 dark:border-danger-900 dark:bg-danger-950/40 dark:text-danger-300"
    >
      <span className="whitespace-pre-wrap">
        {error || focusError(state.error || settings.error)}
      </span>
      <button onClick={() => run(refresh)} className="shrink-0 font-semibold underline">
        Повторить
      </button>
    </div>
  );
  const tools = (
    <div className="flex items-center gap-2">
      <button
        className="btn-secondary h-10 w-10 !p-0"
        title={soundOn ? "Выключить звук" : "Включить звук"}
        onClick={toggleSound}
      >
        {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
      <button className="btn-secondary h-10 w-10 !p-0" title="Настройки фокуса" onClick={settingsButton}>
        <Settings2 size={18} />
      </button>
      <button
        className="btn-secondary h-10 w-10 !p-0"
        title={zen ? "Выйти из полноэкранного режима" : "Полноэкранный режим"}
        onClick={toggleZen}
      >
        {zen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
      </button>
    </div>
  );
  const phasePills = (
    <div className="flex flex-wrap justify-center gap-2">
      {(Object.keys(phaseLabels) as Phase[]).map((p) => (
        <button
          key={p}
          disabled={!!active}
          onClick={() => setPhase(p)}
          className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
            displayPhase === p
              ? "border-transparent text-white shadow-sm"
              : "border-surface-300 text-surface-500 hover:border-surface-400 hover:text-surface-700 dark:border-surface-600 dark:text-surface-400 dark:hover:text-surface-200"
          }`}
          style={displayPhase === p ? { backgroundColor: PHASE_TONE[p].stroke } : undefined}
        >
          {phaseLabels[p]}
        </button>
      ))}
    </div>
  );
  const cyclesBlock = (compact = false) => (
    <div className="flex items-center justify-center gap-1.5" aria-label="Прогресс дневной цели">
      {Array.from({ length: profile?.daily_goal ?? 4 }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${compact ? "w-4" : "w-6"} ${
            i < (summary?.today_sessions ?? 0)
              ? ""
              : "bg-surface-200 dark:bg-surface-700"
          }`}
          style={
            i < (summary?.today_sessions ?? 0) ? { backgroundColor: tone.stroke } : undefined
          }
        />
      ))}
    </div>
  );
  const clockBlock = (mode: "page" | "zen") => {
    const ring = profile?.timer_style === "ring";
    const flip = profile?.timer_style === "flip";
    return (
      <div
        className={`relative flex flex-col items-center justify-center ${
          mode === "zen" ? "gap-10" : "gap-8"
        }`}
      >
        {ring && (
          <svg
            viewBox="0 0 300 300"
            aria-hidden="true"
            className={`absolute -rotate-90 ${
              mode === "zen"
                ? "h-[min(64vmin,460px)] w-[min(64vmin,460px)]"
                : "h-60 w-60 sm:h-72 sm:w-72"
            }`}
          >
            <circle
              cx="150"
              cy="150"
              r="138"
              fill="none"
              strokeWidth="6"
              className="stroke-surface-200 dark:stroke-surface-700"
            />
            <circle
              cx="150"
              cy="150"
              r="138"
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              stroke={tone.stroke}
              strokeDasharray={867}
              strokeDashoffset={867 * (1 - percent)}
            />
          </svg>
        )}
        <span
          role="timer"
          aria-label="Оставшееся время"
          className={`font-semibold leading-none tracking-tight tabular-nums ${tone.text} ${
            mode === "zen"
              ? ring
                ? "text-[clamp(4rem,14vmin,8rem)]"
                : "text-[clamp(4.5rem,19vmin,15rem)]"
              : ring
                ? "text-5xl sm:text-6xl"
                : "text-7xl sm:text-8xl"
          } ${flip ? "rounded-3xl border border-surface-200 bg-surface-50 px-6 py-5 shadow-sm dark:border-surface-700 dark:bg-surface-800" : ""}`}
        >
          {timeLabel(seconds)}
        </span>
        <small className="text-xs text-surface-500 dark:text-surface-400">
          {active?.status === "paused"
            ? "Можно передохнуть"
            : displayPhase === "work"
              ? "Всё важное начинается с одного шага"
              : "Время восстановить силы"}
        </small>
      </div>
    );
  };
  const controlsBlock = (
    <div className="flex items-center justify-center gap-3">
      {!active ? (
        <button
          className="btn-primary rounded-full px-8 py-3 text-base"
          disabled={busy || !profile || state.isLoading || state.isError}
          onClick={() => run(() => start())}
        >
          <Play size={19} /> Начать фокус
        </button>
      ) : (
        <>
          <button
            className="btn-primary rounded-full px-8 py-3 text-base"
            disabled={busy}
            onClick={() =>
              run(() =>
                focusApi.action(active.id, active.status === "paused" ? "resume" : "pause")
              )
            }
          >
            {active.status === "paused" ? <Play size={19} /> : <Pause size={19} />}{" "}
            {active.status === "paused" ? "Продолжить" : "Пауза"}
          </button>
          <button
            className="btn-secondary h-12 w-12 rounded-full !p-0"
            title="Завершить сессию"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const finished = await focusApi.action(active.id, "finish");
                if (active.phase === "work") {
                  setResultSession(finished);
                  setResult(finished.result);
                }
              })
            }
          >
            <Check size={20} />
          </button>
          <button
            className="btn-secondary h-12 w-12 rounded-full !p-0"
            title="Остановить сессию"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Остановить сессию? Отработанное время сохранится."))
                {void run(() => focusApi.action(active.id, "cancel"));}
            }}
          >
            <Square size={18} />
          </button>
        </>
      )}
      {!active && (
        <button
          className="btn-secondary h-12 w-12 rounded-full !p-0"
          title="Настроить длительность"
          onClick={settingsButton}
        >
          <RotateCcw size={18} />
        </button>
      )}
    </div>
  );
  const intentionBlock = (
    <div className="w-full max-w-xl space-y-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
        Одна сессия. Одна цель.
      </span>
      <input
        aria-label="Цель фокус-сессии"
        placeholder="Над чем вы хотите сфокусироваться?"
        value={goal}
        maxLength={300}
        disabled={!!active}
        onChange={(e) => setGoal(e.target.value)}
        className="w-full border-0 bg-transparent text-center text-2xl font-semibold tracking-tight text-surface-900 placeholder:text-surface-400 focus:outline-none disabled:opacity-60 dark:text-surface-50"
      />
      <select
        aria-label="Задача для фокуса"
        value={task}
        disabled={!!active}
        onChange={(e) => setTask(e.target.value)}
        className="input mx-auto max-w-sm text-sm"
      >
        <option value="">Личная сессия без задачи</option>
        {tasks.data?.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))}
      </select>
    </div>
  );
  const sideCard = (
    <aside className="card overflow-hidden p-0">
      <div className="flex border-b border-surface-200 dark:border-surface-700">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-3 py-3 text-xs font-semibold transition-colors ${
              tab === id
                ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                : "border-transparent text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>
      <div className="p-4">
        {tab === "tasks" && (
          <div className="space-y-1.5">
            <p className="mb-2 text-[11px] text-surface-400 dark:text-surface-500">
              Выберите задачу на следующую сессию
            </p>
            {tasks.isError && <p className="text-sm text-danger-600">Не удалось загрузить задачи.</p>}
            {tasks.data?.length === 0 && (
              <p className="text-[11px] text-surface-400 dark:text-surface-500">
                Назначенных задач пока нет. Можно начать личную сессию.
              </p>
            )}
            {tasks.data?.map((t) => (
              <button
                key={t.id}
                disabled={!!active}
                onClick={() => setTask(t.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors disabled:opacity-50 ${
                  task === t.id
                    ? "bg-brand-50 dark:bg-brand-950/40"
                    : "hover:bg-surface-50 dark:hover:bg-surface-700/40"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                    task === t.id
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-surface-300 dark:border-surface-600"
                  }`}
                >
                  {task === t.id && <Check size={13} />}
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  {t.title}
                  <small className="block text-[11px] text-surface-400">{t.status_name}</small>
                </span>
                <Play size={14} className="text-surface-400" />
              </button>
            ))}
          </div>
        )}
        {tab === "notes" && (
          <div className="space-y-3">
            <textarea
              aria-label="Быстрая заметка"
              placeholder="Запишите идею, чтобы вернуться к ней позже…"
              maxLength={10000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input min-h-[90px] text-sm"
            />
            <button
              className="btn-primary w-full py-2 text-xs"
              disabled={busy || !note.trim()}
              onClick={() =>
                run(async () => {
                  await focusApi.addNote(note.trim(), active?.task || task || null);
                  setNote("");
                })
              }
            >
              <Plus size={16} /> Сохранить заметку
            </button>
            {notes.data?.results.map((n) => (
              <article key={n.id} className="border-t border-surface-100 pt-3 dark:border-surface-700">
                <p className="whitespace-pre-wrap break-words text-sm">{n.content}</p>
                <div className="mt-1 flex items-center justify-between">
                  <small className="text-[11px] text-surface-400">
                    {new Date(n.updated_at).toLocaleDateString("ru")}
                  </small>
                  <span className="flex gap-1">
                    <button
                      title="Редактировать заметку"
                      onClick={() => {
                        const text = window.prompt("Заметка", n.content);
                        if (text !== null) {void run(() => focusApi.editNote(n.id, text));}
                      }}
                      className="rounded-md px-2 py-1 text-[11px] text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-700 dark:hover:text-surface-200"
                    >
                      Изменить
                    </button>
                    <button
                      title="Удалить заметку"
                      onClick={() => {
                        if (window.confirm("Удалить заметку?"))
                          {void run(() => focusApi.deleteNote(n.id));}
                      }}
                      className="rounded-md px-2 py-1 text-surface-500 transition-colors hover:bg-surface-100 hover:text-danger-600 dark:hover:bg-surface-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
        {tab === "stats" && (
          <div className="space-y-4">
            <div className="flex h-32 items-end justify-around gap-2 border-b border-surface-100 pb-2 dark:border-surface-700">
              {summary?.daily.slice(-7).map((d) => (
                <div
                  key={d.date}
                  title={`${d.date}: ${Math.round(d.seconds / 60)} мин`}
                  className="flex flex-col items-center gap-2"
                >
                  <span
                    className="w-5 rounded-t-md bg-brand-500/80"
                    style={{
                      height: `${Math.max(4, Math.min(95, (d.seconds / Math.max(...summary.daily.slice(-7).map((x) => x.seconds), 1)) * 95))}px`,
                    }}
                  />
                  <small className="text-[10px] text-surface-400">
                    {new Date(`${d.date}T12:00:00`).toLocaleDateString("ru", { weekday: "short" })}
                  </small>
                </div>
              ))}
            </div>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              {summary?.total_sessions ?? 0} завершённых сессий ·{" "}
              {Math.round((summary?.total_seconds ?? 0) / 60)} минут
            </p>
            <div className="flex flex-wrap gap-2">
              {summary?.achievements.map((a) => (
                <span
                  key={a.id}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                    a.unlocked
                      ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-300"
                      : "border-surface-200 text-surface-400 dark:border-surface-700 dark:text-surface-500"
                  }`}
                >
                  {a.unlocked ? "✦" : "○"} {a.title}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
  const summaryCards = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {([
        [Timer, `${Math.round((summary?.today_seconds ?? 0) / 60)} мин`, "Фокус сегодня"],
        [Target, `${summary?.today_sessions ?? 0} / ${profile?.daily_goal ?? 4}`, "Дневная цель"],
        [Flame, `${summary?.streak ?? 0} дней`, "Ваша серия"],
      ] as [typeof Timer, string, string][]).map(([Icon, value, label]) => (
        <div key={label} className="stat-card">
          <div className="flex items-center gap-2 text-surface-500 dark:text-surface-400">
            <Icon size={16} className="text-brand-500" />
            <span className="text-xs">{label}</span>
          </div>
          <strong className="mt-2 block text-2xl font-semibold tracking-tight">{value}</strong>
        </div>
      ))}
    </div>
  );
  const historyCard = (
    <section className="card">
      <h2 className="mb-4 text-base font-semibold">История сессий</h2>
      {history.data?.results.length === 0 && (
        <p className="text-sm text-surface-500 dark:text-surface-400">
          История появится после первой сессии.
        </p>
      )}
      <div className="divide-y divide-surface-100 dark:divide-surface-700">
        {history.data?.results.map((s) => (
          <article key={s.id} className="flex flex-wrap items-center gap-4 py-3">
            <div className="min-w-0 flex-1">
              <strong className="text-sm font-semibold">
                {s.task_title || s.goal || phaseLabels[s.phase]}
              </strong>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-surface-500 dark:text-surface-400">
                {s.result || phaseLabels[s.phase]}
              </p>
            </div>
            <span className="text-sm tabular-nums">{timeLabel(s.elapsed_seconds)}</span>
            <small className="text-xs text-surface-400">
              {s.status === "completed"
                ? "Завершена"
                : s.status === "cancelled"
                  ? "Остановлена"
                  : s.status === "paused"
                    ? "Пауза"
                    : "Идёт"}{" "}
              · {new Date(s.started_at).toLocaleDateString("ru")}
            </small>
            {s.phase === "work" && ["completed", "cancelled"].includes(s.status) && (
              <button
                onClick={() => {
                  setResultSession(s);
                  setResult(s.result);
                }}
                className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
              >
                Результат
              </button>
            )}
          </article>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-6 text-xs">
        <button
          className="btn-secondary px-3 py-1.5 text-xs"
          disabled={historyPage === 1}
          onClick={() => setHistoryPage((p) => p - 1)}
        >
          Назад
        </button>
        <span>{historyPage}</span>
        <button
          className="btn-secondary px-3 py-1.5 text-xs"
          disabled={!history.data?.next}
          onClick={() => setHistoryPage((p) => p + 1)}
        >
          Далее
        </button>
      </div>
    </section>
  );
  return (
    <div
      ref={root}
      className={
        zen
          ? "fixed inset-0 z-[70] overflow-auto bg-surface-50 dark:bg-surface-950"
          : "space-y-6"
      }
    >
      {zen ? (
        <>
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div
              className={`focus-breathe absolute left-1/2 top-1/2 h-[46vmin] w-[46vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${tone.orb}`}
            />
          </div>
          <header className="relative z-10 flex items-center justify-between p-5">
            <span className="flex items-center gap-2 text-sm font-semibold text-surface-500 dark:text-surface-400">
              <FocusLogo className="h-5 w-auto" />
            </span>
            {tools}
          </header>
          {alertBlock && <div className="relative z-10 px-5">{alertBlock}</div>}
          {runningTimer && (
            <div className="relative z-10 px-5 pt-4">
              {timerBanner(runningTimer, true)}
            </div>
          )}
          <main className="relative z-10 flex flex-1 min-h-[60vh] flex-col items-center justify-center gap-9 px-6 py-8 text-center">
            <p className="max-w-xl text-sm text-surface-500 dark:text-surface-400">
              {active?.task_title || goal || "Личная сессия без задачи"}
            </p>
            {phasePills}
            {cyclesBlock(true)}
            {clockBlock("zen")}
            {controlsBlock}
          </main>
          <footer className="relative z-10 flex items-center justify-center gap-3 pb-8 text-xs text-surface-500 dark:text-surface-400">
            <span>{Math.round((summary?.today_seconds ?? 0) / 60)} мин сегодня</span>
            <span aria-hidden="true">·</span>
            <span>серия {summary?.streak ?? 0} дн.</span>
          </footer>
        </>
      ) : (
        <>
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                <FocusLogo />
              </h1>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                Ваше пространство концентрации
              </p>
            </div>
            {tools}
          </header>
          {alertBlock}
          {timerBanner(runningTimer)}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="card flex flex-col items-center gap-7 text-center">
              {intentionBlock}
              {phasePills}
              {cyclesBlock()}
              {clockBlock("page")}
              {controlsBlock}
              <p className="text-xs text-surface-400 dark:text-surface-500">
                {active?.task_title || "Выберите задачу, сделайте шаг, отметьте результат."}
              </p>
            </section>
            {sideCard}
          </div>
          {summaryCards}
          {historyCard}
        </>
      )}
      {settingsOpen && draft && (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-surface-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Настройки фокуса"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await focusApi.updateSettings(draft);
                setSettingsOpen(false);
              });
            }}
            className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-surface-200 bg-white p-6 shadow-xl dark:border-surface-700 dark:bg-surface-800"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Ваш ритм работы</h2>
              <button
                type="button"
                className="btn-secondary h-8 w-8 !p-0"
                onClick={() => setSettingsOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {([
                ["work_minutes", "Фокус, мин", 180],
                ["short_break_minutes", "Короткий перерыв, мин", 60],
                ["long_break_minutes", "Длинный перерыв, мин", 120],
                ["cycles", "Сессий до длинного перерыва", 12],
                ["daily_goal", "Дневная цель", 24],
              ] as [keyof FocusSettings, string, number][]).map(([key, label, max]) => (
                <label key={String(key)} className="text-xs font-medium text-surface-500 dark:text-surface-400">
                  {label}
                  <input
                    type="number"
                    min={key === "cycles" ? 2 : 1}
                    max={max}
                    required
                    className="input mt-1"
                    value={draft[key] as number}
                    onChange={(e) => setDraft({ ...draft, [String(key)]: Number(e.target.value) })}
                  />
                </label>
              ))}
              <label className="text-xs font-medium text-surface-500 dark:text-surface-400">
                Вид таймера
                <select
                  className="input mt-1"
                  value={draft.timer_style ?? "digital"}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      timer_style: e.target.value as FocusSettings["timer_style"],
                    })
                  }
                >
                  <option value="digital">Цифровой</option>
                  <option value="ring">Круговой</option>
                  <option value="flip">Карточки</option>
                </select>
              </label>
              <label className="text-xs font-medium text-surface-500 dark:text-surface-400">
                Звук
                <select
                  className="input mt-1"
                  value={draft.sound}
                  onChange={(e) => setDraft({ ...draft, sound: e.target.value })}
                >
                  {[
                    ["none", "Без звука"],
                    ["rain", "Дождь"],
                    ["ocean", "Волны"],
                    ["forest", "Лес"],
                  ].map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
              <input
                type="checkbox"
                checked={draft.auto_advance ?? false}
                onChange={(e) => setDraft({ ...draft, auto_advance: e.target.checked })}
              />
              Автоматически начинать следующую фазу
            </label>
            {error && (
              <p role="alert" className="mt-3 text-sm text-danger-600 dark:text-danger-400">
                {error}
              </p>
            )}
            <div className="mt-5 flex items-center justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setSettingsOpen(false)}>
                Отмена
              </button>
              <button className="btn-primary" disabled={busy} type="submit">
                Сохранить
              </button>
            </div>
          </form>
        </div>
      )}
      {resultSession && (
        <div
          className="fixed inset-0 z-[90] grid place-items-center bg-surface-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Результат сессии"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await focusApi.action(resultSession.id, "result", { result });
                setResultSession(null);
              });
            }}
            className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl border border-surface-200 bg-white p-6 shadow-xl dark:border-surface-700 dark:bg-surface-800"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
              Ещё один шаг сделан
            </span>
            <h2 className="mt-1 text-xl font-semibold">Что получилось?</h2>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
              {resultSession.task_title || resultSession.goal}
            </p>
            <textarea
              aria-label="Результат работы"
              value={result}
              maxLength={10000}
              onChange={(e) => setResult(e.target.value)}
              placeholder="Результат, следующий шаг или вопрос команде…"
              className="input mt-4 min-h-[110px] text-sm"
            />
            {error && (
              <p role="alert" className="mt-3 text-sm text-danger-600 dark:text-danger-400">
                {error}
              </p>
            )}
            <div className="mt-5 flex items-center justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setResultSession(null)}>
                Позже
              </button>
              <button className="btn-primary" type="submit" disabled={busy}>
                Сохранить результат
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
