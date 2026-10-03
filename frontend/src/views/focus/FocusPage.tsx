"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  Pause,
  Square,
  Maximize2,
  Minimize2,
  Settings2,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Timer,
  Target,
  Flame,
  Coins,
  Check,
  StickyNote,
  BarChart3,
  RotateCcw,
} from "lucide-react";
import { api } from "@/shared/api/base";
import {
  focusApi,
  FocusSession,
  FocusSettings,
  Phase,
  remaining,
  timeLabel,
  phaseLabels,
  focusError,
} from "@/features/focus/api";
import "./focus.css";

export function FocusPage() {
  const client = useQueryClient();
  const root = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const previous = useRef<FocusSession | null>(null);

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
  const shop = useQuery({ queryKey: ["focus", "shop"], queryFn: focusApi.shop });
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
  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(focusError(e));
    } finally {
      setBusy(false);
    }
  }, [refresh]);
  const start = useCallback(async (nextPhase: Phase = phase) => {
    return focusApi.start({ phase: nextPhase, task: task || null, goal });
  }, [phase, task, goal]);
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
    if (active?.status === "running" && seconds === 0 && !state.isFetching) {void state.refetch();}
  }, [seconds, active?.status, state]);
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
  return (
    <div
      ref={root}
      className={`deo-focus theme-${profile?.theme ?? "midnight"} ${zen ? "focus-zen" : ""}`}
    >
      <header className="focus-header">
        <div className="focus-brand">
          <span className="focus-logo">✦</span>
          <div>
            <strong>
              DEO <span>Focus</span>
            </strong>
            <small>Ваше пространство концентрации</small>
          </div>
        </div>
        <div className="focus-tools">
          <button title={soundOn ? "Выключить звук" : "Включить звук"} onClick={toggleSound}>
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button title="Настройки фокуса" onClick={settingsButton}>
            <Settings2 size={18} />
          </button>
          <button
            title={zen ? "Выйти из режима концентрации" : "Режим концентрации"}
            onClick={() => setZen(!zen)}
          >
            {zen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </header>
      {(error || state.isError || settings.isError) && (
        <div role="alert" className="focus-error">
          {error || focusError(state.error || settings.error)}{" "}
          <button onClick={() => run(refresh)}>Повторить</button>
        </div>
      )}
      <div className="focus-layout">
        <section className="focus-main">
          <div className="focus-intention">
            <span className="focus-eyebrow">ОДНА СЕССИЯ. ОДНА ЦЕЛЬ.</span>
            <input
              aria-label="Цель фокус-сессии"
              placeholder="Над чем вы хотите сфокусироваться?"
              value={goal}
              maxLength={300}
              disabled={!!active}
              onChange={(e) => setGoal(e.target.value)}
            />
            <select
              aria-label="Задача для фокуса"
              value={task}
              disabled={!!active}
              onChange={(e) => setTask(e.target.value)}
            >
              <option value="">Личная сессия без задачи</option>
              {tasks.data?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
          <div className="focus-phases">
            {(Object.keys(phaseLabels) as Phase[]).map((p) => (
              <button
                key={p}
                disabled={!!active}
                onClick={() => setPhase(p)}
                className={displayPhase === p ? "selected" : ""}
              >
                {phaseLabels[p]}
              </button>
            ))}
          </div>
          <div className="focus-cycles" aria-label="Прогресс дневной цели">
            {Array.from({ length: profile?.daily_goal ?? 4 }, (_, i) => (
              <span key={i} className={i < (summary?.today_sessions ?? 0) ? "done" : ""} />
            ))}
          </div>
          <div className={`focus-clock ${profile?.timer_style ?? "digital"}`}>
            {profile?.timer_style === "ring" && (
              <svg viewBox="0 0 300 300" aria-hidden="true">
                <circle cx="150" cy="150" r="138" className="clock-track" />
                <circle
                  cx="150"
                  cy="150"
                  r="138"
                  className="clock-progress"
                  strokeDasharray={867}
                  strokeDashoffset={867 * (1 - percent)}
                />
              </svg>
            )}
            <span role="timer" aria-label="Оставшееся время">
              {timeLabel(seconds)}
            </span>
            <small>
              {active?.status === "paused"
                ? "Можно передохнуть"
                : displayPhase === "work"
                  ? "Всё важное начинается с одного шага"
                  : "Время восстановить силы"}
            </small>
          </div>
          <div className="focus-controls">
            {!active ? (
              <button
                className="focus-primary"
                disabled={busy || !profile || state.isLoading || state.isError}
                onClick={() => run(() => start())}
              >
                <Play size={19} /> Начать фокус
              </button>
            ) : (
              <>
                <button
                  className="focus-primary"
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
              <button title="Настроить длительность" onClick={settingsButton}>
                <RotateCcw size={18} />
              </button>
            )}
          </div>
          <p className="focus-caption">
            {active?.task_title || "Выберите задачу, сделайте шаг, отметьте результат."}
          </p>
        </section>
        <aside className="focus-side">
          <div className="focus-pet">
            <div className="pet-orbit">
              <span>{profile?.pet === "fox" ? "🦊" : profile?.pet === "cat" ? "🐱" : "🐝"}</span>
              {profile?.inventory.map((item) => (
                <i key={item}>{shop.data?.find((x) => x.id === item)?.emoji}</i>
              ))}
            </div>
            <div>
              <strong>Ваш спутник</strong>
              <p>
                Уровень {summary?.level ?? 1} · {summary?.xp ?? 0} XP
              </p>
            </div>
            <span className="pet-coins">
              <Coins size={14} />
              {profile?.coins ?? 0}
            </span>
          </div>
          <div className="focus-card">
            <div className="focus-tabs">
              {[
                ["tasks", "Задачи", Target],
                ["notes", "Заметки", StickyNote],
                ["stats", "Прогресс", BarChart3],
              ].map(([id, label]) => (
                <button
                  key={String(id)}
                  className={tab === id ? "selected" : ""}
                  onClick={() => setTab(String(id))}
                >
                  {String(label)}
                </button>
              ))}
            </div>
            {tab === "tasks" && (
              <div className="focus-task-list">
                <p className="focus-muted">Выберите задачу на следующую сессию</p>
                {tasks.isError && <p>Не удалось загрузить задачи.</p>}
                {tasks.data?.length === 0 && (
                  <p className="focus-muted">
                    Назначенных задач пока нет. Можно начать личную сессию.
                  </p>
                )}
                {tasks.data?.map((t) => (
                  <button
                    className={task === t.id ? "chosen" : ""}
                    disabled={!!active}
                    key={t.id}
                    onClick={() => setTask(t.id)}
                  >
                    <span className="task-check">{task === t.id && <Check size={13} />}</span>
                    <span>
                      {t.title}
                      <small>{t.status_name}</small>
                    </span>
                    <Play size={14} />
                  </button>
                ))}
              </div>
            )}
            {tab === "notes" && (
              <div className="focus-notes">
                <textarea
                  aria-label="Быстрая заметка"
                  placeholder="Запишите идею, чтобы вернуться к ней позже…"
                  maxLength={10000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <button
                  className="focus-small-primary"
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
                  <article key={n.id}>
                    <p>{n.content}</p>
                    <small>{new Date(n.updated_at).toLocaleDateString("ru")}</small>
                    <button
                      title="Редактировать заметку"
                      onClick={() => {
                        const text = window.prompt("Заметка", n.content);
                        if (text !== null) {void run(() => focusApi.editNote(n.id, text));}
                      }}
                    >
                      Изменить
                    </button>
                    <button
                      title="Удалить заметку"
                      onClick={() => {
                        if (window.confirm("Удалить заметку?"))
                          {void run(() => focusApi.deleteNote(n.id));}
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </article>
                ))}
              </div>
            )}
            {tab === "stats" && (
              <div className="focus-progress">
                <div className="focus-week">
                  {summary?.daily.slice(-7).map((d) => (
                    <div key={d.date} title={`${d.date}: ${Math.round(d.seconds / 60)} мин`}>
                      <span
                        style={{
                          height: `${Math.max(4, Math.min(95, (d.seconds / Math.max(...summary.daily.slice(-7).map((x) => x.seconds), 1)) * 95))}px`,
                        }}
                      />
                      <small>
                        {new Date(`${d.date  }T12:00:00`).toLocaleDateString("ru", {
                          weekday: "short",
                        })}
                      </small>
                    </div>
                  ))}
                </div>
                <p>
                  {summary?.total_sessions ?? 0} завершённых сессий ·{" "}
                  {Math.round((summary?.total_seconds ?? 0) / 60)} минут
                </p>
                <div className="focus-achievements">
                  {summary?.achievements.map((a) => (
                    <span key={a.id} className={a.unlocked ? "unlocked" : ""}>
                      {a.unlocked ? "✦" : "○"} {a.title}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
      <div className="focus-summary">
        {[
          [Timer, `${Math.round((summary?.today_seconds ?? 0) / 60)} мин`, "Фокус сегодня"],
          [Target, `${summary?.today_sessions ?? 0} / ${profile?.daily_goal ?? 4}`, "Дневная цель"],
          [Flame, `${summary?.streak ?? 0} дней`, "Ваша серия"],
        ].map(([, value, label]) => (
          <div key={String(label)}>
            <span>{String(label)}</span>
            <strong>{String(value)}</strong>
          </div>
        ))}
      </div>
      <section className="focus-history">
        <h2>История сессий</h2>
        {history.data?.results.length === 0 && <p>История появится после первой сессии.</p>}
        {history.data?.results.map((s) => (
          <article key={s.id}>
            <div>
              <strong>{s.task_title || s.goal || phaseLabels[s.phase]}</strong>
              <p>{s.result || phaseLabels[s.phase]}</p>
            </div>
            <span>{timeLabel(s.elapsed_seconds)}</span>
            <small>
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
              >
                Результат
              </button>
            )}
          </article>
        ))}
        <div className="focus-pagination">
          <button disabled={historyPage === 1} onClick={() => setHistoryPage((p) => p - 1)}>
            Назад
          </button>
          <span>{historyPage}</span>
          <button disabled={!history.data?.next} onClick={() => setHistoryPage((p) => p + 1)}>
            Далее
          </button>
        </div>
      </section>
      <section className="focus-shop">
        <h2>Маленькие награды за большие шаги</h2>
        <p>За каждую завершённую минуту фокуса — одна монета.</p>
        <div>
          {shop.data?.map((item) => (
            <button
              key={item.id}
              disabled={
                busy || profile?.inventory.includes(item.id) || (profile?.coins ?? 0) < item.price
              }
              onClick={() => run(() => focusApi.buy(item.id))}
            >
              <span>{item.emoji}</span>
              <strong>{item.title}</strong>
              <small>
                {profile?.inventory.includes(item.id) ? "Уже у вас" : `${item.price} монет`}
              </small>
            </button>
          ))}
        </div>
      </section>
      {settingsOpen && draft && (
        <div className="focus-modal" role="dialog" aria-modal="true" aria-label="Настройки фокуса">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await focusApi.updateSettings(draft);
                setSettingsOpen(false);
              });
            }}
          >
            <h2>Ваш ритм работы</h2>
            <div className="settings-grid">
              {[
                ["work_minutes", "Фокус, мин", 180],
                ["short_break_minutes", "Короткий перерыв, мин", 60],
                ["long_break_minutes", "Длинный перерыв, мин", 120],
                ["cycles", "Сессий до длинного перерыва", 12],
                ["daily_goal", "Дневная цель", 24],
              ].map(([key, label, max]) => (
                <label key={String(key)}>
                  {String(label)}
                  <input
                    type="number"
                    min={key === "cycles" ? 2 : 1}
                    max={Number(max)}
                    required
                    value={draft[key as keyof FocusSettings] as number}
                    onChange={(e) => setDraft({ ...draft, [String(key)]: Number(e.target.value) })}
                  />
                </label>
              ))}
            </div>
            <label>
              Тема
              <select
                value={draft.theme}
                onChange={(e) => setDraft({ ...draft, theme: e.target.value })}
              >
                {[
                  ["midnight", "Полночь"],
                  ["lavender", "Лаванда"],
                  ["ocean", "Океан"],
                  ["forest", "Лес"],
                  ["sunset", "Закат"],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Вид таймера
              <select
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
            <label>
              Звук
              <select
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
            <label>
              Спутник
              <select
                value={draft.pet}
                onChange={(e) => setDraft({ ...draft, pet: e.target.value })}
              >
                <option value="bee">Пчёлка</option>
                <option value="fox">Лисёнок</option>
                <option value="cat">Котёнок</option>
              </select>
            </label>
            <label className="focus-checkbox">
              <input
                type="checkbox"
                checked={draft.auto_advance ?? false}
                onChange={(e) => setDraft({ ...draft, auto_advance: e.target.checked })}
              />{" "}
              Автоматически начинать следующую фазу
            </label>
            {error && <p role="alert">{error}</p>}
            <div className="modal-actions">
              <button type="button" onClick={() => setSettingsOpen(false)}>
                Отмена
              </button>
              <button className="focus-primary" disabled={busy} type="submit">
                Сохранить
              </button>
            </div>
          </form>
        </div>
      )}
      {resultSession && (
        <div className="focus-modal" role="dialog" aria-modal="true" aria-label="Результат сессии">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await focusApi.action(resultSession.id, "result", { result });
                setResultSession(null);
              });
            }}
          >
            <span className="focus-eyebrow">ЕЩЁ ОДИН ШАГ СДЕЛАН</span>
            <h2>Что получилось?</h2>
            <p>{resultSession.task_title || resultSession.goal}</p>
            <textarea
              aria-label="Результат работы"
              value={result}
              maxLength={10000}
              onChange={(e) => setResult(e.target.value)}
              placeholder="Результат, следующий шаг или вопрос команде…"
            />
            {error && <p role="alert">{error}</p>}
            <div className="modal-actions">
              <button type="button" onClick={() => setResultSession(null)}>
                Позже
              </button>
              <button className="focus-primary" type="submit" disabled={busy}>
                Сохранить результат
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
