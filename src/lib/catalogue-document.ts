import { z } from 'zod'

import type { Json } from '@/types/database.generated'

const linkSchema = z
	.object({ href: z.string().trim().max(2_048) })
	.strict()
	.superRefine(({ href }, context) => {
		try {
			const protocol = new URL(href).protocol
			if (protocol !== 'http:' && protocol !== 'https:') {
				context.addIssue({ code: 'custom', message: 'Links must use http or https URLs.' })
			}
		} catch {
			context.addIssue({ code: 'custom', message: 'Links must use complete http or https URLs.' })
		}
	})

function validateInline(value: unknown): Json {
	const inline = z.object({ type: z.literal('text'), text: z.string().max(10_000), marks: z.array(z.unknown()).max(8).optional() }).strict().parse(value)
	const marks = (inline.marks ?? []).map((mark) => {
		const candidate = z.object({ type: z.enum(['bold', 'italic', 'link']), attrs: z.unknown().optional() }).strict().parse(mark)
		if (candidate.type !== 'link') return { type: candidate.type }
		return { type: 'link', attrs: linkSchema.parse(candidate.attrs) }
	})
	return marks.length ? { type: 'text', text: inline.text, marks } : { type: 'text', text: inline.text }
}

function validateBlock(value: unknown, depth = 0): Json {
	if (depth > 3) throw new Error('Rich-text lists may be nested only three levels deep.')
	const node = z.object({ type: z.string(), attrs: z.unknown().optional(), content: z.array(z.unknown()).optional() }).strict().parse(value)
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
			return { type: 'listItem', content: listItem.content.map((block) => validateBlock(block, depth + 1)) }
		})
		if (node.type === 'orderedList') {
			const start = z.object({ start: z.number().int().min(1).max(10_000).optional() }).strict().parse(node.attrs ?? {}).start ?? 1
			return { type: 'orderedList', attrs: { start }, content }
		}
		return { type: 'bulletList', content }
	}
	throw new Error('The catalogue body contains an unsupported rich-text block.')
}

export function parseCatalogueDocument(value: unknown): Json {
	const document = z.object({ type: z.literal('doc'), content: z.array(z.unknown()).max(200) }).strict().parse(value)
	return { type: 'doc', content: document.content.map((block) => validateBlock(block)) }
}

export function emptyCatalogueDocument(): Json {
	return { type: 'doc', content: [] }
}
