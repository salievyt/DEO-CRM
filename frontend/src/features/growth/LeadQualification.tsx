"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api/base";

type Qualification = { decision_maker: string; target_date: string | null; brief_completed: boolean; business_need: string; qualification: { score: number; factors: { key: string; label: string; weight: number; met: boolean }[] } };
export function LeadQualification({ id }: { id: string }) {
  const cache = useQueryClient();
  const [error, setError] = useState("");
  const query = useQuery({ queryKey: ["qualification", id], queryFn: async () => (await api.get<Qualification>(`/leads/${id}/`)).data });
  const save = useMutation({ mutationFn: (data: object) => api.patch(`/leads/${id}/`, data), onSuccess: () => { setError(""); cache.invalidateQueries({ queryKey: ["qualification", id] }); }, onError: () => setError("Не удалось сохранить квалификацию") });
  if (query.isLoading) return <p>Загружаем оценку лида…</p>;
  if (!query.data) return <button onClick={() => query.refetch()}>Повторить загрузку оценки</button>;
  const data = query.data;
  return <section className="card space-y-4"><div className="flex justify-between"><h2 className="text-lg font-semibold">Квалификация лида</h2><strong className="text-brand-600">{data.qualification.score}/100</strong></div>
    <p className="text-sm text-surface-500">Оценка полноты и активности. Каждый фактор виден команде.</p>
    <div className="flex flex-wrap gap-2">{data.qualification.factors.map(f => <span key={f.key} className={`rounded-lg px-3 py-2 text-sm ${f.met ? "bg-green-100 text-green-900" : "bg-surface-100 text-surface-600"}`}>{f.met ? "✓" : "○"} {f.label} · {f.weight}</span>)}</div>
    <form className="grid gap-3 sm:grid-cols-2" key={query.dataUpdatedAt} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); save.mutate({ decision_maker: f.get("decision_maker"), target_date: f.get("target_date") || null, brief_completed: f.has("brief_completed"), business_need: f.get("business_need") }); }}>
      <label>ЛПР<input className="input mt-1 w-full" name="decision_maker" defaultValue={data.decision_maker} maxLength={255} /></label>
      <label>Срок клиента<input className="input mt-1 w-full" name="target_date" type="date" defaultValue={data.target_date || ""} /></label>
      <label className="sm:col-span-2">Задача клиента<textarea className="input mt-1 w-full" name="business_need" defaultValue={data.business_need} /></label>
      <label><input type="checkbox" name="brief_completed" defaultChecked={data.brief_completed} /> Анкета заполнена</label>
      <button className="btn-primary" disabled={save.isPending}>Сохранить квалификацию</button>
      {error && <p role="alert">{error}</p>}
    </form>
  </section>;
}
