import Image from 'next/image'
import { Link } from '@/i18n/routing'

export default function HomePage() {
	return (
		<div
			id="home"
			className="pb-16 xl:pb-32 w-full mx-auto"
		>
			<div className="mt-6 xl:mt-16 relative mx-auto w-[55%] xl:w-[25%] aspect-[550/160]">
				<Image
					src={'/logos/funding-logo-home.png'}
					alt="Group Logo"
					fill
					sizes="(max-width: 640px) 70vw, 40vw"
				/>
			</div>
			<p className="my-10 lg:my-12 font-jose mx-auto w-4/5 xl:w-2/3 max-w-[1250px] text-primary text-sm lg:text-xl text-center">
				As big business or SME, as NGO or local administration you can
				benefit from international, national, regional and local public
				funding, financing and tenders. Time&Place Funding: Your point
				of access.
			</p>
			<div className="bg-primary mx-auto h-[2px] w-4/5 xl:w-4/5 max-w-[1250px] mt-12 lg:mt-20"></div>
			<div className="w-full">
				<div className="mx-auto w-4/5 xl:w-2/3 max-w-[1250px] py-12 lg:py-20">
					<h2 className="font-unna font-bold text-2xl xl:text-[40px] text-primary mb-10 text-center">
						Our Presence, Your Opportunities
					</h2>
					<p className="text-primary font-jose text-sm lg:text-xl mb-10 lg:mb-16 text-center">
						With a global network of public funding, financing and
						tenders professionals, we provide local access to
						opportunities of all sizes for your competitive
						proposals.
					</p>
					<div className="w-full lg:w-1/2 mx-auto flex flex-col gap-4 lg:flex-row justify-between items-center">
						<Link
							className="w-44 lg:w-52 h-8 lg:h-9 flex items-center justify-center bg-primary-light rounded-md shadow-md hover:shadow-lg text-white font-jose font-bold text-sm lg:text-base"
							href="/our-team"
						>
							Our Team
						</Link>
						<Link
							className="w-44 lg:w-52 h-8 lg:h-9 flex items-center justify-center bg-primary-light rounded-md shadow-md hover:shadow-lg text-white font-jose font-bold text-sm lg:text-base"
							href="/contact"
						>
							Contact Us
						</Link>
					</div>
				</div>
			</div>
			<div className="bg-primary mx-auto h-[2px] w-4/5 xl:w-4/5 max-w-[1250px]"></div>
			<div className="w-full">
				<div className="mx-auto w-4/5 xl:w-2/3 max-w-[1250px] py-12 lg:py-20">
					<h2 className="font-unna font-bold text-2xl xl:text-[40px] text-primary mb-10 text-center">
						(Some of) Our Capacities
					</h2>
					<p className="text-primary font-jose text-sm lg:text-xl mb-10 lg:mb-16 text-center">
						We provide 360 - project management services from
						running your consortium to its communication, or we
						draft your proposals to correspond to the language
						in-between the lines of a RFP.
					</p>
					<div className="w-1/2 mx-auto flex flex-col gap-4 lg:flex-row justify-between items-center">
						<Link
							className="w-44 lg:w-52 h-8 lg:h-9 flex items-center justify-center bg-primary-light rounded-md shadow-md hover:shadow-lg text-white font-jose font-bold text-sm lg:text-base"
							href="/services"
						>
							Our Services
						</Link>
						<Link
							className="w-44 lg:w-52 h-8 lg:h-9 flex items-center justify-center bg-primary-light rounded-md shadow-md hover:shadow-lg text-white font-jose font-bold text-sm lg:text-base"
							href="/why-us/overview"
						>
							Why Us?
						</Link>
					</div>
				</div>
			</div>
		</div>
	)
}
