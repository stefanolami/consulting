import type { ReactNode } from 'react'

import { Link } from '@/i18n/navigation'
import { isInternalLegalHref, legalLinkIssue, type LegalDocument } from '@/lib/legal-document.mjs'
import { allowedHref, type RichTextNode } from '@/lib/rich-text-rules.mjs'
import { cn } from '@/lib/utils'

const linkClass = 'rounded-control font-medium text-tp-blue underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'

// Version-1 legal document (src/lib/legal-document.mjs), already validated by
// the public reader. Long-form reading: body type at a prose measure, section
// headings a step below the page title. Internal links (`/cookie-use`) go
// through the next-intl Link without a `locale` prop, so they take the
// request locale and its canonical path (`/cookie-use`, `/de/cookie-use`);
// passing the default locale explicitly would add an `/en` prefix and a
// redirect. External links are plain anchors.
export function LegalRichText({ className, document }: { className?: string; document: LegalDocument }) {
	return <div className={cn('space-y-5 font-label text-body-lg wrap-anywhere', className)}>{document.content.map((node, index) => renderBlock(node, index))}</div>
}

function renderBlock(node: RichTextNode, key: number): ReactNode {
	switch (node.type) {
		case 'paragraph':
			return <p key={key}>{renderInline(node.content)}</p>
		case 'heading':
			return node.attrs?.level === 3
				? <h3 className="pt-2 font-display text-lead font-bold" key={key}>{renderInline(node.content)}</h3>
				: <h2 className="pt-6 font-display text-heading-3 font-bold" key={key}>{renderInline(node.content)}</h2>
		case 'blockquote':
			return <blockquote className="border-l-4 border-tp-mist pl-5 italic" key={key}>{renderInline(node.content)}</blockquote>
		case 'bulletList':
		case 'orderedList': {
			const Tag = node.type === 'bulletList' ? 'ul' : 'ol'
			const start = node.type === 'orderedList' && typeof node.attrs?.start === 'number' && node.attrs.start !== 1 ? node.attrs.start : undefined
			return (
				<Tag className={cn('space-y-3 pl-6 marker:text-tp-blue', Tag === 'ul' ? 'list-disc' : 'list-decimal')} key={key} start={start}>
					{(node.content ?? []).map((item, index) => (
						<li className="space-y-3 pl-1" key={index}>{(item.content ?? []).map((child, childIndex) => renderBlock(child, childIndex))}</li>
					))}
				</Tag>
			)
		}
		default:
			return null
	}
}

function renderInline(content: RichTextNode[] | undefined): ReactNode {
	return (content ?? []).map((node, index) => {
		if (node.type === 'hardBreak') return <br key={index} />
		if (node.type !== 'text' || typeof node.text !== 'string') return null
		let child: ReactNode = node.text
		let href: string | null = null
		for (const mark of node.marks ?? []) {
			if (mark.type === 'bold') child = <strong className="font-bold">{child}</strong>
			if (mark.type === 'italic') child = <em>{child}</em>
			// Only site paths and http or https links; anything else stays plain text.
			if (mark.type === 'link') href = allowedHref(mark.attrs?.href, legalLinkIssue)
		}
		if (href) {
			return isInternalLegalHref(href)
				? <Link className={linkClass} href={href} key={index}>{child}</Link>
				: <a className={linkClass} href={href} key={index} rel="noopener noreferrer">{child}</a>
		}
		return <span key={index}>{child}</span>
	})
}
