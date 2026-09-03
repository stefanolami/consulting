import { z } from 'zod'

import type { Json } from '@/types/database.generated'

export const ARTICLE_DOCUMENT_VERSION = 2
export const ARTICLE_IMAGE_LAYOUTS = ['content', 'wide', 'fullBleed'] as const

export type ArticleImageLayout = (typeof ARTICLE_IMAGE_LAYOUTS)[number]
export type ArticleImageBlock = {
	alt: string
	caption: string | null
	layout: ArticleImageLayout
	mediaId: string
}

const linkSchema = z
	.object({ href: z.string().trim().max(2_048) })
	.strict()
	.superRefine(({ href }, context) => {
		try {
			const protocol = new URL(href).protocol
			if (protocol !== 'http:' && protocol !== 'https:') context.addIssue({ code: 'custom', message: 'Links must use http or https URLs.' })
		} catch {
			context.addIssue({ code: 'custom', message: 'Links must use complete http or https URLs.' })
		}
	})

const imageAttributesSchema = z.object({
	mediaId: z.string().uuid('Article images must reference a managed media asset.'),
	alt: z.string().trim().min(3, 'Article images need localized alternative text.').max(320),
	caption: z.string().trim().max(2_000).nullable().optional(),
	layout: z.enum(ARTICLE_IMAGE_LAYOUTS),
}).strict()

function validateInline(value: unknown): Json {
	const inline = z.object({ type: z.literal('text'), text: z.string().max(10_000), marks: z.array(z.unknown()).max(8).optional() }).strict().parse(value)
	const marks = (inline.marks ?? []).map((mark) => {
		const candidate = z.object({ type: z.enum(['bold', 'italic', 'link']), attrs: z.unknown().optional() }).strict().parse(mark)
		if (candidate.type !== 'link') return { type: candidate.type }
		return { type: 'link', attrs: linkSchema.parse(candidate.attrs) }
	})
	return marks.length ? { type: 'text', text: inline.text, marks } : { type: 'text', text: inline.text }
}

function validateBlock(value: unknown, version: 1 | 2, depth = 0): Json {
	if (depth > 3) throw new Error('Article lists may be nested only three levels deep.')
	const node = z.object({ type: z.string(), attrs: z.unknown().optional(), content: z.array(z.unknown()).optional() }).strict().parse(value)
	if (node.type === 'articleImage') {
		if (version !== ARTICLE_DOCUMENT_VERSION || depth !== 0 || node.content) throw new Error('Article images must be top-level blocks in a version 2 document.')
		const attributes = imageAttributesSchema.parse(node.attrs)
		return { type: 'articleImage', attrs: { ...attributes, caption: attributes.caption || null } }
	}
	if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'blockquote') {
		const content = (node.content ?? []).map(validateInline)
		if (node.type === 'heading') {
			const level = z.object({ level: z.union([z.literal(2), z.literal(3)]) }).strict().parse(node.attrs).level
			return { type: 'heading', attrs: { level }, content }
		}
		return content.length ? { type: node.type, content } : { type: node.type }
	}
	if (node.type === 'bulletList' || node.type === 'orderedList') {
		const content = z.array(z.unknown()).min(1).max(100).parse(node.content).map((item) => {
			const listItem = z.object({ type: z.literal('listItem'), content: z.array(z.unknown()).min(1).max(20) }).strict().parse(item)
			return { type: 'listItem', content: listItem.content.map((block) => validateBlock(block, version, depth + 1)) }
		})
		if (node.type === 'orderedList') {
			const start = z.object({ start: z.number().int().min(1).max(10_000).optional() }).strict().parse(node.attrs ?? {}).start ?? 1
			return { type: 'orderedList', attrs: { start }, content }
		}
		return { type: 'bulletList', content }
	}
	throw new Error('The article body contains an unsupported rich-text block.')
}

export function parseArticleDocument(value: unknown): Json {
	const document = z.object({ type: z.literal('doc'), attrs: z.unknown().optional(), content: z.array(z.unknown()).max(200) }).strict().parse(value)
	const version = document.attrs === undefined
		? 1
		: z.object({ schemaVersion: z.union([z.literal(1), z.literal(ARTICLE_DOCUMENT_VERSION)]) }).strict().parse(document.attrs).schemaVersion
	return { type: 'doc', attrs: { schemaVersion: ARTICLE_DOCUMENT_VERSION }, content: document.content.map((block) => validateBlock(block, version)) }
}

export function articleImageBlocks(value: unknown): ArticleImageBlock[] {
	const document = parseArticleDocument(value) as { content: Array<{ attrs?: unknown; type?: string }> }
	return document.content.flatMap((block) => {
		if (block.type !== 'articleImage') return []
		const attributes = imageAttributesSchema.parse(block.attrs)
		return [{ ...attributes, caption: attributes.caption ?? null }]
	})
}

export function articleImageMediaIds(value: unknown): string[] {
	return [...new Set(articleImageBlocks(value).map((block) => block.mediaId))]
}

export function emptyArticleDocument(): Json {
	return { type: 'doc', attrs: { schemaVersion: ARTICLE_DOCUMENT_VERSION }, content: [] }
}
