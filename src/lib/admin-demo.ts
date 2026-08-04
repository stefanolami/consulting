/**
 * Local walkthrough mode for the in-progress admin interface.
 *
 * It is deliberately unavailable outside `next dev`, so the production admin
 * area always requires a real Supabase session and active staff profile.
 */
export function isAdminDemoMode() {
	return (
		process.env.NODE_ENV === 'development' &&
		process.env.ADMIN_DEMO_MODE === 'true'
	)
}
