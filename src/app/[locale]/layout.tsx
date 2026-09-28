import { jose, unna, robo } from '@/app/fonts'
import '../globals.css'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { routing } from '@/i18n/routing'
import { notFound } from 'next/navigation'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'

import { SiteFooter } from '@/components/shell/site-footer'
import { SiteHeader } from '@/components/shell/site-header'
import { MAIN_CONTENT_ID, SkipLink } from '@/components/shell/skip-link'

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

	const [messages, t] = await Promise.all([getMessages(), getTranslations({ locale, namespace: 'Shell' })])

	return (
		<html lang={locale}>
			<body
				className={`${jose.variable} ${unna.variable} ${robo.variable} flex min-h-dvh flex-col font-serif antialiased`}
			>
				<NextIntlClientProvider
					locale={locale}
					messages={messages}
				>
					<SkipLink label={t('skipToContent')} />
					<SiteHeader locale={locale} />
					<div className="flex flex-1 flex-col outline-none [&>main]:flex-1" id={MAIN_CONTENT_ID} tabIndex={-1}>
						{children}
					</div>
					<SiteFooter locale={locale} />
				</NextIntlClientProvider>
			</body>
		</html>
	)
}
