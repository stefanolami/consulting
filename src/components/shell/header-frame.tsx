'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

const HIDE_AFTER_PX = 200

// Legacy behaviour: the header hides while scrolling down past 200px and
// returns on scroll up. It stays visible while it contains keyboard focus
// (for example, an open menu). Sticky rather than fixed so the page never
// needs an offset for the header height.
export function HeaderFrame({ children }: { children: ReactNode }) {
	const ref = useRef<HTMLElement>(null)
	const [hidden, setHidden] = useState(false)

	useEffect(() => {
		let lastY = window.scrollY
		let frame = 0
		const update = () => {
			frame = 0
			const y = window.scrollY
			const hasFocus = ref.current?.contains(document.activeElement) ?? false
			setHidden(!hasFocus && y > lastY && y > HIDE_AFTER_PX)
			lastY = y
		}
		const onScroll = () => {
			if (!frame) frame = window.requestAnimationFrame(update)
		}
		window.addEventListener('scroll', onScroll, { passive: true })
		return () => {
			window.removeEventListener('scroll', onScroll)
			if (frame) window.cancelAnimationFrame(frame)
		}
	}, [])

	return (
		<header
			ref={ref}
			onFocus={() => setHidden(false)}
			className={cn(
				'sticky top-0 z-50 bg-brand text-on-brand transition-transform duration-300 ease-in-out motion-reduce:transition-none',
				hidden && '-translate-y-full',
			)}
		>
			{children}
		</header>
	)
}
