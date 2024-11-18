import TeamMember from '@/components/our-team/TeamMember'
import { team, managingTeam } from '@/data/team'

export async function generateMetadata({ params }) {
	let name
	if (params.name == 'glenn-cezanne' || params.name == 'corina-gheorgheza') {
		name = Object.values(managingTeam).find(
			(member) => member.path === params.name
		).name
	} else {
		name = Object.values(team).find(
			(member) => member.path === params.name
		).name
	}

	return {
		title: name,
	}
}

export default function TeamMemberPage({ params }) {
	return <TeamMember name={params.name} />
}
