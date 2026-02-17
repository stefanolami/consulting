import TeamMember from '@/components/who-we-are/team-member'
import { team, managingTeam } from '@/data/team'

export const dynamicParams = false

export async function generateStaticParams() {
	const managingPaths = Object.values(managingTeam).map((member) => ({
		name: member.path,
	}))
	const teamPaths = Object.values(team).map((member) => ({
		name: member.path,
	}))
	return [...managingPaths, ...teamPaths]
}

export async function generateMetadata({ params }) {
	let metaName
	const { name } = await params
	if (name == 'glenn-cezanne' || name == 'corina-gheorgheza') {
		metaName = Object.values(managingTeam).find(
			(member) => member.path === name,
		).name
	} else {
		metaName = Object.values(team).find(
			(member) => member.path === name,
		).name
	}

	return {
		title: metaName,
	}
}

export default async function TeamMemberPage({ params }) {
	const { name } = await params
	return <TeamMember name={name} />
}
