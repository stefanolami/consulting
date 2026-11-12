'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useId, useState } from 'react'

import {
	AUDIENCE_PARAM,
	AUDIENCES,
	audienceSearch,
	nextAudience,
	parseAudience,
	tileEmphasis,
	type Audience,
} from '@/lib/audiences.mjs'
import { cn } from '@/lib/utils'

import { readAudience, setAudience, useAudience } from './audience-store'

// Keeps `?audience=` equal to the applied audience on the Services page, so
// the address can be shared. replaceState: choosing an audience is not a
// navigation, and Next.js keeps its router in step with it.
function syncAddress() {
	const audience = readAudience()
	const search = audienceSearch(window.location.search, audience)
	if (search === window.location.search) return
	window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
}

// The Business / Government Institute / Academia row above the service tiles
// (Figma 6393:6, 6633:100, 6633:32): toggle buttons, one per audience, each
// in its own colour. Pressing the chosen one again shows all services. The
// tiles follow through CSS (catalogue-tile.tsx); the pressed look also comes
// from CSS on <html data-audience>, so neither flashes before hydration.
// PLACEHOLDER: Figma's buttons are patterned artwork (6676:7, 6677:65,
// 6677:61); solid audience colours stand in (docs/figma-asset-needs.md).
export function AudienceSelector({ serviceAudiences }: { serviceAudiences: Audience[][] }) {
	const t = useTranslations('Audience')
	const audience = useAudience()
	const labelId = useId()
	const [announcement, setAnnouncement] = useState('')

	// On arrival the address wins over the remembered choice (the inline
	// script already applied it on a full load; this covers client-side
	// navigation). From then on the address follows the choice, wherever it
	// is made (this row, the header menu, another tab).
	useEffect(() => {
		const fromAddress = parseAudience(new URLSearchParams(window.location.search).get(AUDIENCE_PARAM))
		if (fromAddress && fromAddress !== readAudience()) setAudience(fromAddress)
		else syncAddress()
	}, [])
	useEffect(() => {
		syncAddress()
	}, [audience])

	function choose(option: Audience) {
		const next = nextAudience(readAudience(), option)
		setAudience(next)
		const count = serviceAudiences.filter((audiences) => tileEmphasis(audiences, next) === 'highlighted').length
		setAnnouncement(next ? t('highlighted', { audience: t(`options.${next}.label`), count }) : t('cleared'))
	}

	return (
		<div className="mb-[clamp(2.5rem,1.75rem+3vw,4.5rem)]">
			<p className="sr-only" id={labelId}>{t('selectorLabel')}</p>
			<div aria-labelledby={labelId} className="mx-auto flex max-w-[34rem] flex-wrap justify-center gap-x-[clamp(1rem,0.5rem+2vw,2.5rem)] gap-y-4 lg:max-w-none lg:justify-between" role="group">
				{AUDIENCES.map((option) => (
					<button
						aria-pressed={audience === option}
						className={cn(
							'min-h-12 rounded-[1.25rem] px-[clamp(1.25rem,0.75rem+1.5vw,2.25rem)] py-[clamp(0.5rem,0.3rem+0.6vw,1rem)] font-serif text-[clamp(1.0625rem,0.75rem+1.1vw,1.75rem)] leading-tight font-medium uppercase text-on-brand',
							'decoration-2 underline-offset-6 transition-shadow duration-200 hover:underline focus-visible:outline-3 focus-visible:outline-offset-6 focus-visible:outline-focus motion-reduce:transition-none',
						)}
						data-audience-option={option}
						data-audience-swatch={option}
						data-placeholder-asset={`audience-button-${option}`}
						key={option}
						onClick={() => choose(option)}
						type="button"
					>
						{t(`options.${option}.label`)}
					</button>
				))}
			</div>
			<p className="sr-only" role="status">{announcement}</p>
		</div>
	)
}
