import { AtSign, MapPin, Phone, type LucideIcon } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { connection } from 'next/server'
import { Suspense, type ReactNode } from 'react'

import { LoadingRegion } from '@/components/loading/loading-region'
import { SkeletonText } from '@/components/loading/skeleton-text'
import { Skeleton } from '@/components/ui/skeleton'
import type { AppLocale } from '@/i18n/routing'
import { telHref } from '@/lib/contact/contact-rules.mjs'
import { getPublishedGlobalContent } from '@/lib/public-global-content'
import { cn } from '@/lib/utils'

const HEADING_CLASS = 'text-center font-display text-heading-2 font-bold'
const LIST_CLASS = 'mt-[clamp(1.5rem,1rem+2vw,2.5rem)] flex flex-col items-center gap-[clamp(1.5rem,1rem+2vw,2.75rem)] text-center font-label text-body-lg'
const ICON_CLASS = 'grid size-[clamp(3.5rem,3rem+1.5vw,4.5rem)] place-items-center rounded-full bg-white text-tp-navy'
const LINK_CLASS = 'underline decoration-1 underline-offset-[0.2em] hover:decoration-2 focus-visible:rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-on-dark'

// The head office block (Figma "Brussels Head Office"; legacy contact.jsx),
// read from the public `contact_footer` site setting that the footer also
// uses. Only the details that are set are shown; without any, the block is
// omitted and the form takes the full width.
export async function HeadOffice({ locale }: { locale: AppLocale }) {
	const t = await getTranslations({ locale, namespace: 'Contact.headOffice' })
	return (
		<Suspense fallback={<LoadingRegion label={t('loading')}><HeadOfficeSkeleton /></LoadingRegion>}>
			<HeadOfficeContent locale={locale} />
		</Suspense>
	)
}

async function HeadOfficeContent({ locale }: { locale: AppLocale }) {
	await connection()
	const [{ contact }, t] = await Promise.all([
		getPublishedGlobalContent(locale),
		getTranslations({ locale, namespace: 'Contact.headOffice' }),
	])
	const phoneHref = telHref(contact?.phone)
	if (!contact?.address && !contact?.email && !contact?.phone) return null
	return (
		<section aria-labelledby="head-office-heading">
			<h2 className={HEADING_CLASS} id="head-office-heading">{t('title')}</h2>
			<address className="not-italic">
				<ul className={LIST_CLASS}>
					{contact.address ? <Detail icon={MapPin} label={t('address')}><span className="whitespace-pre-line">{contact.address}</span></Detail> : null}
					{contact.email ? <Detail icon={AtSign} label={t('email')}><a className={cn(LINK_CLASS, 'break-all')} href={`mailto:${contact.email}`}>{contact.email}</a></Detail> : null}
					{contact.phone ? <Detail icon={Phone} label={t('phone')}>{phoneHref ? <a className={LINK_CLASS} href={phoneHref}>{contact.phone}</a> : contact.phone}</Detail> : null}
				</ul>
			</address>
		</section>
	)
}

// PLACEHOLDER icons: Lucide stand-ins for the Figma white-on-grey address,
// email and phone pictograms (docs/figma-asset-needs.md).
function Detail({ children, icon: Icon, label }: { children: ReactNode; icon: LucideIcon; label: string }) {
	return (
		<li className="flex flex-col items-center gap-3">
			<span className={ICON_CLASS} data-placeholder-asset="contact-detail-icon"><Icon aria-hidden="true" className="size-1/2" strokeWidth={1.75} /></span>
			<span><span className="sr-only">{label}: </span>{children}</span>
		</li>
	)
}

function HeadOfficeSkeleton() {
	return (
		<div>
			<SkeletonText className={cn(HEADING_CLASS, 'mx-auto w-3/5')} lastLineWidth="w-full" tone="brand" />
			<ul className={LIST_CLASS}>
				{[2, 1, 1].map((lines, index) => (
					<li className="flex w-full flex-col items-center gap-3" key={index}>
						<Skeleton className={cn(ICON_CLASS, 'bg-on-brand/10')} tone="brand" />
						<SkeletonText className="w-3/5 [&>span]:justify-center" lastLineWidth="w-full" lines={lines} tone="brand" />
					</li>
				))}
			</ul>
		</div>
	)
}
