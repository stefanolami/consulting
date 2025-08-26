import { sectors } from '@/data/data'
import Image from 'next/image'

const OurServices = () => {
	return (
		<div className="pt-8 xl:pt-20 pb-16 xl:pb-32 w-[90%] xl:w-[75%] max-w-[1200px] mx-auto">
			<h1 className="font-unna font-bold text-xl lg:text-[48px] text-center text-primary mb-6 lg:mb-10">
				OUR SERVICES
			</h1>
			<div className="w-[90%] md:w-[80%] max-w-[1000px] mx-auto space-y-4 lg:space-y-6">
				<p className="w-full font-jose text-center text-primary text-sm lg:text-lg ">
					An added value of Time&Place Consulting is that we combine
					our services for a more holistic approach. Crisis management
					needs? We link reputation management with legal services to
					counteract negative impact on your products, services and
					image. Looking to profile an issue which is affecting your
					markets to get healthier regulatory conditions? This can be
					solved by joining government and media relations strategies.
					Or, the joint implementation of compliance standards and CSR
					capacities can help you pre-empt regulatory and reputational
					challenges in the future. We adapt our capacities to your
					needs.
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

export default OurServices
