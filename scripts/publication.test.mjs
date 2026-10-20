import assert from 'node:assert/strict'
import test from 'node:test'

import { editorialState, fromDateTimeLocal, keptPublicationTime, parseInstant, resolvePublication, restoredStatus, toDateTimeLocal } from '../src/lib/publication.mjs'

const NOW = new Date('2026-10-20T12:00:00.000Z')
const PAST = '2025-09-01T00:00:00.000Z'
const SOON = '2026-10-20T12:03:00.000Z'

function resolve(input) {
	return resolvePublication({ now: NOW, ...input })
}

// Node applies a changed TZ to later Date calls in the same process.
function inTimeZone(timeZone, run) {
	const previous = process.env.TZ
	process.env.TZ = timeZone
	try {
		run()
	} finally {
		if (previous === undefined) delete process.env.TZ
		else process.env.TZ = previous
	}
}

test('instants must carry an offset; naive local strings are refused', () => {
	assert.equal(parseInstant(''), null)
	assert.equal(parseInstant(null), null)
	assert.equal(parseInstant('  '), null)
	assert.equal(parseInstant('2026-10-20T15:00:00.000+03:00'), '2026-10-20T12:00:00.000Z')
	assert.equal(parseInstant('2026-10-20T12:00Z'), '2026-10-20T12:00:00.000Z')
	assert.equal(parseInstant('2026-10-20T15:00'), undefined)
	assert.equal(parseInstant('2026-10-20'), undefined)
	assert.equal(parseInstant('next tuesday'), undefined)
	assert.equal(parseInstant('2026-02-30T10:00Z'), undefined)
})

test('the first publish stamps now', () => {
	const result = resolve({ status: 'published', publishAt: '', existing: null })
	assert.deepEqual(result, { ok: true, row: { status: 'published', published_at: NOW.toISOString(), scheduled_for: null }, editorStatus: 'published' })
})

test('saving an already-published translation keeps published_at', () => {
	const existing = { status: 'published', published_at: PAST, scheduled_for: null }
	for (const datedByEditor of [false, true]) {
		const first = resolve({ status: 'published', publishAt: '', existing, datedByEditor })
		assert.equal(first.ok && first.row.published_at, PAST)
		// A second save reads back the first one's row.
		const second = resolve({ status: 'published', publishAt: '', existing: first.ok ? first.row : null, datedByEditor })
		assert.equal(second.ok && second.row.published_at, PAST)
	}
	// Elsewhere than articles the date sent with Published is ignored.
	const ignored = resolve({ status: 'published', publishAt: '2026-01-01T00:00:00Z', existing })
	assert.equal(ignored.ok && ignored.row.published_at, PAST)
})

test('unpublishing and republishing keeps the original date', () => {
	const published = { status: 'published', published_at: PAST, scheduled_for: null }
	const draft = resolve({ status: 'draft', publishAt: '', existing: published })
	assert.deepEqual(draft.ok && draft.row, { status: 'draft', published_at: PAST, scheduled_for: null })
	const republished = resolve({ status: 'published', publishAt: '', existing: draft.ok ? draft.row : null })
	assert.equal(republished.ok && republished.row.published_at, PAST)
})

test('articles: the editor sets and changes the publication date', () => {
	const existing = { status: 'published', published_at: '2026-10-19T10:00:00.000Z' }
	const legacy = resolve({ status: 'published', publishAt: '2025-09-10T09:00:00+02:00', existing, datedByEditor: true })
	assert.equal(legacy.ok && legacy.row.published_at, '2025-09-10T07:00:00.000Z')
	// A date set on a draft is stored and used when it is published.
	const draft = resolve({ status: 'draft', publishAt: '2024-06-24T00:00:00Z', existing: null, datedByEditor: true })
	assert.equal(draft.ok && draft.row.published_at, '2024-06-24T00:00:00.000Z')
	// An unchanged (empty) field keeps the stored date for every status.
	for (const status of ['draft', 'archived', 'published']) {
		const unchanged = resolve({ status, publishAt: '', existing, datedByEditor: true })
		assert.equal(unchanged.ok && unchanged.row.published_at, '2026-10-19T10:00:00.000Z', status)
	}
	// Postgres returns `+00:00`; the kept value is stored in the same UTC form.
	const postgres = resolve({ status: 'published', publishAt: '', existing: { status: 'published', published_at: '2025-09-01T00:00:00+00:00' } })
	assert.equal(postgres.ok && postgres.row.published_at, PAST)
	const future = resolve({ status: 'published', publishAt: SOON, existing, datedByEditor: true })
	assert.equal(future.ok, false)
	assert.equal(!future.ok && future.field, 'publishAt')
	const tooEarly = resolve({ status: 'published', publishAt: '1999-12-31T23:00:00Z', existing, datedByEditor: true })
	assert.equal(tooEarly.ok, false)
})

