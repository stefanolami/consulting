import Image from 'next/image'

export default function Hero() {
	return (
		<div
			id="hero"
			className="bg-primary-light h-svh xl:h-screen -mt-16 xl:-mt-24 flex flex-col justify-end"
		>
			<div className="relative w-full md:w-3/4 lg:w-2/3 xl:w-1/2 my-auto lg:my-0 lg:mb-[10vh] mx-auto aspect-[3619/2250] block">
				<Image
					src={'/hero/hero.png'}
					alt="hero illustration"
					fill
					sizes="100vw"
					className="z-10"
					loading="eager"
				/>
			</div>
			{/* <div className="relative w-full aspect-[4000/1583] md:hidden">
				<Image
					src={'/hero/hero-mobile.png'}
					alt="hero illustration"
					fill
					sizes="100vw"
					className="z-10"
					loading="eager"
				/>
			</div> */}
			{/* <h1 className="text-white text-balance font-unna text-[30px] mt-20 mb-6 ml-6 md:hidden z-20">
				Right TIME. <br></br>Right PLACE. <br></br>Your IMPACT.
			</h1>
			<h1 className="hidden md:block text-white font-unna text-[36px] text-center mb-[2%] mt-[2%] z-20">
				Right TIME. Right PLACE. Your IMPACT.
			</h1> */}
		</div>
	)
}
