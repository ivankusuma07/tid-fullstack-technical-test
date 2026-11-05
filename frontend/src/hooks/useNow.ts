import { useEffect, useState } from 'react';

/**
 * Current time, refreshed every `intervalMs`. Use it for "<= now" limits on date inputs: a `max`
 * computed once at render goes stale while a modal stays open, and the browser then rejects a
 * time that is not in the future at all.
 */
export function useNow(intervalMs = 15_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
