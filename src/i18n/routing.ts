import { defineRouting } from 'next-intl/routing'
import { createLocalizedPathnamesNavigation } from 'next-intl/navigation'

export const routing = defineRouting({
	// A list of all locales that are supported
	locales: ['en'],

	// Used when no locale matches
	defaultLocale: 'en',
	pathnames: {
		'/': '/',
		'/contact': {
			en: '/contact',
		},
		'/cookie-use': {
			en: '/cookie-use',
		},
		'/our-pillars': {
			en: '/our-pillars',
		},
		'/our-products': {
			en: '/our-products',
		},
		'/our-projects': {
			en: '/our-projects',
		},
		'/our-team': {
			en: '/our-team',
		},
		'/our-team/[name]': {
			en: '/our-team/[name]',
		},
		'/privacy-policy': {
			en: '/privacy-policy',
		},
		'/terms-and-conditions': {
			en: '/terms-and-conditions',
		},
	},
})

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter, getPathname } =
	createLocalizedPathnamesNavigation(routing)
