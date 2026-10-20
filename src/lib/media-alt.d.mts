export type LibraryAltRow = { media_asset_id: string; locale: string; alt_text: string | null }

export declare function cleanAlt(value: unknown): string | null
export declare function libraryAlt(rows: readonly LibraryAltRow[] | null | undefined, assetId: string | null | undefined, locale: string, options?: { fallbackLocale?: string }): string | null
export declare function resolveAlt(input: { useAlt?: string | null; libraryAlt?: string | null }): { alt: string | null; source: 'use' | 'library' | null }
