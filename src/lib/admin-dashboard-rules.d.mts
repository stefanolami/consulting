export declare const SCHEDULE_WINDOW_DAYS: number
export declare const DASHBOARD_LIST_LIMIT: number

export declare function scheduleWindow(now?: Date, days?: number): { from: string; to: string }

export declare function mergeRecent<T extends { key: string; at: string | null }>(groups: readonly (readonly T[])[], limit?: number): T[]

export declare function mergeSoonest<T extends { at: string | null }>(groups: readonly (readonly T[])[], limit?: number): T[]

export type ImageUse = {
	liveLocales: readonly string[]
	libraryAlts: Readonly<Record<string, string | null | undefined>>
	useAlts?: Readonly<Record<string, string | null | undefined>>
}
export declare function altTextGaps<T extends ImageUse>(uses: readonly T[], localeOrder: readonly string[]): (T & { missing: string[] })[]

export declare function total(counts: readonly (number | null | undefined)[]): number
