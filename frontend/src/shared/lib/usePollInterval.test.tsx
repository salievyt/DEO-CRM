import { act, renderHook } from "@testing-library/react";
import { IDLE_AFTER_MS, onWake, usePollInterval } from "./usePollInterval";

test("pauses polling while idle and wakes on input", () => {
  jest.useFakeTimers();
  const wake = jest.fn();
  const off = onWake(wake);
  const { result } = renderHook(() => usePollInterval(60000));
  expect(result.current).toBe(60000);
  act(() => {
    jest.advanceTimersByTime(IDLE_AFTER_MS + 1000);
  });
  expect(result.current).toBe(false);
  act(() => {
    window.dispatchEvent(new Event("keydown"));
  });
  expect(result.current).toBe(60000);
  expect(wake).toHaveBeenCalledTimes(1);
  off();
  jest.useRealTimers();
});
