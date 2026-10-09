const paths = {
  play: 'm8 5 11 7-11 7Z',
  pause: 'M8 5v14M16 5v14',
  stop: 'M6 6h12v12H6Z',
  retry: 'M4 10a8 8 0 1 1 1 8M4 4v6h6',
  fullscreen: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  exitFullscreen: 'M3 8h5V3m8 0v5h5M8 21v-5H3m13 5v-5h5',
  close: 'm6 6 12 12M6 18 18 6',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z',
  system: 'M3 5h18v11H3ZM8 20h8m-4-4v4',
  upload: 'M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4',
  trash: 'M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13',
  back: 'M15 5 8 12l7 7',
  music:
    'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0m11-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  heart: 'M12 20 3.5 11.5a5 5 0 0 1 8.5-5 5 5 0 0 1 8.5 5Z',
};
export type IconName = keyof typeof paths;

export default function Icon({
  name,
  size = 16,
}: {
  name: IconName;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
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
