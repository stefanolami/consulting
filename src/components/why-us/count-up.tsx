'use client'

import { useEffect, useRef } from 'react'

const DURATION_MS = 1600

// A figure that counts up from zero the first time it scrolls into view
// (Figma annotation "NUMBERS COUNT UP UNTIL REACHING FINAL METRIC"). The server
// renders the final figure, so it is correct without JavaScript and under
// reduced motion, where nothing animates. The text is updated directly rather
// than through state so counting does not re-render. Callers hide the
// animated copy from assistive technology and provide the sentence as text.
export function CountUp({ children, locale, value }: { children: string; locale: string; value: number }) {
	const ref = useRef<HTMLSpanElement>(null)

	useEffect(() => {
		const element = ref.current
		if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
		const format = new Intl.NumberFormat(locale)
		const finalText = element.textContent
		let frame = 0
		element.textContent = format.format(0)
		const observer = new IntersectionObserver(([entry]) => {
			if (!entry?.isIntersecting) return
			observer.disconnect()
			const start = performance.now()
			const tick = (now: number) => {
				const progress = Math.min((now - start) / DURATION_MS, 1)
				const eased = 1 - (1 - progress) ** 3
				element.textContent = progress < 1 ? format.format(Math.round(value * eased)) : finalText
				if (progress < 1) frame = requestAnimationFrame(tick)
			}
			frame = requestAnimationFrame(tick)
		}, { threshold: 0.6 })
		observer.observe(element)
		return () => {
			observer.disconnect()
			cancelAnimationFrame(frame)
			element.textContent = finalText
		}
	}, [locale, value])

	return <span className="tabular-nums" ref={ref}>{children}</span>
}
