import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'Site Atlas', template: '%s · Site Atlas' },
  description: 'A working archive of complete website concepts and independent digital studies.',
};

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
