import { legalStatusLabel, type LegalStatus } from '@/components/admin/legal-status'
import { cn } from '@/lib/utils'

const LOCALES = ['en', 'de', 'it', 'pt-BR', 'pt-PT'] as const
const NAMES: Record<(typeof LOCALES)[number], string> = { de: 'German', en: 'English', it: 'Italian', 'pt-BR': 'Portuguese (Brazil)', 'pt-PT': 'Portuguese (Portugal)' }

const STYLES: Record<LegalStatus | 'missing', string> = {
	archived: 'border-slate-300 bg-slate-200 text-slate-700',
	draft: 'border-amber-200 bg-amber-50 text-amber-800',
	missing: 'border-dashed border-slate-300 bg-white text-slate-400',
	published: 'border-emerald-200 bg-emerald-50 text-emerald-800',
	scheduled: 'border-blue-200 bg-blue-50 text-blue-800',
}

/** A short visible mark per state, so the chips do not rely on colour alone. */
const MARKS: Record<LegalStatus | 'missing', string> = { archived: '×', draft: '·', missing: '–', published: '✓', scheduled: '◷' }

/**
 * Every language's state for one record (audit NEWS-13): a chip per locale,
 * coloured and marked by state, with the full state in its accessible name.
 */
export function LocaleStates({ states }: { states: Partial<Record<string, LegalStatus | null>> }) {
	return (
		<ul className="flex flex-wrap gap-1 md:flex-nowrap">
			{LOCALES.map((locale) => {
				const state = states[locale] ?? null
				const key = state ?? 'missing'
				return (
					<li className={cn('inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-xs font-semibold', STYLES[key])} key={locale} title={`${NAMES[locale]}: ${legalStatusLabel(state)}`}>
						<span aria-hidden="true">{locale === 'pt-BR' ? 'BR' : locale === 'pt-PT' ? 'PT' : locale.toUpperCase()}</span>
						<span aria-hidden="true">{MARKS[key]}</span>
						<span className="sr-only">{NAMES[locale]}: {legalStatusLabel(state)}</span>
					</li>
				)
			})}
		</ul>
	)
}

/** The key to the chips, shown once above a list. */
export function LocaleStatesLegend() {
	const keys: (LegalStatus | 'missing')[] = ['published', 'scheduled', 'draft', 'archived', 'missing']
	return (
		<p aria-hidden="true" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
			<span>Languages:</span>
			{keys.map((key) => <span className="inline-flex items-center gap-1" key={key}><span className={cn('inline-flex rounded border px-1 font-semibold', STYLES[key])}>{MARKS[key]}</span>{legalStatusLabel(key === 'missing' ? null : key)}</span>)}
		</p>
	)
}
