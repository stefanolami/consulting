import type { Metadata } from 'next'
import Image from 'next/image'
import type { ReactNode } from 'react'

import { jose, robo, unna } from '@/app/fonts'

import '../../globals.css'

export const metadata: Metadata = {
	title: 'Admin access',
	robots: {
		index: false,
		follow: false,
	},
}

export default function AuthLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body
				className={`${jose.variable} ${unna.variable} ${robo.variable} antialiased`}
			>
				<main className="grid min-h-screen bg-[#f4f6fa] lg:grid-cols-[minmax(320px,0.82fr)_1.18fr]">
					<section className="relative hidden overflow-hidden bg-[#27335a] p-12 text-white lg:flex lg:flex-col lg:justify-between">
						<div
							aria-hidden="true"
							className="absolute -right-48 -top-40 size-[34rem] rounded-full border border-white/10"
						/>
						<div
							aria-hidden="true"
							className="absolute -bottom-72 -left-48 size-[38rem] rounded-full bg-[#365086]"
						/>
						<Image
							alt="Time&Place Consulting"
							className="relative h-auto w-64 object-contain"
							height={182}
							priority
							src="/logos/consulting-white.png"
							width={694}
						/>
						<div className="relative max-w-md">
							<p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">
								Content platform
							</p>
							<h1 className="font-robo text-4xl leading-tight">
								A focused workspace for the stories and places
								behind our work.
							</h1>
							<p className="mt-5 max-w-sm text-base leading-7 text-blue-100/80">
								Invite-only access for the Time&amp;Place
								editorial team.
							</p>
						</div>
					</section>
					<section className="flex min-h-screen items-center justify-center p-5 sm:p-10">
						<div className="w-full max-w-md">
							<Image
								alt="Time&Place Consulting"
								className="mb-10 h-auto w-56 object-contain lg:hidden"
								height={160}
								priority
								src="/logos/consulting-logo-home.png"
								width={550}
							/>
							{children}
						</div>
					</section>
				</main>
			</body>
		</html>
	)
}
