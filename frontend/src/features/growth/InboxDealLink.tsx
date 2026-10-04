"use client";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/api/base";
export function InboxDealLink({ id }: { id: string }) {
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ["conversation-deal", id], queryFn: async () => (await api.get<{ deal: string | null; client: string; options: { id: string; title: string }[] }>(`/messaging/conversations/${id}/deal/`)).data });
  const save = useMutation({ mutationFn: (deal: string) => api.patch(`/messaging/conversations/${id}/deal/`, { deal: deal || null }), onSuccess: () => cache.invalidateQueries({ queryKey: ["conversation-deal", id] }) });
  if (!query.data) return query.isError ? <button onClick={() => query.refetch()}>Повторить загрузку связи со сделкой</button> : null;
  return <div className="flex flex-wrap items-center gap-3 rounded-xl border border-surface-200 p-3 dark:border-surface-700"><Link href={`/clients/${query.data.client}`} className="text-brand-600">Клиент 360° →</Link><label>Сделка <select aria-label="Связанная сделка" className="input" disabled={save.isPending} value={query.data.deal || ""} onChange={e => save.mutate(e.target.value)}><option value="">Не определена</option>{query.data.options.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}</select></label>{save.isError && <span role="alert">Не удалось изменить связь</span>}</div>;
}
