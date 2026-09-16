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
  collapseLeft: 'M4 4h16v16H4ZM9 4v16m7-11-3 3 3 3',
  collapseRight: 'M4 4h16v16H4Zm11 0v16M8 9l3 3-3 3',
  expandLeft: 'M4 4h16v16H4ZM9 4v16m4-11 3 3-3 3',
  expandRight: 'M4 4h16v16H4Zm11 0v16m-4-11-3 3 3 3',
  settings:
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6m7.4 3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.5 2h-5l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2',
  history: 'M4 12a8 8 0 1 0 2.3-5.7L4 8.6M4 4v4.6h4.6M12 8v4l3 2',
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
