"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { focusApi, remaining, timeLabel } from "./api";
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
      className="flex items-center justify-between rounded-xl bg-amber-100 px-4 py-2 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100"
    >
      <span>
        ● DEO Focus · {data.active.task_title || data.active.goal || "Личная сессия"}{" "}
        {data.active.status === "paused" ? "· Пауза" : ""}
      </span>
      <strong>{timeLabel(remaining(data.active, offset, now))}</strong>
    </Link>
  );
}
