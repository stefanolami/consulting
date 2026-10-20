// The controlled rich-text contracts of the catalogue (services, sectors and
// Our Outreach country content), the newsroom article and the team profile
// (control tower §13.2). The legal contract lives in legal-document.mjs. Each
// parser accepts exactly what its contract always accepted and returns the
// same normalized document; a failure throws an Error that names the block
// ("Block 2 (numbered list): …"). catalogue-document.ts, article-document.ts
// and team-profile-document.ts keep their typed exports on top of these.
// Plain JavaScript with a `.d.mts` declaration so the node:test suites can
// import it.
import { z } from 'zod'

import { issueMessage } from './admin-form-state.mjs'
import { createRichTextRules, httpLinkIssue, validateBlocks, validationMessage } from './rich-text-rules.mjs'

const MAX_BLOCKS = 200

// The document wrapper: a readable message instead of the Zod issue list.
function documentShape(schema, value) {
	const result = schema.safeParse(value)
	if (result.success) return result.data
	const tooLong = result.error.issues.some((issue) => issue.code === 'too_big' && issue.path[0] === 'content')
	throw new Error(tooLong ? `The text may have at most ${MAX_BLOCKS} top-level blocks.` : 'The text is not a valid rich-text document. Reload the page and try again.')
}

// Catalogue ----------------------------------------------------------------

/** The catalogue link rule: a complete http or https URL. */
export const catalogueLinkIssue = httpLinkIssue

const catalogueRules = createRichTextRules({ unsupportedBlockMessage: 'The catalogue body contains an unsupported rich-text block.' })
const catalogueDocumentSchema = z.object({ type: z.literal('doc'), content: z.array(z.unknown()).max(MAX_BLOCKS) }).strict()

/** Validates and normalizes a catalogue or country document. */
export function parseCatalogueRichText(value) {
	const document = documentShape(catalogueDocumentSchema, value)
	return { type: 'doc', content: validateBlocks(document.content, (block) => catalogueRules.validateBlock(block)) }
}

// Article ------------------------------------------------------------------

export const ARTICLE_DOCUMENT_VERSION = 2
export const ARTICLE_IMAGE_LAYOUTS = ['content', 'wide', 'fullBleed']

/** The article link rule: a complete http or https URL. */
export const articleLinkIssue = httpLinkIssue

export const articleImageAttributesSchema = z.object({
	mediaId: z.string().uuid('Article images must reference a managed media asset.'),
	alt: z.string().trim().min(3, 'Article images need localized alternative text.').max(320),
	caption: z.string().trim().max(2_000).nullable().optional(),
	layout: z.enum(ARTICLE_IMAGE_LAYOUTS),
}).strict()

// The article contract is the catalogue rules plus top-level managed images.
const articleRules = createRichTextRules({
	unsupportedBlockMessage: 'The article body contains an unsupported rich-text block.',
	listDepthMessage: 'Article lists may be nested only three levels deep.',
})
const articleImageNodeSchema = z.object({ type: z.literal('articleImage'), attrs: z.unknown().optional(), content: z.array(z.unknown()).optional() }).strict()
const articleDocumentSchema = z.object({ type: z.literal('doc'), attrs: z.unknown().optional(), content: z.array(z.unknown()).max(MAX_BLOCKS) }).strict()
const articleVersionSchema = z.object({ schemaVersion: z.union([z.literal(1), z.literal(ARTICLE_DOCUMENT_VERSION)]) }).strict()

function validateArticleBlock(value, version) {
	if (value && typeof value === 'object' && value.type === 'articleImage') {
		const node = articleImageNodeSchema.parse(value)
		if (version !== ARTICLE_DOCUMENT_VERSION || node.content) throw new Error('Article images must be top-level blocks in a version 2 document.')
		const attributes = articleImageAttributesSchema.parse(node.attrs)
		return { type: 'articleImage', attrs: { ...attributes, caption: attributes.caption || null } }
	}
	return articleRules.validateBlock(value)
}

/**
 * Validates and normalizes an article document. Version-1 documents (no root
 * attributes) are accepted and returned as version 2.
 */
export function parseArticleRichText(value) {
	const document = documentShape(articleDocumentSchema, value)
	let version = 1
	if (document.attrs !== undefined) {
		const parsed = articleVersionSchema.safeParse(document.attrs)
		if (!parsed.success) throw new Error('The article text has an unknown document version. Reload the page and try again.')
		version = parsed.data.schemaVersion
	}
	return { type: 'doc', attrs: { schemaVersion: ARTICLE_DOCUMENT_VERSION }, content: validateBlocks(document.content, (block) => validateArticleBlock(block, version)) }
}

// Team profile -------------------------------------------------------------
// A profile document is an introduction and up to 20 titled sections, each
// with rich text and an optional endorsement (team-profile-document.ts).

const profileHrefSchema = z.string().url().max(2_048)

/** The profile link rule (a URL as Zod reads it). Returns an error message or null. */
export function profileLinkIssue(href) {
	return profileHrefSchema.safeParse(href).success ? null : 'Links must be complete web addresses, such as https://example.com.'
}

