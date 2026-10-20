import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { fromEditorDocument, toEditorDocument } from '../src/lib/editor-document.mjs'
import { parseLegalDocument, safeParseLegalDocument } from '../src/lib/legal-document.mjs'
import { parseArticleRichText, parseCatalogueRichText, parseProfileRichText, parseTeamProfileDocument, profileLinkIssue } from '../src/lib/rich-text-contracts.mjs'
import { validationMessage } from '../src/lib/rich-text-rules.mjs'

// Raw editor.getJSON() output of the admin editors, captured in Chrome
// (scripts/data/tiptap-editor-output.json): auto-linked URLs, dialog links,
// numbered lists, headings and quotations.
const editorOutput = JSON.parse(await readFile(new URL('./data/tiptap-editor-output.json', import.meta.url), 'utf8'))

const text = (value, marks) => (marks ? { type: 'text', text: value, marks } : { type: 'text', text: value })
const link = (href) => ({ type: 'link', attrs: { href } })
const paragraph = (...content) => (content.length ? { type: 'paragraph', content } : { type: 'paragraph' })
const item = (...content) => ({ type: 'listItem', content })
const numbered = (...labels) => ({ type: 'orderedList', attrs: { start: 1 }, content: labels.map((label) => item(paragraph(text(label)))) })
const quote = (value) => ({ type: 'blockquote', content: [text(value)] })
const errorOf = (parse, value) => { try { parse(value); return null } catch (error) { return validationMessage(error) } }

const autoLinked = paragraph(text('Slice 2 check: read '), text('https://example.com/slice-2', [link('https://example.com/slice-2')]), text(' for details. '))
const dialogLinked = paragraph(text('Linked through the dialog', [link('https://www.timeandplace.example/about')]))
const heading = { type: 'heading', attrs: { level: 2 }, content: [text('Slice 2 heading')] }
const listItems = numbered('First numbered item', 'Second numbered item')

// Cleaning -----------------------------------------------------------------

test('cleaning keeps only href on links and start on numbered lists', () => {
	const cleaned = fromEditorDocument({ type: 'doc', content: [
		{ type: 'paragraph', attrs: { textAlign: null }, content: [{ type: 'text', marks: [{ type: 'link', attrs: { href: 'https://a.example', target: '_blank', rel: 'noopener noreferrer nofollow', class: null, title: 'A' } }, { type: 'bold' }], text: 'a' }, { type: 'text', text: 'b', marks: [] }] },
		{ type: 'orderedList', attrs: { start: 3, type: null }, content: [item(paragraph(text('three')))] },
		{ type: 'orderedList', attrs: { type: 'a' }, content: [item(paragraph(text('one')))] },
	] })
	assert.deepEqual(cleaned, { type: 'doc', content: [
		paragraph(text('a', [link('https://a.example'), { type: 'bold' }]), text('b')),
		{ type: 'orderedList', attrs: { start: 3 }, content: [item(paragraph(text('three')))] },
		{ type: 'orderedList', content: [item(paragraph(text('one')))] },
	] })
})

test('cleaning stores each paragraph of a quotation as a quotation of text, in order', () => {
	const cleaned = fromEditorDocument({ type: 'doc', content: [
		{ type: 'blockquote', content: [paragraph(text('one')), paragraph(), paragraph(text('two', [{ type: 'italic' }]))] },
		{ type: 'bulletList', content: [item({ type: 'blockquote', content: [paragraph(text('nested'))] })] },
		{ type: 'blockquote', content: [paragraph()] },
	] })
	assert.deepEqual(cleaned.content, [
		quote('one'),
		{ type: 'blockquote', content: [text('two', [{ type: 'italic' }])] },
		{ type: 'bulletList', content: [item(quote('nested'))] },
		{ type: 'blockquote' },
	])
})

