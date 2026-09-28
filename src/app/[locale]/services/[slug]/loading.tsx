import { CatalogueDetailSkeleton } from '@/components/catalogue/catalogue-loading'
import { LoadingMessage } from '@/components/loading/loading-message'

export default function ServiceDetailLoading() {
	return <CatalogueDetailSkeleton label={<LoadingMessage messageKey="Catalogue.service.loadingDetail" />} />
}
