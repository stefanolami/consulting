import Image from 'next/image'

import type { AppLocale } from '@/i18n/routing'
import { getPublishedGlobalContent } from '@/lib/public-global-content'

type GlobalContentProofProps = {
	labels: { contact: string; endorsements: string; partners: string; socials: string }
	locale: AppLocale
}

export async function GlobalContentProof({ labels, locale }: GlobalContentProofProps) {
	const content = await getPublishedGlobalContent(locale)
	if (!content.contact && !content.partners.length && !content.endorsements.length && !content.socials.length) return null

	return (
		<section aria-label={labels.contact} className="mx-auto my-12 grid w-full max-w-5xl gap-8 rounded-2xl bg-slate-50 p-6 text-slate-800 sm:grid-cols-2 lg:grid-cols-3">
			{content.partners.length ? <div><h2 className="font-robo text-2xl text-slate-950">{labels.partners}</h2><ul className="mt-4 space-y-4">{content.partners.map((partner) => <li key={partner.id}>{partner.websiteUrl ? <a className="inline-block rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#27335a]" href={partner.websiteUrl} rel="noreferrer" target="_blank"><Image alt={partner.alt} className="h-20 w-48 object-contain object-left" height={80} src={partner.logoUrl} unoptimized width={192} /></a> : <Image alt={partner.alt} className="h-20 w-48 object-contain object-left" height={80} src={partner.logoUrl} unoptimized width={192} />}</li>)}</ul></div> : null}
			{content.endorsements.length ? <div><h2 className="font-robo text-2xl text-slate-950">{labels.endorsements}</h2><div className="mt-4 space-y-5">{content.endorsements.map((endorsement) => <figure key={endorsement.id}><blockquote className="border-l-2 border-[#27335a] pl-4 leading-7">“{endorsement.quote}”</blockquote><figcaption className="mt-3 text-sm font-semibold">{endorsement.attributionName}{endorsement.attributionTitle ? <span className="block font-normal text-slate-600">{endorsement.attributionTitle}</span> : null}</figcaption></figure>)}</div></div> : null}
			{content.contact || content.socials.length ? <div><h2 className="font-robo text-2xl text-slate-950">{labels.contact}</h2>{content.contact ? <address className="mt-4 whitespace-pre-line not-italic leading-7">{content.contact.address}{content.contact.email ? <a className="mt-2 block underline underline-offset-4" href={`mailto:${content.contact.email}`}>{content.contact.email}</a> : null}{content.contact.phone ? <a className="block underline underline-offset-4" href={`tel:${content.contact.phone.replace(/[^+\d]/g, '')}`}>{content.contact.phone}</a> : null}</address> : null}{content.socials.length ? <nav aria-label={labels.socials} className="mt-5"><ul className="flex flex-wrap gap-3">{content.socials.map((social) => <li key={social.platform}><a className="capitalize underline underline-offset-4" href={social.url} rel="noreferrer" target="_blank">{social.platform}</a></li>)}</ul></nav> : null}{content.contact?.footerNote ? <p className="mt-5 text-xs text-slate-500">{content.contact.footerNote}</p> : null}</div> : null}
		</section>
	)
}