test('cleaning leaves unsupported structures for the validator to explain', () => {
	const listInQuote = { type: 'doc', content: [{ type: 'blockquote', content: [paragraph(text('a')), { type: 'bulletList', content: [item(paragraph(text('b')))] }] }] }
	assert.deepEqual(fromEditorDocument(listInQuote), listInQuote)
	assert.equal(errorOf(parseCatalogueRichText, fromEditorDocument(listInQuote)), 'Block 1 (quotation): A quotation may contain only text. Move lists and headings out of the quotation.')
	// Hard breaks lose the marks they inherit; empty paragraphs stay.
	assert.deepEqual(fromEditorDocument(paragraph(text('a'), { type: 'hardBreak', marks: [{ type: 'bold' }] })), paragraph(text('a'), { type: 'hardBreak' }))
	assert.deepEqual(fromEditorDocument({ type: 'doc', content: [paragraph(text('a')), paragraph()] }).content.length, 2)
})

test('stored quotations load into the editor as TipTap expects and come back unchanged', () => {
	const stored = { type: 'doc', content: [quote('one'), { type: 'blockquote' }, { type: 'bulletList', content: [item(quote('nested'))] }, autoLinked] }
	const loaded = toEditorDocument(stored)
	assert.deepEqual(loaded.content[0], { type: 'blockquote', content: [paragraph(text('one'))] })
	assert.deepEqual(loaded.content[1], { type: 'blockquote', content: [paragraph()] })
	assert.deepEqual(loaded.content[2].content[0].content[0], { type: 'blockquote', content: [paragraph(text('nested'))] })
	assert.deepEqual(fromEditorDocument(loaded), stored)
})

// Contracts with real editor output ----------------------------------------

test('raw editor output is refused, which is why the editor cleans it', () => {
	assert.equal(errorOf(parseCatalogueRichText, editorOutput.catalogue), 'Block 3 (paragraph): Unsupported properties: target, rel, class, title.')
	assert.match(errorOf(parseArticleRichText, editorOutput.article), /^Block 2 \(paragraph\): Unsupported properties/)
	assert.match(errorOf(parseProfileRichText, editorOutput.profile), /^Block 4 \(numbered list\): /)
	assert.match(safeParseLegalDocument(editorOutput.legal).error, /^Block 1 \(paragraph\): Unsupported properties/)
})

test('catalogue: auto-links, dialog links, a heading, a numbered list and a two-paragraph quotation', () => {
	const document = parseCatalogueRichText(fromEditorDocument(editorOutput.catalogue))
	assert.deepEqual(document.content.slice(2), [autoLinked, dialogLinked, heading, listItems, quote('A quotation for the slice 2 check.'), quote('Its second paragraph.'), paragraph()])
	// Saving the stored document again changes nothing.
	assert.deepEqual(parseCatalogueRichText(fromEditorDocument(toEditorDocument(document))), document)
})

test('country content and country service copy use the catalogue contract', () => {
	assert.deepEqual(parseCatalogueRichText(fromEditorDocument(editorOutput.country)).content, [autoLinked, dialogLinked, heading, listItems, quote('A quotation for the slice 2 check.'), paragraph()])
	assert.deepEqual(parseCatalogueRichText(fromEditorDocument(editorOutput.countryServiceCopy)).content, [
		paragraph(text('Service copy with '), text('https://example.com/research', [link('https://example.com/research')]), text(' linked. ')),
		numbered('Step one', 'Step two'),
		paragraph(),
	])
})

test('article: the same blocks next to a managed image, as a version 2 document', () => {
	const document = parseArticleRichText(fromEditorDocument(editorOutput.article))
	assert.deepEqual(document.attrs, { schemaVersion: 2 })
	assert.deepEqual(document.content, [
		{ type: 'articleImage', attrs: { mediaId: '13d7ed0a-f265-4875-84ca-42bc89ba6624', alt: 'Open office doors at Time&Place', caption: 'Open office doors', layout: 'content' } },
		autoLinked, dialogLinked, heading, listItems, quote('A quotation for the slice 2 check.'), paragraph(),
	])
	assert.equal(errorOf(parseArticleRichText, { ...editorOutput.article, content: [{ type: 'articleImage', attrs: { mediaId: '13d7ed0a-f265-4875-84ca-42bc89ba6624', alt: '', caption: null, layout: 'content' } }] }), 'Block 1 (image): Article images need localized alternative text.')
	// Version-1 documents (no root attributes) are still accepted.
	assert.deepEqual(parseArticleRichText({ type: 'doc', content: [paragraph(text('old'))] }), { type: 'doc', attrs: { schemaVersion: 2 }, content: [paragraph(text('old'))] })
})

