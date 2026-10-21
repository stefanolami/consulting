// The fixed vocabulary of article kinds (audit NEWS-11, decided by the
// product owner on 2026-10-21; control tower §23.11). These are the nine keys
// the public newsroom labels (messages `Newsroom.kinds`) and filters by; the
// admin offers them in a select and the server schema accepts nothing else.
// The admin labels name each key on its own, where the public labels group
// video, vodcast and podcast. Plain JavaScript with a `.d.mts` declaration so
// the node:test suites can import it.
import { z } from 'zod'

export const ARTICLE_KINDS = Object.freeze(['article', 'newsletter', 'announcement', 'event', 'video', 'vodcast', 'podcast', 'book', 'media'])

export const ARTICLE_KIND_LABELS = Object.freeze({
	article: 'Article',
	newsletter: 'Newsletter',
	announcement: 'Announcement',
	event: 'Event',
	video: 'Video',
	vodcast: 'Vodcast',
	podcast: 'Podcast',
	book: 'Book',
	media: 'Media',
})

export const DEFAULT_ARTICLE_KIND = 'article'

export function isArticleKind(value) {
	return typeof value === 'string' && ARTICLE_KINDS.includes(value)
}

/** The admin label of a kind, or the stored key when it is not in the vocabulary. */
export function articleKindLabel(kind) {
	return isArticleKind(kind) ? ARTICLE_KIND_LABELS[kind] : kind
}

export const articleKindSchema = z.enum(ARTICLE_KINDS, { message: 'Choose one of the listed article kinds.' })
