import Link from 'next/link'

export default function Footer() {
	const socialMediaIcons = [
		{
			icon: '/social-media/facebook.png',
			alt: 'Facebook Icon',
			url: 'https://www.facebook.com/profile.php?id=61566446167362',
		},
		{
			icon: '/social-media/instagram.png',
			alt: 'Instagram Icon',
			url: 'https://www.instagram.com/groupontap/',
		},
		{
			icon: '/social-media/linkedin.png',
			alt: 'LinkedIn Icon',
			url: 'https://www.linkedin.com/company/time-place-group/',
		},
	]

	return (
		<div className="w-full bg-primary h-[85px] xl:h-[200px] py-1 absolute bottom-0 flex flex-col items-center justify-between text-white">
			<ul className="flex flex-row justify-center items-center gap-2 xl:gap-8 mt-2 xl:mt-8 mb-1">
				{socialMediaIcons.map((element, index) => {
					return (
						<li
							key={index}
							className="w-4 xl:w-8 h-4 xl:h-8 relative"
						>
							<Link
								href={element.url}
								className="w-full h-full"
								target="_blank"
							>
								{/* eslint-disable */}
								<img
									src={element.icon}
									alt={element.alt}
									className="w-full h-full"
								></img>
								{/* eslint-enable */}
							</Link>
						</li>
					)
				})}
			</ul>
			<nav className="flex flex-row justify-center items-center leading-none text-[10px] xl:text-lg">
				<Link
					href="/cookie-use"
					className="font-unna text-center px-4 xl:px-16 border-r border-white"
				>
					COOKIE USE
				</Link>
				<Link
					href="/terms-and-conditions"
					className="font-unna text-center px-4 xl:px-16 border-r border-white"
				>
					TERMS AND CONDITIONS
				</Link>
				<Link
					href="/privacy-policy"
					className="font-unna text-center px-4 xl:px-16"
				>
					PRIVACY POLICY
				</Link>
			</nav>
			<span className="block font-jose text-[8px] xl:text-base text-center mb-1 xl:mb-3">
				© 2025 Time&Place Consulting. All rights reserved.
			</span>
		</div>
	)
}
