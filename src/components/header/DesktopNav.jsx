'use client'

import { Link } from '@/i18n/routing'
import { usePathname } from '@/i18n/routing'
import DesktopLocaleSwitcher from './DesktopLocaleSwitcher'

export default function DesktopNav({ messages }) {
	const path = usePathname()
	return (
		<div
			id="desktop-nav"
			className="hidden md:flex flex-row justify-between items-center gap-12 h-full font-unna font-bold"
		>
			{/* CHANGE TO GRID-COLS-6 */}
			<nav
				id="desktop-nav"
				className="grid grid-cols-5 text-center uppercase h-full *:px-4 text-base"
			>
				<div className="group relative flex items-center justify-center cursor-pointer">
					<span
						className={`block
							${path == '/about-us' || path == '/our-team' ? 'active-link' : ''}
							`}
					>
						{messages.whoWeAre}
					</span>
					<div className="hidden group-hover:flex flex-col items-center justify-center gap-1 w-full absolute top-full">
						<Link
							href="/about-us"
							className={`desktop-nav-li w-full h-full bg-primary hover:bg-primary-light py-3 hover:scale-110 hover:shadow-xl mt-1`}
						>
							{messages.aboutUs}
						</Link>
						<Link
							href="/our-team"
							className={`desktop-nav-li w-full h-full bg-primary hover:bg-primary-light py-3 hover:scale-110 hover:shadow-xl mt-1 $`}
						>
							{messages.ourTeam}
						</Link>
					</div>
				</div>
				<Link
					className={`hover:bg-primary-light relative ${
						path == '/services' ? 'active-link' : ''
					}`}
					href="/services"
				>
					{messages.services}
				</Link>
				<Link
					className={`hover:bg-primary-light relative ${
						path == '/sectors' ? 'active-link' : ''
					}`}
					href="/sectors"
				>
					{messages.sectors}
				</Link>
				<div className="group relative flex items-center justify-center cursor-pointer">
					<span
						className={`block
							${path == '/about-us' || path == '/our-team' ? 'active-link' : ''}
							`}
					>
						{messages.whyUs}
					</span>
					<div className="hidden group-hover:flex flex-col items-center justify-center gap-1 w-full absolute top-full">
						<Link
							href="/about-us"
							className={`desktop-nav-li w-full h-full bg-primary hover:bg-primary-light py-3 hover:scale-110 hover:shadow-xl mt-1 $`}
						>
							{messages.overview}
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
						<Link
							href="/about-us"
							className={`desktop-nav-li w-full h-full bg-primary hover:bg-primary-light py-3 hover:scale-110 hover:shadow-xl mt-1 $`}
						>
							{messages.clientCodex}
						</Link>
					</div>
				</div>
				<Link
					className={`hover:bg-primary-light relative ${
						path == '/contact' ? 'active-link' : ''
					}`}
					href="/contact"
				>
					{messages.contact}
				</Link>
			</nav>
			{/* <DesktopLocaleSwitcher /> */}
		</div>
	)
}
