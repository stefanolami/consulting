export type FieldErrors = Record<string, string>

/** What every admin server action returns (src/lib/admin-action.ts). */
export type AdminActionResult<V = undefined> = {
	ok: boolean
	success?: string
	formError?: string
	fieldErrors?: FieldErrors
	values?: V
	redirectTo?: string
}

export type IssueLike = { code?: string; path?: PropertyKey[]; message?: string; origin?: string; minimum?: number | bigint; maximum?: number | bigint; format?: string; keys?: string[] }

export declare function issueMessage(issue: IssueLike): string

export declare function issuesToErrors(issues: readonly IssueLike[], options?: { itemLabels?: Record<string, string> }): { fieldErrors: FieldErrors; formError?: string }

export declare function toActionFailure(error: unknown, fallback: string, options?: { itemLabels?: Record<string, string> }): AdminActionResult<never>

export declare function formSnapshot(entries: Iterable<[string, string | { name?: string; size?: number; lastModified?: number }]>): string

export declare function failureSummary(result: AdminActionResult<unknown> | null, renderedFields?: readonly string[]): string[] | null

export declare function nextTabIndex(key: string, index: number, count: number): number | null
