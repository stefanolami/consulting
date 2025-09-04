import { sectors } from '@/data/data'
import CardSlide from '../card-slide/card-slide'

const OurSectors = () => {
	return (
		<div className="pt-8 xl:pt-20 pb-16 xl:pb-32 w-[90%] xl:w-[75%] max-w-[1200px] mx-auto">
			<h1 className="font-unna font-bold text-xl lg:text-[48px] text-center text-primary mb-6 lg:mb-10">
				OUR SECTORS
			</h1>
			<div className="w-[90%] md:w-[80%] max-w-[1000px] mx-auto space-y-4 lg:space-y-6">
				<p className="w-full font-jose text-center text-primary text-sm lg:text-lg ">
					Our team brings together a broad variety of sector-specific
					knowledge. Each sector is its own culture and eco-system.
					Our experience therein drives our services to have a
					tacit-based impact.
				</p>
			</div>
			<div className="w-full sm:w-[75%] max-w-[850px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-2 lg:gap-3 mt-10 lg:mt-20">
				{sectors.map((sector, index) => (
					<div
						key={index}
						className="w-full aspect-square"
					>
						<CardSlide element={sector} />
					</div>
				))}
			</div>
		</div>
	)
}

export default OurSectors
