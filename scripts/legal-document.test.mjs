import assert from 'node:assert/strict'
import test from 'node:test'

import {
	emptyLegalDocument,
	fromEditorDocument,
	hasLegalContent,
	isInternalLegalHref,
	legalDocumentText,
	legalLinkIssue,
	parseLegalDocument,
	safeParseLegalDocument,
} from '../src/lib/legal-document.mjs'

const text = (value, marks) => (marks ? { type: 'text', text: value, marks } : { type: 'text', text: value })
const paragraph = (...content) => ({ type: 'paragraph', content })
const doc = (...content) => ({ type: 'doc', attrs: { schemaVersion: 1 }, content })
const link = (href) => ({ type: 'link', attrs: { href } })
const item = (...content) => ({ type: 'listItem', content })
const nest = (depth) => (depth === 0 ? paragraph(text('leaf')) : { type: 'bulletList', content: [item(nest(depth - 1))] })
const errorOf = (value) => { const result = safeParseLegalDocument(value); return result.success ? null : result.error }

test('the empty document is valid and matches the column default', () => {
	assert.deepEqual(emptyLegalDocument(), { type: 'doc', attrs: { schemaVersion: 1 }, content: [] })
	assert.deepEqual(parseLegalDocument(emptyLegalDocument()), emptyLegalDocument())
	assert.equal(hasLegalContent(emptyLegalDocument()), false)
})

test('the root must be a version-1 document', () => {
	assert.equal(errorOf({ type: 'doc', content: [] }), 'The content is not a version-1 legal document.')
	assert.equal(errorOf({ type: 'doc', attrs: { schemaVersion: 2 }, content: [] }), 'The content is not a version-1 legal document.')
	assert.equal(errorOf({ type: 'doc', attrs: { schemaVersion: 1, extra: true }, content: [] }), 'The content is not a version-1 legal document.')
	assert.equal(errorOf(null), 'The content is not a version-1 legal document.')
	assert.equal(errorOf('<p>html</p>'), 'The content is not a version-1 legal document.')
})

test('hard breaks are allowed in paragraphs and list items, without attributes or marks', () => {
	const address = doc(paragraph(text('Time&Place Group'), { type: 'hardBreak' }, text('Rue de la Loi 81A,')))
	assert.deepEqual(parseLegalDocument(address), address)
	const category = doc({ type: 'orderedList', attrs: { start: 1 }, content: [item(paragraph(text('Strictly Necessary Cookies', [{ type: 'bold' }]), { type: 'hardBreak' }, text('These cookies…')))] })
	assert.deepEqual(parseLegalDocument(category), category)
	assert.match(errorOf(doc(paragraph({ type: 'hardBreak', attrs: { x: 1 } }))), /^Block 1 \(paragraph\): Unsupported property: attrs\.$/)
	assert.match(errorOf(doc(paragraph({ type: 'hardBreak', marks: [{ type: 'bold' }] }))), /Unsupported property: marks/)
})

test('internal links are root-relative paths without a locale segment', () => {
	for (const href of ['/', '/cookie-use', '/privacy-policy', '/who-we-are/glenn-cezanne', '/english']) assert.equal(isInternalLegalHref(href), true, href)
	for (const href of ['/de/cookie-use', '/en/cookie-use', '/pt-br/cookie-use', '/pt-BR/cookie-use', '/de', '//evil.example', '/Cookie-Use', '/cookie-use?x=1', '/cookie-use#top', '/a.b', 'cookie-use']) assert.equal(isInternalLegalHref(href), false, href)
	assert.equal(legalLinkIssue('/cookie-use'), null)
	assert.match(legalLinkIssue('/de/cookie-use'), /must not start with a language/)
	assert.match(legalLinkIssue('/pt-pt'), /must not start with a language/)
	assert.match(legalLinkIssue('//evil.example'), /single slash/)
	assert.match(legalLinkIssue('/Cookie-Use'), /lowercase letters/)
	assert.match(legalLinkIssue('/cookie-use?x=1'), /lowercase letters/)
	const internal = doc(paragraph(text('Cookie Policy', [link('/cookie-use')])))
	assert.deepEqual(parseLegalDocument(internal), internal)
})

