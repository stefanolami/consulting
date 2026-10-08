import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { legalDocumentText } from '../src/lib/legal-document.mjs'
import { createLegalPlan, draftRow, LEGAL_PAGE_KEYS, loadLegalSeed, validateLegalSeed } from './lib/legal-bootstrap.mjs'

const seed = await loadLegalSeed(new URL('./data/legal-pages.json', import.meta.url))
const { issues, pages } = validateLegalSeed(seed)
const pageOf = (key) => pages.find((page) => page.stableKey === key)
const headings = (key) => pageOf(key).content.content.filter((block) => block.type === 'heading').map((block) => block.content.map((node) => node.text).join(''))
const hostedPages = LEGAL_PAGE_KEYS.map((stable_key, index) => ({ id: `00000000-0000-4000-8000-00000000000${index + 1}`, stable_key, is_active: true }))
const idOf = (key) => hostedPages.find((page) => page.stable_key === key).id

test('the checked-in seed is valid, normalized and English-only', () => {
	assert.deepEqual(issues, [])
	assert.deepEqual(pages.map((page) => [page.stableKey, page.locale, page.title]), [
		['privacy-policy', 'en', 'Privacy Policy'],
		['terms-and-conditions', 'en', 'Terms and Conditions'],
		['cookie-use', 'en', 'Cookie Use'],
	])
})

test('validation reports a broken seed', () => {
	const broken = structuredClone(seed)
	broken.pages[0].content.content.push({ type: 'image', attrs: {} })
	broken.pages[1].title = ' Terms '
	broken.pages.pop()
	const result = validateLegalSeed(broken)
	assert.ok(result.issues.some((issue) => issue.startsWith('privacy-policy: Block')))
	assert.ok(result.issues.some((issue) => issue.startsWith('terms-and-conditions: the title')))
	assert.ok(result.issues.includes('The seed must contain cookie-use exactly once (found 0).'))
})

test('a fresh project gets three English drafts and nothing else', () => {
	const plan = createLegalPlan(pages, { legalPages: hostedPages, translations: [] })
	assert.equal(plan.refused, null)
	assert.deepEqual(plan.entries.map((entry) => entry.action), ['create', 'create', 'create'])
	assert.equal(plan.creates.length, 3)
	for (const row of plan.creates) {
		assert.deepEqual(Object.keys(row).sort(), ['content', 'last_updated_on', 'legal_page_id', 'locale', 'status', 'title'])
		assert.equal(row.status, 'draft')
		assert.equal(row.locale, 'en')
		assert.equal(row.last_updated_on, null)
	}
})

test('an existing English translation is never overwritten, whatever its state', () => {
	const translations = [
		{ legal_page_id: idOf('privacy-policy'), locale: 'en', title: 'Privacy Policy', content: pageOf('privacy-policy').content, status: 'draft' },
		{ legal_page_id: idOf('cookie-use'), locale: 'en', title: 'Cookies', content: { type: 'doc', attrs: { schemaVersion: 1 }, content: [] }, status: 'published' },
		{ legal_page_id: idOf('terms-and-conditions'), locale: 'de', title: 'AGB', content: {}, status: 'draft' },
	]
	const plan = createLegalPlan(pages, { legalPages: hostedPages, translations })
	assert.deepEqual(plan.entries.map((entry) => [entry.stableKey, entry.action, entry.differences ?? null]), [
		['privacy-policy', 'skip', []],
		['terms-and-conditions', 'create', null],
		['cookie-use', 'skip', ['title', 'content']],
	])
	assert.deepEqual(plan.creates.map((row) => row.legal_page_id), [idOf('terms-and-conditions')])
})

test('planning is idempotent: after the drafts exist, a rerun creates nothing', () => {
	const first = createLegalPlan(pages, { legalPages: hostedPages, translations: [] })
	const translations = first.creates.map((row) => ({ ...row }))
	const second = createLegalPlan(pages, { legalPages: hostedPages, translations })
	assert.equal(second.creates.length, 0)
	assert.ok(second.entries.every((entry) => entry.action === 'skip' && !entry.differences.length))
})

test('the plan is refused while the migration rows are missing', () => {
	const plan = createLegalPlan(pages, { legalPages: hostedPages.slice(0, 2), translations: [] })
	assert.match(plan.refused, /missing cookie-use/)
	assert.deepEqual(plan.creates, [])
})

test('draft rows carry no audit or publication fields', () => {
	const row = draftRow(pageOf('cookie-use'), idOf('cookie-use'))
	for (const field of ['created_by', 'updated_by', 'published_at', 'scheduled_for']) assert.equal(field in row, false, field)
})

