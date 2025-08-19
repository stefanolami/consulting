'use client'

import { useState, useEffect } from 'react'
import { getLocalStorage, setLocalStorage } from '@/lib/utils/storage'
import Link from 'next/link'

export default function CookieBanner() {
	const [cookieConsent, setCookieConsent] = useState(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		const storedCookieConsent = getLocalStorage('cookieConsent', null)
		setCookieConsent(storedCookieConsent)
		setIsLoading(false)
	}, [])

	useEffect(() => {
		if (cookieConsent !== null) {
			setLocalStorage('cookieConsent', cookieConsent)
		}
		const newValue = cookieConsent ? 'granted' : 'denied'
		if (typeof window !== 'undefined' && window.gtag) {
			window.gtag('consent', 'update', {
				analytics_storage: newValue,
			})
		}
	}, [cookieConsent])

	if (isLoading || cookieConsent !== null) {
		return null
	}

	return (
		<div className="fixed bottom-0 z-40 w-full">
			<div className="container mb-3 bg-grey p-4 rounded-md shadow-xl w-[95%] xl:w-[98%] mx-auto flex justify-between items-center font-jose text-primary text-sm xl:text-lg">
				<div>
					We use cookies to ensure you get the best experience on our
					website. Learn more here:
					<div className="block xl:inline">
						<Link
							href="/cookie-use"
							className="underline xl:ml-3 mr-3"
						>
							Cookie Use
						</Link>
						<Link
							href="/privacy-policy"
							className="underline"
						>
							Privacy Policy
						</Link>
					</div>
				</div>
				<div className="grid grid-rows-2 gap-2 xl:grid-cols-2 xl:grid-rows-1">
					<button
						className="bg-primary-light shadow-md hover:shadow-xl text-white w-20 h-8 xl:w-24 xl:h-11 rounded hover:scale-105"
						onClick={() => setCookieConsent(true)}
					>
						Accept
					</button>
					<button
						className="bg-primary shadow-md hover:shadow-xl text-white w-20 h-8 xl:w-24 xl:h-11 rounded hover:scale-105"
						onClick={() => setCookieConsent(false)}
					>
						Decline
					</button>
				</div>
			</div>
		</div>
	)
}
