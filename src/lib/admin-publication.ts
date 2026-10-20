import { FieldError } from '@/lib/admin-action'
import { editorialState, resolvePublication, type EditorialState, type StoredPublication } from '@/lib/publication.mjs'

/** What a translation save returns: the stored publication as the admin shows it. */
export type SavedPublication = EditorialState

/** The columns every translation table reads back to resolve a save. */
export const PUBLICATION_COLUMNS = 'status, published_at, scheduled_for'

/**
 * The stored publication columns for the editor's choice (src/lib/publication.mjs),
 * given the row as it is stored now (null for a new translation). A refusal
 * is reported on its field. `goesPublic` is true when the row is or will be
 * public (published now or scheduled), for the "needs alt text" checks.
 */
export function publicationColumns({ datedByEditor = false, existing, publishAt, status }: { datedByEditor?: boolean; existing: StoredPublication | null; publishAt: FormDataEntryValue | null; status: string }) {
	const result = resolvePublication({ datedByEditor, existing, publishAt, status })
	if (!result.ok) throw new FieldError(result.field, result.message)
	return { goesPublic: result.row.status === 'published', row: result.row, saved: editorialState(result.row) }
}

/** The end of a "translation saved" message: " and published", " and scheduled", or nothing. */
export function publishedNotice(saved: SavedPublication) {
	return saved.status === 'published' ? ' and published' : saved.status === 'scheduled' ? ' and scheduled' : ''
}
