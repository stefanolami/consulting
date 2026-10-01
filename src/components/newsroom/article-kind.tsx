import { BookOpen, CalendarDays, type LucideIcon, Megaphone, Newspaper, PenTool, Share2, Video } from 'lucide-react'

import { cn } from '@/lib/utils'

// Kind keys with an interface label (`Newsroom.kinds.*`) and an icon. The
// admin stores `articles.kind` as a free controlled key; an unknown key shows
// no label and is not offered as a filter. The Figma "Newletter Icons" set is
// not in the repository yet, so Lucide icons stand in for it
// (docs/figma-asset-needs.md).
const KIND_ICONS = {
	article: PenTool,
	newsletter: Newspaper,
	announcement: Megaphone,
	event: CalendarDays,
	video: Video,
	vodcast: Video,
	podcast: Video,
	book: BookOpen,
	media: Share2,
} satisfies Record<string, LucideIcon>

export type ArticleKind = keyof typeof KIND_ICONS

export function isArticleKind(value: string): value is ArticleKind {
	return Object.hasOwn(KIND_ICONS, value)
}

/** Decorative kind icon; the label next to it names the kind. */
export function ArticleKindIcon({ className, kind }: { className?: string; kind: ArticleKind }) {
	const Icon = KIND_ICONS[kind]
	return <Icon aria-hidden="true" className={cn('shrink-0', className)} data-placeholder-asset={`newsroom-kind-icon-${kind}`} strokeWidth={1.5} />
}
