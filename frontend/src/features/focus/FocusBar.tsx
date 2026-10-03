"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { focusApi, remaining, timeLabel, phaseLabels } from "./api";
export function FocusBar() {
  const { data, dataUpdatedAt } = useQuery({
    queryKey: ["focus", "state"],
    queryFn: focusApi.state,
    refetchInterval: 10000,
    retry: false,
  });
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!data?.active) {return null;}
  const offset = Date.parse(data.server_time) - dataUpdatedAt;
  return (
    <Link
      href="/focus"
      className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-800 shadow-sm transition-colors hover:bg-brand-100 dark:border-brand-900 dark:bg-brand-950/60 dark:text-brand-200 dark:hover:bg-brand-900/60"
    >
      <span className="flex items-center gap-2">
        <Sparkles size={14} className="text-brand-500" />
        DEO Focus · {data.active.task_title || data.active.goal || phaseLabels[data.active.phase]}{" "}
        {data.active.status === "paused" ? "· Пауза" : ""}
      </span>
      <strong className="tabular-nums">{timeLabel(remaining(data.active, offset, now))}</strong>
    </Link>
  );
}
