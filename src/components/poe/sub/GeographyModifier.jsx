'use client'
import { useState } from 'react'
import { useStore } from '@/store/store'
import Image from 'next/image'

export default function GeographyModifier() {
	const [isOpen, setIsOpen] = useState(false)
	const [missingGeographies, setMissingGeographies] = useState('')
	const items = [
		{ value: 'euAdmin', label: 'EU Administrated' },
		{ value: 'eu27', label: 'EU27, Island, Norway, UK, Switzerland ' },
		{ value: 'brazil', label: 'Brazil' },
		{ value: 'turkey', label: 'Turkey ' },
		{ value: 'colombia', label: 'Colombia ' },
		{ value: 'russia', label: 'Russia ' },
	]

	const geographies = useStore((state) => state.geographies)
	const addGeography = useStore((state) => state.addGeography)
	const removeGeography = useStore((state) => state.removeGeography)

	const upArrow = '/up-arrow.png'
	const downArrow = '/down-arrow.png'

	const handleCheckboxChange = (geography) => {
		if (geographies.find((geo) => geography.value == geo.value)) {
			removeGeography(geography)
		} else {
			addGeography(geography)
		}
		console.log('geographies', geographies)
	}

	const handleCLick = async () => {
		if (geographies.length > 0) {
			setIsOpen(false)
		} else if (geographies.length === 0) {
			setMissingGeographies('Please select at least one geography')
		} else {
			setMissingGeographies(
				'Something went wrong. Please refresh the page and try again.'
			)
		}
	}

	const openMenu = () => {
		setIsOpen(!isOpen)
	}

	return (
		<div
			id="geo-modifier"
			className="text-xs xl:text-2xl w-40 xl:w-96 bg-primary text-white"
		>
			<div
				className="flex w-full items-center justify-center gap-1 h-9 xl:h-20 cursor-pointer"
				onClick={openMenu}
			>
				<span className="font-bold">Change Geographies</span>
				<Image
					src={isOpen ? upArrow : downArrow}
					alt="arrow"
					width={20}
					height={20}
					className="scale-[0.7] -mr-1"
				/>
			</div>
			{isOpen && (
				<div className="w-full px-3 py-3">
					<ul className="flex flex-col items-center justify-center gap-3 xl:gap-4 mx-auto">
						{items.map((item, index) => (
							<li
								key={index}
								className="flex flex-row items-center gap-2 xl:gap-3 w-full"
							>
								<input
									type="checkbox"
									id={`checkbox-geo-modifier-${index}`}
									value={item.value} // Use a unique value for each item
									checked={
										geographies.find(
											(geo) => item.value == geo.value
										)
											? true
											: false
									} // Set checked state
									onChange={() => handleCheckboxChange(item)}
									className="custom-checkbox"
								/>
								<label
									htmlFor={`checkbox-geo-modifier-${index}`}
								>
									{item.label}
								</label>
							</li>
						))}
					</ul>
					<p className="text-center text-red-500 py-4">
						{missingGeographies}
					</p>
					<button
						onClick={handleCLick}
						className="block mx-auto px-4 py-1 text-primary font-bold bg-white hover:brightness-95 shadow-md hover:shadow-xl"
					>
						Close
					</button>
				</div>
			)}
		</div>
	)
}
