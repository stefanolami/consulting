'use client'

import useMeasure from 'react-use-measure'
import {
	useDragControls,
	useMotionValue,
	useAnimate,
	motion,
} from 'framer-motion'

export default function InfographicModal({
	open,
	setOpen,
	children,
	background,
}) {
	const [scope, animate] = useAnimate()
	const [drawerRef, { height }] = useMeasure()

	const y = useMotionValue(0)
	const controls = useDragControls()

	const handleClose = async () => {
		const yStart = typeof y.get() === 'number' ? y.get() : 0

		await animate('#drawer', {
			y: [yStart, height],
		})

		setOpen(false)
	}

	return (
		<>
			{open && (
				<motion.div
					ref={scope}
					className=""
				>
					<motion.div
						id="drawer"
						ref={drawerRef}
						onClick={(e) => e.stopPropagation()}
						initial={{ y: '100%' }}
						animate={{ y: '0%' }}
						transition={{
							ease: 'easeInOut',
						}}
						className="fixed z-50 bottom-0 w-full overflow-hidden rounded-t-3xl text-white"
						style={{ y, backgroundColor: background }}
						drag="y"
						dragControls={controls}
						onDragEnd={() => {
							handleClose()
						}}
						dragListener={false}
						dragConstraints={{
							top: 0,
							bottom: 0,
						}}
						dragElastic={{
							top: 0,
							bottom: 0.5,
						}}
					>
						<div
							className="absolute left-0 right-0 top-0 z-10 flex justify-center p-4"
							style={{ backgroundColor: background }}
						>
							<button
								onPointerDown={(e) => {
									controls.start(e)
								}}
								className="h-2 w-14 cursor-grab touch-none rounded-full bg-white active:cursor-grabbing"
							></button>
						</div>
						<div className="relative z-0 h-full overflow-y-scroll p-4 pt-12">
							{children}
						</div>
					</motion.div>
				</motion.div>
			)}
		</>
	)
}
