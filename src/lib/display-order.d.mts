export type OrderedRow = { id: string; order: number; tieBreak?: string | null }

export declare function nextDisplayOrder(highest: number | null | undefined): number

export declare function compareDisplayOrder(a: OrderedRow, b: OrderedRow): number

export declare function sortByDisplayOrder<T extends OrderedRow>(rows: readonly T[]): T[]

export declare function moveInDisplayOrder<T extends OrderedRow>(
	rows: readonly T[],
	id: string,
	direction: 'up' | 'down',
	canMove?: (row: T) => boolean,
): { moved: boolean; updates: { id: string; order: number }[] }

export declare function moveAvailability<T extends OrderedRow>(
	rows: readonly T[],
	canMove?: (row: T) => boolean,
): Map<string, { up: boolean; down: boolean }>
