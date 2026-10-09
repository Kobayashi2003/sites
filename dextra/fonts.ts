import { Anybody, Instrument_Sans } from 'next/font/google';

/** Wide display face for numbers and headings; it stretches with the chart. */
export const display = Anybody({
  subsets: ['latin'],
  variable: '--dx-display',
  axes: ['wdth'],
});
export const text = Instrument_Sans({
  subsets: ['latin'],
  variable: '--dx-text',
});
