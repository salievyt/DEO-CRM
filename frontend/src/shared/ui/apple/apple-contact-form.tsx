"use client";

import { useState } from "react";
import { leadsApi } from "@/lib/api";
import { AppleButton } from "./apple-button";

interface ContactFormData {
  contact_name: string;
  phone: string;
  email: string;
  company_name: string;
  service_type: string;
  budget: string;
  notes: string;
}

const SERVICE_OPTIONS = [
  { value: "web-development", label: "Веб-разработка" },
  { value: "mobile-development", label: "Мобильная разработка" },
  { value: "design", label: "UI/UX дизайн" },
  { value: "crm", label: "CRM-система" },
  { value: "marketing", label: "Маркетинг" },
  { value: "other", label: "Другое" },
];

const BUDGET_OPTIONS = [
  { value: "100000", label: "до 100 000 ₽" },
  { value: "300000", label: "100 000 — 300 000 ₽" },
  { value: "500000", label: "300 000 — 500 000 ₽" },
  { value: "1000000", label: "500 000 — 1 000 000 ₽" },
  { value: "1000001", label: "от 1 000 000 ₽" },
];

interface AppleContactFormProps {
  defaultService?: string;
  onClose?: () => void;
}

export function AppleContactForm({ defaultService, onClose }: AppleContactFormProps) {
  const [form, setForm] = useState<ContactFormData>({
    contact_name: "",
    phone: "",
    email: "",
    company_name: "",
    service_type: defaultService || "",
    budget: "",
    notes: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      await leadsApi.publicCreate({
        contact_name: form.contact_name,
        phone: form.phone,
        email: form.email || undefined,
        company_name: form.company_name || undefined,
        service_type: form.service_type || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        notes: form.notes || undefined,
      });
      setStatus("success");
    } catch (err: unknown) {
      setStatus("error");
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setErrorMsg(axiosErr.response?.data?.detail || "Ошибка отправки. Попробуйте позже.");
      } else {
        setErrorMsg("Ошибка отправки. Попробуйте позже.");
      }
    }
  };

  if (status === "success") {
    return (
      <div className="text-center py-16 space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-sf-display text-apple-display-md font-semibold text-apple-ink">
          Заявка отправлена
        </h3>
        <p className="font-sf-text text-apple-body text-apple-inkMuted80 max-w-md mx-auto">
          Мы свяжемся с вами в ближайшее время для обсуждения вашего проекта.
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="font-sf-text text-apple-body text-apple-primary hover:underline mt-4"
          >
            Вернуться на сайт
          </button>
        )}
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-apple-hairline bg-white text-apple-ink font-sf-text text-apple-body placeholder:text-apple-inkMuted48 focus:outline-none focus:ring-2 focus:ring-apple-primary/30 focus:border-apple-primary transition-all";
  const labelClass = "block font-sf-text text-apple-caption-strong text-apple-inkMuted80 mb-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="contact_name" className={labelClass}>
            Имя *
          </label>
          <input
            type="text"
            id="contact_name"
            name="contact_name"
            required
            value={form.contact_name}
            onChange={handleChange}
            placeholder="Ваше имя"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="phone" className={labelClass}>
            Телефон *
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            required
            value={form.phone}
            onChange={handleChange}
            placeholder="+7 (999) 123-45-67"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="email@example.com"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="company_name" className={labelClass}>
            Компания
          </label>
          <input
            type="text"
            id="company_name"
            name="company_name"
            value={form.company_name}
            onChange={handleChange}
            placeholder="Название компании"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="service_type" className={labelClass}>
            Услуга
          </label>
          <select
            id="service_type"
            name="service_type"
            value={form.service_type}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="">Выберите услугу</option>
            {SERVICE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="budget" className={labelClass}>
            Бюджет
          </label>
          <select
            id="budget"
            name="budget"
            value={form.budget}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="">Укажите бюджет</option>
            {BUDGET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className={labelClass}>
          Описание проекта
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          value={form.notes}
          onChange={handleChange}
          placeholder="Расскажите о вашем проекте, целях и сроках..."
          className={inputClass + " resize-none"}
        />
      </div>

      {errorMsg && (
        <p className="font-sf-text text-apple-caption text-red-500">{errorMsg}</p>
      )}

      <div className="flex items-center gap-4 pt-2">
        <AppleButton
          type="submit"
          variant="store-hero"
          size="large"
          fullWidth
          isLoading={status === "loading"}
        >
          Отправить заявку
        </AppleButton>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="font-sf-text text-apple-body text-apple-inkMuted48 hover:text-apple-ink transition-colors whitespace-nowrap"
          >
            Отмена
          </button>
        )}
      </div>

      <p className="font-sf-text text-apple-fine-print text-apple-inkMuted48 text-center">
        Нажимая «Отправить», вы соглашаетесь с обработкой персональных данных.
      </p>
    </form>
  );
}