const profileTextSchema = z.object({
	type: z.literal('text'),
	text: z.string().min(1).max(10_000),
	marks: z.array(z.union([
		z.object({ type: z.literal('bold') }).strict(),
		z.object({ type: z.literal('italic') }).strict(),
		z.object({ type: z.literal('link'), attrs: z.object({
			href: profileHrefSchema,
			target: z.string().nullable().optional(),
			rel: z.string().nullable().optional(),
			class: z.string().nullable().optional(),
		}).strip() }).strict(),
	])).max(3).optional(),
}).strict()
const profileInlineSchema = z.array(z.union([profileTextSchema, z.object({ type: z.literal('hardBreak') }).strict()])).max(500)
const profileNodeSchema = z.object({ type: z.string(), content: z.unknown().optional(), attrs: z.unknown().optional() }).strict()
const profileListItemSchema = z.object({ type: z.literal('listItem'), content: z.array(z.unknown()).min(1).max(20) }).strict()
const profileListSchema = z.array(z.unknown()).min(1).max(100)
const profileDocumentSchema = z.object({ type: z.literal('doc'), content: z.array(z.unknown()).max(MAX_BLOCKS) }).strict()

function validateProfileInline(value) {
	return profileInlineSchema.parse(value).map((node) => {
		if (node.type === 'hardBreak') return node
		return {
			type: 'text',
			text: node.text,
			...(node.marks ? { marks: node.marks.map((mark) => (mark.type === 'link' ? { type: 'link', attrs: { href: mark.attrs.href } } : { type: mark.type })) } : {}),
		}
	})
}

function validateProfileBlock(value, depth = 0) {
	if (depth > 3) throw new Error('Profile list nesting may not exceed three levels.')
	const node = profileNodeSchema.parse(value)
	if (node.type === 'paragraph') return { type: 'paragraph', content: validateProfileInline(node.content ?? []) }
	if (node.type === 'bulletList') return { type: 'bulletList', content: profileListSchema.parse(node.content).map((item) => validateProfileListItem(item, depth + 1)) }
	if (node.type === 'orderedList') {
		const start = node.attrs === undefined ? 1 : z.object({ start: z.number().int().min(1).max(10_000) }).strict().parse(node.attrs).start
		return { type: 'orderedList', attrs: { start }, content: profileListSchema.parse(node.content).map((item) => validateProfileListItem(item, depth + 1)) }
	}
	throw new Error('The profile text contains an unsupported block. Use paragraphs and lists only.')
}

function validateProfileListItem(value, depth) {
	const item = profileListItemSchema.parse(value)
	return { type: 'listItem', content: item.content.map((block) => validateProfileBlock(block, depth)) }
}

/** Validates and normalizes one rich-text field of a team profile (the introduction or a section). */
export function parseProfileRichText(value) {
	const document = documentShape(profileDocumentSchema, value)
	return { type: 'doc', content: validateBlocks(document.content, (block) => validateProfileBlock(block)) }
}

const endorsementSchema = z.object({
	quote: z.string().trim().min(1).max(4_000),
	attribution: z.string().trim().min(1).max(240).optional(),
	role: z.string().trim().min(1).max(240).optional(),
}).strict()

const profileShapeSchema = z.object({
	version: z.literal(1),
	intro: z.object({ content: z.unknown(), endorsement: endorsementSchema.optional() }).strict(),
	sections: z.array(z.object({
		id: z.string().uuid(),
		title: z.string().trim().min(1).max(160),
		content: z.unknown(),
		endorsement: endorsementSchema.optional(),
	}).strict()).max(20),
}).strict()

const PROFILE_FIELD_NAMES = { attribution: 'attribution', endorsement: 'endorsement', quote: 'endorsement quote', role: 'attribution role', title: 'title' }

// "Section 2 title: This field is required." rather than the bare issue.
function profileShapeError(issue) {
	const [area, index, ...rest] = issue.path
	const part = area === 'intro' ? 'Introduction' : area === 'sections' && typeof index === 'number' ? `Section ${index + 1}` : 'The profile'
	const field = [...(area === 'intro' && index !== undefined ? [index] : []), ...rest].filter((segment) => typeof segment === 'string' && segment in PROFILE_FIELD_NAMES).map((segment) => PROFILE_FIELD_NAMES[segment]).pop()
	return new Error(`${part}${field ? ` ${field}` : ''}: ${issueMessage(issue)}`)
}

function profileText(value, part) {
	try {
		return parseProfileRichText(value)
	} catch (error) {
		throw new Error(`${part}: ${validationMessage(error)}`)
	}
}

/** Validates and normalizes a version-1 team profile document. */
export function parseTeamProfileDocument(value) {
	const shape = profileShapeSchema.safeParse(value)
	if (!shape.success) throw profileShapeError(shape.error.issues[0])
	const document = shape.data
	return {
		version: 1,
		intro: {
			content: profileText(document.intro.content, 'Introduction text'),
			...(document.intro.endorsement ? { endorsement: document.intro.endorsement } : {}),
		},
		sections: document.sections.map((section, index) => ({
			id: section.id,
			title: section.title,
			content: profileText(section.content, `Section ${index + 1} text`),
			...(section.endorsement ? { endorsement: section.endorsement } : {}),
		})),
	}
}
