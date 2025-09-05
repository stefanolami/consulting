import { partners } from '@/data/data'
import Image from 'next/image'
import Link from 'next/link'

const Partners = () => {
	return (
		<div className="w-[90%] md:w-3/4 max-w-[1000px] mx-auto pt-10 xl:pt-20 pb-10 xl:pb-20">
			<h2 className="font-unna font-bold text-xl lg:text-[36px] text-center text-primary mb-6 lg:mb-10">
				PARTNERS & PORTFOLIOS
			</h2>
			<div className="flex flex-wrap justify-center gap-2 lg:gap-4">
				{partners.map((partner, index) => (
					<div
						className="w-1/3 sm:w-1/4 md:w-1/6 lg:w-[12.5%] aspect-square relative"
						key={index}
					>
						<Link
							href={partner.link}
							target="_blank"
							rel="noopener noreferrer"
						>
							<Image
								src={partner.img}
								alt={partner.alt}
								fill
								className="object-scale-down"
							/>
						</Link>
					</div>
				))}
			</div>
		</div>
	)
}

export default Partners
