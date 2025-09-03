import { team, managingTeam } from '@/data/team'
import Image from 'next/image'
import Link from 'next/link'

export default function WhoWeAre() {
	const managingTeamArray = Object.values(managingTeam)
	const teamArray = Object.values(team)
	return (
		<div className="pt-8 xl:pt-20 pb-16 xl:pb-32 w-[90%] xl:w-[75%] max-w-[1200px] mx-auto">
			<h1 className="font-unna font-bold text-xl xl:text-[48px] text-center text-primary mb-6 xl:mb-10">
				WHO WE ARE
			</h1>
			<div className="w-[90%] md:w-[80%] max-w-[1000px] mx-auto space-y-4 lg:space-y-6">
				<p className="w-full font-jose text-center text-primary text-sm lg:text-lg ">
					Time&Place Consulting was founded in 2016 in Brussels. Our
					main purpose then: Create dialogue with EU and national
					policy decision-makers for our clients. We have grown over
					the years, expanding our offer in services and sectors based
					on tacit knowledge, increasingly global coordinated presence
					and the ability to have an impact locally. Our pillars? Our
					team of colleagues.
				</p>
			</div>
			<div className="mx-auto xl:w-1/2 grid grid-cols-2 xl:grid-cols-2 gap-4 xl:gap-5 mt-10 lg:mt-20 mb-4 xl:mb-5">
				{managingTeamArray.map((member, index) =>
					member.name === 'empty' ? (
						<div
							key={index}
							className="w-full h-full hidden xl:block"
						></div>
					) : (
						<Link
							href={`/who-we-are/${member.path}`}
							key={member.path}
							className="w-full aspect-[265/390] relative border-primary shadow-md hover:shadow-2xl group"
						>
							<Image
								alt={`${member.name} Picture`}
								src={member.img}
								fill
								sizes="(max-width: 640px) 50vw, 20vw"
							/>
							<div className="w-full h-[20%] absolute bottom-0 bg-primary group-hover:bg-primary-light z-20 text-white font-jose text-xs xl:text-lg text-center flex items-center flex-col justify-center">
								<span className="font-bold">
									{member.imgName}
								</span>
								<span>{member.imgTitle}</span>
							</div>
						</Link>
					)
				)}
			</div>
			<div className="mx-auto xl:w-3/4 grid grid-cols-2 xl:grid-cols-3 gap-4 xl:gap-5">
				{teamArray.map((member, index) =>
					member.name === 'empty' ? (
						<div
							key={index}
							className="w-full h-full hidden xl:block"
						></div>
					) : (
						<Link
							href={`/who-we-are/${member.path}`}
							key={member.path}
							className="w-full aspect-[265/390] relative border-primary shadow-md hover:shadow-2xl group"
						>
							<Image
								alt={`${member.name} Picture`}
								src={member.img}
								fill
								sizes="(max-width: 640px) 50vw, 20vw"
							/>
							<div className="w-full h-[20%] absolute bottom-0 bg-primary group-hover:bg-primary-light z-20 text-white font-jose text-xs xl:text-lg text-center flex items-center flex-col justify-center">
								<span className="font-bold">
									{member.imgName}
								</span>
								<span>{member.imgTitle}</span>
							</div>
						</Link>
					)
				)}
			</div>
		</div>
	)
}
