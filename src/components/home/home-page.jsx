import EndorsementsHome from '../endorsements/endorsements-home'
import Hero from './hero'

export default function HomePage() {
	return (
		<>
			<Hero />
			<div className="bg-grey pt-6 xl:pt-16 pb-16 xl:pb-32">
				<div
					id="home"
					className="w-[90%] md:w-3/4 max-w-[1000px] flex flex-col items-center justify-center gap-4 mx-auto font-robo text-primary"
				>
					<span className="block text-base lg:text-xl font-unna">
						A SNAPSHOT OF
					</span>
					<span className="block text-2xl lg:text-4xl font-unna">
						TIME&PLACE CONSULTING
					</span>
					<span className="block h-[2px] bg-primary w-48 mb-10"></span>
					<p className="text-center text-sm md:text-base lg:text-xl font-jose">
						With international presence and local access, Time&Place
						Consulting provides integral approaches to impacting
						decision-making.
					</p>
					<p className="text-center text-sm md:text-base lg:text-xl font-jose">
						As a strategic communications, public affairs and
						project management agency, our global team focuses on
						nourishing your decision-making capacities and building
						your channels of impact. We are your strategic point of
						access to enter markets, and line of communication to
						governments, regulatory bodies, public opinion, as well
						as public procurement, financing and funding agencies.
					</p>
					<p className="text-center text-sm md:text-base lg:text-xl font-jose">
						Powered by people, and just a little bit of AI.
					</p>
				</div>
			</div>
			<EndorsementsHome />
		</>
	)
}
