import { sectors } from '@/data/data'
import Image from 'next/image'

const OurSectors = () => {
	return (
		<div className="pt-8 xl:pt-20 pb-16 xl:pb-32 w-[90%] xl:w-[75%] max-w-[1200px] mx-auto">
			<h1 className="font-unna font-bold text-xl lg:text-[48px] text-center text-primary mb-6 lg:mb-10">
				OUR SECTORS
			</h1>
			<div className="w-[90%] md:w-[80%] max-w-[1000px] mx-auto space-y-4 lg:space-y-6">
				<p className="w-full font-jose text-center text-primary text-sm lg:text-lg ">
					Time&Place Consulting offers the expertise, focus, and
					skills necessary for clients to thrive in a global economy
					that spans diverse industries and borders. Our professionals
					grasp the interconnected nature of global sectors,
					delivering extensive experience.
				</p>
				<p className="font-jose text-center text-primary text-sm lg:text-lg ">
					With years of experience and an in-depth understanding of
					the consulting landscape, we empower consulting businesses
					to flourish. We provide tailored solutions, specifically
					addressing the unique needs of each sector within the
					consulting industry, ensuring you receive the most relevant
					and effective support.
				</p>
			</div>
			<div className="w-[90%] sm:w-[75%] max-w-[850px] mx-auto grid grid-cols-2 md:grid-cols-3 gap-2 lg:gap-3 mt-10 lg:mt-20">
				{sectors.map((sector, index) => (
					<div
						key={index}
						className="w-full"
					>
						<div className="w-full aspect-square relative">
							<Image
								src={`/sectors/${sector.id}.png`}
								alt={sector.label}
								fill
								sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
								className="object-contain"
							/>
							<div className="absolute inset-0 bg-black transition-opacity duration-300 text-white text-center font-jose text-xs">
								{/* <span className="block text-xl">AGRIFOOD</span> */}
								Lorem ipsum dolor sit amet, consectetur
								adipiscing elit, sed do eiusmod tempor
								incididunt ut labore et dolore magna aliqua. Ut
								enim ad minim veniam, quis nostrud exercitation
								ullamco laboris nisi ut aliquip ex ea commodo
								consequat. Duis aute irure dolor in
								reprehenderit in voluptate velit esse cillum
								dolore eu fugiat nulla pariatur. Excepteur sint
								occaecat cupidatat non proident, sunt
							</div>
						</div>
						<div className="-mt-1 pt-1 w-full h-10 flex items-center justify-center bg-primary text-white text-center font-jose font-bold text-sm lg:text-lg">
							{sector.label}
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

export default OurSectors
