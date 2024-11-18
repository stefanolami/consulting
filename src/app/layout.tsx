import './globals.css'
import { Metadata } from 'next'
import { GoogleAnalytics } from '@next/third-parties/google'
import { jose, unna } from '@/app/fonts'

export const metadata: Metadata = {
	title: {
		default: 'Time&Place Consulting',
		template: '%s - Time&Place Consulting',
	},
	description: 'Time&Place Consulting',
	openGraph: {
		title: 'Time&Place Consulting',
		description: 'Our Presence, Your Opportunities.',
		url: 'https://www.consultingontap.com',
		siteName: 'Time&Place Consulting',
		images: [
			{
				url: 'https://consulting-one.vercel.app/web-app-manifest-512x512.png', // Must be an absolute URL
				width: 512,
				height: 512,
			},
			{
				url: 'https://consulting-one.vercel.app/web-app-manifest-192x192.png', // Must be an absolute URL
				width: 192,
				height: 192,
			},
		],
		locale: 'en_US',
		type: 'website',
	},
}

export default function RootLayout({
	children,
	params: { locale },
}: {
	children: React.ReactNode
	params: { locale: string }
}) {
	return (
		<html
			lang={locale}
			className={`${jose.variable} ${unna.variable}`}
		>
			{/* <GoogleAnalytics gaId={'G-MEJHPJY420'} /> */}
			<body className="relative pt-16 xl:pt-24 pb-[85px] xl:pb-[200px] min-h-screen">
				{children}
			</body>
		</html>
	)
}
