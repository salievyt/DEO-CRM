"use client";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/shared/api/base";
export default function ReferralPage() {
  const { code } = useParams<{ code: string }>();
  const requestId = useRef<string>();
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  return <main className="mx-auto max-w-xl px-6 py-16"><h1 className="text-3xl font-bold">Обсудим ваш проект</h1><p className="my-4 text-surface-500">Оставьте заявку в DEO CORE по рекомендации партнёра.</p>{sent ? <p role="status" className="card">Спасибо! Заявка принята. Команда свяжется с вами.</p> : <form className="card space-y-4" onSubmit={async e => { e.preventDefault(); const f = new FormData(e.currentTarget); requestId.current ||= crypto.randomUUID(); setPending(true); setError(""); try { await api.post(`/partners/ref/${encodeURIComponent(code)}/`, { request_id: requestId.current, contact_name: f.get("name"), phone: f.get("phone"), email: f.get("email"), business_need: f.get("need"), consent: f.has("consent") }); setSent(true); } catch { setError("Заявка не отправлена. Проверьте данные и актуальность ссылки, затем повторите."); } finally { setPending(false); } }}>
    <label className="block">Ваше имя<input className="input mt-1 w-full" name="name" autoComplete="name" maxLength={255} required /></label>
    <label className="block">Телефон<input className="input mt-1 w-full" name="phone" type="tel" autoComplete="tel" minLength={6} maxLength={20} required /></label>
    <label className="block">Email<input className="input mt-1 w-full" name="email" type="email" autoComplete="email" /></label>
    <label className="block">Что нужно сделать?<textarea className="input mt-1 w-full" name="need" maxLength={5000} required /></label>
    <label className="flex gap-2 text-sm"><input type="checkbox" name="consent" required /> Разрешаю DEO CORE использовать указанные имя, контакты и описание проекта для обработки этой заявки и связи со мной.</label>
    {error && <p role="alert">{error}</p>}<button className="btn-primary w-full" disabled={pending}>{pending ? "Отправляем…" : "Отправить заявку"}</button>
  </form>}</main>;
}
