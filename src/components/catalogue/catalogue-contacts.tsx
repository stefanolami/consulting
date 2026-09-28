import { SkeletonSectionHeading, SkeletonText } from '@/components/loading/skeleton-text'
import { TeamPortrait } from '@/components/team/team-portrait'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from '@/i18n/navigation'
import type { AppLocale } from '@/i18n/routing'
import type { CatalogueContact } from '@/lib/public-catalogue'
import { TEAM_SEGMENT } from '@/lib/team-paths'

type CatalogueContactsProps = {
	contacts: CatalogueContact[]
	labels: { email: string; heading: string; phone: string }
	locale: AppLocale
}

const listClass = 'mt-[clamp(1.5rem,1rem+2vw,3rem)] grid gap-x-10 gap-y-8 md:grid-cols-2'
const itemClass = 'flex items-center gap-[clamp(1rem,0.6rem+1.5vw,1.75rem)] font-label text-body-lg text-black'
const portraitClass = 'w-[clamp(5.5rem,4rem+5vw,10.6875rem)] shrink-0'
const linkClass = 'rounded-control underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'

// "Get in Touch with the Team" (Figma 5488:464, 5408:267): round portrait with
// the contact lines beside it, two per row on wider screens. Figma shows no
// name; it is added (linking to the profile) because a portrait alone does not
// identify the person. Figma's office address is not in the people contract,
// so it is not rendered (control tower §15.4).
export function CatalogueContacts({ contacts, labels, locale }: CatalogueContactsProps) {
	if (!contacts.length) return null
	return (
		<section aria-labelledby="catalogue-contacts-heading">
			<h2 className="border-b-2 border-black pb-3 font-display text-heading-2 font-bold text-black" id="catalogue-contacts-heading">{labels.heading}</h2>
			<ul className={listClass}>
				{contacts.map((contact) => (
					<li className={itemClass} key={contact.id}>
						<TeamPortrait
							alt=""
							className={portraitClass}
							name={contact.cardName}
							portrait={contact.portrait ? { ...contact.portrait, height: null, width: null } : null}
							sizes="(min-width: 64rem) 11rem, 6rem"
						/>
						<div className="min-w-0">
							<p className="font-bold">
								<Link className={linkClass} href={`/${TEAM_SEGMENT}/${contact.slug}`} locale={locale}>{contact.cardName}</Link>
							</p>
							{contact.role ? <p className="text-body">{contact.role}</p> : null}
							{contact.phone || contact.email ? (
								<dl className="mt-2">
									{contact.phone ? <div><dt className="sr-only">{labels.phone}</dt><dd><a className={linkClass} href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}>{contact.phone}</a></dd></div> : null}
									{contact.email ? <div><dt className="sr-only">{labels.email}</dt><dd><a className={`${linkClass} break-all`} href={`mailto:${contact.email}`}>{contact.email}</a></dd></div> : null}
								</dl>
							) : null}
						</div>
					</li>
				))}
			</ul>
		</section>
	)
}

export function CatalogueContactsSkeleton() {
	return (
		<div>
			<SkeletonSectionHeading width="w-3/5" />
			<ul className={listClass}>
				{Array.from({ length: 2 }, (_, index) => (
					<li className={itemClass} key={index}>
						<Skeleton className={`${portraitClass} aspect-square rounded-pill`} tone="light" />
						<div className="min-w-0 flex-1">
							<SkeletonText lastLineWidth="w-3/5" />
							<SkeletonText className="text-body" lastLineWidth="w-2/5" />
							<SkeletonText className="mt-2" lastLineWidth="w-4/5" lines={2} />
						</div>
					</li>
				))}
			</ul>
		</div>
	)
}
