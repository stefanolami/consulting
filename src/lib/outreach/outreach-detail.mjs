// Our Outreach country page (control tower §15.12.7, slice b): which blocks
// render and how statistics read. Plain JavaScript so `node --test` can
// import it; types are in outreach-detail.d.mts. Publication rules are applied
// by the loaders in src/lib/public-outreach.ts and are not repeated here.

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

const trimmed = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null)

function finiteNumber(value) {
	const number = typeof value === 'string' && value.trim() ? Number(value) : value
	return typeof number === 'number' && Number.isFinite(number) ? number : null
}

// Whether a stored rich-text body has any visible text (as
// hasCatalogueContent in src/lib/catalogue-document.ts).
export function hasVisibleText(node) {
	if (!node || typeof node !== 'object' || Array.isArray(node)) return false
	if (typeof node.text === 'string' && node.text.trim()) return true
	return Array.isArray(node.content) && node.content.some(hasVisibleText)
}

// A statistic as the page shows it: the localized display value when set
// (it replaces the number and its unit, admin slice 5b), otherwise the
// number in the locale's format with its unit; then the year in brackets,
// as in Figma ("19.06 million (2023)"). Null when there is nothing to show.
export function statisticText(statistic, locale) {
	const year = finiteNumber(statistic.year)
	const suffix = year === null ? '' : ` (${year})`
	const display = trimmed(statistic.displayValue)
	if (display) return `${display}${suffix}`
	const number = finiteNumber(statistic.numericValue)
	if (number === null) return null
	const value = new Intl.NumberFormat(locale).format(number)
	const unit = trimmed(statistic.unit)
	return `${unit ? `${value} ${unit}` : value}${suffix}`
}

// The statistic's source as a safe link: an http(s) URL and its host name
// without "www." (the contract has no source name; Figma shows "World Bank").
export function statisticSource(value) {
	const text = trimmed(value)
	if (!text) return null
	try {
		const url = new URL(text)
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
		return { host: url.hostname.replace(/^www\./, ''), href: url.toString() }
	} catch {
		return null
	}
}

// `countries.last_reviewed_on` (a date without time) as a UTC date, or null
// when it is missing or not a real calendar date. Format it with
// `timeZone: 'UTC'` so it never shifts by a day.
export function reviewedDate(value) {
	const match = typeof value === 'string' ? DATE_ONLY.exec(value) : null
	if (!match) return null
	const [, year, month, day] = match.map(Number)
	const date = new Date(Date.UTC(year, month - 1, day))
	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null
}

// What the country page renders: every block is present only when it has
// published content, so an empty block never leaves a heading or a gap. The
// flag is not listed: it always renders, with the placeholder when there is
// no flag media.
export function countryDetailBlocks(country, locale) {
	const statistics = country.statistics.flatMap((statistic) => {
		const label = trimmed(statistic.label)
		const text = statisticText(statistic, locale)
		return label && text ? [{ id: statistic.id, label, metricKey: statistic.metricKey, source: statisticSource(statistic.sourceUrl), text }] : []
	})
	const seen = new Set()
	const people = country.people.filter((person) => !seen.has(person.id) && seen.add(person.id))
	return {
		content: hasVisibleText(country.content),
		coverage: trimmed(country.coverageSummary),
		lastReviewed: reviewedDate(country.lastReviewedOn),
		offices: country.offices,
		people,
		serviceDetails: country.services.filter((service) => trimmed(service.summary) || hasVisibleText(service.content)),
		services: country.services,
		statistics,
		summary: trimmed(country.summary),
	}
}

// Characters in the longest word of any of `names`, so the service circles
// can be sized for it: words are never broken inside a circle.
export function longestWordLength(names) {
	return Math.max(0, ...names.flatMap((name) => name.split(/\s+/)).map((word) => [...word].length))
}
