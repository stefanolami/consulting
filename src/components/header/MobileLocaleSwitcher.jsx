'use client'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { useTransition } from 'react'
import { useRouter, usePathname } from '@/i18n/routing'
import { useLocale } from 'next-intl'
import { useSearchParams } from 'next/navigation'

const wrapperVariants = {
	open: {
		scaleY: 1,
		transition: {
			staggerChildren: 0.1,
			duration: 0.1,
		},
	},
	closed: {
		scaleY: 0,
		transition: {
			staggerChildren: 0.1,
			duration: 0.1,
		},
	},
}

const itemVariants = {
	open: {
		opacity: 1,
		y: 0,
	},
	closed: {
		opacity: 0,
		y: -15,
	},
}

const actionIconVariants = {
	open: { scale: 1, y: 0 },
	closed: { scale: 0, y: -7 },
}

const locales = ['en', 'de', 'fr', 'es', 'ro']

const LocaleElement = ({ locale, handler }) => {
	const text = locale.toUpperCase()
	return (
		<motion.li
			variants={itemVariants}
			className=""
		>
			<motion.span
				onClick={handler}
				id={locale}
				variants={actionIconVariants}
				className="flex items-center justify-center font-unna font-normal text-xs text-white bg-primary-light w-10 h-10 rounded-full py-1 mt-2 cursor-pointer border-2 border-primary"
			>
				{text}
			</motion.span>
		</motion.li>
	)
}

const getFullUrl = (pathname, searchParams) => {
	return `${pathname}?${searchParams.toString()}`
}

export default function MobileLocaleSwitcher() {
	const [open, setOpen] = useState(false)
	const locale = useLocale()
	const router = useRouter()
	const [isPending, startTransition] = useTransition()
	const pathname = usePathname()
	const searchParams = useSearchParams()

	function changeLocale(event) {
		const nextLocale = event.target.id
		startTransition(() => {
			router.replace(getFullUrl(pathname, searchParams), {
				locale: nextLocale,
			})
		})
	}

	return (
		<div className="md:hidden flex items-center justify-center text-xs scale-90">
			<motion.div
				animate={open ? 'open' : 'closed'}
				className="relative"
			>
				<button
					onClick={() => setOpen((pv) => !pv)}
					className="flex items-center justify-center gap-2 font-unna font-normal text-xs text-white bg-primary-light w-10 h-10 rounded-full py-1 shadow-md"
				>
					{locale.toUpperCase()}
				</button>

				<motion.ul
					initial={wrapperVariants.closed}
					variants={wrapperVariants}
					style={{ originY: 'top', translateX: '-50%' }}
					className="flex flex-col items-center absolute top-[100%] left-[50%] overflow-hidden"
				>
					{locales.map((loc) => {
						if (loc !== locale) {
							return (
								<LocaleElement
									key={loc}
									locale={loc}
									handler={changeLocale}
								/>
							)
						}
						return null
					})}
				</motion.ul>
			</motion.div>
		</div>
	)
}
