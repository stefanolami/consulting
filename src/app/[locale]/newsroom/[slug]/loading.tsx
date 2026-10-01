import { LoadingMessage } from '@/components/loading/loading-message'
import { NewsroomDetailSkeleton } from '@/components/newsroom/newsroom-article'

export default function NewsroomDetailLoading() {
	return <NewsroomDetailSkeleton label={<LoadingMessage messageKey="Newsroom.loadingArticle" />} />
}