test('external links keep the catalogue rules; javascript: and mailto: are rejected', () => {
	const external = doc(paragraph(text('Chrome', [link('https://support.google.com/chrome/answer/95647?hl=en')])))
	assert.deepEqual(parseLegalDocument(external), external)
	assert.equal(errorOf(doc(paragraph(text('x', [link('javascript:alert(1)')])))), 'Block 1 (paragraph): Links must use http or https URLs.')
	assert.equal(errorOf(doc(paragraph(text('x', [link('mailto:info@consultingontap.com')])))), 'Block 1 (paragraph): Links must use http or https URLs.')
	assert.equal(errorOf(doc(paragraph(text('x', [link('cookie-use')])))), 'Block 1 (paragraph): Links must use complete http or https URLs.')
	assert.equal(errorOf(doc(paragraph(text('x', [{ type: 'link', attrs: { href: 'https://a.example', target: '_blank' } }])))), 'Block 1 (paragraph): Unsupported property: target.')
	assert.match(errorOf(doc(paragraph(text('x', [link(`https://example.com/${'a'.repeat(2_100)}`)])))), /^Block 1 \(paragraph\): /)
})

test('tables, images and other blocks are rejected with the block position', () => {
	assert.equal(errorOf(doc(paragraph(text('ok')), { type: 'table', content: [] })), 'Block 2: The legal document contains an unsupported block. Use paragraphs, headings, lists and quotations only.')
	assert.match(errorOf(doc({ type: 'image', attrs: { src: 'https://example.com/a.png' } })), /^Block 1: The legal document contains an unsupported block/)
	assert.match(errorOf(doc({ type: 'articleImage', attrs: {} })), /unsupported block/)
	assert.match(errorOf(doc({ type: 'heading', attrs: { level: 1 }, content: [text('H')] })), /^Block 1 \(heading\): /)
	assert.match(errorOf(doc(paragraph(text('x', [{ type: 'strike' }])))), /^Block 1 \(paragraph\): /)
})

test('depth and size limits', () => {
	assert.doesNotThrow(() => parseLegalDocument(doc(nest(3))))
	assert.equal(errorOf(doc(nest(4))), 'Block 1 (bulleted list): Rich-text lists may be nested only three levels deep.')
	assert.doesNotThrow(() => parseLegalDocument(doc(...Array.from({ length: 200 }, () => paragraph()))))
	assert.equal(errorOf(doc(...Array.from({ length: 201 }, () => paragraph()))), 'The legal document may have at most 200 top-level blocks.')
	assert.match(errorOf(doc(paragraph(text('a'.repeat(10_001))))), /^Block 1 \(paragraph\): /)
	assert.match(errorOf(doc({ type: 'bulletList', content: Array.from({ length: 101 }, () => item(paragraph())) })), /^Block 1 \(bulleted list\): /)
})

test('fromEditorDocument removes only TipTap editor attributes', () => {
	const fromEditor = {
		type: 'doc',
		attrs: { schemaVersion: 1 },
		content: [
			{ type: 'paragraph', attrs: { textAlign: null }, content: [
				{ type: 'text', text: 'Policy', marks: [{ type: 'link', attrs: { href: '/cookie-use', target: '_blank', rel: 'noopener noreferrer nofollow', class: null, title: null } }] },
				{ type: 'hardBreak', marks: [{ type: 'bold' }] },
				{ type: 'text', text: 'plain', marks: [] },
			] },
			{ type: 'orderedList', attrs: { start: 1, type: null }, content: [item(paragraph(text('one')))] },
		],
	}
	const cleaned = fromEditorDocument(fromEditor)
	assert.deepEqual(parseLegalDocument(cleaned), doc(
		paragraph(text('Policy', [link('/cookie-use')]), { type: 'hardBreak' }, text('plain')),
		{ type: 'orderedList', attrs: { start: 1 }, content: [item(paragraph(text('one')))] },
	))
	// Anything else is left for the validator to reject.
	assert.ok(errorOf(fromEditorDocument(doc({ type: 'image', attrs: { src: 'x' } }))))
	assert.ok(errorOf(fromEditorDocument(doc(paragraph(text('x', [{ type: 'strike' }]))))))
})

test('legalDocumentText joins blocks and keeps hard breaks', () => {
	const value = doc(
		{ type: 'heading', attrs: { level: 2 }, content: [text('1. Data Controller')] },
		paragraph(text('Time&Place Group'), { type: 'hardBreak' }, text('Belgium')),
		{ type: 'bulletList', content: [item(paragraph(text('a'))), item(paragraph(text('b')))] },
	)
	assert.equal(legalDocumentText(value), '1. Data Controller\n\nTime&Place Group\nBelgium\n\na\n\nb')
	assert.equal(hasLegalContent(value), true)
})
