// Controlled rich-text rules shared by the catalogue contract
// (catalogue-document.ts) and the legal document contract
// (legal-document.mjs). Plain JavaScript with a `.d.mts` declaration so the
// node:test suites and the seed scripts can import it directly. The catalogue
// options reproduce the original catalogue validator exactly; the legal
// contract adds hard breaks and its own link rule (platform doc §11.4).
import { z } from 'zod'

export const MAX_LIST_DEPTH = 3

/** The catalogue link rule: a complete http or https URL. Returns an error message or null. */
export function httpLinkIssue(href) {
	try {
		const protocol = new URL(href).protocol
		if (protocol !== 'http:' && protocol !== 'https:') return 'Links must use http or https URLs.'
		return null
	} catch {
		return 'Links must use complete http or https URLs.'
	}
}

/**
 * Builds the inline and block validators. Each returns the normalized node or
 * throws (a ZodError, or an Error for depth and unsupported blocks).
 *
 * @param {{ unsupportedBlockMessage: string; allowHardBreak?: boolean; linkIssue?: (href: string) => string | null }} options
 */
export function createRichTextRules({ unsupportedBlockMessage, allowHardBreak = false, linkIssue = httpLinkIssue }) {
	const linkSchema = z
		.object({ href: z.string().trim().max(2_048) })
		.strict()
		.superRefine(({ href }, context) => {
			const message = linkIssue(href)
			if (message) context.addIssue({ code: 'custom', message })
		})
	const hardBreakSchema = z.object({ type: z.literal('hardBreak') }).strict()

	function validateInline(value) {
		if (allowHardBreak && value && typeof value === 'object' && value.type === 'hardBreak') {
			hardBreakSchema.parse(value)
			return { type: 'hardBreak' }
		}
		const inline = z.object({ type: z.literal('text'), text: z.string().max(10_000), marks: z.array(z.unknown()).max(8).optional() }).strict().parse(value)
		const marks = (inline.marks ?? []).map((mark) => {
			const candidate = z.object({ type: z.enum(['bold', 'italic', 'link']), attrs: z.unknown().optional() }).strict().parse(mark)
			if (candidate.type !== 'link') return { type: candidate.type }
			return { type: 'link', attrs: linkSchema.parse(candidate.attrs) }
		})
		return marks.length ? { type: 'text', text: inline.text, marks } : { type: 'text', text: inline.text }
	}

	function validateBlock(value, depth = 0) {
		if (depth > MAX_LIST_DEPTH) throw new Error('Rich-text lists may be nested only three levels deep.')
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
		throw new Error(unsupportedBlockMessage)
	}

	return { validateBlock, validateInline }
}

/** The first readable message of a validation failure (ZodError or Error). */
export function validationMessage(error) {
	if (error instanceof z.ZodError) {
		const issue = error.issues[0]
		if (!issue) return 'The document is not valid.'
		if (issue.code === 'unrecognized_keys') return `Unsupported ${issue.keys.length === 1 ? 'property' : 'properties'}: ${issue.keys.join(', ')}.`
		return issue.message
	}
	return error instanceof Error ? error.message : 'The document is not valid.'
}