test('transcription keeps the legacy section headings', () => {
	assert.deepEqual(headings('privacy-policy'), ['1. Data Controller', '2. Data We Collect', '3. Legal Basis for Processing', '4. How We Use Your Data', '5. Data Retention', '6. Sharing Your Data', '7. International Data Transfers', '8. Your Rights Under GDPR', '9. Security of Your Data', '10. Cookies and Tracking Technologies', '11. Marketing Communications', '12. Third-Party Links', '13. Changes to This Privacy Policy', '14. Contact Us'])
	assert.deepEqual(headings('terms-and-conditions'), ['1. General Information', '2. Use of the Website', '3. Website Content', '4. User Accounts', '5. Privacy and Data Protection', '6. Cookies', '7. Intellectual Property', '8. Third-Party Links', '9. Limitation of Liability', '10. Indemnification', '11. Modifications to Terms and Website', '12. Governing Law and Jurisdiction', '13. Contact Us'])
	assert.deepEqual(headings('cookie-use'), ['1. What Are Cookies?', '2. Types of Cookies Used on This Website', '3. The categories of cookies used are:', '4. Legal Basis for Using Cookies', '5. Managing Your Cookie Preferences', '6. Third-Party Cookies', '7. Data Collected via Cookies', '8. Data Retention', '9. Your Rights', '10. Contact Us'])
})

test('transcription keeps key sentences, addresses, links and categories', () => {
	const privacy = legalDocumentText(pageOf('privacy-policy').content)
	assert.ok(privacy.includes('Time&Place Group\nRue de la Loi 81A,\n1040 Brussels,\nBelgium\nEmail: info@consultingontap.com'))
	assert.ok(privacy.includes('also known as the "right to be forgotten."'))
	assert.ok(privacy.includes('We do not sell or rent your personal data to third parties.'))
	const terms = legalDocumentText(pageOf('terms-and-conditions').content)
	assert.ok(terms.includes('Time&Place Funding is a Brussels-based provider of public funding advisory and consulting services.'))
	assert.ok(terms.includes('The website and its content are provided "as is" without any warranties, express or implied.'))
	const cookies = legalDocumentText(pageOf('cookie-use').content)
	assert.ok(cookies.includes('Strictly Necessary Cookies\nThese cookies are essential for the functioning of the website.'))
	assert.ok(cookies.includes('Analytical/Performance Cookies*\n'))
	assert.ok(cookies.includes('helps us optimize the website’s performance.'))
	assert.ok(cookies.includes('Right to erasure ("right to be forgotten") – You may request the deletion of your data under certain conditions.'))
	assert.equal(cookies.includes('tp_contact_form'), false, 'the proposed tp_contact_form wording is not seeded')

	const hrefs = (key) => JSON.stringify(pageOf(key).content).match(/"href":"[^"]+"/g)
	assert.deepEqual(hrefs('privacy-policy'), ['"href":"/cookie-use"', '"href":"/cookie-use"'])
	assert.deepEqual(hrefs('terms-and-conditions'), ['"href":"/privacy-policy"', '"href":"/cookie-use"'])
	assert.deepEqual(hrefs('cookie-use'), [
		'"href":"https://support.google.com/chrome/answer/95647?hl=en"',
		'"href":"https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop?redirectslug=enable-and-disable-cookies-website-preferences&redirectlocale=en-US"',
		'"href":"https://support.microsoft.com/en-us/windows/manage-cookies-in-microsoft-edge-view-allow-block-delete-and-use-168dab11-0753-043d-7c16-ede5947fc64d"',
		'"href":"https://support.apple.com/ro-ro/guide/safari/sfri11471/mac"',
		'"href":"/privacy-policy"',
	])
	const categories = pageOf('cookie-use').content.content.find((block) => block.type === 'orderedList')
	assert.deepEqual(categories.content.map((item) => item.content[0].content.slice(0, 2).map((node) => node.type === 'hardBreak' ? 'BR' : `${node.text}|${node.marks?.[0]?.type}`)), [
		['Strictly Necessary Cookies|bold', 'BR'],
		['Analytical/Performance Cookies*|bold', 'BR'],
		['Functional Cookies|bold', 'BR'],
		['Targeting/Advertising Cookies|bold', 'BR'],
	])
})

// The legacy site is a git-ignored local reference (control tower §4.3). When
// it is present, the whole text must match it word for word.
test('the wording matches the legacy JSX exactly (when the legacy site is present)', async (context) => {
	for (const key of LEGAL_PAGE_KEYS) {
		let source
		try {
			source = await readFile(new URL(`../old-consulting/src/app/${key}/page.jsx`, import.meta.url), 'utf8')
		} catch (error) {
			if (error.code === 'ENOENT') return context.skip('old-consulting is not present')
			throw error
		}
		const body = source.slice(source.indexOf('<div className="space-y-6'), source.lastIndexOf('</div>'))
		const legacy = body.replace(/\{' '\}/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/\s+/g, '')
		const seeded = legalDocumentText(pageOf(key).content).replace(/\s+/g, '')
		assert.equal(seeded, legacy, `${key} wording differs from the legacy page`)
	}
})
