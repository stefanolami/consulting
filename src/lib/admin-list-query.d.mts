export type ListLocale = 'en' | 'de' | 'it' | 'pt-BR' | 'pt-PT'
export type TranslationState = 'draft' | 'scheduled' | 'published' | 'archived' | 'missing' | 'not-live'

export declare const LIST_LOCALES: readonly ListLocale[]
export declare const TRANSLATION_STATES: readonly TranslationState[]

type SearchParam = { type: 'search' }
type EnumParam<V extends string = string> = { type: 'enum'; values: readonly V[]; default?: V }
type KeyParam = { type: 'key' }
type IdParam = { type: 'id'; also?: readonly string[] }
type PageParam = { type: 'page' }
export type ListParam = SearchParam | EnumParam | KeyParam | IdParam | PageParam
export type ListSpec = Record<string, ListParam>

type ValueOf<P> = P extends PageParam ? number : P extends EnumParam<infer V> ? V | '' : string
export type ListState<S extends ListSpec> = { [K in keyof S]: ValueOf<S[K]> }

export declare const NEWSROOM_LIST: {
	q: SearchParam
	status: EnumParam<TranslationState>
	locale: EnumParam<ListLocale>
	kind: KeyParam
	page: PageParam
}
export declare const COUNTRY_LIST: {
	q: SearchParam
	coverage: EnumParam<'covered' | 'not-covered' | 'all'>
	region: IdParam
	status: EnumParam<TranslationState>
	locale: EnumParam<ListLocale>
	page: PageParam
}
export declare const PEOPLE_LIST: { q: SearchParam }
export declare const CATALOGUE_LIST: { kind: EnumParam<'services' | 'sectors'>; q: SearchParam }
export declare const PARTNER_LIST: { kind: EnumParam<'partners' | 'endorsements'>; q: SearchParam }

export declare const NEWSROOM_PAGE_SIZE: number
export declare const COUNTRY_PAGE_SIZE: number

export type ParamSource = URLSearchParams | { get(name: string): string | null } | Record<string, string | string[] | undefined> | null | undefined

export declare function normalizeSearch(text: unknown): string
export declare function parseListQuery<S extends ListSpec>(spec: S, source: ParamSource): ListState<S>
export declare function listQueryString<S extends ListSpec>(spec: S, state: Partial<ListState<S>>): string
export declare function changeListQuery<S extends ListSpec>(spec: S, state: ListState<S>, change: Partial<{ [K in keyof S]: ListState<S>[K] | null }>): ListState<S>
export declare function hasListFilters<S extends ListSpec>(spec: S, state: ListState<S>, ignore?: readonly (keyof S & string)[]): boolean
export declare function pageWindow(total: number | null | undefined, page: number, pageSize: number): { page: number; pageCount: number; from: number; to: number; first: number; last: number }
export declare function containsPattern(text: string): string
