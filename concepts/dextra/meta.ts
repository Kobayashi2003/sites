import type { ConceptMeta } from '../types';
import previewDark from './assets/preview-dark.jpg';
import previewLight from './assets/preview-light.jpg';

export const meta = {
  slug: 'dextra',
  title: 'DEXTRA / SIX — Left-hand studio',
  summary:
    'A six-lane keyboard trainer with customizable Hanon sequences, falling and static charts, imported songs, and detailed results.',
  type: 'product prototype',
  status: 'published',
  year: 2026,
  tags: ['training', 'rhythm', 'interactive'],
  tone: 'night',
  preview: {
    light: previewLight,
    dark: previewDark,
    alt: 'DEXTRA practice studio paused mid-run: setup and live status on the left, a six-lane falling chart with score and combo in the center, and a progress and key-layout guide on the right.',
  },
  overview: {
    lede: 'DEXTRA / SIX is a practice studio for left-hand independence. Six remappable keys map to five fingers, and every exercise loads into one full-height chart. Notes can fall toward a hit line or wait in a stationary grid.',
    highlights: [
      'Configuration-filtered history and personal bests, with accuracy, static efficiency and survival endurance ratings.',
      '18 Hanon studies with key previews, ordered sequences, ascending or descending practice, repetitions and note values.',
      'Falling charts with Pure+, Pure and Far timing windows, combo-weighted scoring and S–D ranks.',
      'Static practice that measures active time and accuracy without a tempo.',
      'Survival with up to 10 lives and timed random challenges.',
      'Import your own songs: beats are detected locally and turned into Easy, Normal or Hard charts played in sync with the music.',
      'Resizable, collapsible side panels, lane colors and light or dark themes.',
    ],
    details: [
      { label: 'Input', value: 'Physical keyboard' },
      { label: 'Formats', value: 'Falling · Static' },
      { label: 'Storage', value: 'This browser only' },
      {
        label: 'Session',
        value: 'Hanon sequences, 32 groups, open-ended or a full song',
      },
    ],
  },
} satisfies ConceptMeta;
