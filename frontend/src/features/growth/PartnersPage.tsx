"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Power, Trash2 } from "lucide-react";
import { api } from "@/shared/api/base";

type Partner = {
  id: string;
  name: string;
  code: string;
  commission_rate: string;
  active: boolean;
  totals: {
    leads: number;
    won: number;
    conversion: number;
    revenue: string;
    earned: string;
    paid: string;
    payable: string;
  };
};
type Referral = {
  id: number;
  lead: string;
  contact_name: string;
  project: string | null;
  deal: { id: string; title: string } | null;
  commission_rate: string;
};
const money = (n: string) => Number(n).toLocaleString("ru-RU", { maximumFractionDigits: 2 });
export function PartnersPage() {
  const cache = useQueryClient();
  const [selected, setSelected] = useState<string>("");
  const [error, setError] = useState("");
  const partners = useQuery({
    queryKey: ["partners"],
    queryFn: async () =>
      (await api.get<{ results: Partner[] }>("/partners/", { params: { page_size: 100 } })).data
        .results,
  });
  const referrals = useQuery({
    queryKey: ["partner-referrals", selected],
    queryFn: async () =>
      (await api.get<{ results: Referral[] }>(`/partners/${selected}/referrals/`)).data.results,
    enabled: !!selected,
  });
  const leads = useQuery({
    queryKey: ["partner-leads"],
    queryFn: async () =>
      (
        await api.get<{ results: { id: string; contact_name: string }[] }>("/leads/", {
          params: { page_size: 100 },
        })
      ).data.results,
  });
  const payouts = useQuery({
    queryKey: ["partner-payouts", selected],
    queryFn: async () =>
      (
        await api.get<{
          results: { id: number; amount: string; reference: string; paid_at: string }[];
        }>(`/partners/${selected}/payouts/`)
      ).data.results,
    enabled: !!selected,
  });
  const save = useMutation({
    mutationFn: ({ path, data }: { path: string; data: object }) => api.post(path, data),
    onSuccess: () => {
      setError("");
      for (const key of ["partners", "partner-referrals", "partner-payouts"])
        cache.invalidateQueries({ queryKey: [key] });
    },
    onError: () => setError("Не удалось сохранить: проверьте сумму, уникальность записи и доступ."),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/partners/${id}/`),
    onSuccess: (_response, id) => {
      setError("");
      setSelected((current) => (current === id ? "" : current));
      for (const key of ["partners", "partner-referrals", "partner-payouts"]) {
        cache.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (error) => {
      const detail = (error as { response?: { data?: { detail?: string } } }).response?.data
        ?.detail;
      setError(detail || "Не удалось удалить партнёра.");
    },
  });
  const setActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/partners/${id}/`, { active }),
    onSuccess: () => {
      setError("");
      cache.invalidateQueries({ queryKey: ["partners"] });
    },
    onError: () => setError("Не удалось изменить статус партнёра."),
  });
  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Партнёры</h1>
      <p className="text-surface-500">
        Комиссия начисляется по фактическим оплатам сделок. Ставка фиксируется при передаче лида.
        Выплата здесь — учёт уже проведённого перевода.
      </p>
      {(partners.isError || error) && (
        <p role="alert">
          {error || "Партнёрский модуль доступен владельцу. Не удалось загрузить данные."}
        </p>
      )}
      {partners.isLoading && <p>Загрузка…</p>}
      <form
        className="card flex flex-wrap gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          save.mutate({
            path: "/partners/",
            data: { name: f.get("name"), email: f.get("email"), commission_rate: f.get("rate") },
          });
        }}
      >
        <label>
          Партнёр
          <input className="input" name="name" required maxLength={255} />
        </label>
        <label>
          Email
          <input className="input" name="email" type="email" />
        </label>
        <label>
          Комиссия, %
          <input
            className="input w-28"
            name="rate"
            type="number"
            min="0"
            max="100"
            step=".01"
            defaultValue="10"
            required
          />
        </label>
        <button className="btn-primary" disabled={save.isPending}>
          Добавить
        </button>
      </form>
      <div className="grid gap-4 lg:grid-cols-2">
        {partners.data
          ?.slice()
          .sort((a, b) => Number(b.totals.revenue) - Number(a.totals.revenue))
          .map((p) => {
            const hasHistory = p.totals.leads > 0 || Number(p.totals.paid) > 0;
            return (
              <section
                className={`card space-y-3 ${selected === p.id ? "ring-2 ring-brand-500" : ""}`}
                key={p.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <button
                      className="text-left text-lg font-semibold text-surface-900 hover:text-brand-600 dark:text-white"
                      onClick={() => setSelected(p.id)}
                    >
                      {p.name} →
                    </button>
                    {!p.active && (
                      <p className="mt-1 text-xs font-medium text-surface-500">Партнёр отключён</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition disabled:opacity-50 ${hasHistory ? "text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700" : "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"}`}
                    disabled={remove.isPending || setActive.isPending}
                    onClick={() => {
                      if (hasHistory) {
                        setActive.mutate({ id: p.id, active: !p.active });
                        return;
                      }
                      if (
                        window.confirm(
                          `Удалить партнёра «${p.name}»? Это действие нельзя отменить.`
                        )
                      ) {
                        setError("");
                        remove.mutate(p.id);
                      }
                    }}
                    aria-label={
                      hasHistory
                        ? `${p.active ? "Отключить" : "Включить"} партнёра ${p.name}`
                        : `Удалить партнёра ${p.name}`
                    }
                  >
                    {hasHistory ? <Power className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                    {hasHistory ? (p.active ? "Отключить" : "Включить") : "Удалить"}
                  </button>
                </div>
                <dl className="grid grid-cols-3 gap-3 text-sm">
                  {Object.entries({
                    Лиды: p.totals.leads,
                    "Сделки выиграны": p.totals.won,
                    Конверсия: `${p.totals.conversion}%`,
                    Поступления: money(p.totals.revenue),
                    Комиссия: money(p.totals.earned),
                    "К выплате": money(p.totals.payable),
                  }).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-surface-500">{k}</dt>
                      <dd className="font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="break-all text-sm">
                  Реферальная ссылка:{" "}
                  <a className="text-brand-600" href={`/ref/${p.code}`}>
                    {typeof window === "undefined" ? "" : window.location.origin}/ref/{p.code}
                  </a>
                </p>
              </section>
            );
          })}
      </div>
      {selected && (
        <section className="card space-y-4">
          <h2 className="text-lg font-semibold">Лиды, сделки и выплаты</h2>
          <form
            className="flex gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              save.mutate({
                path: `/partners/${selected}/referrals/`,
                data: { lead: f.get("lead") },
              });
            }}
          >
            <select className="input flex-1" name="lead" required>
              <option value="">Переданный лид</option>
              {leads.data?.map((l) => (
                <option value={l.id} key={l.id}>
                  {l.contact_name}
                </option>
              ))}
            </select>
            <button className="btn-secondary" disabled={save.isPending}>
              Связать
            </button>
          </form>
          {referrals.isError && <p role="alert">Не удалось загрузить лиды</p>}
          {referrals.data?.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap justify-between gap-3 border-b border-surface-200 py-3"
            >
              <Link href={`/leads/${r.lead}`}>{r.contact_name}</Link>
              <span>{r.deal?.title || "Без сделки"}</span>
              {r.project && <Link href={`/projects/${r.project}`}>Проект →</Link>}
              <span>{r.commission_rate}%</span>
            </div>
          ))}
          <form
            className="flex flex-wrap gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              save.mutate({
                path: `/partners/${selected}/payouts/`,
                data: { amount: f.get("amount"), reference: f.get("reference") },
              });
            }}
          >
            <label>
              Сумма выплаты
              <input className="input" name="amount" type="number" min=".01" step=".01" required />
            </label>
            <label>
              Номер перевода
              <input className="input" name="reference" required maxLength={120} />
            </label>
            <button className="btn-primary" disabled={save.isPending}>
              Учесть выплату
            </button>
          </form>
          {payouts.isError && <p role="alert">Не удалось загрузить выплаты</p>}
          {payouts.data?.map((p) => (
            <p key={p.id}>
              {new Date(p.paid_at).toLocaleDateString("ru-RU")} · {money(p.amount)} · {p.reference}
            </p>
          ))}
        </section>
      )}
    </main>
  );
}
