import { LogOut } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { signOutAction } from '@/app/(admin)/admin/actions'
import { AdminNavigation } from '@/components/admin/admin-navigation'
import { SignOutForm, UnsavedChangesProvider } from '@/components/admin/form/unsaved-changes'
import { Button } from '@/components/ui/button'
import type { StaffProfile } from '@/lib/auth/authorization'

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
		<UnsavedChangesProvider>
			<div className="admin-ui min-h-screen bg-[#f4f6fa] text-slate-950">
				{/* The links scroll inside the sidebar and the account block stays at
				    the bottom, so Sign out is reachable on short screens (NAV-02). */}
				<aside className="fixed inset-y-0 left-0 hidden w-72 flex-col bg-[#27335a] pt-5 pb-3 text-white [--admin-focus:#ffffff] lg:flex">
					<Link className="mx-5 shrink-0 self-start rounded-md px-2" href="/admin">
						<Image
							alt="Time&Place Consulting"
							className="h-auto w-44 object-contain"
							height={182}
							priority
							src="/logos/consulting-white.png"
							width={694}
						/>
					</Link>
					{/* A thin, dark scrollbar that only matters on short screens. */}
					<div className="mt-4 min-h-0 flex-1 overflow-y-auto px-5 py-2 [scrollbar-color:rgb(255_255_255/0.2)_transparent] scrollbar-thin">
						<AdminNavigation />
					</div>
					<div className="mx-5 mt-2 shrink-0 border-t border-white/10 pt-3">
						<div className="mb-1.5 flex items-center gap-3 px-2">
							<div aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold uppercase">
								{displayName.slice(0, 2)}
							</div>
							<div className="min-w-0">
								<p className="truncate text-sm font-medium leading-5">
									{displayName}
								</p>
								<p className="truncate text-xs capitalize leading-4 text-blue-100/60">
									{profile.role}
								</p>
							</div>
						</div>
						<SignOutForm action={signOutAction}>
							<Button
								className="h-8 w-full justify-start text-blue-100 hover:bg-white/10 hover:text-white"
								type="submit"
								variant="ghost"
							>
								<LogOut aria-hidden="true" />
								Sign out
							</Button>
						</SignOutForm>
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
							<SignOutForm action={signOutAction}>
								<Button
									aria-label="Sign out"
									size="icon"
									type="submit"
									variant="ghost"
								>
									<LogOut aria-hidden="true" />
								</Button>
							</SignOutForm>
						</div>
						<div className="overflow-x-auto px-5 pt-1 pb-4">
							<AdminNavigation compact />
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
		</UnsavedChangesProvider>
	)
}
