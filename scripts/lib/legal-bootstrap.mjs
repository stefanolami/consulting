import { isDeepStrictEqual } from 'node:util'
import { readFile } from 'node:fs/promises'

import { hasLegalContent, parseLegalDocument } from '../../src/lib/legal-document.mjs'

// The fixed pages created by migration 20261005120000_legal_pages.sql.
export const LEGAL_PAGE_KEYS = ['privacy-policy', 'terms-and-conditions', 'cookie-use']

export async function loadLegalSeed(path) {
	return JSON.parse(await readFile(path, 'utf8'))
}

/**
 * Checks the checked-in seed: version 1, exactly the three keys once each, an
 * English title within the column limit, and a document that is valid and
 * already in its normalized form (so what is reviewed is what is inserted).
 */
export function validateLegalSeed(seed) {
	const issues = []
	if (seed?.version !== 1) issues.push('The seed must declare version 1.')
	const pages = Array.isArray(seed?.pages) ? seed.pages : []
	const keys = pages.map((page) => page.stableKey)
	for (const key of LEGAL_PAGE_KEYS) {
		const count = keys.filter((value) => value === key).length
		if (count !== 1) issues.push(`The seed must contain ${key} exactly once (found ${count}).`)
	}
	for (const key of keys) if (!LEGAL_PAGE_KEYS.includes(key)) issues.push(`Unknown legal page key: ${key}.`)
	for (const page of pages) {
		const label = page.stableKey ?? 'unknown page'
		if (page.locale !== 'en') issues.push(`${label}: the seed holds English text only.`)
		const title = typeof page.title === 'string' ? page.title.trim() : ''
		if (!title || title.length > 160 || title !== page.title) issues.push(`${label}: the title must be 1–160 characters without surrounding spaces.`)
		try {
			const normalized = parseLegalDocument(page.content)
			if (!isDeepStrictEqual(normalized, page.content)) issues.push(`${label}: the document is valid but not in normalized form.`)
			if (!hasLegalContent(normalized)) issues.push(`${label}: the document is empty.`)
		} catch (error) {
			issues.push(`${label}: ${error instanceof Error ? error.message : 'invalid document'}`)
		}
	}
	return { issues, pages }
}

/**
 * Plans the seed against the hosted state. Refuses when the canonical rows are
 * not all present (the migration is not applied). Otherwise each page is a
 * create (no English translation yet) or a skip (one exists, whatever its
 * status or content). Nothing is ever updated.
 *
 * @param {Array<{ stableKey: string; title: string; content: unknown }>} pages
 * @param {{ legalPages: Array<{ id: string; stable_key: string; is_active: boolean }>; translations: Array<{ legal_page_id: string; locale: string; title: string; content: unknown; status: string }> }} hosted
 */
export function createLegalPlan(pages, hosted) {
	const pageByKey = new Map(hosted.legalPages.map((page) => [page.stable_key, page]))
	const missing = LEGAL_PAGE_KEYS.filter((key) => !pageByKey.has(key))
	if (missing.length) return { refused: `Hosted legal_pages is missing ${missing.join(', ')}. Apply migration 20261005120000_legal_pages.sql first.`, entries: [], creates: [] }

	const entries = pages.map((page) => {
		const canonical = pageByKey.get(page.stableKey)
		const english = hosted.translations.find((translation) => translation.legal_page_id === canonical.id && translation.locale === 'en')
		if (!english) return { stableKey: page.stableKey, action: 'create', legalPageId: canonical.id, isActive: canonical.is_active }
		const differences = [
			english.title !== page.title ? 'title' : null,
			!isDeepStrictEqual(english.content, page.content) ? 'content' : null,
		].filter(Boolean)
		return { stableKey: page.stableKey, action: 'skip', legalPageId: canonical.id, isActive: canonical.is_active, status: english.status, differences }
	})
	const creates = entries.filter((entry) => entry.action === 'create').map((entry) => draftRow(pages.find((page) => page.stableKey === entry.stableKey), entry.legalPageId))
	return { refused: null, entries, creates }
}

/**
 * The only row the seed writes: an English draft with no "last updated" date.
 * Audit fields are left null (the service role has no auth.uid(), so the
 * trigger keeps them as sent); publication is a human step in the admin.
 */
export function draftRow(page, legalPageId) {
	return {
		legal_page_id: legalPageId,
		locale: 'en',
		title: page.title,
		content: page.content,
		status: 'draft',
		last_updated_on: null,
	}
}

export function formatLegalReport({ applyMode, issues, plan, hosted }) {
	const lines = [
		'LEGAL PAGES BOOTSTRAP',
		`Mode: ${applyMode ? 'APPLY (pre-apply report)' : 'DRY RUN (default)'}`,
		'',
		'LOCAL VALIDATION',
		`- Seed documents: ${LEGAL_PAGE_KEYS.length} expected`,
		`- Issues: ${issues.length}${issues.length ? `\n${issues.map((issue) => `  - ${issue}`).join('\n')}` : ''}`,
		'',
		'HOSTED SNAPSHOT (READ ONLY)',
		`- legal_pages rows: ${hosted.legalPages.length}${hosted.legalPages.length ? ` (${hosted.legalPages.map((page) => `${page.stable_key}${page.is_active ? '' : ' [inactive]'}`).join(', ')})` : ''}`,
		`- English translations: ${hosted.translations.filter((translation) => translation.locale === 'en').length}`,
		'',
		'PROPOSED OPERATIONS',
	]
	if (plan.refused) lines.push(`- REFUSED: ${plan.refused}`)
	for (const entry of plan.entries) {
		if (entry.action === 'create') lines.push(`- create ${entry.stableKey}: English draft, last_updated_on empty${entry.isActive ? '' : ' (page is inactive)'}`)
		else lines.push(`- skip ${entry.stableKey}: an English translation exists (status ${entry.status})${entry.differences.length ? `; its ${entry.differences.join(' and ')} differ${entry.differences.length === 1 ? 's' : ''} from the seed and will not be changed` : '; it matches the seed'}`)
	}
	lines.push(
		`- Totals: create ${plan.creates.length}, skip ${plan.entries.length - plan.creates.length}, update 0`,
		'',
		'SAFETY AND PUBLICATION',
		'- Inserts only missing English translations, as drafts with no "last updated" date.',
		'- Never updates or overwrites a translation, never publishes, never touches other locales or the canonical rows.',
		'- Publication is a human step in /admin/legal after legal review.',
	)
	return lines.join('\n')
}
