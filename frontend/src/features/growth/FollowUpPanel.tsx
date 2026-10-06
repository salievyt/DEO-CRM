"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api/base";

type FollowUp = { id: string; client: string; client_name: string; reason_label: string; due_at: string };
export function FollowUpPanel() {
  const cache = useQueryClient();
  const [all, setAll] = useState(false);
  const [error, setError] = useState("");
  const event = useRef<string>();
  const query = useQuery({ queryKey: ["followups", all], queryFn: async () => (await api.get<{ results: FollowUp[] }>("/reminders/followups/", { params: { all, page_size: 100 } })).data });
  const clients = useQuery({ queryKey: ["followup-clients"], queryFn: async () => (await api.get<{ results: { id: string; full_name: string }[] }>("/reminders/followups/clients/")).data.results });
  const mutation = useMutation({ mutationFn: async ({ path, data, patch = false }: { path: string; data?: object; patch?: boolean }) => patch ? api.patch(path, data) : api.post(path, data), onSuccess: () => { setError(""); event.current = undefined; cache.invalidateQueries({ queryKey: ["followups"] }); }, onError: () => setError("Не удалось сохранить. Повторите попытку.") });
  return <section className="card space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">С кем связаться сегодня</h2><button className="btn-secondary" disabled={mutation.isPending} onClick={() => mutation.mutate({ path: "/reminders/followups/" })}>Проверить события</button></div>
    <label className="block text-sm"><input type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} /> Показать и будущие контакты</label>
    {(error || query.isError) && <p role="alert">{error || "Не удалось загрузить очередь"} <button onClick={() => query.refetch()}>Повторить</button></p>}
    {query.isLoading && <p>Загрузка…</p>}
    {query.data?.results.length === 0 && <p className="text-surface-500">На выбранный период контактов нет.</p>}
    {query.data?.results.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-200 p-4 dark:border-surface-700"><div><Link className="font-medium text-brand-600" href={`/clients/${row.client}`}>{row.client_name}</Link><p className="text-sm">{row.reason_label} · {new Date(row.due_at).toLocaleString("ru-RU")}</p></div><div className="flex gap-3"><button disabled={mutation.isPending} onClick={() => mutation.mutate({ path: `/reminders/followups/${row.id}/`, patch: true, data: { due_at: new Date(Date.now() + 86400000).toISOString() } })}>Завтра</button><button className="btn-primary" disabled={mutation.isPending} onClick={() => mutation.mutate({ path: `/reminders/followups/${row.id}/`, patch: true, data: { status: "completed" } })}>Связался</button></div></div>)}
    <form className="flex flex-wrap items-end gap-3 border-t border-surface-200 pt-4" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); event.current ||= crypto.randomUUID(); mutation.mutate({ path: "/reminders/followups/proposal/", data: { client: f.get("client"), event_id: event.current } }); }}><label className="flex-1">Отправили КП клиенту?<select className="input mt-1 w-full" name="client" required><option value="">Выберите клиента</option>{clients.data?.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}</select></label><button className="btn-secondary" disabled={mutation.isPending}>Напомнить через 3 дня</button></form>
    <p className="text-xs text-surface-500">Очередь обновляется автоматически каждые 15 минут при работающем планировщике.</p>
  </section>;
}
