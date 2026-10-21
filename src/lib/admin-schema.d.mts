import type { z } from 'zod'

export declare function isBlank(value: unknown): boolean

export declare function optional<T extends z.ZodType>(schema: T): z.ZodType<z.output<T> | null, unknown>

export declare function httpUrl(message?: string): z.ZodType<string, string>

export declare function optionalText(maximum: number, message?: string): z.ZodType<string | null, unknown>

export declare const optionalUuid: z.ZodType<string | null, unknown>

export declare const optionalNumber: z.ZodType<number | null, unknown>

export declare function optionalHttpUrl(message?: string): z.ZodType<string | null, unknown>

export declare function optionalEmail(message?: string): z.ZodType<string | null, unknown>

export declare const requiredKey: z.ZodType<string, string>

export type ProfileRole = { id?: string | null; title: string; cardLabel: string | null; isCardRole: boolean }
export declare const profileRoleSchema: z.ZodType<ProfileRole, unknown>

export type CountryServiceAssignment = { serviceId: string; coverageLevel: string | null }
export declare const countryServiceAssignmentSchema: z.ZodType<CountryServiceAssignment, unknown>

export type CountryStatistic = { id?: string | null; metricKey: string; numericValue: number | null; unit: string | null; statisticYear: number | null; sourceUrl: string | null; displayOrder: number }
export declare const countryStatisticSchema: z.ZodType<CountryStatistic, unknown>

export type CountryServiceCopy = { serviceId: string; summary: string | null; content: unknown }
export declare const countryServiceCopySchema: z.ZodType<CountryServiceCopy, unknown>

export type CountryStatisticLabel = { statisticId: string; label: string; displayValue: string | null }
export declare const countryStatisticLabelSchema: z.ZodType<CountryStatisticLabel, unknown>

export type SocialPlatform = 'linkedin' | 'instagram' | 'facebook' | 'youtube' | 'x'
export declare const SOCIAL_PLATFORMS: readonly SocialPlatform[]
export type SocialLink = { platform: SocialPlatform; url: string }
export declare const socialLinkSchema: z.ZodType<SocialLink, unknown>
export declare function unusedSocialPlatform(used: Iterable<string>): SocialPlatform | null

export type CallToAction ={ key: string; href: string; labels: { en: string; de: string | null; it: string | null; 'pt-BR': string | null; 'pt-PT': string | null } }
export declare const callToActionSchema: z.ZodType<CallToAction, unknown>
