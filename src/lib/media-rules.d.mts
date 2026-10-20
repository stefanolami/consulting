export type MediaKind = 'portrait' | 'icon' | 'cover' | 'logo' | 'flag'
export type MediaType = 'image/gif' | 'image/jpeg' | 'image/png' | 'image/svg+xml' | 'image/webp' | 'application/pdf'

export declare const MEDIA_BUCKET: 'public-media'
export declare const MAX_MEDIA_FILE_BYTES: number
export declare const IMAGE_MEDIA_TYPES: readonly MediaType[]
export declare const MEDIA_TYPES: readonly MediaType[]
export declare const MEDIA_KINDS: readonly MediaKind[]
export declare const MEDIA_KIND_LABELS: Readonly<Record<MediaKind, string>>

export declare function formatBytes(bytes: number | null | undefined): string
export declare function acceptedTypeNames(imagesOnly?: boolean): string
export declare function acceptAttribute(imagesOnly?: boolean): string
export declare function mediaFileProblem(file: { name?: string; type?: string; size?: number } | null | undefined, options?: { imagesOnly?: boolean }): string | null
export declare function mediaExtension(type: string): string | null
export declare function mediaObjectPath(kind: string | null | undefined, type: string, options?: { now?: Date; uuid?: string }): string
export declare function kindFromPath(objectPath: string | null | undefined): MediaKind | null
export declare function mediaKinds(input: { objectPath: string | null | undefined; references?: readonly { type: string }[] }): MediaKind[]
