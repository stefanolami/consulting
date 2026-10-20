// The translations whose published_at was re-stamped by a later save before
// slice 3 (audit X-05) and whose first publication time is recorded in the
// audit's content logs (docs/admin-audit.md §4). Only records with a known
// original are listed; the others keep their current date and can be
// corrected by an editor (articles have an editable publication date).

export const PUBLISHED_AT_REPAIRS = [
	{
		label: 'Glenn Cezanne (en)',
		table: 'people_translations',
		key: { person_id: '402f4522-ad61-490d-a823-350c054d4be4', locale: 'en' },
		original: '2025-09-01T00:00:00.000Z',
		source: 'Content log, slice 2 test content: "published_at 2025-09-01T00:00:00Z, now the save time".',
	},
	{
		label: 'Country Romania (en)',
		table: 'country_translations',
		key: { country_code: 'RO', locale: 'en' },
		original: '2026-09-03T10:33:31.000Z',
		source: 'Content log, changed records: "en published 2026-09-03T10:33:31Z", then re-stamped.',
	},
	{
		label: 'Sector Circular Economy (en)',
		table: 'sector_translations',
		key: { sector_id: 'aa0e911f-565b-439f-926d-8229314335ad', locale: 'en' },
		original: '2026-10-19T11:01:52.000Z',
		source: 'Content log, slice 2 test content: "published_at 2026-10-19T11:01:52Z" before the slice 2 saves re-stamped it.',
	},
]

/** Records the logs show were re-stamped but whose original time is not recorded. */
export const UNKNOWN_ORIGINALS = [
	'Article "We are hiring an Advocacy & Communication Intern!" (en): re-stamped by the slice 2 saves; set its date in the article editor.',
	'Flávia Guerra (en): re-stamped by the slice 2 saves.',
	'Country Sweden (en): first published during the audit, then re-stamped.',
	'Legal privacy policy (en): re-stamped; its visible "Last updated" date is a separate field and unchanged.',
]

const time = (value) => (value ? Date.parse(value) : Number.NaN)

/**
 * The plan for each repair, given the stored rows (keyed by label):
 * `restore` when published_at differs from the original, `unchanged` when it
 * already matches (so running again changes nothing), `missing` when the row
 * does not exist.
 */
export function planRepairs(repairs, storedByLabel) {
	return repairs.map((repair) => {
		const stored = storedByLabel.get(repair.label) ?? null
		if (!stored) return { ...repair, action: 'missing', current: null }
		const current = stored.published_at ?? null
		if (time(current) === time(repair.original)) return { ...repair, action: 'unchanged', current, status: stored.status }
		return { ...repair, action: 'restore', current, status: stored.status }
	})
}

export function formatRepairReport(plan, { applyMode }) {
	const lines = [`published_at repair — ${applyMode ? 'APPLY' : 'DRY RUN (nothing is written; pass --apply to write)'}`, '']
	for (const item of plan) {
		const where = `${item.table} ${Object.entries(item.key).map(([column, value]) => `${column}=${value}`).join(' ')}`
		if (item.action === 'missing') lines.push(`- ${item.label}: not found (${where}); skipped.`)
		else if (item.action === 'unchanged') lines.push(`- ${item.label}: already ${item.original}; nothing to do.`)
		else lines.push(`- ${item.label}: ${applyMode ? 'restored' : 'would restore'} published_at ${item.current ?? 'null'} → ${item.original} (status ${item.status}; ${where}).`)
		lines.push(`    source: ${item.source}`)
	}
	lines.push('', 'Not repaired (original time not recorded):', ...UNKNOWN_ORIGINALS.map((item) => `- ${item}`))
	const counts = plan.reduce((total, item) => ({ ...total, [item.action]: (total[item.action] ?? 0) + 1 }), {})
	lines.push('', `Summary: ${counts.restore ?? 0} to restore, ${counts.unchanged ?? 0} already correct, ${counts.missing ?? 0} missing.`)
	return lines.join('\n')
}
