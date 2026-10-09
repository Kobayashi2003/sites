import type { CatalogTag } from '../library/tags';
import type { ComponentMeta } from '../library/types';
import type { ComponentType, LazyExoticComponent } from 'react';

export type { CatalogTag, TagGroup } from '../library/tags';

/** A directory of the library, described by the title and first sentence of its README. */
export interface CategoryDefinition {
  id: string;
  title: string;
  description: string;
}

export interface CatalogEntry extends Omit<ComponentMeta, 'tags'> {
  tags: CatalogTag[];
  key: string;
  thumbnail?: string;
  Demo: LazyExoticComponent<ComponentType>;
  loadReadme: () => Promise<string>;
}
