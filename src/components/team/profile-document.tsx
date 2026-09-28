import type { ReactNode } from 'react'

import type { ProfileDocument, ProfileEndorsement as ProfileEndorsementData } from '@/lib/team-profile-document'
import { cn } from '@/lib/utils'
import type { Json } from '@/types/database.generated'

// Renders the controlled profile document (src/lib/team-profile-document.ts).
// Figma justifies body copy; it is left-aligned here for readability.

export function ProfileSections({ document }: { document: ProfileDocument }) {
	const { endorsement } = document.intro
	if (!endorsement && !document.sections.length) return null
	return (
		<div className="space-y-[clamp(3rem,2.25rem+3vw,5.5rem)]">
			{endorsement ? <ProfileEndorsement endorsement={endorsement} /> : null}
			{document.sections.map((section) => (
				<section aria-labelledby={`section-${section.id}`} key={section.id}>
					<h2 className="font-display text-heading-2 font-bold text-black" id={`section-${section.id}`}>{section.title}</h2>
					<ProfileRichText className="mt-[clamp(1.25rem,1rem+1vw,2rem)] text-black" content={section.content} />
					{section.endorsement ? <ProfileEndorsement className="mt-[clamp(2rem,1.5rem+2vw,3.5rem)]" endorsement={section.endorsement} /> : null}
				</section>
			))}
		</div>
	)
}

export function ProfileRichText({ className, content }: { className?: string; content: Json }) {
	if (!content || typeof content !== 'object' || Array.isArray(content)) return null
	const children = (content as { content?: unknown }).content
	if (!Array.isArray(children) || !children.length) return null
	return <div className={cn('space-y-5 font-label text-body-lg wrap-anywhere', className)}>{children.map((node, index) => renderBlock(node, index))}</div>
}

// Figma 5408:554: full-width muted-blue panel, italic quote, attribution
// right-aligned below it.
function ProfileEndorsement({ className, endorsement }: { className?: string; endorsement: ProfileEndorsementData }) {
	return (
		<figure className={cn('bg-tp-blue-muted px-[clamp(1.25rem,0.5rem+4vw,4.875rem)] py-[clamp(1.5rem,1.1rem+1.6vw,3rem)] font-label text-on-brand wrap-anywhere', className)}>
			<blockquote className="text-lead italic">
				<p>{quoted(endorsement.quote)}</p>
			</blockquote>
			{endorsement.attribution || endorsement.role ? (
				<figcaption className="mt-5 text-right text-lead italic">
					{endorsement.attribution ? <span className="block font-bold">{endorsement.attribution}</span> : null}
					{endorsement.role ? <span className="block">{endorsement.role}</span> : null}
				</figcaption>
			) : null}
		</figure>
	)
}

// Migrated legacy quotes already carry their own quotation marks.
function quoted(text: string) {
	return /^["“„«'‘]/.test(text.trim()) ? text : `“${text}”`
}

function renderBlock(node: unknown, key: number): ReactNode {
	if (!node || typeof node !== 'object' || Array.isArray(node)) return null
	const value = node as { type?: unknown; content?: unknown; attrs?: unknown }
	if (value.type === 'paragraph') return <p key={key}>{renderInline(value.content)}</p>
	if (value.type === 'bulletList' || value.type === 'orderedList') {
		const Tag = value.type === 'bulletList' ? 'ul' : 'ol'
		const start = value.type === 'orderedList' && value.attrs && typeof value.attrs === 'object' && !Array.isArray(value.attrs) && typeof (value.attrs as { start?: unknown }).start === 'number' ? (value.attrs as { start: number }).start : undefined
		return <Tag className={value.type === 'bulletList' ? 'list-disc space-y-2 pl-6' : 'list-decimal space-y-2 pl-6'} key={key} start={start}>{Array.isArray(value.content) && value.content.map((item, itemIndex) => <li key={itemIndex}>{renderListItem(item)}</li>)}</Tag>
	}
	return null
}

function renderListItem(item: unknown): ReactNode {
	if (!item || typeof item !== 'object' || Array.isArray(item)) return null
	const content = (item as { content?: unknown }).content
	if (!Array.isArray(content)) return null
	return content.map((node, index) => node && typeof node === 'object' && !Array.isArray(node) && (node as { type?: unknown }).type === 'paragraph' ? <span key={index}>{index > 0 && <br />}{renderInline((node as { content?: unknown }).content)}</span> : renderBlock(node, index))
}

function renderInline(content: unknown): ReactNode {
	if (!Array.isArray(content)) return null
	return content.map((node, index) => {
		if (!node || typeof node !== 'object' || Array.isArray(node)) return null
		const value = node as { type?: unknown; text?: unknown; marks?: unknown }
		if (value.type === 'hardBreak') return <br key={index} />
		if (value.type !== 'text' || typeof value.text !== 'string') return null
		let child: ReactNode = value.text
		if (Array.isArray(value.marks)) for (const mark of value.marks) {
			if (!mark || typeof mark !== 'object' || Array.isArray(mark)) continue
			const type = (mark as { type?: unknown }).type
			if (type === 'bold') child = <strong>{child}</strong>
			if (type === 'italic') child = <em>{child}</em>
			if (type === 'link') {
				const href = (mark as { attrs?: { href?: unknown } }).attrs?.href
				if (typeof href === 'string') child = <a className="rounded-control underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current" href={href} rel="noreferrer" target="_blank">{child}</a>
			}
		}
		return <span key={index}>{child}</span>
	})
}
