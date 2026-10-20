import assert from 'node:assert/strict'
import test from 'node:test'

import { cleanAlt, libraryAlt, resolveAlt } from '../src/lib/media-alt.mjs'
import { kindFromPath, MAX_MEDIA_FILE_BYTES, mediaFileProblem, mediaKinds, mediaObjectPath } from '../src/lib/media-rules.mjs'

const ROWS = [
	{ media_asset_id: 'energy', locale: 'en', alt_text: 'Energy sector icon.' },
	{ media_asset_id: 'energy', locale: 'de', alt_text: '  ' },
	{ media_asset_id: 'logo', locale: 'de', alt_text: 'Logo des Verbands' },
]

test('a use shows its own alt text when set, otherwise the library alt text', () => {
	assert.deepEqual(resolveAlt({ useAlt: 'Event organisation icon', libraryAlt: 'Energy sector icon.' }), { alt: 'Event organisation icon', source: 'use' })
	assert.deepEqual(resolveAlt({ useAlt: '   ', libraryAlt: 'Energy sector icon.' }), { alt: 'Energy sector icon.', source: 'library' })
	assert.deepEqual(resolveAlt({ useAlt: null, libraryAlt: null }), { alt: null, source: null })
	assert.deepEqual(resolveAlt({}), { alt: null, source: null })
})

test('two uses of one image keep their own alt text', () => {
	// The X-09 case: one icon file, two catalogue records.
	const library = libraryAlt(ROWS, 'energy', 'en')
	const energy = resolveAlt({ useAlt: null, libraryAlt: library })
	const eventOrganisation = resolveAlt({ useAlt: 'Event organisation icon', libraryAlt: library })
	assert.equal(energy.alt, 'Energy sector icon.')
	assert.equal(eventOrganisation.alt, 'Event organisation icon')
})

test('library alt text is read per locale, with an optional fallback locale', () => {
	assert.equal(libraryAlt(ROWS, 'energy', 'en'), 'Energy sector icon.')
	assert.equal(libraryAlt(ROWS, 'energy', 'de'), null, 'whitespace is no alt text')
	assert.equal(libraryAlt(ROWS, 'energy', 'de', { fallbackLocale: 'en' }), 'Energy sector icon.')
	assert.equal(libraryAlt(ROWS, 'logo', 'en'), null)
	assert.equal(libraryAlt(ROWS, null, 'en'), null)
	assert.equal(libraryAlt(null, 'energy', 'en'), null)
	assert.equal(cleanAlt(' Flag of Romania '), 'Flag of Romania')
	assert.equal(cleanAlt(42), null)
})

test('files are refused with a sentence that names the file and the rule', () => {
	assert.equal(mediaFileProblem({ name: 'logo.png', type: 'image/png', size: 2_000 }), null)
	assert.equal(mediaFileProblem({ name: 'brochure.pdf', type: 'application/pdf', size: 2_000 }), null)
	assert.match(mediaFileProblem({ name: 'brochure.pdf', type: 'application/pdf', size: 2_000 }, { imagesOnly: true }), /“brochure\.pdf” is a PDF file\. Choose an image: GIF, JPEG, PNG, SVG or WebP\./)
	assert.match(mediaFileProblem({ name: 'notes.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 10 }), /“notes\.docx” is a \.docx file\. Choose an image or a PDF: GIF, JPEG, PNG, SVG, WebP or PDF\./)
	assert.match(mediaFileProblem({ name: 'alberto.png', type: 'image/png', size: 19.3 * 1024 * 1024 }), /“alberto\.png” is 19\.3 MiB\. Files can be up to 15 MiB: export a smaller version/)
	assert.equal(mediaFileProblem({ name: 'edge.png', type: 'image/png', size: MAX_MEDIA_FILE_BYTES }), null)
	assert.match(mediaFileProblem({ name: 'empty.png', type: 'image/png', size: 0 }), /is empty/)
	assert.match(mediaFileProblem(null), /This file is a file of an unknown type/)
})

test('new uploads keep their kind in the Storage path', () => {
	const now = new Date('2026-10-20T12:00:00Z')
	assert.equal(mediaObjectPath('logo', 'image/svg+xml', { now, uuid: 'u' }), 'library/logo/2026/10/u.svg')
	assert.equal(mediaObjectPath(null, 'image/jpeg', { now, uuid: 'u' }), 'library/other/2026/10/u.jpg')
	assert.equal(mediaObjectPath('nonsense', 'application/pdf', { now, uuid: 'u' }), 'library/other/2026/10/u.pdf')
	assert.throws(() => mediaObjectPath('logo', 'text/html', { now, uuid: 'u' }), /Unsupported/)
	assert.equal(kindFromPath('library/logo/2026/10/u.svg'), 'logo')
	assert.equal(kindFromPath('library/2026/10/u.svg'), null)
	assert.equal(kindFromPath('people/abc/u.jpg'), 'portrait')
	assert.equal(kindFromPath('catalogue/sectors/abc/u.png'), 'icon')
	assert.equal(kindFromPath('newsroom/abc/u.png'), 'cover')
})

test('an asset belongs to the kinds of its uses and of its upload path', () => {
	assert.deepEqual(mediaKinds({ objectPath: 'library/2026/10/u.png', references: [{ type: 'Person' }, { type: 'Partner' }, { type: 'Endorsement' }] }), ['portrait', 'logo'])
	assert.deepEqual(mediaKinds({ objectPath: 'library/flag/2026/10/u.svg' }), ['flag'])
	assert.deepEqual(mediaKinds({ objectPath: 'visual-test/x.png', references: [{ type: 'Country outline' }, { type: 'Article inline image' }] }), ['cover', 'flag'])
	assert.deepEqual(mediaKinds({ objectPath: 'library/2026/10/u.png' }), [])
})
