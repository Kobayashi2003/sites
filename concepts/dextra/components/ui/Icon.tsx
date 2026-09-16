import type { CSSProperties } from 'react';
const paths = {
  play: 'm8 5 11 7-11 7Z',
  pause: 'M8 5v14M16 5v14',
  stop: 'M6 6h12v12H6Z',
  retry: 'M4 10a8 8 0 1 1 1 8M4 4v6h6',
  fullscreen: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  close: 'm6 6 12 12M6 18 18 6',
  down: 'M12 4v16m-6-6 6 6 6-6',
  up: 'M12 20V4m-6 6 6-6 6 6',
  random: 'M3 5h3l12 14h3M3 19h3L18 5h3m-4-3 4 3-4 3m0 8 4 3-4 3',
  heart: 'M12 20 3.5 11.5a5 5 0 0 1 8.5-5 5 5 0 0 1 8.5 5Z',
  clock: 'M12 8v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
};
export type IconName = keyof typeof paths;
export default function Icon({
  name,
  style,
}: {
  name: IconName;
  style?: CSSProperties;
}) {
  return (
    <svg
      style={style}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
