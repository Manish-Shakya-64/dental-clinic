import { useEffect, useState } from "react";

/** Delays reflecting `value` until it's stopped changing for `delayMs` — for search inputs wired
 *  to a server-side query, so every keystroke doesn't fire its own request. */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
