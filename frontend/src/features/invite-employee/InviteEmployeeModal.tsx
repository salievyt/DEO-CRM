"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Check, Copy, KeyRound, Mail, UserPlus } from "lucide-react";
import { authApi } from "@/shared/api/base";
import { QUERY_KEYS } from "@/shared/constants";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Modal } from "@/shared/ui/Modal";

const ROLE_OPTIONS = [
  { value: "project_manager", label: "Проджект-менеджер" },
  { value: "developer", label: "Разработчик" },
  { value: "designer", label: "Дизайнер" },
  { value: "marketer", label: "Маркетолог" },
  { value: "owner", label: "Владелец компании" },
];

interface InviteEmployeeModalProps {
  open: boolean;
  onClose: () => void;
}

interface InviteResult {
  email: string;
  temporary_password: string;
  email_sent: boolean;
}

function extractError(error: unknown): string {
  const axiosError = error as AxiosError<Record<string, unknown>>;
  const data = axiosError?.response?.data;

  if (data && typeof data === "object") {
    // Custom backend envelope: { error: true, detail: <DRF data>, status_code }
    const detail = data.detail;
    if (detail && typeof detail === "object") {
      const detailObj = detail as Record<string, unknown>;
      if (typeof detailObj.detail === "string") return detailObj.detail;
      // Field errors: { email: ["..."], role_name: ["..."] }
      const firstKey = Object.keys(detailObj)[0];
      const firstValue = firstKey ? detailObj[firstKey] : undefined;
      if (firstValue && Array.isArray(firstValue)) return String(firstValue[0]);
      if (typeof firstValue === "string") return firstValue;
    }
    if (typeof detail === "string") return detail;
    // Plain response body fallback
    if (typeof data.error === "string") return data.error;
    const firstKey = Object.keys(data)[0];
    const firstValue = firstKey ? data[firstKey] : undefined;
    if (firstValue && Array.isArray(firstValue)) return String(firstValue[0]);
    if (typeof firstValue === "string") return firstValue;
  }
  return "Не удалось отправить приглашение. Попробуйте ещё раз.";
}

export function InviteEmployeeModal({ open, onClose }: InviteEmployeeModalProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role_name: "project_manager",
  });
  const [invited, setInvited] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset state every time the modal opens
  useEffect(() => {
    if (open) {
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        role_name: "project_manager",
      });
      setInvited(null);
      setCopied(false);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => authApi.users.invite(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
      setInvited({
        email: res.data.email,
        temporary_password: res.data.temporary_password,
        email_sent: Boolean(res.data.email_sent),
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const handleCopyPassword = async () => {
    if (!invited) return;
    try {
      await navigator.clipboard.writeText(invited.temporary_password);
    } catch {
      // Fallback for older browsers / non-secure contexts
      const textarea = document.createElement("textarea");
      textarea.value = invited.temporary_password;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    if (mutation.isPending) return;
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={invited ? "Сотрудник приглашён" : "Пригласить сотрудника"}
      description={
        invited
          ? "Аккаунт создан. Передайте сотруднику данные для входа."
          : "Создайте аккаунт сотрудника и назначьте роль"
      }
      size="md"
    >
      {invited ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-success-200 bg-success-50 p-4 dark:border-success-800 dark:bg-success-900/20">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-success-600 dark:text-success-400" />
            <div className="text-sm text-surface-700 dark:text-surface-200">
              <p className="font-medium text-surface-900 dark:text-white">
                Аккаунт создан для {invited.email}
              </p>
              <p className="mt-1 text-surface-500 dark:text-surface-400">
                {invited.email_sent
                  ? "Письмо с доступом отправлено. Сотрудник сможет войти с временным паролем ниже."
                  : "Email не настроен — письмо не отправлялось. Передайте сотруднику временный пароль ниже."}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-surface-700 dark:text-surface-200">
              Временный пароль
            </p>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-surface-300 bg-surface-50 px-3 py-2.5 dark:border-surface-600 dark:bg-surface-800">
                <KeyRound className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                <code className="select-all font-mono text-sm font-semibold text-surface-900 dark:text-white">
                  {invited.temporary_password}
                </code>
              </div>
              <Button
                variant="secondary"
                type="button"
                onClick={handleCopyPassword}
                aria-label="Скопировать пароль"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-surface-400">
              Рекомендуем сменить пароль после первого входа.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={handleClose}>
              Готово
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Имя"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              required
            />
            <Input
              label="Фамилия"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              required
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="name@example.com"
            hint="Временный пароль для входа будет показан после создания аккаунта"
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Телефон"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+7 (___) ___-__-__"
            />
            <Select
              label="Роль"
              options={ROLE_OPTIONS}
              value={form.role_name}
              onChange={(e) => setForm({ ...form, role_name: e.target.value })}
            />
          </div>

          {mutation.isError && (
            <div className="flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700 dark:border-danger-800 dark:bg-danger-900/20 dark:text-danger-300">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{extractError(mutation.error)}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={handleClose}
              disabled={mutation.isPending}
            >
              Отмена
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              <UserPlus className="h-4 w-4" />
              Отправить приглашение
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
