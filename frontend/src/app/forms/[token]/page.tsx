"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle, ClipboardList, Loader2 } from "lucide-react";

import { formsApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Button } from "@/shared/ui/Button";
import type { FormField, PublicFormGetResponse } from "@/entities/forms/types";

export default function PublicFormPage({ params }: { params: { token: string } }) {
  const token = params.token;

  const { data, isLoading, error } = useQuery({
    queryKey: [QUERY_KEYS.FORM_PUBLIC, token],
    queryFn: () => formsApi.public.get(token),
    select: (res): PublicFormGetResponse => res.data,
    retry: false,
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const form = data?.form;
  const fields = form?.form_fields || [];

  const submitMutation = useMutation({
    mutationFn: (response: Record<string, string>) => formsApi.public.submit(token, response),
    onSuccess: () => setSubmitted(true),
  });

  const httpStatus = (error as { response?: { status?: number } })?.response?.status || null;
  const errorDetail =
    (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "";

  if (isLoading) {
    return (
      <PublicShell>
        <div className="flex items-center justify-center gap-2 text-surface-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Загружаем анкету...
        </div>
      </PublicShell>
    );
  }

  if (error || !form) {
    const gone = httpStatus === 410;
    return (
      <PublicShell>
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger-50 text-danger-500 dark:bg-red-900/20">
            <ClipboardList className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-surface-900 dark:text-white">
            {gone ? "Ссылка истекла" : "Ссылка не найдена"}
          </h1>
          <p className="mt-2 text-sm text-surface-500">
            {gone
              ? "Срок действия ссылки закончился. Попросите новый инвайт."
              : errorDetail || "Анкета больше не доступна или ссылка указана неверно."}
          </p>
        </div>
      </PublicShell>
    );
  }

  if (submitted) {
    return (
      <PublicShell>
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-success-600 dark:bg-green-900/20">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-surface-900 dark:text-white">Спасибо!</h1>
          <p className="mt-2 text-sm text-surface-500">
            Ваши ответы сохранены. Ожидайте обратной связи.
          </p>
        </div>
      </PublicShell>
    );
  }

  const setName = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }));

  const canSubmit =
    submitMutation.isPending || fields.some((f) => f.required && !values[f.key]?.trim());

  return (
    <PublicShell>
      <div className="mb-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">
          <ClipboardList className="h-6 w-6" />
        </div>
        <h1 className="mt-3 text-2xl font-bold text-surface-900 dark:text-white">{form.title}</h1>
        {form.description && <p className="mt-2 text-sm text-surface-500">{form.description}</p>}
        {data?.invitation.recipient_name && (
          <p className="mt-1 text-xs text-surface-400">
            Анкета для: {data.invitation.recipient_name}
          </p>
        )}
      </div>

      {fields.length === 0 ? (
        <p className="text-center text-sm text-surface-500">В анкете пока нет полей.</p>
      ) : (
        <div className="space-y-4">
          {fields.map((field) => (
            <FormInput
              key={field.key}
              field={field}
              value={values[field.key] || ""}
              error={
                submitMutation.error && field.required && !values[field.key]?.trim()
                  ? "Обязательное поле"
                  : undefined
              }
              onChange={(value) => setName(field.key, value)}
            />
          ))}
        </div>
      )}

      {submitMutation.error && (
        <p className="mt-4 text-center text-sm text-danger-600 dark:text-danger-400">
          {(submitMutation.error as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || "Не удалось отправить ответы."}
        </p>
      )}

      <div className="mt-6 flex justify-center">
        <Button
          onClick={() => submitMutation.mutate(values)}
          loading={submitMutation.isPending}
          disabled={canSubmit}
        >
          Отправить
        </Button>
      </div>
    </PublicShell>
  );
}

function FormInput({
  field,
  value,
  error,
  onChange,
}: {
  field: FormField;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-200">
        {field.label}
        {field.required && <span className="ml-1 text-danger-500">*</span>}
      </label>
      {field.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 transition-colors placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-50 dark:placeholder:text-surface-500"
        />
      ) : field.type === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-50"
        >
          <option value="">— выберите —</option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 transition-colors placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-50 dark:placeholder:text-surface-500"
        />
      )}
      {error && <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">{error}</p>}
    </div>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-50 px-4 py-10 dark:bg-surface-950">
      <div className="w-full max-w-xl rounded-2xl border border-surface-200 bg-white p-6 shadow-xl shadow-surface-200/20 dark:border-surface-700 dark:bg-surface-800 dark:shadow-black/20 sm:p-8">
        {children}
      </div>
    </main>
  );
}
