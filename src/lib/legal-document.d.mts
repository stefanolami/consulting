import type { RichTextNode } from './rich-text-rules.mjs'

export type LegalDocument = { type: 'doc'; attrs: { schemaVersion: 1 }; content: RichTextNode[] }

export declare const LEGAL_DOCUMENT_VERSION: 1

export declare function isInternalLegalHref(href: string): boolean
export declare function legalLinkIssue(href: string): string | null
export declare function parseLegalDocument(value: unknown): LegalDocument
export declare function safeParseLegalDocument(value: unknown): { success: true; data: LegalDocument } | { success: false; error: string }
export declare function emptyLegalDocument(): LegalDocument
export declare function fromEditorDocument<T>(value: T): T
export declare function legalDocumentText(value: unknown): string
export declare function hasLegalContent(value: unknown): boolean
