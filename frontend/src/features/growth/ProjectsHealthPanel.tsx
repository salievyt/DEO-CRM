"use client";
import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {api} from "@/shared/api/base";
type Row={id:string;name:string;health:{score:number;level:"healthy"|"attention"|"critical";label:string;risks:{key:string;label:string;points:number}[]}};
export function ProjectsHealthPanel(){const q=useQuery({queryKey:["project-health-list"],queryFn:async()=> (await api.get<Row[]>("/projects/health/")).data});if(q.isLoading)return <p>Проверяем состояние проектов…</p>;if(!q.data)return <section className="card">Не удалось загрузить риски проектов. <button onClick={()=>q.refetch()}>Повторить</button></section>;const order={critical:0,attention:1,healthy:2};const rows=[...q.data].sort((a,b)=>order[a.health.level]-order[b.health.level]);return <section className="card space-y-3"><h2 className="text-lg font-semibold">Здоровье проектов</h2>{rows.map(r=><Link className="flex flex-wrap justify-between gap-3 border-t border-surface-200 py-3" key={r.id} href={`/projects/${r.id}`}><span>{r.name}</span><span>{r.health.label} · {r.health.score}/100 {r.health.risks[0]?.label||""}</span></Link>)}</section>}
