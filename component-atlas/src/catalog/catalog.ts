import type { CatalogEntry, CategoryDefinition } from './types';
import type { ComponentMeta } from '../library/types';
import type { ComponentType } from 'react';
import { lazy } from 'react';
import { resolveTags } from '../library/tags';

// `src/library` is a link to the components folder (see scripts/link-library.mjs).
// Every directory there with a README.md is a category.
const categoryReadmes = import.meta.glob('../library/*/README.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function describeCategory(readmePath: string, readme: string): CategoryDefinition {
  const id = readmePath.split('/').at(-2)!;
  const [heading, ...paragraphs] = readme.trim().split(/\r?\n\s*\r?\n/);
  const title = heading.match(/^#\s+(.+)$/m)?.[1].trim();
  if (!title) throw new Error(`Category README must start with a heading: ${id}/README.md`);
  const intro = (paragraphs[0] ?? '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ');
  return { id, title, description: intro.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? intro };
}

export const categories: CategoryDefinition[] = Object.entries(categoryReadmes)
  .map(([path, readme]) => describeCategory(path, readme))
  .sort((a, b) => a.title.localeCompare(b.title));

const metadataModules = import.meta.glob('../library/*/*/meta.ts', {
  eager: true,
  import: 'default',
}) as Record<string, ComponentMeta>;

const demoModules = import.meta.glob([
  '../library/*/*/demo/index.tsx',
  '../library/data-display/epub-reader/index.tsx',
]) as Record<string, () => Promise<{ default: ComponentType }>>;

const entryReadmes = import.meta.glob('../library/*/*/README.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

const thumbnailModules = import.meta.glob('../library/*/*/thumbnail.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const pathPattern = /^\.\.\/library\/([^/]+)\/([^/]+)\/meta\.ts$/;

export const entries: CatalogEntry[] = Object.entries(metadataModules)
  .map(([metadataPath, metadata]) => {
    const match = metadataPath.match(pathPattern);
    if (!match) throw new Error(`Unexpected catalog metadata path: ${metadataPath}`);

    const [, category, slug] = match;
    if (metadata.category !== category || metadata.slug !== slug) {
      throw new Error(`Catalog metadata must match its directory: ${metadataPath}`);
    }

    const demoPath =
      slug === 'epub-reader'
        ? `../library/${category}/${slug}/index.tsx`
        : `../library/${category}/${slug}/demo/index.tsx`;
    const readmePath = `../library/${category}/${slug}/README.md`;
    const loadDemo = demoModules[demoPath];
    const loadReadme = entryReadmes[readmePath];

    if (!loadDemo || !loadReadme) {
      throw new Error(`Catalog entry is incomplete: ${category}/${slug}`);
    }

    return {
      ...metadata,
      tags: resolveTags(
        slug === 'epub-reader'
          ? ['epub', 'pagination', 'typography', 'fixed-layout', 'accessibility']
          : metadata.tags,
      ),
      usage: metadata.usage ?? 'reusable',
      key: `${category}/${slug}`,
      thumbnail: thumbnailModules[`../library/${category}/${slug}/thumbnail.webp`],
      Demo: lazy(loadDemo),
      loadReadme,
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title));

/** Entries whose title, summary, category or tags contain every word of the query. */
export function searchEntries(query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return entries.filter(entry => {
    const text = [
      entry.title,
      entry.summary,
      getCategory(entry.category)?.title ?? '',
      ...entry.tags.map(tag => tag.label),
    ]
      .join(' ')
      .toLowerCase();
    return words.every(word => text.includes(word));
  });
}

export function getCategory(id: string) {
  return categories.find(category => category.id === id);
}

export function getCategoryEntries(id: string) {
  return entries.filter(entry => entry.category === id);
}

// Former slugs keep old links working after an entry is renamed.
const renamedEntries: Record<string, string> = {
  'layout-navigation/create-menu': 'morphing-action-menu',
  'visual-effects/semantic-drag-cursor': 'semantic-cursor',
};

export function getEntry(category: string, slug: string) {
  const current = renamedEntries[`${category}/${slug}`] ?? slug;
  return entries.find(entry => entry.category === category && entry.slug === current);
}
