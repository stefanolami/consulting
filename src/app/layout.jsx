import Header from '@/components/header/header'
import Footer from '@/components/footer/footer'
import './globals.css'
import { jose, unna, robo } from '@/app/fonts'
import Loading from '@/components/loading'
import { Suspense } from 'react'
import CookieBanner from '@/components/cookie-banner'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
	title: {
		default: 'Time&Place Consulting',
		template: '%s - Time&Place Consulting',
	},
	description: 'Your Line of Communication',
	openGraph: {
		title: 'Time&Place Consulting',
		description: 'Your Line of Communication',
		url: 'https://www.consultingontap.com',
		siteName: 'Time&Place Consulting',
		images: [
			{
				url: 'https://www.consultingontap.com/web-app-manifest-512x512.png',
				width: 512,
				height: 512,
			},
			{
				url: 'https://www.consultingontap.com/web-app-manifest-192x192.png',
				width: 192,
				height: 192,
			},
		],
		locale: 'en_US',
		type: 'website',
	},
}

export default function RootLayout({ children, params: { locale } }) {
	return (
		<html
			lang={locale}
			className={`${jose.variable} ${unna.variable} ${robo.variable}`}
		>
			{/* <GoogleAnalytics gaId={'G-MEJHPJY420'} /> */}
			<body className="relative pt-16 lg:pt-24 pb-[85px] lg:pb-[200px] min-h-screen">
				<Suspense fallback={<Loading />}>
					<Header />
					<main>{children}</main>
					<CookieBanner />
					<Footer />
					<Toaster />
				</Suspense>
			</body>
		</html>
	)
}
