// Legal document version 1 (platform doc §11.4): the catalogue rich-text
// contract (rich-text-rules.mjs) plus `hardBreak` and locale-neutral internal
// links such as `/cookie-use`, with `attrs.schemaVersion: 1` on the root.
// Shared by the admin Server Actions, the public renderer and the seed script.
// Plain JavaScript with a `.d.mts` declaration, like contact-rules.mjs.
import { z } from 'zod'

import { createRichTextRules, httpLinkIssue, validationMessage } from './rich-text-rules.mjs'

export const LEGAL_DOCUMENT_VERSION = 1

// Every locale's first path segment, lowercased. An internal link must not
// carry one: the renderer adds the visitor's locale (`/de/cookie-use`).
const LOCALE_SEGMENTS = new Set(['en', 'de', 'it', 'pt-br', 'pt-pt'])
const INTERNAL_PATH = /^\/(?!\/)[a-z0-9/-]*$/

/** Whether `href` is a locale-neutral, root-relative site path. */
export function isInternalLegalHref(href) {
	if (!INTERNAL_PATH.test(href)) return false
	return !LOCALE_SEGMENTS.has(href.split('/')[1] ?? '')
}

/** The legal link rule: an internal site path, or a complete http(s) URL. */
export function legalLinkIssue(href) {
	if (href.startsWith('/')) {
		if (href.startsWith('//')) return 'Internal links must start with a single slash, such as /cookie-use.'
		if (!INTERNAL_PATH.test(href)) return 'Internal links may use only lowercase letters, numbers, hyphens and slashes, such as /cookie-use.'
		if (!isInternalLegalHref(href)) return 'Internal links must not start with a language such as /de; the site adds the visitor\'s language.'
		return null
	}
	return httpLinkIssue(href)
}

const rules = createRichTextRules({
	unsupportedBlockMessage: 'The legal document contains an unsupported block. Use paragraphs, headings, lists and quotations only.',
	allowHardBreak: true,
	linkIssue: legalLinkIssue,
})

const BLOCK_LABELS = { blockquote: 'quotation', bulletList: 'bulleted list', heading: 'heading', orderedList: 'numbered list', paragraph: 'paragraph' }

const documentSchema = z.object({
	type: z.literal('doc'),
	attrs: z.object({ schemaVersion: z.literal(LEGAL_DOCUMENT_VERSION) }).strict(),
	content: z.array(z.unknown()).max(200),
}).strict()

/**
 * Validates and normalizes a version-1 legal document. Throws an Error whose
 * message names the failing block, for display in the admin.
 */
export function parseLegalDocument(value) {
	const document = documentSchema.safeParse(value)
	if (!document.success) {
		const tooLong = document.error.issues.some((issue) => issue.code === 'too_big' && issue.path[0] === 'content')
		throw new Error(tooLong ? 'The legal document may have at most 200 top-level blocks.' : 'The content is not a version-1 legal document.')
	}
	const content = document.data.content.map((block, index) => {
		try {
			return rules.validateBlock(block)
		} catch (error) {
			const type = block && typeof block === 'object' ? BLOCK_LABELS[block.type] : undefined
			throw new Error(`Block ${index + 1}${type ? ` (${type})` : ''}: ${validationMessage(error)}`)
		}
	})
	return { type: 'doc', attrs: { schemaVersion: LEGAL_DOCUMENT_VERSION }, content }
}

export function safeParseLegalDocument(value) {
	try {
		return { success: true, data: parseLegalDocument(value) }
	} catch (error) {
		return { success: false, error: validationMessage(error) }
	}
}

export function emptyLegalDocument() {
	return { type: 'doc', attrs: { schemaVersion: LEGAL_DOCUMENT_VERSION }, content: [] }
}

// TipTap's JSON carries editor-only attributes that the contract does not
// store: link `target`, `rel`, `class` and `title`, the ordered-list `type`,
// paragraph attributes, and marks that a hard break inherits from the text
// around it. The legal editor removes exactly these before saving; anything
// else is left for the validator to reject.
export function fromEditorDocument(value) {
	if (Array.isArray(value)) return value.map(fromEditorDocument)
	if (!value || typeof value !== 'object') return value
	const node = { ...value }
	if (node.type === 'link' && node.attrs && typeof node.attrs === 'object') node.attrs = { href: node.attrs.href }
	if (node.type === 'orderedList' && node.attrs && typeof node.attrs === 'object') node.attrs = node.attrs.start === undefined ? {} : { start: node.attrs.start }
	if (node.type === 'paragraph') delete node.attrs
	if (node.type === 'hardBreak') { delete node.marks; delete node.attrs }
	if (node.type === 'text' && Array.isArray(node.marks) && !node.marks.length) delete node.marks
	if (Array.isArray(node.content)) node.content = node.content.map(fromEditorDocument)
	if (Array.isArray(node.marks)) node.marks = node.marks.map(fromEditorDocument)
	return node
}

/** Plain text of a document: blocks separated by blank lines, hard breaks as line breaks. */
export function legalDocumentText(value) {
	const blocks = []
	const inline = (nodes) => (Array.isArray(nodes) ? nodes.map((node) => (node?.type === 'hardBreak' ? '\n' : typeof node?.text === 'string' ? node.text : '')).join('') : '')
	const walk = (node) => {
		if (!node || typeof node !== 'object') return
		if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'blockquote') blocks.push(inline(node.content))
		else if (Array.isArray(node.content)) node.content.forEach(walk)
	}
	walk(value)
	return blocks.join('\n\n')
}

/** Whether a document has any visible text. */
export function hasLegalContent(value) {
	return legalDocumentText(value).trim().length > 0
}
