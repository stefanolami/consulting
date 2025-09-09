'use client'

import { useState } from 'react'
import { motion, useScroll, useMotionValueEvent } from 'framer-motion'
import Image from 'next/image'
import DesktopNav from './desktop-nav'
import MobileNav from './mobile-nav'
import Link from 'next/link'

export default function Header() {
	const { scrollY } = useScroll()

	const [hidden, setHidden] = useState(false)
	const [style, setStyle] = useState({
		background: '#27335A',
		color: '#FFFFFF',
	})

	useMotionValueEvent(scrollY, 'change', (latest) => {
		const previous = scrollY.getPrevious()
		if (latest > previous && latest > 200) {
			setHidden(true)
		} else {
			setHidden(false)
		}
	})

	return (
		<motion.div
			variants={{
				visible: {
					y: 0,
					backgroundColor: style.background,
					color: style.color,
				},
				hidden: {
					y: '-100%',
					color: '#fff',
				},
			}}
			animate={hidden ? 'hidden' : 'visible'}
			transition={{ duration: 0.3, ease: 'easeInOut' }}
			className={
				'fixed top-0 w-full bg-transparent text-white z-50 px-6 md:px-10 xl:px-[7%]'
			}
		>
			<div className="flex justify-between items-center max-w-[1300px] mx-auto h-16 lg:h-24">
				<div className="flex items-center justify-center h-full md:pl-4 lg:pl-0">
					<Link
						className=" md:py-4 xl:py-7 w-[124px] xl:w-[231px] aspect-[694/186] relative xl:scale-75"
						href="/"
					>
						<Image
							src="/logos/consulting-white.png"
							alt="T&P Logo"
							fill
							sizes="(max-width: 640px) 40vw, 40vw"
						/>
					</Link>
				</div>

				<DesktopNav />

				<MobileNav />
			</div>
		</motion.div>
	)
}
