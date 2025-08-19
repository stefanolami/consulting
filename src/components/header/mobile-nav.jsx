'use client'

import { motion, MotionConfig } from 'framer-motion'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { FiChevronDown } from 'react-icons/fi'

export default function MobileNav() {
	const [active, setActive] = useState(false)
	const [whoWeAre, setWhoWeAre] = useState(false)
	const [whyUs, setWhyUs] = useState(false)

	useEffect(() => {
		if (active) {
			document.body.classList.add('overflow-y-hidden')
		} else {
			document.body.classList.remove('overflow-y-hidden')
		}
	}, [active])

	return (
		<div className="md:hidden flex flex-row font-unna text-lg">
			<MotionConfig
				transition={{
					duration: 0.4,
					ease: 'easeInOut',
				}}
			>
				<motion.button
					initial={false}
					onClick={() => setActive((pv) => !pv)}
					className="relative h-10 w-10 ml-3 rounded-full z-50 bg-primary-light scale-90"
					animate={active ? 'open' : 'closed'}
				>
					<motion.span
						className="absolute h-1 w-6 bg-white rounded-sm"
						style={{
							left: '50%',
							top: '34%',
							x: '-50%',
							y: '-50%',
						}}
						variants={{
							open: {
								rotate: ['0deg', '0deg', '45deg'],
								top: ['34%', '50%', '50%'],
							},
							closed: {
								rotate: ['45deg', '0deg', '0deg'],
								top: ['50%', '50%', '34%'],
							},
						}}
					/>
					<motion.span
						className="absolute h-1 w-6 bg-white rounded-sm"
						style={{
							left: '50%',
							top: '50%',
							x: '-50%',
							y: '-50%',
						}}
						variants={{
							open: {
								rotate: ['0deg', '0deg', '-45deg'],
							},
							closed: {
								rotate: ['-45deg', '0deg', '0deg'],
							},
						}}
					/>
					<motion.span
						className="absolute h-1 w-6 bg-white rounded-sm"
						style={{
							left: '50%',
							bottom: '34%',
							x: '-50%',
							y: '50%',
						}}
						variants={{
							open: {
								rotate: ['0deg', '0deg', '45deg'],
								left: '50%',
								bottom: ['34%', '50%', '50%'],
							},
							closed: {
								rotate: ['45deg', '0deg', '0deg'],
								left: '50%',
								bottom: ['50%', '50%', '34%'],
							},
						}}
					/>
				</motion.button>
				<motion.div>
					<motion.div
						className="fixed top-0 left-0 w-full h-screen bg-black/50 backdrop-blur flex flex-col justify-start items-center"
						initial={false}
						animate={active ? 'open' : 'closed'}
						variants={{
							open: {
								x: 0,
								opacity: 1,
								pointerEvents: 'auto',
							},
							closed: {
								x: '100%',
								opacity: 0,
								pointerEvents: 'none',
							},
						}}
					>
						<nav className="flex flex-col justify-start gap-4 items-center text-white mt-24">
							{/* <Link
								onClick={() => setActive(false)}
								href="/poe"
							>
								{messages.poe}
							</Link>
							<Link
								onClick={() => setActive(false)}
								href="/your-access"
							>
								{messages.yourAccess}
							</Link> */}
							<div className="flex flex-row justify-start items-center gap-3">
								<span
									className="text-center relative block"
									onClick={() => setWhoWeAre((pv) => !pv)}
								>
									WHO WE ARE
									<motion.span
										transition={{
											duration: 0.2,
										}}
										className="absolute left-full ml-2 mt-1"
										animate={whoWeAre ? 'open' : 'closed'}
										variants={{
											open: {
												rotate: '180deg',
											},
											closed: {
												rotate: '0deg',
											},
										}}
									>
										<FiChevronDown className="text-xl text-white" />
									</motion.span>
								</span>
							</div>
							{whoWeAre && (
								<div className="flex flex-col justify-center gap-2 items-center text-sm">
									<Link
										onClick={() => setActive(false)}
										href="/about-us"
									>
										ABOUT US
									</Link>
									<Link
										onClick={() => setActive(false)}
										href="/our-team"
									>
										OUR TEAM
									</Link>
								</div>
							)}

							<Link
								onClick={() => setActive(false)}
								href="/services"
							>
								SERVICES
							</Link>
							<Link
								onClick={() => setActive(false)}
								href="/services"
							>
								SECTORS
							</Link>
							<div className="flex flex-row justify-start items-center gap-3">
								<span
									className="text-center relative block"
									onClick={() => setWhyUs((pv) => !pv)}
								>
									WHY US
									<motion.span
										transition={{
											duration: 0.2,
										}}
										className="absolute left-full ml-2 mt-1"
										animate={whyUs ? 'open' : 'closed'}
										variants={{
											open: {
												rotate: '180deg',
											},
											closed: {
												rotate: '0deg',
											},
										}}
									>
										<FiChevronDown className="text-xl text-white" />
									</motion.span>
								</span>
							</div>
							{whyUs && (
								<div className="flex flex-col justify-center gap-2 items-center text-sm">
									<Link
										onClick={() => setActive(false)}
										href="/about-us"
									>
										OVERVIEW
									</Link>
									{/* <Link
										onClick={() => setActive(false)}
										href="/our-team"
									>
										{messages.sectorExpertise}
									</Link>
									<Link
										onClick={() => setActive(false)}
										href="/our-team"
									>
										{messages.partnersPortfolios}
									</Link>
									<Link
										onClick={() => setActive(false)}
										href="/our-team"
									>
										{messages.endorsements}
									</Link>
									<Link
										onClick={() => setActive(false)}
										href="/our-team"
									>
										{messages.publications}
									</Link> */}
									<Link
										onClick={() => setActive(false)}
										href="/our-team"
									>
										CLIENT CODEX
									</Link>
								</div>
							)}
							<Link
								onClick={() => setActive(false)}
								href="/contact"
							>
								CONTACT
							</Link>
						</nav>
					</motion.div>
				</motion.div>
			</MotionConfig>
		</div>
	)
}