test('profile: links, a line break and a numbered list; no headings or quotations', () => {
	const content = parseProfileRichText(fromEditorDocument(editorOutput.profile)).content
	assert.deepEqual(content, [autoLinked, dialogLinked, paragraph({ type: 'hardBreak' }, text('after a line break')), listItems, { type: 'paragraph', content: [] }])
	const document = parseTeamProfileDocument({ version: 1, intro: { content: fromEditorDocument(editorOutput.profile) }, sections: [] })
	assert.deepEqual(document.intro.content.content, content)
	assert.equal(errorOf(parseTeamProfileDocument, { version: 1, intro: { content: { type: 'doc', content: [] } }, sections: [{ id: '3a2f5a0b-91ad-43d0-b2ad-b6c47044efc1', title: 'Career', content: { type: 'doc', content: [heading] } }] }), 'Section 1 text: Block 1 (heading): The profile text contains an unsupported block. Use paragraphs and lists only.')
	assert.equal(errorOf(parseTeamProfileDocument, { version: 1, intro: { content: { type: 'doc', content: [] } }, sections: [{ id: '3a2f5a0b-91ad-43d0-b2ad-b6c47044efc1', title: ' ', content: { type: 'doc', content: [] } }] }), 'Section 1 title: This field is required.')
	assert.equal(profileLinkIssue('https://example.com'), null)
	assert.ok(profileLinkIssue('example.com'))
})

test('profile links: only http, https and mailto', () => {
	for (const href of ['https://example.com', 'http://example.com/path?q=1', 'mailto:name@example.com', 'mailto:first.last@time-place.eu?subject=Hello']) {
		assert.equal(profileLinkIssue(href), null, href)
	}
	for (const href of ['javascript:alert(1)', 'JavaScript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox', 'tel:+40123', 'ftp://example.com', 'mailto:', 'mailto:not-an-address', 'https://', '/who-we-are', '//evil.example']) {
		assert.ok(profileLinkIssue(href), href)
	}
	assert.equal(profileLinkIssue('javascript:alert(1)'), 'Links must use https, http or mailto.')
	const withLink = (href) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Contact', marks: [{ type: 'link', attrs: { href } }] }] }] })
	assert.deepEqual(parseProfileRichText(withLink('mailto:name@example.com')).content[0].content[0].marks, [{ type: 'link', attrs: { href: 'mailto:name@example.com' } }])
	assert.throws(() => parseProfileRichText(withLink('javascript:alert(1)')), /https, http or mailto/)
	assert.throws(() => parseProfileRichText(withLink('data:text/html,x')), /https, http or mailto/)
})

test('legal: site-path links, a heading, a numbered list and a quotation', () => {
	const document = parseLegalDocument(fromEditorDocument(editorOutput.legal))
	assert.deepEqual(document.content, [autoLinked, paragraph(text('See the cookie notice', [link('/cookie-use')])), heading, listItems, quote('A quotation for the slice 2 check.'), paragraph()])
})

test('errors name the block and never contain JSON', () => {
	const cases = [
		[parseCatalogueRichText, { type: 'doc', content: [paragraph(text('a')), { type: 'table', content: [] }] }, 'Block 2: The catalogue body contains an unsupported rich-text block.'],
		[parseCatalogueRichText, { type: 'doc', content: [paragraph(text('a', [link('mailto:a@b.example')]))] }, 'Block 1 (paragraph): Links must use http or https URLs.'],
		[parseCatalogueRichText, { type: 'doc', content: Array.from({ length: 201 }, () => paragraph()) }, 'The text may have at most 200 top-level blocks.'],
		[parseArticleRichText, { type: 'doc', attrs: { schemaVersion: 9 }, content: [] }, 'The article text has an unknown document version. Reload the page and try again.'],
		[parseCatalogueRichText, 'not a document', 'The text is not a valid rich-text document. Reload the page and try again.'],
	]
	for (const [parse, value, message] of cases) {
		const error = errorOf(parse, value)
		assert.equal(error, message)
		assert.doesNotMatch(error, /[[{]"/)
	}
})
