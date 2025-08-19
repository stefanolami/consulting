import Image from 'next/image'

export default function AboutUs() {
	return (
		<div className="bg-white pt-8 xl:pt-20 pb-16 xl:pb-32">
			<div className="bg-white w-full absolute top-0 h-16 xl:h-24"></div>
			<div className="w-[90%] xl:w-[75%] max-w-[1100px] mx-auto">
				<h1 className="font-unna font-bold text-xl xl:text-[48px] text-center text-primary mb-10">
					ABOUT US
				</h1>
				<div className="font-jose text-xs xl:text-lg text-primary text-justify">
					<p className="mb-4">
						Time&Place Funding was the brainchild of Kjeld B. Olesen
						and Glenn Cezanne in 2017 (after becoming friends during
						motorcycle driving lessons), to address client needs in
						attaining public funding for innovative projects. The
						range of services quickly developed with the team
						growing exponentially to provide monitoring,
						government/administrator-engagement, 360-project
						management and competitive proposal drafting service for
						public funding, finance and tenders. Within this context
						it has always been important to have the team located
						strategically so that our clients are able to have local
						access.
					</p>
					<p className="mb-4">
						Why is this important? Speaking the local language is an
						absolute asset but understanding the context for the
						most competitive proposal is indispensable according to
						our strategy. Our locally based teams are able to engage
						government before opportunities are published or to
						understand the intentions behind the opportunities and
						the meaning between the lines of the requests for
						proposals.
					</p>
					<p className="mb-4">
						These are just a few advantages when taking into account
						potential consortium partners and new project
						opportunities that come with a global network. In other
						words, when an opportunity arises through our team
						located in one part of the world, we can find the right
						partners on the other side of the planet. This can be a
						significant asset when building a consortium within the
						scope of the EU’s innovation funding regime.
					</p>
					<p className="mb-4">
						Kjeld’s and Glenn’s dream project came true, but there
						is a bigger picture to it all. Glenn being a Public
						Affairs and Association Management professional, and
						Founder of Time&Place Group, and Kjeld being a lecturer
						and project management guru, they sought to integrate
						Time&Place Funding as a pillar of the Group. The
						advantage? An integrated offer for the clients bringing
						together education, government relations, media,
						training, public relations, think tanks – just to name a
						few – capacities to give a holistic approach to
						impacting decision-making and supporting our clients’
						agendas.
					</p>
				</div>
			</div>
		</div>
	)
}
