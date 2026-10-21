'use client'

import { useSyncExternalStore } from 'react'

const local = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
const utc = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })
const subscribe = () => () => {}

/**
 * A date and time in the editor's own time zone (en-GB). The server, which
 * does not know that zone, renders it in UTC; the browser shows local time
 * right after hydration.
 */
export function LocalDateTime({ value }: { value: string | null }) {
	const date = value ? new Date(value) : null
	const valid = date !== null && !Number.isNaN(date.getTime())
	const label = useSyncExternalStore(
		subscribe,
		() => (valid ? local.format(date) : ''),
		() => (valid ? `${utc.format(date)} UTC` : ''),
	)
	if (!valid) return <span>—</span>
	return <time dateTime={date.toISOString()}>{label}</time>
}
