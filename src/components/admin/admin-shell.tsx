import {
	BookOpenText,
	Layers3,
	Globe2,
	ImageIcon,
	LayoutDashboard,
	LogOut,
	UsersRound,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { signOutAction } from '@/app/(admin)/admin/actions'
import { Button } from '@/components/ui/button'
import type { StaffProfile } from '@/lib/auth/authorization'
import { cn } from '@/lib/utils'

const navigation = [
	{ label: 'Dashboard', href: '/admin', icon: LayoutDashboard, enabled: true },
	{ label: 'People', href: '/admin/people', icon: UsersRound, enabled: true },
	{ label: 'Catalogue', href: '/admin/catalogue', icon: Layers3, enabled: true },
	{
		label: 'Newsroom',
		href: '/admin/newsroom',
		icon: BookOpenText,
		enabled: false,
	},
	{
		label: 'Our Outreach',
		href: '/admin/outreach',
		icon: Globe2,
		enabled: false,
	},
	{ label: 'Media', href: '/admin/media', icon: ImageIcon, enabled: false },
]

function Navigation({ compact = false }: { compact?: boolean }) {
	return (
		<nav
			aria-label="Admin navigation"
			className={cn(
				compact
					? 'flex min-w-max gap-2'
					: 'flex flex-1 flex-col gap-1',
			)}
		>
			{navigation.map((item) => {
				const Icon = item.icon
				const className = cn(
					'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
					item.enabled
						? 'bg-white/10 text-white'
						: 'cursor-not-allowed text-blue-100/45',
					compact &&
						(item.enabled
							? 'bg-[#27335a] text-white'
							: 'bg-white text-slate-400'),
				)

				if (!item.enabled) {
					return (
						<span
							aria-disabled="true"
							className={className}
							key={item.label}
							title="Coming in a later phase"
						>
							<Icon aria-hidden="true" className="size-4" />
							{item.label}
						</span>
					)
				}

				return (
					<Link
						aria-current="page"
						className={className}
						href={item.href}
						key={item.label}
					>
						<Icon aria-hidden="true" className="size-4" />
						{item.label}
					</Link>
				)
			})}
		</nav>
	)
}

export function AdminShell({
	children,
	profile,
}: {
	children: ReactNode
	profile: StaffProfile
}) {
	const displayName =
		profile.displayName || profile.email?.split('@')[0] || 'Staff member'

	return (
		<div className="min-h-screen bg-[#f4f6fa] text-slate-950">
			<aside className="fixed inset-y-0 left-0 hidden w-72 flex-col bg-[#27335a] px-5 py-6 text-white lg:flex">
				<Link className="px-2" href="/admin">
					<Image
						alt="Time&Place Consulting"
						className="h-auto w-52 object-contain"
						height={182}
						priority
						src="/logos/consulting-white.png"
						width={694}
					/>
				</Link>
				<div className="mt-8" />
				<Navigation />
				<div className="mt-6 border-t border-white/10 pt-5">
					<div className="mb-4 flex items-center gap-3 px-2">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold uppercase">
							{displayName.slice(0, 2)}
						</div>
						<div className="min-w-0">
							<p className="truncate text-sm font-medium">
								{displayName}
							</p>
							<p className="truncate text-xs capitalize text-blue-100/60">
								{profile.role}
							</p>
						</div>
					</div>
					<form action={signOutAction}>
						<Button
							className="w-full justify-start text-blue-100 hover:bg-white/10 hover:text-white"
							type="submit"
							variant="ghost"
						>
							<LogOut aria-hidden="true" />
							Sign out
						</Button>
					</form>
				</div>
			</aside>

			<div className="lg:pl-72">
				<header className="border-b border-slate-200 bg-white lg:hidden">
					<div className="flex h-20 items-center justify-between px-5">
						<Image
							alt="Time&Place Consulting"
							className="h-auto w-44 object-contain"
							height={160}
							priority
							src="/logos/consulting-logo-home.png"
							width={550}
						/>
						<form action={signOutAction}>
							<Button
								aria-label="Sign out"
								size="icon"
								type="submit"
								variant="ghost"
							>
								<LogOut aria-hidden="true" />
							</Button>
						</form>
					</div>
					<div className="overflow-x-auto px-5 pb-4">
						<Navigation compact />
					</div>
				</header>

				<header className="hidden h-20 items-center border-b border-slate-200 bg-white px-8 lg:flex">
					<div>
						<p className="text-sm text-slate-500">Admin portal</p>
						<p className="font-medium text-slate-900">
							Welcome, {displayName}
						</p>
					</div>
				</header>

				<main className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
					{children}
				</main>
			</div>
		</div>
	)
}
