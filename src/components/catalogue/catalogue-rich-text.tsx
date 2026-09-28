import type { ReactNode } from 'react'

import { parseCatalogueDocument } from '@/lib/catalogue-document'
import { cn } from '@/lib/utils'
import type { Json } from '@/types/database.generated'

// Controlled catalogue body (src/lib/catalogue-document.ts), in the Figma body
// style (Josefin, 18px). Colour is inherited. Figma justifies body copy; it is
// left-aligned here for readability, as on team profiles.
export function CatalogueRichText({ className, content }: { className?: string; content: Json }) {
	let document: Json
	try {
		document = parseCatalogueDocument(content)
	} catch {
		return null
	}
	if (!document || typeof document !== 'object' || Array.isArray(document)) return null
	const blocks = (document as { content?: unknown }).content
	if (!Array.isArray(blocks) || !blocks.length) return null
	return <div className={cn('space-y-5 font-label text-body-lg wrap-anywhere', className)}>{blocks.map(renderBlock)}</div>
}

function renderBlock(node: unknown, key: number): ReactNode {
	if (!node || typeof node !== 'object' || Array.isArray(node)) return null
	const value = node as { attrs?: unknown; content?: unknown; type?: unknown }
	if (value.type === 'paragraph') return <p key={key}>{renderInline(value.content)}</p>
	if (value.type === 'heading') {
		const level = value.attrs && typeof value.attrs === 'object' && !Array.isArray(value.attrs)
			? (value.attrs as { level?: unknown }).level
			: null
		return level === 3
			? <h3 className="pt-2 font-display text-heading-3 font-bold" key={key}>{renderInline(value.content)}</h3>
			: <h2 className="pt-3 font-display text-heading-2 font-bold" key={key}>{renderInline(value.content)}</h2>
	}
	if (value.type === 'blockquote') {
		return <blockquote className="bg-tp-blue-muted px-[clamp(1.25rem,0.5rem+4vw,4.875rem)] py-[clamp(1.5rem,1.1rem+1.6vw,3rem)] text-lead italic text-on-brand" key={key}>{renderInline(value.content)}</blockquote>
	}
	if (value.type === 'bulletList' || value.type === 'orderedList') {
		const Tag = value.type === 'bulletList' ? 'ul' : 'ol'
		const start = value.type === 'orderedList' && value.attrs && typeof value.attrs === 'object' && !Array.isArray(value.attrs)
			? (value.attrs as { start?: number }).start
			: undefined
		return <Tag className={value.type === 'bulletList' ? 'list-disc space-y-2 pl-6' : 'list-decimal space-y-2 pl-6'} key={key} start={start}>{Array.isArray(value.content) ? value.content.map(renderListItem) : null}</Tag>
	}
	return null
}

function renderListItem(node: unknown, key: number): ReactNode {
	if (!node || typeof node !== 'object' || Array.isArray(node)) return null
	const content = (node as { content?: unknown }).content
	if (!Array.isArray(content)) return null
	return <li key={key}>{content.map((child, index) => {
		if (child && typeof child === 'object' && !Array.isArray(child) && (child as { type?: unknown }).type === 'paragraph') {
			return <span key={index}>{index > 0 ? <br /> : null}{renderInline((child as { content?: unknown }).content)}</span>
		}
		return renderBlock(child, index)
	})}</li>
}

function renderInline(content: unknown): ReactNode {
	if (!Array.isArray(content)) return null
	return content.map((node, index) => {
		if (!node || typeof node !== 'object' || Array.isArray(node)) return null
		const value = node as { marks?: unknown; text?: unknown; type?: unknown }
		if (value.type !== 'text' || typeof value.text !== 'string') return null
		let child: ReactNode = value.text
		if (Array.isArray(value.marks)) {
			for (const mark of value.marks) {
				if (!mark || typeof mark !== 'object' || Array.isArray(mark)) continue
				const typedMark = mark as { attrs?: { href?: unknown }; type?: unknown }
				if (typedMark.type === 'bold') child = <strong>{child}</strong>
				if (typedMark.type === 'italic') child = <em>{child}</em>
				if (typedMark.type === 'link' && typeof typedMark.attrs?.href === 'string') {
					child = <a className="rounded-control underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current" href={typedMark.attrs.href}>{child}</a>
				}
			}
		}
		return <span key={index}>{child}</span>
	})
}
