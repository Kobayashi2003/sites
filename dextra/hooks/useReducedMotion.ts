import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';

export function useReducedMotion() {
  return useSyncExternalStore(
    (notify) => {
      const media = matchMedia(query);
      media.addEventListener('change', notify);
      return () => media.removeEventListener('change', notify);
    },
    () => matchMedia(query).matches,
    () => false,
  );
}
