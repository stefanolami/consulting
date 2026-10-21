import type { z } from 'zod'

export type ArticleKind = 'article' | 'newsletter' | 'announcement' | 'event' | 'video' | 'vodcast' | 'podcast' | 'book' | 'media'

export declare const ARTICLE_KINDS: readonly ArticleKind[]

export declare const ARTICLE_KIND_LABELS: Readonly<Record<ArticleKind, string>>

export declare const DEFAULT_ARTICLE_KIND: ArticleKind

export declare function isArticleKind(value: unknown): value is ArticleKind

export declare function articleKindLabel(kind: string): string

export declare const articleKindSchema: z.ZodType<ArticleKind, unknown>
