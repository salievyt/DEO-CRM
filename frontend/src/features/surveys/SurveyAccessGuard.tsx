"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { canManageSurveys } from "@/entities/surveys/access";
import { EmptyState } from "@/shared/ui/EmptyState";

/**
 * Route-level guard for the survey management section. The dashboard
 * layout already requires a session (AuthGuard); here we additionally
 * check the role, so a direct URL does not render the section for other
 * roles. The backend enforces the same rule with 403.
 */
export function SurveyAccessGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!canManageSurveys(user?.role_name)) {
    return (
      <EmptyState
        className="mx-auto mt-10 max-w-xl"
        icon={<ShieldAlert className="h-10 w-10" />}
        title="Нет доступа"
        description="Раздел «Опросы» доступен администратору, владельцу и HR-менеджеру."
        action={
          <Link href="/cabinet" className="btn-secondary">
            В кабинет
          </Link>
        }
      />
    );
  }

  return <>{children}</>;
}
