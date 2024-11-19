import Image from 'next/image'

export default function Hero() {
	return (
		<div
			id="hero"
			className="bg-primary h-svh xl:h-screen -mt-16 xl:-mt-24 flex flex-col justify-end"
		>
			<div className="w-full bg-primary h-40 xl:h-8"></div>
			<div className="relative w-full aspect-[5444/1583] hidden md:block">
				<Image
					src={'/hero/hero.png'}
					alt="hero illustration"
					fill
					sizes="100vw"
					className="z-10"
					loading="eager"
				/>
			</div>
			<div className="relative w-full aspect-[4000/1583] md:hidden">
				<Image
					src={'/hero/hero-mobile.png'}
					alt="hero illustration"
					fill
					sizes="100vw"
					className="z-10"
					loading="eager"
				/>
			</div>
			<h1 className="text-white text-balance font-unna text-[30px] mt-20 mb-6 ml-6 md:hidden z-20 invisible">
				Your Line <br></br>of Communication.
			</h1>
			<h1 className="hidden md:block text-white font-unna text-[36px] text-center mb-[2%] mt-[2%] z-20 invisible">
				Your Line of Communication.
			</h1>
		</div>
	)
}
