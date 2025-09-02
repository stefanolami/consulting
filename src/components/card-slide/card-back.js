export default function CardBack({ element }) {
	return (
		<div className="relative w-full h-full flex items-center justify-center">
			<div className="w-full h-full bg-primary text-white text-center font-jose flex items-center justify-center p-2 sm:p-3 lg:p-4 text-xs md:text-sm lg:text-base">
				{element.excerpt}
			</div>
		</div>
	)
}
