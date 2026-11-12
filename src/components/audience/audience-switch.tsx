'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useId } from 'react'

import { AUDIENCES, type Audience } from '@/lib/audiences.mjs'
import { cn } from '@/lib/utils'

import { setAudience, useAudience } from './audience-store'

const ALL = 'all'

/**
 * The current audience as text, one span per state; CSS on <html
 * data-audience> shows the applied one (globals.css), so the label is right
 * before hydration. `short` is the visible label; the full label is for
 * screen readers.
 */
export function AudienceStateLabel({ variant }: { variant: 'short' | 'full' }) {
	const t = useTranslations('Audience')
	return (
		<>
			<span data-audience-show="none">{variant === 'short' ? t('noneShort') : t('all')}</span>
			{AUDIENCES.map((audience) => (
				<span data-audience-show={audience} key={audience}>{t(`options.${audience}.${variant === 'short' ? 'short' : 'label'}`)}</span>
			))}
		</>
	)
}

/** The audience options and "All", for the header menu and the mobile menu. */
export function useAudienceOptions() {
	const t = useTranslations('Audience')
	return [
		...AUDIENCES.map((audience) => ({ label: t(`options.${audience}.label`), value: audience as Audience | null })),
		{ label: t('all'), value: null },
	]
}

// The header button (Figma 6648:12 "gov. ins.", navy with a white edge,
// 6648:2). It names the current audience, visibly in short and in full in its
// accessible name, and opens a menu of the three audiences and "All".
// Choosing one themes the site at once and stays on the page.
export function AudienceSwitch({ className }: { className?: string }) {
	const t = useTranslations('Audience')
	const audience = useAudience()
	const options = useAudienceOptions()
	const menuLabelId = useId()

	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				className={cn(
					'inline-flex min-h-10 items-center justify-center rounded-control border-2 border-on-brand bg-tp-navy px-3 font-serif text-[0.75rem] font-medium whitespace-nowrap uppercase text-on-brand transition-colors min-[90rem]:px-4 min-[90rem]:text-[0.8125rem] hover:bg-brand-strong',
					'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-on-dark data-[state=open]:bg-brand-strong motion-reduce:transition-none',
					className,
				)}
			>
				<span className="sr-only">{t('label')}: </span>
				<span aria-hidden="true"><AudienceStateLabel variant="short" /></span>
				<span className="sr-only"><AudienceStateLabel variant="full" /></span>
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				{/* Named by its heading rather than by the button, whose per-state
				    labels are hidden by CSS only. */}
				<DropdownMenu.Content
					align="end"
					aria-labelledby={menuLabelId}
					className="z-[60] min-w-60 rounded-control bg-on-brand p-1 text-brand shadow-xl ring-1 ring-brand/10 motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=open]:zoom-in-95"
					sideOffset={8}
				>
					<DropdownMenu.Label className="px-3 pb-1 pt-2 font-label text-label text-brand/70" id={menuLabelId}>{t('menuLabel')}</DropdownMenu.Label>
					<DropdownMenu.RadioGroup onValueChange={(value) => setAudience(value === ALL ? null : value as Audience)} value={audience ?? ALL}>
						{options.map((option) => (
							<DropdownMenu.RadioItem
								className="flex cursor-pointer items-center gap-3 rounded-control px-3 py-2 font-serif text-body outline-none data-[highlighted]:bg-surface-tint"
								key={option.value ?? ALL}
								value={option.value ?? ALL}
							>
								{option.value ? <span aria-hidden="true" className="size-3 shrink-0 rounded-pill" data-audience-swatch={option.value} /> : <span aria-hidden="true" className="size-3 shrink-0 rounded-pill border border-brand/40" />}
								<span className="flex-1">{option.label}</span>
								<DropdownMenu.ItemIndicator><Check aria-hidden="true" className="size-4" /></DropdownMenu.ItemIndicator>
							</DropdownMenu.RadioItem>
						))}
					</DropdownMenu.RadioGroup>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	)
}
