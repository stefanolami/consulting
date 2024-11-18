'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { contactCountries } from '@/data/data'

const pin = '/contact/pin.png'
const map = '/contact/map.png'

export default function ContactMapMobile() {
	const [selectedCountry, setSelectedCountry] = useState('austria')
	const [countryData, setCountryData] = useState(null)

	useEffect(() => {
		const country = contactCountries.find(
			(country) => country.id === selectedCountry
		)
		setCountryData(country)
	}, [selectedCountry])

	return (
		<div className="w-full xl:hidden">
			<h1 className="font-unna font-bold text-xl xl:text-[36px] text-primary mb-4 xl:mb-10">
				OUR OFFICES, YOUR ACCESS
			</h1>
			<div className="w-full">
				<div className="relative w-full aspect-[2/1]">
					<Image
						src={map}
						alt="map"
						fill
						sizes="100vw"
					/>
					{countryData && (
						<Image
							style={{
								left: `${countryData.left}%`,
								top: `${countryData.top}%`,
							}}
							src={pin}
							alt={`${countryData.id} pin`}
							width={7}
							height={7}
							sizes="5vw"
							className="absolute z-20"
						/>
					)}
				</div>
				<div className="mt-6 flex flex-row items-center justify-start">
					<div className="flex flex-col justify-center gap-2 items-center w-1/3">
						{contactCountries.map((country) => {
							return (
								<button
									className={`${
										selectedCountry == country.id
											? 'bg-primary-light shadow-xl'
											: 'bg-primary shadow-md'
									} block shadow-xl w-full h-6 pt-1 rounded-[3px] font-jose font-bold text-white uppercase text-xs`}
									key={country.id}
									onClick={() =>
										setSelectedCountry(country.id)
									}
								>
									{country.label}
								</button>
							)
						})}
					</div>
					<div className="mx-auto">
						{countryData && (
							<div className="flex flex-col items-center justify-center gap-5 font-jose text-primary">
								<span className="font-bold uppercase">
									{countryData.label}
								</span>
								<div className="flex flex-col items-center justify-center italic">
									{countryData.city.map((city) => (
										<span
											className="text-sm"
											key={city}
										>
											{city}
										</span>
									))}
								</div>
								<span className="text-sm">
									{countryData.email}
								</span>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
