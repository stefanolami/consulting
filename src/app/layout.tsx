import type { Metadata } from 'next'
import type { ReactNode } from 'react'

type Props = {
	children: ReactNode
}

export const metadata: Metadata = {
	metadataBase: new URL('https://www.consultingontap.com'),
	title: {
		default: 'Time&Place Consulting',
		template: '%s | Time&Place Consulting',
	},
	description:
		'International public affairs, strategic communications, business development, and project management.',
}

// Since we have a `not-found.tsx` page on the root, a layout file
// is required, even if it's just passing children through.
export default function RootLayout({ children }: Props) {
	return children
}