test('scheduling stores published with the future time and derives Scheduled', () => {
	const result = resolve({ status: 'scheduled', publishAt: '2026-10-20T15:03:00+03:00', existing: null })
	assert.deepEqual(result, { ok: true, row: { status: 'published', published_at: SOON, scheduled_for: null }, editorStatus: 'scheduled' })
	const row = result.ok ? result.row : null
	assert.deepEqual(editorialState(row, NOW), { status: 'scheduled', publishAt: SOON, future: true })
	// Once the time has passed the same row is simply published.
	assert.deepEqual(editorialState(row, new Date('2026-10-20T12:03:00.001Z')), { status: 'published', publishAt: SOON, future: false })
})

test('scheduling needs a valid future time', () => {
	for (const publishAt of ['', null, NOW.toISOString(), PAST]) {
		const result = resolve({ status: 'scheduled', publishAt, existing: null })
		assert.equal(result.ok, false, String(publishAt))
		assert.equal(!result.ok && result.field, 'publishAt')
	}
	// A schedule that was kept and is still ahead needs no new time.
	const kept = resolve({ status: 'scheduled', publishAt: '', existing: { status: 'draft', published_at: SOON } })
	assert.deepEqual(kept.ok && kept.row, { status: 'published', published_at: SOON, scheduled_for: null })
	const passed = resolve({ status: 'scheduled', publishAt: '', existing: { status: 'published', published_at: PAST } })
	assert.equal(passed.ok, false)
	const naive = resolve({ status: 'scheduled', publishAt: '2026-10-20T15:03', existing: null })
	assert.equal(!naive.ok && naive.message, 'Enter a valid date and time.')
	assert.equal(resolve({ status: 'live', publishAt: '' }).ok, false)
})

test('publishing a scheduled translation at once stamps now', () => {
	const scheduled = { status: 'published', published_at: SOON }
	const now = resolve({ status: 'published', publishAt: '', existing: scheduled })
	assert.equal(now.ok && now.row.published_at, NOW.toISOString())
	assert.equal(now.ok && now.editorStatus, 'published')
})

test('archiving keeps the date and the schedule; restore brings them back', () => {
	const scheduled = { status: 'published', published_at: SOON }
	const archived = resolve({ status: 'archived', publishAt: '', existing: scheduled })
	assert.deepEqual(archived.ok && archived.row, { status: 'archived', published_at: SOON, scheduled_for: null })
	assert.deepEqual(editorialState(archived.ok ? archived.row : null, NOW), { status: 'archived', publishAt: SOON, future: true })
	assert.equal(restoredStatus(archived.ok ? archived.row : null), 'published')
	assert.deepEqual(editorialState({ status: 'published', published_at: SOON }, NOW).status, 'scheduled')
	assert.equal(restoredStatus({ status: 'archived', published_at: PAST }), 'published')
	assert.equal(restoredStatus({ status: 'archived', published_at: null }), 'draft')
	// Scheduling an archived translation again works from its kept time.
	const rescheduled = resolve({ status: 'scheduled', publishAt: SOON, existing: archived.ok ? archived.row : null })
	assert.equal(rescheduled.ok && rescheduled.row.status, 'published')
})

