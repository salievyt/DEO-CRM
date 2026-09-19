"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("access_token");
    router.replace(token ? "/dashboard" : "/crm");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-surface-50 dark:bg-surface-900">
      <div className="text-center">
        <div className="mb-4 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    </div>
  );
}