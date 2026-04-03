import Image from 'next/image'

export default function CardFront({ element }) {
	return (
		<div className="bg-grey flip-card-front w-full h-full flex items-center justify-center">
			<div className="w-full h-full bg-primary-light text-white text-center font-jose flex flex-col items-center justify-center p-2 sm:p-3 lg:p-4">
				<span className="text-base md:text-lg lg:text-2xl">
					{element.title}
				</span>
				{element.subtitle && (
					<span className="text-xs md:text-sm lg:text-base mt-1">
						{element.subtitle}
					</span>
				)}
			</div>
		</div>
	)
}
