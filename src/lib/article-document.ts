import { ARTICLE_DOCUMENT_VERSION, ARTICLE_IMAGE_LAYOUTS, articleImageAttributesSchema, parseArticleRichText } from '@/lib/rich-text-contracts.mjs'
import type { Json } from '@/types/database.generated'

// The article contract lives in rich-text-contracts.mjs: the catalogue rules
// plus top-level managed image blocks (control tower §13.2). Errors name the
// failing block.
export { ARTICLE_DOCUMENT_VERSION, ARTICLE_IMAGE_LAYOUTS }

export type ArticleImageLayout = (typeof ARTICLE_IMAGE_LAYOUTS)[number]
export type ArticleImageBlock = {
	alt: string
	caption: string | null
	layout: ArticleImageLayout
	mediaId: string
}

export function parseArticleDocument(value: unknown): Json {
	return parseArticleRichText(value) as unknown as Json
}

export function articleImageBlocks(value: unknown): ArticleImageBlock[] {
	const document = parseArticleDocument(value) as { content: Array<{ attrs?: unknown; type?: string }> }
	return document.content.flatMap((block) => {
		if (block.type !== 'articleImage') return []
		const attributes = articleImageAttributesSchema.parse(block.attrs)
		return [{ ...attributes, caption: attributes.caption ?? null }]
	})
}

export function articleImageMediaIds(value: unknown): string[] {
	return [...new Set(articleImageBlocks(value).map((block) => block.mediaId))]
}

export function emptyArticleDocument(): Json {
	return { type: 'doc', attrs: { schemaVersion: ARTICLE_DOCUMENT_VERSION }, content: [] }
}
