"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

const isPublicRoute = (path: string): boolean =>
  PUBLIC_ROUTES.some((route) => path.startsWith(route));

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, fetchUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    const currentPath = pathname || "/";
    if (!isLoading) {
      if (!isAuthenticated && !isPublicRoute(currentPath)) {
        router.push("/login");
      }
      if (isAuthenticated && isPublicRoute(currentPath)) {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  const currentPath = pathname || "/";

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-50 dark:bg-surface-900">
        <div className="text-center">
          <div className="mb-4 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-xl font-bold text-white">
              D
            </div>
          </div>
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm text-surface-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !isPublicRoute(currentPath)) {
    return null;
  }

  return <>{children}</>;
}
