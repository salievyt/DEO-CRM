"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api/base";
type Control = { currency: string; revenue: string; expenses: string; salaries: string; partner_payouts: string; profit: string; receivables: string; projects: { id: string; name: string; revenue: string; expenses: string; profit: string; margin: string | null }[] };
export function FinancialControl() {
  const q = useQuery({ queryKey: ["financial-control"], queryFn: async () => (await api.get<Control>("/finance/control/")).data });
  if (q.isLoading) return <p>Загружаем финансовый контроль…</p>;
  if (!q.data) return <section className="card"><p>Финансовый контроль доступен владельцу. Данные не загружены.</p><button onClick={() => q.refetch()}>Повторить</button></section>;
  const d = q.data;
  const money = (value: string) => `${Number(value).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ${d.currency}`;
  return <section className="card space-y-4"><h2 className="text-lg font-semibold">Финансовый контроль</h2><p className="text-sm text-surface-500">Фактические поступления и выплаты за всё время. Прибыль проектов учитывает прямые расходы; зарплаты и партнёрские выплаты вычитаются на уровне компании.</p><dl className="grid gap-4 sm:grid-cols-3">{Object.entries({ "Поступления": d.revenue, "Расходы": d.expenses, "Зарплаты": d.salaries, "Партнёрские выплаты": d.partner_payouts, "Денежная прибыль": d.profit, "Дебиторская задолженность": d.receivables }).map(([label, value]) => <div key={label}><dt className="text-sm text-surface-500">{label}</dt><dd className="text-xl font-semibold">{money(value)}</dd></div>)}</dl>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="py-3 text-left font-semibold">Прибыльность проектов</caption><thead><tr>{["Проект", "Поступления", "Расходы", "Прибыль", "Маржа"].map(t => <th className="p-2" key={t}>{t}</th>)}</tr></thead><tbody>{d.projects.map(p => <tr key={p.id} className="border-t border-surface-200"><td className="p-2"><Link href={`/projects/${p.id}`}>{p.name}</Link></td><td className="p-2">{money(p.revenue)}</td><td className="p-2">{money(p.expenses)}</td><td className="p-2">{money(p.profit)}</td><td className="p-2">{p.margin === null ? "—" : `${p.margin}%`}</td></tr>)}</tbody></table></div>
  </section>;
}
