import assert from 'node:assert/strict'
import test from 'node:test'

import { createRichTextRules, httpLinkIssue, validationMessage } from '../src/lib/rich-text-rules.mjs'

// The catalogue contract (src/lib/catalogue-document.ts) is these options.
// These cases pin its behaviour, which the legal contract must not change.
const catalogue = createRichTextRules({ unsupportedBlockMessage: 'The catalogue body contains an unsupported rich-text block.' })
const text = (value, marks) => (marks ? { type: 'text', text: value, marks } : { type: 'text', text: value })
const paragraph = (...content) => ({ type: 'paragraph', content })
const link = (href, extra = {}) => ({ type: 'link', attrs: { href, ...extra } })
const nest = (depth) => (depth === 0 ? paragraph(text('leaf')) : { type: 'bulletList', content: [{ type: 'listItem', content: [nest(depth - 1)] }] })
const message = (fn) => { try { fn(); return null } catch (error) { return validationMessage(error) } }

test('catalogue keeps bold, italic and http(s) links and normalizes marks', () => {
	assert.deepEqual(catalogue.validateBlock(paragraph(text('a', [{ type: 'bold', attrs: { x: 1 } }, { type: 'italic' }, link('  https://example.com/a  ')]), text('b', []))), {
		type: 'paragraph',
		content: [text('a', [{ type: 'bold' }, { type: 'italic' }, link('https://example.com/a')]), text('b')],
	})
	assert.deepEqual(catalogue.validateBlock({ type: 'paragraph', attrs: { textAlign: 'left' } }), { type: 'paragraph' })
	assert.deepEqual(catalogue.validateBlock({ type: 'blockquote', content: [text('q')] }), { type: 'blockquote', content: [text('q')] })
})

test('catalogue link rule accepts only complete http(s) URLs', () => {
	assert.equal(httpLinkIssue('https://example.com'), null)
	assert.equal(httpLinkIssue('http://example.com'), null)
	assert.equal(httpLinkIssue('javascript:alert(1)'), 'Links must use http or https URLs.')
	assert.equal(httpLinkIssue('mailto:a@b.c'), 'Links must use http or https URLs.')
	assert.equal(httpLinkIssue('/cookie-use'), 'Links must use complete http or https URLs.')
	assert.equal(httpLinkIssue('//evil.example'), 'Links must use complete http or https URLs.')
	assert.equal(message(() => catalogue.validateInline(text('a', [link('/cookie-use')]))), 'Links must use complete http or https URLs.')
	assert.equal(message(() => catalogue.validateInline(text('a', [link('https://example.com', { target: '_blank' })]))), 'Unsupported property: target.')
})

test('catalogue rejects hard breaks, images, tables and unknown marks', () => {
	assert.match(message(() => catalogue.validateBlock(paragraph(text('a'), { type: 'hardBreak' }))), /expected "text"/i)
	assert.equal(message(() => catalogue.validateBlock({ type: 'image', attrs: { src: 'https://example.com/a.png' } })), 'The catalogue body contains an unsupported rich-text block.')
	assert.equal(message(() => catalogue.validateBlock({ type: 'table', content: [] })), 'The catalogue body contains an unsupported rich-text block.')
	assert.ok(message(() => catalogue.validateInline(text('a', [{ type: 'strike' }]))))
})

test('catalogue headings, lists and limits', () => {
	assert.deepEqual(catalogue.validateBlock({ type: 'heading', attrs: { level: 3 }, content: [] }), { type: 'heading', attrs: { level: 3 }, content: [] })
	assert.ok(message(() => catalogue.validateBlock({ type: 'heading', attrs: { level: 1 }, content: [] })))
	assert.ok(message(() => catalogue.validateBlock({ type: 'heading', attrs: { level: 2, id: 'x' }, content: [] })))
	assert.doesNotThrow(() => catalogue.validateBlock(nest(3)))
	assert.equal(message(() => catalogue.validateBlock(nest(4))), 'Rich-text lists may be nested only three levels deep.')
	assert.deepEqual(catalogue.validateBlock({ type: 'orderedList', content: [{ type: 'listItem', content: [paragraph(text('1'))] }] }).attrs, { start: 1 })
	assert.ok(message(() => catalogue.validateBlock({ type: 'orderedList', attrs: { start: 1, type: null }, content: [{ type: 'listItem', content: [paragraph()] }] })))
	assert.ok(message(() => catalogue.validateBlock({ type: 'bulletList', content: [] })))
	assert.ok(message(() => catalogue.validateInline(text('a'.repeat(10_001)))))
	assert.ok(message(() => catalogue.validateInline(text('a', Array.from({ length: 9 }, () => ({ type: 'bold' }))))))
})
