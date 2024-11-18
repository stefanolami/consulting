import CountryComponent from '@/components/your-access/CountryComponent'
import { team, managingTeam } from '@/data/team'

export async function generateMetadata({ params }) {
	return {
		title: params.country,
	}
}

export default function CountryPage({ params }) {
	return <CountryComponent country={params.country} />
}
