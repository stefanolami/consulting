import type { ReactNode } from 'react'

import { parseProfileDocument } from '@/lib/team-profile-document'
import type { ProfileEndorsement } from '@/lib/team-profile-document'
import type { Json } from '@/types/database.generated'

export function TeamProfileDocument({ content }: { content: Json }) {
	let document
	try { document = parseProfileDocument(content) } catch { return null }
	return <><RichText content={document.intro.content} />{document.intro.endorsement && <Endorsement endorsement={document.intro.endorsement} />}{document.sections.map((section) => <section className="mt-10 sm:mt-14" key={section.id}><h2 className="font-unna text-3xl leading-tight text-[#27335a] sm:text-4xl">{section.title}</h2><div className="mt-5"><RichText content={section.content} /></div>{section.endorsement && <Endorsement endorsement={section.endorsement} />}</section>)}</>
}

function RichText({ content }: { content: Json }) {
	if (!content || typeof content !== 'object' || Array.isArray(content)) return null
	const children = (content as { content?: unknown }).content
	if (!Array.isArray(children)) return null
	return <div className="space-y-5 text-lg leading-8 text-slate-700">{children.map((node, index) => renderBlock(node, index))}</div>
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
				if (typeof href === 'string') child = <a className="underline underline-offset-4" href={href} rel="noreferrer" target="_blank">{child}</a>
			}
		}
		return <span key={index}>{child}</span>
	})
}

function Endorsement({ endorsement }: { endorsement: ProfileEndorsement }) {
	return <figure className="mt-8 rounded-r-xl border-l-4 border-[#53617f] bg-slate-50 px-6 py-5 text-slate-700"><blockquote className="font-unna text-2xl leading-snug text-[#27335a]">“{endorsement.quote}”</blockquote>{(endorsement.attribution || endorsement.role) && <figcaption className="mt-3 text-sm font-medium text-slate-600">{endorsement.attribution}{endorsement.attribution && endorsement.role ? ', ' : ''}{endorsement.role}</figcaption>}</figure>
}
