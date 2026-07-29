import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
	locales: ['en', 'de', 'it', 'pt-BR', 'pt-PT'],
	defaultLocale: 'en',
	localePrefix: 'as-needed',
})

export type AppLocale = (typeof routing.locales)[number]
