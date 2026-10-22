import type { OutreachCountry, OutreachOffice, OutreachPerson, OutreachService } from '@/lib/public-outreach'

export type StatisticSource = { host: string; href: string }
export type DetailStatistic = { id: string; label: string; metricKey: string; source: StatisticSource | null; text: string }
export type CountryDetailBlocks = {
	content: boolean
	coverage: string | null
	lastReviewed: Date | null
	offices: OutreachOffice[]
	people: OutreachPerson[]
	serviceDetails: OutreachService[]
	services: OutreachService[]
	statistics: DetailStatistic[]
	summary: string | null
}

type StatisticInput = { displayValue: string | null; numericValue: number | string | null; unit: string | null; year: number | null }
type DetailInput = Pick<OutreachCountry, 'content' | 'coverageSummary' | 'lastReviewedOn' | 'offices' | 'people' | 'services' | 'statistics' | 'summary'>

export declare function hasVisibleText(node: unknown): boolean
export declare function statisticText(statistic: StatisticInput, locale: string): string | null
export declare function statisticSource(value: string | null | undefined): StatisticSource | null
export declare function reviewedDate(value: string | null | undefined): Date | null
export declare function countryDetailBlocks(country: DetailInput, locale: string): CountryDetailBlocks
export declare function longestWordLength(names: readonly string[]): number
