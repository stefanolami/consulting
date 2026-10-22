import { LoadingMessage } from '@/components/loading/loading-message'
import { OutreachDetailSkeleton } from '@/components/outreach/outreach-detail'

export default function OutreachCountryLoading() {
	return <OutreachDetailSkeleton label={<LoadingMessage messageKey="Outreach.detail.loading" />} />
}
