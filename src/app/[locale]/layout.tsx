import type { Metadata } from 'next'
import { jose, unna, robo } from '@/app/fonts'
import '../globals.css'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { routing } from '@/i18n/routing'
import { notFound } from 'next/navigation'
import { getMessages, setRequestLocale } from 'next-intl/server'

const defaultUrl = process.env.VERCEL_URL
	? `https://${process.env.VERCEL_URL}`
	: 'http://localhost:3000'

export const metadata: Metadata = {
	metadataBase: new URL(defaultUrl),
	title: 'Next.js and Supabase Starter Kit',
	description: 'The fastest way to build apps with Next.js and Supabase',
}

export function generateStaticParams() {
	return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
	children,
	params,
}: Readonly<{
	children: React.ReactNode
	params: Promise<{ locale: string }>
}>) {
	const { locale } = await params
	if (!hasLocale(routing.locales, locale)) {
		notFound()
	}

	setRequestLocale(locale)

	const messages = await getMessages()
	return (
		<html
			lang={locale}
			//suppressHydrationWarning
		>
			<body
				className={`${jose.variable} ${unna.variable} ${robo.variable} antialiased`}
			>
				<NextIntlClientProvider
					locale={locale}
					messages={messages}
				>
					{children}
				</NextIntlClientProvider>
			</body>
		</html>
	)
}
