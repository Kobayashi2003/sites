import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'Site Atlas', template: '%s · Site Atlas' },
  description:
    'A gallery of complete website concepts, each running live in the page.',
  icons: { icon: '/favicon.svg' },
};

// Runs before paint so a saved or system dark theme never flashes light.
const themeScript = `
  try {
    const stored = localStorage.getItem('site-atlas-theme');
    const theme = stored === 'light' || stored === 'dark'
      ? stored
      : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (_) {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={geist.variable}>{children}</body>
    </html>
  );
}
