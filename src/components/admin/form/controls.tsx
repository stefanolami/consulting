'use client'

import { useState, type SelectHTMLAttributes } from 'react'

import type { PublicationStatus } from '@/components/admin/form/locale-tabs'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<PublicationStatus, string> = { archived: 'Archived', draft: 'Draft', published: 'Published', scheduled: 'Scheduled' }
const ALL_STATUSES: readonly PublicationStatus[] = ['draft', 'scheduled', 'published', 'archived']

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'defaultValue' | 'onChange' | 'value'>

/**
 * The publication status, controlled so that it always shows the status that
 * was last chosen and saved (audit X-01). Pass `value` to control it from the
 * editor; otherwise it starts from `defaultValue` and keeps its own state
 * (key the form by locale to start from another saved status).
 */
export function StatusSelect({ className, defaultValue = 'draft', name = 'status', onValueChange, options = ALL_STATUSES, value: controlled, ...props }: SelectProps & { defaultValue?: PublicationStatus; onValueChange?: (status: PublicationStatus) => void; options?: readonly PublicationStatus[]; value?: PublicationStatus }) {
	const [own, setOwn] = useState<PublicationStatus>(options.includes(defaultValue) ? defaultValue : options[0])
	const value = controlled ?? own
	return (
		<select {...props} className={cn('input-select', className)} name={name} onChange={(event) => { const next = event.target.value as PublicationStatus; setOwn(next); onValueChange?.(next) }} value={value}>
			{options.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
		</select>
	)
}

export type MediaChoice = { id: string; label: string }

/**
 * A media asset select, controlled by the editor so that an upload or a save
 * can set it (audit X-01). A selected asset that is not in the list (newer
 * than the list's limit, or just uploaded) stays selected instead of falling
 * back to "none".
 */
export function MediaSelect({ className, emptyLabel = 'No media selected', media, onValueChange, value, ...props }: SelectProps & { emptyLabel?: string; media: readonly MediaChoice[]; onValueChange: (id: string | null) => void; value: string | null }) {
	const missing = value && !media.some((item) => item.id === value)
	return (
		<select {...props} className={cn('input-select', className)} onChange={(event) => onValueChange(event.target.value || null)} value={value ?? ''}>
			<option value="">{emptyLabel}</option>
			{missing ? <option value={value}>Selected file (not in this list)</option> : null}
			{media.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
		</select>
	)
}
