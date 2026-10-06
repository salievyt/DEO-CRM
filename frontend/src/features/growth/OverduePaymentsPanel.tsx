"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api/base";
type Row={id:number;currency:string;project_name:string;title:string;amount:string;remaining:string;due_date:string;status:string};
export function OverduePaymentsPanel(){const q=useQuery({queryKey:["payment-plan","overdue"],queryFn:async()=> (await api.get<{results:Row[]}>("/finance/payment-plan/",{params:{overdue:true,page_size:8}})).data.results});if(q.isError)return null;if(q.isLoading||!q.data?.length)return null;return <section className="card space-y-2"><h2 className="text-lg font-semibold">Просроченные этапы оплат</h2>{q.data.map(r=><Link className="flex flex-wrap justify-between gap-2 border-t border-surface-200 py-3" key={r.id} href="/finance"><span>{r.project_name} · {r.title} · срок {r.due_date}</span><strong>{`${Number(r.remaining).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ${r.currency}`}</strong></Link>)}</section>}
