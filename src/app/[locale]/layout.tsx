import { unstable_setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import HeaderWrapper from '@/components/header/HeaderWrapper'
import Footer from '@/components/footer/Footer'
import Loading from '@/components/Loading'
import CookieBanner from '@/components/CookieBanner'

// Can be imported from a shared config
const locales = ['en']

export function generateStaticParams() {
	return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
	children,
	params: { locale },
}: {
	children: React.ReactNode
	params: { locale: string }
}) {
	const messages = await getMessages()
	unstable_setRequestLocale(locale)
	return (
		<NextIntlClientProvider messages={messages}>
			<Suspense fallback={<Loading />}>
				<HeaderWrapper />
				<main className="">{children}</main>
				<CookieBanner />
				<Footer />
			</Suspense>
		</NextIntlClientProvider>
	)
}
