"use client";

import { useEffect, useState } from "react";

/** After this long without input the page stops polling until the user is back. */
export const IDLE_AFTER_MS = 5 * 60 * 1000;
const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;

let lastActivity = Date.now();
let idle = false;
const listeners = new Set<(idle: boolean) => void>();
let attached = false;
let idleTimer: ReturnType<typeof setTimeout> | undefined;

const wakeListeners = new Set<() => void>();

function setIdle(next: boolean) {
  if (idle === next) {return;}
  idle = next;
  listeners.forEach((fn) => fn(next));
  if (!next) {wakeListeners.forEach((fn) => fn());}
}

/** Run ``fn`` when the user comes back after being idle. Returns an unsubscribe. */
export function onWake(fn: () => void): () => void {
  attach();
  wakeListeners.add(fn);
  return () => {
    wakeListeners.delete(fn);
  };
}

function scheduleIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => setIdle(true), IDLE_AFTER_MS - (Date.now() - lastActivity));
}

function onActivity() {
  const now = Date.now();
  // Throttle: a mousemove storm only resets the timer once a second.
  if (!idle && now - lastActivity < 1000) {return;}
  lastActivity = now;
  setIdle(false);
  scheduleIdle();
}

function attach() {
  if (attached || typeof window === "undefined") {return;}
  attached = true;
  ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {onActivity();}
  });
  scheduleIdle();
}

/**
 * ``refetchInterval`` that pauses while the user is idle.
 *
 * React Query already stops intervals in hidden tabs; this also stops them in
 * a visible tab nobody is using (a CRM left open all day), which is where most
 * serverless CPU went. Polling resumes on the next input; ``Providers``
 * refetches stale active queries at that moment (see ``onWake``).
 */
export function usePollInterval(ms: number): number | false {
  const [isIdle, setIsIdle] = useState(idle);
  useEffect(() => {
    attach();
    listeners.add(setIsIdle);
    setIsIdle(idle);
    return () => {
      listeners.delete(setIsIdle);
    };
  }, []);
  return isIdle ? false : ms;
}
