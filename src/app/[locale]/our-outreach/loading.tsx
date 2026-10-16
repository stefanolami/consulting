import { LoadingMessage } from '@/components/loading/loading-message'
import { OutreachOverviewSkeleton } from '@/components/outreach/outreach-overview'

export default function OutreachRouteLoading() {
	return <main><OutreachOverviewSkeleton label={<LoadingMessage messageKey="Outreach.loading" />} /></main>
}
