import type { User } from '@supabase/supabase-js'
import { cache } from 'react'
import { redirect } from 'next/navigation'

import { isAdminDemoMode } from '@/lib/admin-demo'
import { createClient } from '@/lib/supabase/server'

export type AppRole = 'admin' | 'editor'

export type StaffProfile = {
	id: string
	email: string | null
	displayName: string | null
	role: AppRole
	isActive: boolean
}

type SignedOutAccount = {
	status: 'signed_out'
	user: null
	profile: null
}

type InactiveAccount = {
	status: 'inactive'
	user: User
	profile: StaffProfile | null
}

type ActiveAccount = {
	status: 'active'
	user: User
	profile: StaffProfile
}

type UnavailableAccount = {
	status: 'unavailable'
	user: User
	profile: null
}

export type CurrentAccount =
	| SignedOutAccount
	| InactiveAccount
	| ActiveAccount
	| UnavailableAccount

type ProfileRow = {
	id: string
	email: string | null
	display_name: string | null
	role: AppRole
	is_active: boolean
}

function isProfileRow(value: unknown): value is ProfileRow {
	if (!value || typeof value !== 'object') {
		return false
	}

	const row = value as Record<string, unknown>

	return (
		typeof row.id === 'string' &&
		(row.email === null || typeof row.email === 'string') &&
		(row.display_name === null || typeof row.display_name === 'string') &&
		(row.role === 'admin' || row.role === 'editor') &&
		typeof row.is_active === 'boolean'
	)
}

function toStaffProfile(row: ProfileRow): StaffProfile {
	return {
		id: row.id,
		email: row.email,
		displayName: row.display_name,
		role: row.role,
		isActive: row.is_active,
	}
}

export const getCurrentAccount = cache(
	async (): Promise<CurrentAccount> => {
		if (isAdminDemoMode()) {
			return {
				status: 'active',
				user: {
					id: 'local-demo-user',
				} as User,
				profile: {
					id: 'local-demo-user',
					email: 'local.preview@timeandplace.com',
					displayName: 'Stefano Lami',
					role: 'admin',
					isActive: true,
				},
			}
		}

		const supabase = await createClient()
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser()

		if (userError || !user) {
			return { status: 'signed_out', user: null, profile: null }
		}

		const { data, error } = await supabase
			.from('profiles')
			.select('id, email, display_name, role, is_active')
			.eq('id', user.id)
			.maybeSingle()

		if (error) {
			return { status: 'unavailable', user, profile: null }
		}

		if (!isProfileRow(data)) {
			return { status: 'inactive', user, profile: null }
		}

		const profile = toStaffProfile(data)

		if (!profile.isActive) {
			return { status: 'inactive', user, profile }
		}

		return { status: 'active', user, profile }
	},
)

export async function requireActiveStaff(): Promise<ActiveAccount> {
	const account = await getCurrentAccount()

	if (account.status === 'signed_out') {
		redirect('/auth/sign-in?next=/admin')
	}

	if (account.status === 'inactive') {
		redirect('/auth/access-pending')
	}

	if (account.status === 'unavailable') {
		redirect('/auth/access-pending?reason=unavailable')
	}

	return account
}

export async function requireAdmin(): Promise<ActiveAccount> {
	const account = await requireActiveStaff()

	if (account.profile.role !== 'admin') {
		redirect('/admin?notice=admin-required')
	}

	return account
}
