import type { ComponentType } from 'react';
import type { StaticImageData } from 'next/image';
export type ConceptStatus = 'draft' | 'published' | 'archived';
export type ConceptType = 'landing page' | 'product prototype' | 'editorial' | 'commerce';
export type ConceptTone = 'acid' | 'night';
/** Screenshots imported from `concepts/<slug>/assets/`; `dark` is optional. */
export interface ConceptPreview { light: StaticImageData; dark?: StaticImageData; alt: string; }
/** Copy for the overview page shown before a concept opens. */
export interface ConceptOverview { lede: string; highlights: string[]; details: { label: string; value: string }[]; }
export interface ConceptMeta { slug: string; title: string; summary: string; type: ConceptType; status: ConceptStatus; year: number; tags: string[]; tone: ConceptTone; preview?: ConceptPreview; overview?: ConceptOverview; }
export interface ConceptDefinition extends ConceptMeta { Component: ComponentType; }
