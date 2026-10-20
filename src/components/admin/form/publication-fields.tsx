'use client'

import { useState, useSyncExternalStore } from 'react'

import { Field } from '@/components/admin/form/admin-form'
import { StatusSelect } from '@/components/admin/form/controls'
import { Input } from '@/components/ui/input'
import { fromDateTimeLocal, toDateTimeLocal, type EditorialState, type EditorStatus } from '@/lib/publication.mjs'

/** A translation's publication as the admin shows it (src/lib/publication.mjs). */
export type PublicationState = EditorialState

const noSubscription = () => () => {}

// The date field shows the editor's local time, which the server cannot know:
// it is filled in only after hydration, so the server's time zone never
// reaches the field.
function useBrowser() {
	return useSyncExternalStore(noSubscription, () => true, () => false)
}

function browserTimeZone() {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || null
	} catch {
		return null
	}
}

/**
 * The publication status and its date (audit X-05, slice 3).
 *
 * - `mode="schedule"`: the date ("Publish at") appears with Scheduled only.
 *   Saving keeps the stored publication date.
 * - `mode="date"` (articles): the date is the publication date, always shown,
 *   editable for every status (a legacy article keeps its original date).
 *
 * The visible `datetime-local` input is in the editor's time zone and has no
 * name. The hidden `publishAt` field carries a UTC ISO string, and only when
 * the editor changed the date: empty means "keep the stored time". `saved`
 * (the action's returned state) moves the fields to what was stored.
 */
export function PublicationFields({ initial, mode = 'schedule', onStatusChange, options, saved, statusLabel = 'Publication status' }: {
	initial?: PublicationState | null
	mode?: 'schedule' | 'date'
	onStatusChange?: (status: EditorStatus) => void
	options?: readonly EditorStatus[]
	saved?: PublicationState | null
	statusLabel?: string
}) {
	const base = saved ?? initial ?? { status: 'draft', publishAt: null, future: false }
	const [status, setStatus] = useState<EditorStatus>(base.status)
	// The local date-time the editor typed; null while unchanged.
	const [edited, setEdited] = useState<string | null>(null)
	// After a save, start again from the stored values.
	const [lastSaved, setLastSaved] = useState(saved)
	if (saved !== lastSaved) {
		setLastSaved(saved)
		if (saved) {
			setStatus(saved.status)
			setEdited(null)
		}
	}
	const browser = useBrowser()
	const shownAt = mode === 'date' || base.future ? base.publishAt : null
	const local = edited ?? (browser ? toDateTimeLocal(shownAt) : '')
	const showDate = mode === 'date' || status === 'scheduled'
	// An unreadable value is sent as typed, so the server explains it.
	const publishAt = showDate && edited ? fromDateTimeLocal(edited) ?? edited : ''
	const timeZone = browser ? browserTimeZone() : null
	const zone = timeZone ? ` Times are in your time zone (${timeZone}).` : ''
	const hint = mode === 'date'
		? `Shown on the article and used to order the newsroom. Set the original date of an older article here. Leave it to use the time of the first publish. With Scheduled, the article appears at this time.${zone}`
		: `The translation appears on the website at this time, within about a minute, without any further step.${zone}`

	return (
		<>
			<Field label={statusLabel} name="status">
				<StatusSelect onValueChange={(next) => { setStatus(next); onStatusChange?.(next) }} options={options} value={status} />
			</Field>
			{showDate ? (
				<Field hint={hint} label={mode === 'date' ? 'Publication date' : 'Publish at'} name="publishAt" required={status === 'scheduled'}>
					<Input disabled={!browser} onChange={(event) => setEdited(event.target.value)} type="datetime-local" value={local} />
				</Field>
			) : <div aria-hidden="true" className="hidden md:block" />}
			<input name="publishAt" type="hidden" value={publishAt} />
		</>
	)
}
