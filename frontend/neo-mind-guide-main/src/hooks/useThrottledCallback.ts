import { useRef, useCallback } from "react";

/**
 * Returns a throttled version of fn that runs at most once every ms (leading edge).
 * First call runs immediately; subsequent calls within ms are ignored.
 */
export function useThrottledCallback<T extends (...args: any[]) => void>(
  fn: T,
  ms: number
): T {
  const lastRun = useRef(0);

  const throttled = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRun.current >= ms || lastRun.current === 0) {
        lastRun.current = now;
        fn(...args);
      }
    },
    [fn, ms]
  ) as T;

  return throttled;
}
