import Image from 'next/image'
import type { ReactNode } from 'react'

import { parseArticleDocument, type ArticleImageBlock } from '@/lib/article-document'
import type { PublicArticleImage } from '@/lib/public-newsroom'
import type { Json } from '@/types/database.generated'

export function ArticleRichText({ content, media }: { content: Json; media: Record<string, PublicArticleImage> }) {
	let document: Json
	try {
		document = parseArticleDocument(content)
	} catch {
		return null
	}
	if (!document || typeof document !== 'object' || Array.isArray(document)) return null
	const blocks = (document as { content?: unknown }).content
	if (!Array.isArray(blocks) || !blocks.length) return null
	return <div className="space-y-6 text-lg leading-8 text-slate-700">{blocks.map((node, index) => renderBlock(node, index, media))}</div>
}

function renderBlock(node: unknown, key: number, media: Record<string, PublicArticleImage>): ReactNode {
	if (!node || typeof node !== 'object' || Array.isArray(node)) return null
	const value = node as { attrs?: unknown; content?: unknown; type?: unknown }
	if (value.type === 'articleImage') return renderImage(value.attrs, key, media)
	if (value.type === 'paragraph') return <p key={key}>{renderInline(value.content)}</p>
	if (value.type === 'heading') {
		const level = value.attrs && typeof value.attrs === 'object' && !Array.isArray(value.attrs) ? (value.attrs as { level?: unknown }).level : null
		return level === 3
			? <h3 className="pt-3 font-unna text-2xl leading-tight text-[#27335a] sm:text-3xl" key={key}>{renderInline(value.content)}</h3>
			: <h2 className="pt-4 font-unna text-3xl leading-tight text-[#27335a] sm:text-4xl" key={key}>{renderInline(value.content)}</h2>
	}
	if (value.type === 'blockquote') return <blockquote className="border-l-4 border-[#8d9bc0] bg-[#f3f5fa] px-6 py-5 font-unna text-2xl leading-snug text-[#27335a]" key={key}>{renderInline(value.content)}</blockquote>
	if (value.type === 'bulletList' || value.type === 'orderedList') {
		const Tag = value.type === 'bulletList' ? 'ul' : 'ol'
		const start = value.type === 'orderedList' && value.attrs && typeof value.attrs === 'object' && !Array.isArray(value.attrs) ? (value.attrs as { start?: number }).start : undefined
		return <Tag className={value.type === 'bulletList' ? 'list-disc space-y-3 pl-7' : 'list-decimal space-y-3 pl-7'} key={key} start={start}>{Array.isArray(value.content) ? value.content.map((item, index) => renderListItem(item, index, media)) : null}</Tag>
	}
	return null
}

function renderImage(attributes: unknown, key: number, media: Record<string, PublicArticleImage>) {
	if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return null
	const block = attributes as ArticleImageBlock
	const asset = media[block.mediaId]
	if (!asset) return null
	const layout = block.layout === 'fullBleed'
		? 'relative left-1/2 w-screen -translate-x-1/2 px-6 sm:px-10 lg:px-16'
		: block.layout === 'wide'
			? 'relative left-1/2 w-[min(calc(100vw-3rem),72rem)] -translate-x-1/2'
			: 'mx-auto max-w-3xl'
	return <figure className={layout} key={key}><Image alt={block.alt} className="h-auto w-full rounded-lg object-cover" height={asset.height ?? 900} sizes={block.layout === 'content' ? '(max-width: 768px) 100vw, 768px' : '100vw'} src={asset.url} unoptimized={asset.mimeType === 'image/svg+xml'} width={asset.width ?? 1600} />{block.caption ? <figcaption className="mx-auto mt-2 max-w-3xl text-sm leading-6 text-slate-600">{block.caption}</figcaption> : null}</figure>
}

function renderListItem(node: unknown, key: number, media: Record<string, PublicArticleImage>): ReactNode {
	if (!node || typeof node !== 'object' || Array.isArray(node)) return null
	const content = (node as { content?: unknown }).content
	if (!Array.isArray(content)) return null
	return <li key={key}>{content.map((child, index) => child && typeof child === 'object' && !Array.isArray(child) && (child as { type?: unknown }).type === 'paragraph'
		? <span key={index}>{index > 0 ? <br /> : null}{renderInline((child as { content?: unknown }).content)}</span>
		: renderBlock(child, index, media))}</li>
}

function renderInline(content: unknown): ReactNode {
	if (!Array.isArray(content)) return null
	return content.map((node, index) => {
		if (!node || typeof node !== 'object' || Array.isArray(node)) return null
		const value = node as { marks?: unknown; text?: unknown; type?: unknown }
		if (value.type !== 'text' || typeof value.text !== 'string') return null
		let child: ReactNode = value.text
		if (Array.isArray(value.marks)) for (const mark of value.marks) {
			if (!mark || typeof mark !== 'object' || Array.isArray(mark)) continue
			const typedMark = mark as { attrs?: { href?: unknown }; type?: unknown }
			if (typedMark.type === 'bold') child = <strong>{child}</strong>
			if (typedMark.type === 'italic') child = <em>{child}</em>
			if (typedMark.type === 'link' && typeof typedMark.attrs?.href === 'string') child = <a className="font-medium text-[#27335a] underline decoration-[#8d9bc0] decoration-2 underline-offset-4 hover:decoration-[#27335a]" href={typedMark.attrs.href}>{child}</a>
		}
		return <span key={index}>{child}</span>
	})
}
