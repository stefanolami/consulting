export type OutreachView = { readonly country: string | null; readonly region: string | null }
export type OutreachParams = { country: string | null; region: string | null }
export type OutreachRegionIndex = { key: string; countryCodes: readonly string[] }

export declare const OTHER_REGION_KEY: 'other'
export declare const WORLD_VIEW: OutreachView

export declare function parseOutreachParams(params: { get(name: string): string | null } | null | undefined): OutreachParams
export declare function resolveOutreachView(params: OutreachParams, regions: readonly OutreachRegionIndex[]): OutreachView
export declare function outreachSearch(view: OutreachView): string
export declare function regionToggleView(view: OutreachView, regionKey: string): OutreachView
export declare function countryView(regionKey: string, countryCode: string): OutreachView
export declare function closeCountryView(view: OutreachView): OutreachView
export declare function sameView(a: OutreachView, b: OutreachView): boolean
