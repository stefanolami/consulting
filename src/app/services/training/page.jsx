import TrainingPage from '@/components/services/training-page'
import { trainingCourses } from '@/data/data'

export const metadata = {
	title: 'Training & Education',
}

const TrainingEducationPage = () => {
	return (
		<TrainingPage
			title="Training and Education"
			subtitle="for Individuals, Businesses and Institutions"
			courses={trainingCourses}
		/>
	)
}

export default TrainingEducationPage
