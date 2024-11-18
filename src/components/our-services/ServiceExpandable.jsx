'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { FiChevronDown } from 'react-icons/fi'

export default function ServiceExpandable({
	title,
	children,
	defaultOpen = false,
}) {
	const [open, setOpen] = useState(defaultOpen)

	return (
		<motion.div
			animate={open ? 'open' : 'closed'}
			className="border-b border-primary"
		>
			<button
				onClick={() => setOpen((pv) => !pv)}
				className="flex w-full items-center justify-between gap-4 py-6"
			>
				<motion.span
					variants={{
						open: {
							color: '#009EC2',
						},
						closed: {
							color: '#004A6A',
						},
					}}
					className="text-left text-2xl font-bold font-unna"
				>
					{title}
				</motion.span>
				<motion.span
					variants={{
						open: {
							rotate: '180deg',
							color: '#009EC2',
						},
						closed: {
							rotate: '0deg',
							color: '#004A6A',
						},
					}}
				>
					<FiChevronDown className="text-2xl" />
				</motion.span>
			</button>
			<motion.div
				initial={false}
				animate={{
					height: open ? 'auto' : '0px',
					marginBottom: open ? '24px' : '0px',
				}}
				className="overflow-hidden text-slate-600"
			>
				<div className="font-jose text-lg">{children}</div>
			</motion.div>
		</motion.div>
	)
}
