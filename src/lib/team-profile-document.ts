import { z } from 'zod'

import type { Json } from '@/types/database.generated'

export const profileDocumentVersion = 1 as const

export type ProfileEndorsement = {
	quote: string
	attribution?: string
	role?: string
}

export type ProfileDocument = {
	version: typeof profileDocumentVersion
	intro: {
		content: Json
		endorsement?: ProfileEndorsement
	}
	sections: Array<{
		id: string
		title: string
		content: Json
		endorsement?: ProfileEndorsement
	}>
}

const textNodeSchema = z.object({
	type: z.literal('text'),
	text: z.string().min(1).max(10_000),
	marks: z.array(z.union([
		z.object({ type: z.literal('bold') }).strict(),
		z.object({ type: z.literal('italic') }).strict(),
		z.object({ type: z.literal('link'), attrs: z.object({
			href: z.string().url().max(2_048),
			target: z.string().nullable().optional(),
			rel: z.string().nullable().optional(),
			class: z.string().nullable().optional(),
		}).strip() }).strict(),
	])).max(3).optional(),
}).strict()

function validateInlineContent(value: unknown): Json[] {
	const nodes = z.array(z.union([
		textNodeSchema,
		z.object({ type: z.literal('hardBreak') }).strict(),
	])).max(500).parse(value)
	return nodes.map((node) => {
		if (node.type === 'hardBreak') return node
		return {
			type: 'text',
			text: node.text,
			...(node.marks ? {
				marks: node.marks.map((mark) => mark.type === 'link'
					? { type: 'link', attrs: { href: mark.attrs.href } }
					: { type: mark.type }),
			} : {}),
		} as Json
	})
}

function validateBlock(value: unknown, depth = 0): Json {
	if (depth > 3) throw new Error('Profile list nesting may not exceed three levels.')
	const node = z.object({ type: z.string(), content: z.unknown().optional(), attrs: z.unknown().optional() }).strict().parse(value)
	if (node.type === 'paragraph') {
		return { type: 'paragraph', content: validateInlineContent(node.content ?? []) }
	}
	if (node.type === 'bulletList') {
		return { type: 'bulletList', content: z.array(z.unknown()).min(1).max(100).parse(node.content).map((item) => validateListItem(item, depth + 1)) }
	}
	if (node.type === 'orderedList') {
		const start = node.attrs === undefined ? 1 : z.object({ start: z.number().int().min(1).max(10_000) }).strict().parse(node.attrs).start
		return { type: 'orderedList', attrs: { start }, content: z.array(z.unknown()).min(1).max(100).parse(node.content).map((item) => validateListItem(item, depth + 1)) }
	}
	throw new Error('The profile document contains an unsupported rich-text block.')
}

function validateListItem(value: unknown, depth: number): Json {
	const item = z.object({ type: z.literal('listItem'), content: z.array(z.unknown()).min(1).max(20) }).strict().parse(value)
	return { type: 'listItem', content: item.content.map((block) => validateBlock(block, depth)) }
}

function validateRichText(value: unknown): Json {
	const document = z.object({ type: z.literal('doc'), content: z.array(z.unknown()).max(200) }).strict().parse(value)
	return { type: 'doc', content: document.content.map((block) => validateBlock(block)) }
}

const endorsementSchema = z.object({
	quote: z.string().trim().min(1).max(4_000),
	attribution: z.string().trim().min(1).max(240).optional(),
	role: z.string().trim().min(1).max(240).optional(),
}).strict()

const documentShapeSchema = z.object({
	version: z.literal(profileDocumentVersion),
	intro: z.object({ content: z.unknown(), endorsement: endorsementSchema.optional() }).strict(),
	sections: z.array(z.object({
		id: z.string().uuid(),
		title: z.string().trim().min(1).max(160),
		content: z.unknown(),
		endorsement: endorsementSchema.optional(),
	}).strict()).max(20),
}).strict()

export function parseProfileDocument(value: unknown): ProfileDocument {
	const document = documentShapeSchema.parse(value)
	return {
		version: profileDocumentVersion,
		intro: {
			content: validateRichText(document.intro.content),
			...(document.intro.endorsement ? { endorsement: document.intro.endorsement } : {}),
		},
		sections: document.sections.map((section) => ({
			id: section.id,
			title: section.title,
			content: validateRichText(section.content),
			...(section.endorsement ? { endorsement: section.endorsement } : {}),
		})),
	}
}

export function emptyRichText(): Json {
	return { type: 'doc', content: [] }
}

export function emptyProfileDocument(): ProfileDocument {
	return { version: profileDocumentVersion, intro: { content: emptyRichText() }, sections: [] }
}

export function profileDocumentFromLegacy(intro: string | null, biography: string | null): ProfileDocument {
	const toRichText = (value: string | null): Json => value
		? { type: 'doc', content: value.split(/\n{2,}/).filter(Boolean).map((paragraph) => ({ type: 'paragraph', content: [{ type: 'text', text: paragraph.replace(/\n/g, ' ') }] })) }
		: emptyRichText()
	return {
		version: profileDocumentVersion,
		intro: { content: toRichText(intro) },
		sections: biography ? [{ id: crypto.randomUUID(), title: 'Biography', content: toRichText(biography) }] : [],
	}
}
