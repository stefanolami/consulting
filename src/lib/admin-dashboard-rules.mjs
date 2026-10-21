// The admin dashboard's rules (audit DASH-01 to DASH-04, control tower §12.1,
// slice 5a). The data module (admin-dashboard.ts) reads counts and short
// lists; these functions decide what they mean. Plain JavaScript with a
// `.d.mts` declaration so the node:test suites can import it.

import { cleanAlt } from './media-alt.mjs'

/** "Scheduled soon" looks this many days ahead. */
export const SCHEDULE_WINDOW_DAYS = 14

/** How many items each dashboard list shows. */
export const DASHBOARD_LIST_LIMIT = 8

/** The scheduling window from `now`, as UTC ISO strings. */
export function scheduleWindow(now = new Date(), days = SCHEDULE_WINDOW_DAYS) {
	const from = new Date(now.getTime())
	return { from: from.toISOString(), to: new Date(from.getTime() + days * 86_400_000).toISOString() }
}

function time(value) {
	const parsed = Date.parse(value ?? '')
	return Number.isNaN(parsed) ? -Infinity : parsed
}

/**
 * Items from several sources (`{ key, at }` plus anything else), newest
 * first, one per `key` (its newest), at most `limit`. Ties keep source order.
 */
export function mergeRecent(groups, limit = DASHBOARD_LIST_LIMIT) {
	const all = groups.flat().map((item, index) => ({ item, index }))
	all.sort((a, b) => time(b.item.at) - time(a.item.at) || a.index - b.index)
	const seen = new Set()
	const result = []
	for (const { item } of all) {
		if (seen.has(item.key)) continue
		seen.add(item.key)
		result.push(item)
		if (result.length === limit) break
	}
	return result
}

/**
 * Items from several sources sorted by `at`, soonest first (scheduled
 * items), at most `limit`.
 */
export function mergeSoonest(groups, limit = DASHBOARD_LIST_LIMIT) {
	return groups.flat().sort((a, b) => time(a.at) - time(b.at)).slice(0, limit)
}

/**
 * Images on live content without a description in a language the content
 * is live in. Each use is `{ liveLocales, libraryAlts, useAlts? }` plus
 * anything else: `libraryAlts` and `useAlts` map a locale to text (a use's
 * own alt text wins, as on the public pages). Returns the uses that miss at
 * least one, each with `missing` (locales in `localeOrder`).
 */
export function altTextGaps(uses, localeOrder) {
	const rank = (locale) => {
		const index = localeOrder.indexOf(locale)
		return index < 0 ? localeOrder.length : index
	}
	return uses.flatMap((use) => {
		const missing = [...new Set(use.liveLocales)]
			.filter((locale) => !cleanAlt(use.useAlts?.[locale]) && !cleanAlt(use.libraryAlts?.[locale]))
			.sort((a, b) => rank(a) - rank(b))
		return missing.length ? [{ ...use, missing }] : []
	})
}

/** The sum of the counts, ignoring missing ones. */
export function total(counts) {
	return counts.reduce((sum, count) => sum + (typeof count === 'number' && Number.isFinite(count) ? count : 0), 0)
}
