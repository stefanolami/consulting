import type { z } from 'zod'

import type { RichTextNode } from './rich-text-rules.mjs'

export type RichTextDocument = { type: 'doc'; attrs?: { schemaVersion: number }; content: RichTextNode[] }

export declare const catalogueLinkIssue: (href: string) => string | null
export declare function parseCatalogueRichText(value: unknown): RichTextDocument

export declare const ARTICLE_DOCUMENT_VERSION: 2
export declare const ARTICLE_IMAGE_LAYOUTS: readonly ['content', 'wide', 'fullBleed']
export declare const articleLinkIssue: (href: string) => string | null
export declare const articleImageAttributesSchema: z.ZodType<{ mediaId: string; alt: string; caption?: string | null; layout: 'content' | 'wide' | 'fullBleed' }, unknown>
export declare function parseArticleRichText(value: unknown): RichTextDocument

export declare function profileLinkIssue(href: string): string | null
export declare function parseProfileRichText(value: unknown): RichTextDocument

export type TeamProfileEndorsement = { quote: string; attribution?: string; role?: string }
export type TeamProfileDocument = {
	version: 1
	intro: { content: RichTextDocument; endorsement?: TeamProfileEndorsement }
	sections: Array<{ id: string; title: string; content: RichTextDocument; endorsement?: TeamProfileEndorsement }>
}
export declare function parseTeamProfileDocument(value: unknown): TeamProfileDocument
