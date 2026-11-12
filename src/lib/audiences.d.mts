export type Audience = 'business' | 'government' | 'academia'

export type TileEmphasis = 'default' | 'highlighted' | 'muted'

export declare const AUDIENCES: readonly ['business', 'government', 'academia']

export declare const AUDIENCE_ADMIN_LABELS: Readonly<Record<Audience, string>>

export declare const AUDIENCE_STORAGE_KEY: string

export declare const AUDIENCE_PARAM: string

export declare const AUDIENCE_ATTRIBUTE: string

export declare const AUDIENCE_EVENT: string

export declare function isAudience(value: unknown): value is Audience

export declare function parseAudience(value: unknown): Audience | null

export declare function parseAudienceList(value: unknown): Audience[]

export declare function resolveAudience(sources?: { stored?: unknown; url?: unknown }): Audience | null

export declare function nextAudience(current: unknown, chosen: unknown): Audience | null

export declare function tileEmphasis(serviceAudiences: unknown, active: unknown): TileEmphasis

export declare function isServicesListingPath(pathname: string, locales: readonly string[]): boolean

export declare function audienceSearch(search: string, audience: Audience | null): string

export declare function audienceBootScript(locales: readonly string[]): string
