export type StoredStatus = 'draft' | 'scheduled' | 'published' | 'archived'
export type EditorStatus = 'draft' | 'scheduled' | 'published' | 'archived'

export type StoredPublication = { status: StoredStatus; published_at: string | null; scheduled_for?: string | null }

export declare const EDITOR_STATUSES: readonly EditorStatus[]

export declare function parseInstant(value: unknown): string | null | undefined

export declare function keptPublicationTime(row: StoredPublication | null | undefined): string | null

export type EditorialState = { status: EditorStatus; publishAt: string | null; future: boolean }
export declare function editorialState(row: StoredPublication | null | undefined, now?: Date): EditorialState

export type ResolvedPublication =
	| { ok: true; row: { status: 'draft' | 'published' | 'archived'; published_at: string | null; scheduled_for: null }; editorStatus: EditorStatus }
	| { ok: false; field: 'publishAt' | 'status'; message: string }

export declare function resolvePublication(input: {
	status: string
	publishAt: unknown
	existing?: StoredPublication | null
	now?: Date
	datedByEditor?: boolean
}): ResolvedPublication

export declare function restoredStatus(row: StoredPublication | null | undefined): 'draft' | 'published'

export declare function toDateTimeLocal(value: string | null | undefined): string

export declare function fromDateTimeLocal(value: string | null | undefined): string | null
