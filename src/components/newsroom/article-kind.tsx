import { BookOpen, CalendarDays, type LucideIcon, Megaphone, Newspaper, PenTool, Share2, Video } from 'lucide-react'

import { isArticleKind, type ArticleKind } from '@/lib/article-kinds.mjs'
import { cn } from '@/lib/utils'

export { isArticleKind, type ArticleKind }

// One icon per kind of the fixed vocabulary (src/lib/article-kinds.mjs), which
// also has an interface label (`Newsroom.kinds.*`). A stored key outside the
// vocabulary shows no label and is not offered as a filter. The Figma
// "Newletter Icons" set is not in the repository yet, so Lucide icons stand in
// for it (docs/figma-asset-needs.md).
const KIND_ICONS: Record<ArticleKind, LucideIcon> = {
	article: PenTool,
	newsletter: Newspaper,
	announcement: Megaphone,
	event: CalendarDays,
	video: Video,
	vodcast: Video,
	podcast: Video,
	book: BookOpen,
	media: Share2,
}

/** Decorative kind icon; the label next to it names the kind. */
export function ArticleKindIcon({ className, kind }: { className?: string; kind: ArticleKind }) {
	const Icon = KIND_ICONS[kind]
	return <Icon aria-hidden="true" className={cn('shrink-0', className)} data-placeholder-asset={`newsroom-kind-icon-${kind}`} strokeWidth={1.5} />
}
