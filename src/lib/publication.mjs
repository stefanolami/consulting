// The publication model of every editorial translation (platform doc §4,
// audit slice 3):
// - `published_at` is set once, on the first publish, and kept by every later
//   save, unpublish, archive and republish. Articles let the editor choose it
//   (the article date, also used for legacy articles).
// - "Scheduled" is not stored. A scheduled translation is stored as
//   `status = 'published'` with a future `published_at`; the public RLS
//   policies and readers already hide it until that moment, so nothing has to
//   run to publish it. The admin derives the label from the date.
// - The admin sends instants as ISO 8601 strings with an offset, made in the
//   editor's browser from the `datetime-local` value in their time zone.
//   Naive strings are refused, because the server would read them in its own
//   time zone.
// - `scheduled_for` is no longer written (always null). Rows still stored
//   with the legacy status 'scheduled' are read as scheduled at
//   `scheduled_for` until the migration converts them.
// Plain JavaScript with a `.d.mts` declaration so the node:test suites can
// import it.

/** The statuses an editor chooses from. 'scheduled' is derived, never stored. */
export const EDITOR_STATUSES = ['draft', 'scheduled', 'published', 'archived']

const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:\d{2})$/
const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
const EARLIEST_DATE = '2000-01-01T00:00:00.000Z'

// `YYYY-MM-DD` names a day that exists (Date.parse rolls 30 February over).
function isCalendarDate(text) {
	const [year, month, day] = text.split('-').map(Number)
	const date = new Date(Date.UTC(year, month - 1, day))
	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

/** A time as milliseconds, or NaN. */
function time(value) {
	return value instanceof Date ? value.getTime() : typeof value === 'string' ? Date.parse(value) : Number.NaN
}

/**
 * Parses an instant sent by the admin. Empty means "none" (null); a string
 * with an explicit offset (`Z`, `+03:00`) is returned in UTC ISO form; anything
 * else, including a naive `2026-10-20T15:00`, is undefined (invalid).
 */
export function parseInstant(value) {
	if (value === null || value === undefined) return null
	const text = String(value).trim()
	if (!text) return null
	if (!INSTANT.test(text) || !isCalendarDate(text.slice(0, 10))) return undefined
	const parsed = Date.parse(text)
	return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString()
}

/**
 * The time a stored row keeps: its `published_at`, or for a row still stored
 * with the legacy 'scheduled' status, its `scheduled_for`.
 */
export function keptPublicationTime(row) {
	if (!row) return null
	return row.published_at ?? (row.status === 'scheduled' ? row.scheduled_for ?? null : null)
}

/**
 * How the admin shows a stored row: the editor status (with 'scheduled'
 * derived from a future `published_at`), the instant the date field shows
 * (UTC ISO), and whether that instant is still in the future.
 */
export function editorialState(row, now = new Date()) {
	if (!row) return { status: 'draft', publishAt: null, future: false }
	const kept = keptPublicationTime(row)
	const publishAt = kept === null || Number.isNaN(time(kept)) ? null : new Date(time(kept)).toISOString()
	const future = publishAt !== null && time(publishAt) > time(now)
	if (row.status === 'scheduled') return { status: 'scheduled', publishAt, future }
	if (row.status === 'published' && future) return { status: 'scheduled', publishAt, future }
	return { status: row.status, publishAt, future }
}

function refuse(message) {
	return { ok: false, field: 'publishAt', message }
}

/**
 * Turns the editor's choice into the stored publication columns.
 *
 * - `status`: the editor status (draft, scheduled, published, archived).
 * - `publishAt`: the date the editor typed, as an ISO string with an offset.
 *   Empty means "unchanged": the stored time is kept. The form sends a value
 *   only when the editor changed the field.
 * - `existing`: the stored row (`status`, `published_at`, `scheduled_for`),
 *   or null when the translation is new.
 * - `datedByEditor`: true where the date is an editable field for every
 *   status (articles): a date that has passed may be set with Published (a
 *   legacy article's original date), or stored on a draft. Elsewhere a date
 *   is used only with Scheduled.
 *
 * Returns `{ ok: true, row, editorStatus }` with `row` holding `status`,
 * `published_at` and `scheduled_for`, or `{ ok: false, field, message }`.
 */
export function resolvePublication({ status, publishAt, existing = null, now = new Date(), datedByEditor = false }) {
	if (!EDITOR_STATUSES.includes(status)) return { ok: false, field: 'status', message: 'Choose a publication status.' }
	const requested = parseInstant(publishAt)
	if (requested === undefined) return refuse('Enter a valid date and time.')
	if (requested !== null && requested < EARLIEST_DATE) return refuse('Choose a date on or after 1 January 2000.')
	const nowTime = time(now)
	const keptValue = keptPublicationTime(existing)
	const kept = keptValue === null || Number.isNaN(time(keptValue)) ? null : new Date(time(keptValue)).toISOString()
	const stored = (storedStatus, publishedAt) => ({
		ok: true,
		row: { status: storedStatus, published_at: publishedAt, scheduled_for: null },
		editorStatus: storedStatus === 'published' && publishedAt !== null && time(publishedAt) > nowTime ? 'scheduled' : storedStatus,
	})

	if (status === 'scheduled') {
		const at = requested ?? kept
		if (at === null) return refuse('Choose when to publish.')
		if (time(at) <= nowTime) return refuse('Choose a time in the future, or choose Published to publish now.')
		return stored('published', at)
	}
	if (status === 'published') {
		if (datedByEditor && requested !== null) {
			if (time(requested) > nowTime) return refuse('This date is in the future. Choose Scheduled to publish then, or choose a date that has passed.')
			return stored('published', requested)
		}
		// Keep the first publication date. A kept time still in the future (a
		// schedule the editor now publishes at once) becomes now.
		return stored('published', kept !== null && time(kept) <= nowTime ? kept : new Date(nowTime).toISOString())
	}
	// Draft and archived keep the date, and so the schedule, for a later
	// republish or restore. Where the date is a field, a new one is stored.
	return stored(status, datedByEditor && requested !== null ? requested : kept)
}

/**
 * The status an archived translation returns to on restore: published again
 * at its kept date (still scheduled if that date is in the future), or draft
 * when it was never published.
 */
export function restoredStatus(row) {
	return keptPublicationTime(row) ? 'published' : 'draft'
}

// Time zones ----------------------------------------------------------------
// `datetime-local` inputs hold a wall-clock time without a zone. These run in
// the editor's browser, so "local" is the editor's time zone.

const pad = (value, length = 2) => String(value).padStart(length, '0')

/** An instant as a `datetime-local` value (`YYYY-MM-DDTHH:mm`) in local time; '' when empty or invalid. */
export function toDateTimeLocal(value) {
	if (!value) return ''
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return ''
	return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * A `datetime-local` value read in local time, as a UTC ISO string; null when
 * empty or invalid. A wall-clock time skipped by a daylight-saving change
 * moves forward by the change (02:30 on a spring-forward night becomes 03:30).
 */
export function fromDateTimeLocal(value) {
	const match = typeof value === 'string' ? LOCAL_DATE_TIME.exec(value.trim()) : null
	if (!match) return null
	const [, year, month, day, hours, minutes, seconds] = match.map(Number)
	const date = new Date(year, month - 1, day, hours, minutes, Number.isNaN(seconds) ? 0 : seconds)
	if (Number.isNaN(date.getTime()) || date.getMonth() !== month - 1 || date.getDate() !== day) return null
	return date.toISOString()
}
