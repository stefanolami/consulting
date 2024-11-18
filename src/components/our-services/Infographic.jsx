'use client'

import Image from 'next/image'
import { useState } from 'react'
import { infographic, infographicMobile } from '@/data/services'
import InfographicModal from './InfographicModal'

export default function Infographic() {
	const [hovered, setHovered] = useState('')
	const [open, setOpen] = useState(false)
	const [clicked, setClicked] = useState('')

	const handleClick = (str) => {
		setClicked(str)
		setOpen(true)
		console.log(clicked)
	}

	const handleMouseEnter = (str) => {
		setHovered(str)
	}

	const handleMouseLeave = () => {
		setHovered('')
	}

	return (
		<div>
			{/* DESKTOP */}
			<div className="w-3/4 mx-auto aspect-[16667/9376] my-20 relative hidden md:block">
				<Image
					src="/infographic/placeholder.svg"
					alt="Infographic"
					fill
					className="z-10"
				/>
				<Image
					src={'/infographic/map.svg'}
					fill
					alt="map background"
					className="z-0"
				/>
				{infographic.map((item) => (
					<div
						key={item.id}
						className="absolute w-full h-full top-0 left-0 "
					>
						<div
							className="absolute w-full h-full top-0 left-0 cursor-pointer z-30"
							style={{ clipPath: item.clipPath }}
							onMouseEnter={() => handleMouseEnter(item.id)}
							onMouseLeave={() => handleMouseLeave()}
						></div>
						<div
							className={`${
								hovered == item.id ? 'flex' : 'hidden'
							} flex-col gap-4 w-48 xl:w-60 items-center justify-center z-50 text-white absolute text-center rounded-[36px] p-6`}
							style={{
								top: item.windowTop ? item.windowTop : 'auto',
								bottom: item.windowBottom
									? item.windowBottom
									: 'auto',
								left: item.windowLeft
									? item.windowLeft
									: 'auto',
								right: item.windowRight
									? item.windowRight
									: 'auto',
								backgroundColor: item.color,
							}}
						>
							<Image
								src={`/infographic/modal/${item.id}.png`}
								alt={item.id}
								width={item.iconWidth / 1.5}
								height={item.iconHeight / 1.5}
							/>
							<span className="font-unna text-lg xl:text-xl">
								{item.label}
							</span>
							<p className="font-unna text-xs xl:text-sm">
								{item.text}
							</p>
						</div>
					</div>
				))}
			</div>

			{/* MOBILE */}
			<div className="w-full relative">
				<div className="w-3/4 mx-auto aspect-[1370/2443] my-20 block md:hidden">
					<Image
						src="/infographic/placeholder-mobile.svg"
						alt="Infographic"
						fill
						className="z-10"
					/>
					{infographicMobile.map((item) => (
						<div
							key={item.id}
							className="absolute w-full h-full top-0 left-0 "
						>
							<div
								className="absolute w-full h-full top-0 left-0 cursor-pointer z-30"
								style={{ clipPath: item.clipPath }}
								onClick={() => handleClick(item.id)}
							></div>
							<div
								className={`${
									hovered == item.id ? 'flex' : 'hidden'
								} flex-col gap-4 w-48 xl:w-60 items-center justify-center z-50 text-white absolute text-center rounded-[36px] p-6`}
								style={{
									top: item.windowTop
										? item.windowTop
										: 'auto',
									bottom: item.windowBottom
										? item.windowBottom
										: 'auto',
									left: item.windowLeft
										? item.windowLeft
										: 'auto',
									right: item.windowRight
										? item.windowRight
										: 'auto',
									backgroundColor: item.color,
								}}
							>
								<Image
									src={`/infographic/modal/${item.id}.png`}
									alt={item.id}
									width={item.iconWidth / 1.5}
									height={item.iconHeight / 1.5}
								/>
								<span className="font-unna text-lg xl:text-xl">
									{item.label}
								</span>
								<p className="font-unna text-xs xl:text-sm">
									{item.text}
								</p>
							</div>
						</div>
					))}
				</div>
				{clicked && (
					<InfographicModal
						open={open}
						setOpen={setOpen}
						background={
							infographicMobile.find((item) => item.id == clicked)
								.color
						}
					>
						<div className="flex flex-col items-center justify-center gap-3">
							{/* <Image
								src={`/infographic/modal/${clicked}.png`}
								alt={clicked}
								width={
									infographicMobile.find(
										(item) => item.id == clicked
									).iconWidth / 1.5
								}
								height={
									infographicMobile.find(
										(item) => item.id == clicked
									).iconHeight / 1.5
								}
							/> */}
							<span className="font-unna text-lg xl:text-xl">
								{
									infographicMobile.find(
										(item) => item.id == clicked
									).label
								}
							</span>
							<p className="font-unna text-sm text-center">
								{
									infographicMobile.find(
										(item) => item.id == clicked
									).text
								}
							</p>
						</div>
					</InfographicModal>
				)}
			</div>
		</div>
	)
}
