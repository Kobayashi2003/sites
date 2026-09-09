import type { ComponentType } from 'react';
export type ConceptStatus = 'draft' | 'published' | 'archived';
export type ConceptType = 'landing page' | 'product prototype' | 'editorial' | 'commerce';
export type ConceptTone = 'acid' | 'night';
export interface ConceptMeta { slug: string; title: string; summary: string; type: ConceptType; status: ConceptStatus; year: number; tags: string[]; tone: ConceptTone; }
export interface ConceptDefinition extends ConceptMeta { Component: ComponentType; }
