import Image from 'next/image'

export default function CardFront({ element }) {
	return (
		<div className="bg-grey flip-card-front w-full h-full flex items-center justify-center">
			<div className="w-full h-full bg-primary-light text-white text-center font-jose flex items-center justify-center p-2 sm:p-3 lg:p-4 text-base md:text-lg lg:text-2xl">
				{element.title}
			</div>
		</div>
	)
}
