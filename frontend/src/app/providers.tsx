"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { isPublicPagePath } from "@/shared/api/base";
import { ToastContainer } from "@/shared/ui/Toast";

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const fetchUser = useAuth((state) => state.fetchUser);
  const pathname = usePathname();
  // Respondent pages (/survey/*, /forms/*) must not call /auth/me: the JWT of
  // whoever is logged in on this device must not reach the server there.
  // The dashboard's AuthGuard fetches the user itself on navigation.
  const isPublicPage = isPublicPagePath(pathname);

  useEffect(() => {
    if (!isPublicPage) {
      fetchUser();
    }
  }, [fetchUser, isPublicPage]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>{children}</AuthInitializer>
      <ToastContainer />
    </QueryClientProvider>
  );
}
