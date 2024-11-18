'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { contactCountries } from '@/data/data'
import Loading from '@/components/Loading'

const pin = '/contact/pin.png'
const map = '/contact/map.png'

export default function ContactMapDesktop() {
	const [selectedCountry, setSelectedCountry] = useState('austria')
	const [countryData, setCountryData] = useState(null)

	useEffect(() => {
		const country = contactCountries.find(
			(country) => country.id === selectedCountry
		)
		setCountryData(country)
	}, [selectedCountry])

	return (
		<div className="w-full hidden xl:block">
			<h1 className="font-unna font-bold text-xl xl:text-[36px] text-primary mb-4 xl:mb-20">
				OUR OFFICES, YOUR ACCESS
			</h1>
			<div className="w-full grid grid-cols-[1fr_2fr]">
				<div className="w-2/3 mx-auto mt-16">
					{countryData ? (
						<div className="flex flex-col items-center justify-center gap-5 font-jose text-primary">
							<span className="font-bold uppercase xl:text-lg">
								{countryData.label}
							</span>
							<div className="h-[1px] w-full bg-black"></div>
							<div className="flex flex-col items-center justify-center italic">
								{countryData.city.map((city) => (
									<span
										className="text-sm xl:text-base"
										key={city}
									>
										{city}
									</span>
								))}
							</div>
							<span className="text-sm xl:text-base">
								{countryData.email}
							</span>
						</div>
					) : (
						<div className="w-full">
							<Loading />
						</div>
					)}
				</div>
				<div className="relative w-full aspect-[2/1]">
					<Image
						src={map}
						alt="map"
						fill
						sizes="50vw"
					/>
					{contactCountries.map((country) => (
						<Image
							onMouseEnter={() => setSelectedCountry(country.id)}
							style={{
								left: `${country.left}%`,
								top: `${country.top}%`,
							}}
							src={pin}
							alt={`${country.id} pin`}
							width={10}
							height={10}
							sizes="5vw"
							className={`${
								selectedCountry == country.id ? 'scale-150' : ''
							} absolute z-20 cursor-pointer`}
							key={country.id}
						/>
					))}
				</div>
			</div>
		</div>
	)
}
