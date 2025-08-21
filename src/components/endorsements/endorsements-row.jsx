'use client'

import { motion } from 'framer-motion'

export default function EndorsementsRow({
	list,
	reverse = false,
	duration = 50,
}) {
	return (
		<motion.div
			initial={{ translateX: reverse ? '-100%' : '0%' }}
			animate={{ translateX: reverse ? '0%' : '-100%' }}
			transition={{ duration, repeat: Infinity, ease: 'linear' }}
			className="flex gap-4 px-2"
		>
			{list.map((t) => {
				return (
					<div
						key={t.id}
						className="shrink-0 w-[500px] grid grid-rows-[2fr_3fr] rounded-lg overflow-hidden relative bg-white font-jose"
					>
						<img
							src={t.img}
							className="w-full h-44 object-contain"
						/>
						<div className="bg-primary text-slate-50 p-4">
							<span className="block font-semibold text-lg mb-1">
								{t.name}
							</span>
							<span className="block mb-3 text-sm font-medium">
								{t.title}
							</span>
							<span className="block text-sm text-slate-300">
								{t.text}
							</span>
						</div>
					</div>
				)
			})}
		</motion.div>
	)
}