test('legacy scheduled rows are read as scheduled at scheduled_for', () => {
	const legacy = { status: 'scheduled', published_at: null, scheduled_for: '2026-10-19T11:08:00.000Z' }
	assert.equal(keptPublicationTime(legacy), '2026-10-19T11:08:00.000Z')
	assert.deepEqual(editorialState(legacy, NOW), { status: 'scheduled', publishAt: '2026-10-19T11:08:00.000Z', future: false })
	// Its time has passed: saving it as Scheduled again needs a new time, and
	// publishing uses the intended time.
	assert.equal(resolve({ status: 'scheduled', publishAt: legacy.scheduled_for, existing: legacy }).ok, false)
	const published = resolve({ status: 'published', publishAt: '', existing: legacy })
	assert.equal(published.ok && published.row.published_at, '2026-10-19T11:08:00.000Z')
	assert.equal(published.ok && published.row.scheduled_for, null)
	assert.deepEqual(editorialState(null), { status: 'draft', publishAt: null, future: false })
})

test('datetime-local values round-trip unchanged in the editor time zone', () => {
	for (const timeZone of ['Europe/Bucharest', 'UTC', 'America/Sao_Paulo', 'Asia/Kolkata', 'America/New_York']) {
		inTimeZone(timeZone, () => {
			for (const local of ['2026-10-20T15:00', '2026-01-05T00:00', '2026-06-30T23:59', '2025-09-01T08:30']) {
				const stored = fromDateTimeLocal(local)
				assert.match(stored, /Z$/, `${timeZone} ${local}`)
				// What the server stores is shown again as exactly what was typed,
				// so saving a form a second time does not move the time.
				assert.equal(toDateTimeLocal(stored), local, `${timeZone} ${local}`)
				assert.equal(toDateTimeLocal(fromDateTimeLocal(toDateTimeLocal(stored))), local)
				assert.equal(parseInstant(stored), stored)
			}
		})
	}
})

test('local times are converted to UTC with the editor offset', () => {
	inTimeZone('Europe/Bucharest', () => {
		// The audit case: 15:00 in Bucharest (UTC+3 in summer time) is 12:00 UTC,
		// and 12:00 UTC is shown as 15:00, not 12:00.
		assert.equal(fromDateTimeLocal('2026-10-20T15:00'), '2026-10-20T12:00:00.000Z')
		assert.equal(toDateTimeLocal('2026-10-20T12:00:00.000Z'), '2026-10-20T15:00')
		// Winter time, UTC+2.
		assert.equal(fromDateTimeLocal('2026-12-01T15:00'), '2026-12-01T13:00:00.000Z')
		assert.equal(toDateTimeLocal('2026-12-01T13:00:00Z'), '2026-12-01T15:00')
		// The night the clocks go back (25 October 2026, 04:00 → 03:00): both
		// instants that read 03:30 are shown as 03:30.
		assert.equal(toDateTimeLocal('2026-10-25T00:30:00Z'), '2026-10-25T03:30')
		assert.equal(toDateTimeLocal('2026-10-25T01:30:00Z'), '2026-10-25T03:30')
		// The night the clocks go forward (29 March 2026, 03:00 → 04:00): 03:30
		// does not exist and moves forward by the hour.
		assert.equal(toDateTimeLocal(fromDateTimeLocal('2026-03-29T03:30')), '2026-03-29T04:30')
	})
	inTimeZone('America/New_York', () => {
		assert.equal(fromDateTimeLocal('2026-10-20T15:00'), '2026-10-20T19:00:00.000Z')
	})
	inTimeZone('UTC', () => {
		assert.equal(fromDateTimeLocal('2026-10-20T15:00'), '2026-10-20T15:00:00.000Z')
		assert.equal(toDateTimeLocal('2026-10-20T15:00:00+03:00'), '2026-10-20T12:00')
	})
})

test('empty and invalid local values are rejected', () => {
	for (const value of ['', null, undefined, '2026-10-20', '2026-13-01T10:00', '2026-02-30T10:00', '20:00', '2026-10-20T15:00Z']) {
		assert.equal(fromDateTimeLocal(value), null, String(value))
	}
	for (const value of ['', null, undefined, 'not a date']) assert.equal(toDateTimeLocal(value), '')
})
