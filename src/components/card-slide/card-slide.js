'use client'

import { motion, useAnimationControls } from 'framer-motion'

import CardFront from './card-front'
import CardBack from './card-back'
import { useState } from 'react'

export default function CardSlide({ element }) {
	const controls = useAnimationControls()
	const [isFlipped, setIsFlipped] = useState(false)

	const handleHover = () => {
		controls.start('slide')
	}

	const endHover = () => {
		controls.start('initial')
	}

	const handleTouch = () => {
		if (isFlipped) {
			controls.start('initial')
			setIsFlipped(false)
		} else {
			controls.start('slide')
			setIsFlipped(true)
		}
	}

	return (
		<motion.div
			className="relative flex items-center justify-center w-full h-full overflow-hidden"
			onHoverStart={handleHover}
			onHoverEnd={endHover}
			onTouchStart={handleTouch}
		>
			<CardFront element={element} />
			<motion.div
				className="absolute left-0 w-full h-full z-10"
				variants={{
					initial: {
						y: '101%',
					},
					slide: {
						y: 0,
					},
					exit: {
						y: '-100%',
					},
				}}
				transition={{
					duration: 0.4,
					ease: 'easeInOut',
				}}
				initial="initial"
				animate={controls}
			>
				<CardBack element={element} />
			</motion.div>
		</motion.div>
	)
}
