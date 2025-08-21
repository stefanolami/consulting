'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function DesktopNav() {
	const path = usePathname()

	return (
		<div
			id="desktop-nav"
			className="hidden md:flex flex-row justify-between items-center gap-12 h-full font-unna font-bold"
		>
			{/* CHANGE TO GRID-COLS-6 */}
			<nav
				id="desktop-nav"
				className="grid grid-cols-5 text-center uppercase h-full *:px-4 text-xs lg:text-base"
			>
				<div className="group relative flex items-center justify-center cursor-pointer">
					<span
						className={`block
							${path == '/about-us' || path == '/our-team' ? 'active-link' : ''}
							`}
					>
						WHO WE ARE
					</span>
					<div className="hidden group-hover:flex flex-col items-center justify-center gap-1 w-full absolute top-full">
						<Link
							href="/about-us"
							className={`desktop-nav-li w-full h-full bg-primary hover:bg-primary-light py-3 hover:scale-110 shadow-lg hover:shadow-xl mt-1`}
						>
							ABOUT US
						</Link>
						<Link
							href="/our-team"
							className={`desktop-nav-li w-full h-full bg-primary hover:bg-primary-light py-3 hover:scale-110 shadow-lg hover:shadow-xl mt-1`}
						>
							OUR TEAM
						</Link>
					</div>
				</div>
				<Link
					className={`hover:bg-primary-light relative ${
						path == '/services' ? 'active-link' : ''
					}`}
					href="/services"
				>
					SERVICES
				</Link>
				<Link
					className={`hover:bg-primary-light relative ${
						path == '/sectors' ? 'active-link' : ''
					}`}
					href="/sectors"
				>
					SECTORS
				</Link>
				<div className="group relative flex items-center justify-center cursor-pointer">
					<span
						className={`block
							${path.startsWith('/why-us') ? 'active-link' : ''}
							`}
					>
						WHY US
					</span>
					<div className="hidden group-hover:flex flex-col items-center justify-center gap-1 w-full absolute top-full">
						<Link
							href="/why-us"
							className={`desktop-nav-li w-full h-full bg-primary hover:bg-primary-light py-3 hover:scale-110 shadow-lg hover:shadow-xl mt-1 $`}
						>
							OVERVIEW
						</Link>
						<Link
							href="/why-us#client-codex"
							className={`desktop-nav-li w-full h-full bg-primary hover:bg-primary-light py-3 hover:scale-110 shadow-lg hover:shadow-xl mt-1 $`}
						>
							CLIENT CODEX
						</Link>
						<Link
							href="/why-us#endorsements"
							className={`desktop-nav-li w-full h-full bg-primary hover:bg-primary-light py-3 hover:scale-110 shadow-lg hover:shadow-xl mt-1 $`}
						>
							ENDORSEMENTS
						</Link>
						{/* <Link
							href="/about-us"
							className={`desktop-nav-li w-full h-full bg-primary py-3 hover:scale-110 hover:shadow-xl mt-1 ${
								inverted ? 'text-white' : ''
							}`}
						>
							{messages.sectorExpertise}
						</Link>
						<Link
							href="/about-us"
							className={`desktop-nav-li w-full h-full bg-primary py-3 hover:scale-110 hover:shadow-xl mt-1 ${
								inverted ? 'text-white' : ''
							}`}
						>
							{messages.partnersPortfolios}
						</Link>
						<Link
							href="/about-us"
							className={`desktop-nav-li w-full h-full bg-primary py-3 hover:scale-110 hover:shadow-xl mt-1 ${
								inverted ? 'text-white' : ''
							}`}
						>
							{messages.endorsements}
						</Link>
						<Link
							href="/about-us"
							className={`desktop-nav-li w-full h-full bg-primary py-3 hover:scale-110 hover:shadow-xl mt-1 ${
								inverted ? 'text-white' : ''
							}`}
						>
							{messages.publications}
						</Link> */}
					</div>
				</div>
				<Link
					className={`hover:bg-primary-light relative ${
						path == '/contact' ? 'active-link' : ''
					}`}
					href="/contact"
				>
					CONTACT
				</Link>
			</nav>
		</div>
	)
}
