'use client'

import { Link } from '@/i18n/routing'
import DesktopLocaleSwitcher from './DesktopLocaleSwitcher'

export default function DesktopNav({ messages, inverted }) {
	return (
		<div
			id="desktop-nav"
			className="hidden md:flex flex-row justify-between items-center gap-12 h-full font-unna font-bold"
		>
			<nav
				id="desktop-nav"
				className="grid grid-cols-6 text-center uppercase h-full *:px-4 text-base"
			>
				<Link
					className={
						inverted
							? 'hover:text-white hover:bg-primary'
							: 'hover:bg-primary-light'
					}
					href="/poe"
				>
					{messages.poe}
				</Link>
				<Link
					className={
						inverted
							? 'hover:text-white hover:bg-primary'
							: 'hover:bg-primary-light'
					}
					href="/your-access"
				>
					{messages.yourAccess}
				</Link>
				<div className="group relative flex items-center justify-center cursor-pointer">
					<span>{messages.whoWeAre}</span>
					<ul className="hidden group-hover:flex flex-col items-center justify-center gap-1 w-full absolute top-full">
						<li className="desktop-nav-li w-full bg-primary py-3 hover:scale-110 hover:shadow-xl mt-1 ">
							<Link
								href="/about-us"
								className={
									inverted
										? 'text-white w-full h-full'
										: 'w-full h-full'
								}
							>
								{messages.aboutUs}
							</Link>
						</li>
						<li className="desktop-nav-li w-full bg-primary py-3 hover:scale-110 hover:shadow-xl">
							<Link
								href="/our-team"
								className={inverted ? 'text-white' : ''}
							>
								{messages.ourTeam}
							</Link>
						</li>
					</ul>
				</div>
				<Link
					className={
						inverted
							? 'hover:text-white hover:bg-primary'
							: 'hover:bg-primary-light'
					}
					href="/services"
				>
					{messages.services}
				</Link>
				<div className="group relative flex items-center justify-center cursor-pointer">
					<span>{messages.whyUs}</span>
					<ul className="hidden group-hover:flex flex-col items-center justify-center gap-1 w-full absolute top-full">
						<li className="desktop-nav-li w-full bg-primary py-3 hover:scale-110 hover:shadow-xl mt-1 ">
							<Link
								href="/about-us"
								className={inverted ? 'text-white' : ''}
							>
								{messages.overview}
							</Link>
						</li>
						<li className="desktop-nav-li w-full bg-primary py-3 hover:scale-110 hover:shadow-xl">
							<Link
								href="/our-team"
								className={inverted ? 'text-white' : ''}
							>
								{messages.sectorExpertise}
							</Link>
						</li>
						<li className="desktop-nav-li w-full bg-primary py-3 hover:scale-110 hover:shadow-xl">
							<Link
								href="/our-team"
								className={inverted ? 'text-white' : ''}
							>
								{messages.partnersPortfolios}
							</Link>
						</li>
						<li className="desktop-nav-li w-full bg-primary py-3 hover:scale-110 hover:shadow-xl">
							<Link
								href="/our-team"
								className={inverted ? 'text-white' : ''}
							>
								{messages.endorsements}
							</Link>
						</li>
						<li className="desktop-nav-li w-full bg-primary py-3 hover:scale-110 hover:shadow-xl">
							<Link
								href="/our-team"
								className={inverted ? 'text-white' : ''}
							>
								{messages.publications}
							</Link>
						</li>
						<li className="desktop-nav-li w-full bg-primary py-3 hover:scale-110 hover:shadow-xl">
							<Link
								href="/our-team"
								className={inverted ? 'text-white' : ''}
							>
								{messages.clientCodex}
							</Link>
						</li>
					</ul>
				</div>
				<Link
					className={
						inverted
							? 'hover:text-white hover:bg-primary'
							: 'hover:bg-primary-light'
					}
					href="/contact"
				>
					{messages.contact}
				</Link>
			</nav>
			<DesktopLocaleSwitcher />
		</div>
	)
}
