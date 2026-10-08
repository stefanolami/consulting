import type { LegalPageKey } from '@/lib/legal-pages'
import { cn } from '@/lib/utils'

export type LegalStatus = 'draft' | 'scheduled' | 'published' | 'archived'

/** English names for the admin, which is not localized. */
export const LEGAL_PAGE_NAMES: Record<LegalPageKey, string> = {
	'cookie-use': 'Cookie use',
	'privacy-policy': 'Privacy policy',
	'terms-and-conditions': 'Terms and conditions',
}

const STATUS_STYLES: Record<LegalStatus | 'missing', { label: string; className: string }> = {
	archived: { label: 'Archived', className: 'bg-slate-200 text-slate-700' },
	draft: { label: 'Draft', className: 'bg-amber-50 text-amber-800' },
	missing: { label: 'Not started', className: 'bg-white text-slate-500 ring-1 ring-slate-200' },
	published: { label: 'Published', className: 'bg-emerald-50 text-emerald-700' },
	scheduled: { label: 'Scheduled', className: 'bg-blue-50 text-blue-800' },
}

export function legalStatusLabel(status: LegalStatus | null) {
	return STATUS_STYLES[status ?? 'missing'].label
}

export function LegalStatusBadge({ status }: { status: LegalStatus | null }) {
	const style = STATUS_STYLES[status ?? 'missing']
	return <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', style.className)}>{style.label}</span>
}
