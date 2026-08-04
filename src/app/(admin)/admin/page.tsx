import type { Metadata } from 'next'
import {
	FilePenLine,
	Globe2,
	UsersRound,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { requireActiveStaff } from '@/lib/auth/authorization'

export const metadata: Metadata = {
	title: 'Dashboard',
}

const upcomingAreas = [
	{
		title: 'People and team',
		description:
			'Profiles, translations, ordering, archive and restore workflows.',
		icon: UsersRound,
		href: '/admin/people',
	},
	{
		title: 'Newsroom',
		description:
			'Drafts, authors, taxonomy, translations and publishing controls.',
		icon: FilePenLine,
	},
	{
		title: 'Our Outreach',
		description:
			'Countries, services, offices and the public map experience.',
		icon: Globe2,
	},
]

type DashboardPageProps = {
	searchParams: Promise<{ notice?: string | string[] }>
}

async function DashboardContent({
	searchParams,
}: DashboardPageProps) {
	const { profile } = await requireActiveStaff()
	const params = await searchParams
	const adminRequired = params.notice === 'admin-required'

	return (
		<div className="mx-auto max-w-6xl">
			{adminRequired && (
				<div
					className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
					role="alert"
				>
					That area is available to administrators only.
				</div>
			)}

			<div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">
						Overview
					</p>
					<h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950 sm:text-5xl">
						Good morning, {profile.displayName?.split(' ')[0] ?? 'there'}
					</h1>
					<p className="mt-3 max-w-2xl leading-7 text-slate-600">
						Keep the Time&amp;Place website content accurate and up to date.
					</p>
				</div>
				<Button
					asChild
					className="h-10 bg-[#27335a] text-white hover:bg-[#1e294c] hover:text-white"
				>
					<Link href="/admin/people">Manage team</Link>
				</Button>
			</div>

			<div className="mt-9 grid gap-4 sm:grid-cols-3">
				<Summary label="Team profiles" value="3" />
				<Summary label="Published profiles" value="2" />
				<Summary label="Active locales" value="5" />
			</div>

			<section className="mt-10" aria-labelledby="upcoming-heading">
				<div className="mb-5">
					<h2
						className="font-robo text-2xl text-slate-950"
						id="upcoming-heading"
					>
						Editorial areas
					</h2>
					<p className="mt-1 text-sm text-slate-500">
						The areas used to maintain the website.
					</p>
				</div>
				<div className="grid gap-4 md:grid-cols-3">
					{upcomingAreas.map((area) => {
						const Icon = area.icon

						return (
							<Card
								className="border-slate-200 shadow-none"
								key={area.title}
							>
								<CardHeader>
									<div className="flex items-center justify-between gap-4">
										<div className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-[#27335a]">
											<Icon
												aria-hidden="true"
												className="size-5"
											/>
										</div>
									</div>
									<CardTitle className="pt-3 text-lg">
										{area.title}
									</CardTitle>
									<CardDescription className="leading-6">
										{area.description}
									</CardDescription>
								</CardHeader>
							</Card>
						)
					})}
				</div>
			</section>
		</div>
	)
}

function Summary({ label, value }: { label: string; value: string }) {
	return (
		<Card className="border-slate-200 shadow-none">
			<CardContent className="p-5">
				<p className="text-sm text-slate-500">{label}</p>
				<p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
			</CardContent>
		</Card>
	)
}

export default function DashboardPage(props: DashboardPageProps) {
	return (
		<Suspense
			fallback={
				<div
					aria-label="Loading dashboard"
					className="mx-auto h-[36rem] max-w-6xl animate-pulse rounded-2xl bg-white"
				/>
			}
		>
			<DashboardContent {...props} />
		</Suspense>
	)
}
