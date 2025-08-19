'use client'

import Header from '@/components/header/header'

export default function NotFound() {
	return (
		<>
			<Header />
			<main className="w-full h-screen flex items-center justify-center">
				<h1 className="font-jose text-center text-2xl lg:text-4xl text-primary">
					404 - Page not found
				</h1>
			</main>
		</>
	)
}
