import { services } from '@/data/data'
import CardSlide from '../card-slide/card-slide'

const OurServices = () => {
	return (
		<div className="pt-8 xl:pt-20 pb-16 xl:pb-32 w-[90%] xl:w-[75%] max-w-[1200px] mx-auto">
			<h1 className="font-unna font-bold text-xl lg:text-[48px] text-center text-primary mb-6 lg:mb-10">
				OUR SERVICES
			</h1>
			<div className="w-[90%] md:w-[80%] max-w-[1000px] mx-auto space-y-4 lg:space-y-6 font-jose text-center text-primary text-sm lg:text-lg">
				<p>
					An added value of Time&Place Consulting is that we combine
					our services to provide you tailored strategies and tools
					with a broader scope and concrete impact. Market entrance
					interests? We link market research, business and strategy
					development, and stakeholder management with visibility and
					communication capabilities to facilitate your hitting the
					ground running with your products, services and image.
				</p>
				<p>
					Looking to profile an issue which is affecting your markets
					to get healthier regulatory conditions? This could be solved
					by joining government relations and reputation management to
					strengthen the impact on regulatory decision-making.
				</p>
				<p>
					Are you looking to drive or contribute to innovative ideas,
					no matter if they are your own, or you are part of a
					consortium? Our access to national and international public
					funds and finance combined with project and stakeholder
					management can see your project through; cradle-to-cradle,
					and with government approval.
				</p>
				<p>We adapt our capacities to your needs.</p>
			</div>
			<div className="w-[90%] sm:w-[80%] max-w-[300px] sm:max-w-[850px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 lg:gap-3 mt-10 lg:mt-20">
				{services.map((sector, index) => (
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

export default OurServices
