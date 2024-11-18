import './globals.css'
import { Metadata } from 'next'
import { GoogleAnalytics } from '@next/third-parties/google'
import { jose, unna } from '@/app/fonts'

export const metadata: Metadata = {
	title: {
		default: 'Time&Place Funding',
		template: '%s - Time&Place Funding',
	},
	description: 'Time&Place Funding',
	openGraph: {
		title: 'Time&Place Funding',
		description: 'Our Presence, Your Opportunities.',
		url: 'https://www.fundingontap.com',
		siteName: 'Time&Place Funding',
		images: [
			{
				url: 'https://funding-kohl.vercel.app/web-app-manifest-1024x1024.png', // Must be an absolute URL
				width: 1024,
				height: 1024,
			},
			{
				url: 'https://funding-kohl.vercel.app/web-app-manifest-512x512.png', // Must be an absolute URL
				width: 512,
				height: 512,
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
