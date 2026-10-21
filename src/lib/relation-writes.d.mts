export declare function postgrestInList(values: readonly (string | number)[]): string

export declare function relationWritePlan<T extends Record<string, unknown>>(rows: readonly T[], key: keyof T & string): { upsert: readonly T[]; keep: unknown[] | null }

export type StoredStatistic = { id: string; metricKey: string }
export type DesiredStatistic = { id?: string | null; metricKey: string }

export declare function statisticWritePlan<T extends DesiredStatistic>(existing: readonly StoredStatistic[], desired: readonly T[]): {
	insert: T[]
	parked: string[]
	remove: string[]
	unknown: string[]
	update: (T & { id: string })[]
}

export declare function parkedMetricKey(id: string): string
