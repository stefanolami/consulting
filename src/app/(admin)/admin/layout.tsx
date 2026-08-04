import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Suspense } from 'react'

import { jose, robo, unna } from '@/app/fonts'
import { AdminShell } from '@/components/admin/admin-shell'
import { requireActiveStaff } from '@/lib/auth/authorization'

import '../../globals.css'

export const metadata: Metadata = {
	title: {
		default: 'Admin',
		template: '%s | Time&Place Admin',
	},
	robots: {
		index: false,
		follow: false,
	},
}

async function ProtectedAdminShell({
	children,
}: {
	children: ReactNode
}) {
	const { profile } = await requireActiveStaff()

	return <AdminShell profile={profile}>{children}</AdminShell>
}

export default function AdminLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body
				className={`${jose.variable} ${unna.variable} ${robo.variable} antialiased`}
			>
				<Suspense
					fallback={
						<main
							aria-label="Checking admin access"
							className="min-h-screen animate-pulse bg-[#f4f6fa]"
						/>
					}
				>
					<ProtectedAdminShell>{children}</ProtectedAdminShell>
				</Suspense>
			</body>
		</html>
	)
}
