'use client'

import Header from '@/components/header/header'
import { useEffect } from 'react'

export default function Error({ error }) {
	useEffect(() => {
		console.error(error)
	}, [error])

	return (
		<>
			<Header />
			<main className="w-[90%] h-screen text-center flex items-center justify-center bg-black-spaces text-white">
				<h1 className="font-jose text-primary text-2xl lg:text-4xl">
					We&apos;re sorry, something went wrong.
				</h1>
			</main>
		</>
	)
}
