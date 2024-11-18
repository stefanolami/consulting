'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { FiChevronDown } from 'react-icons/fi'

export default function ServiceExpandable2({
	title,
	children,
	defaultOpen = false,
}) {
	const [open, setOpen] = useState(defaultOpen)

	return (
		<motion.div
			animate={open ? 'open' : 'closed'}
			className="border rounded-xl px-4 mb-4 border-primary"
			variants={{
				open: {
					backgroundColor: '#009EC2',
				},
				closed: {
					backgroundColor: '#fff',
				},
			}}
		>
			<button
				onClick={() => setOpen((pv) => !pv)}
				className="flex w-full items-center justify-between gap-4 py-6"
			>
				<motion.span
					variants={{
						open: {
							color: '#fff',
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
							color: '#fff',
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
				<div className="font-jose text-lg text-white">{children}</div>
			</motion.div>
		</motion.div>
	)
}
