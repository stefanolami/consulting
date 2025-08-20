import { endorsements } from '@/data/data'
import EndorsementsRow from './endorsements-row'

export default function Endorsements() {
	return (
		<div className="pt-8 xl:pt-20 pb-16 xl:pb-32 w-full">
			<h1 className="font-unna font-bold text-xl lg:text-[48px] text-center text-primary mb-6 lg:mb-10">
				ENDORSEMENTS
			</h1>
			<div className="p-4 overflow-x-hidden relative">
				{
					<div className="absolute top-0 bottom-0 left-0 w-24 z-10 bg-gradient-to-r from-primary to-transparent" />
				}

				<div className="flex items-center mb-4">
					<EndorsementsRow
						list={endorsements.top}
						duration={125}
					/>
					<EndorsementsRow
						list={endorsements.top}
						duration={125}
					/>
					<EndorsementsRow
						list={endorsements.top}
						duration={125}
					/>
				</div>
				<div className="flex items-center">
					<EndorsementsRow
						list={endorsements.bottom}
						duration={125}
						reverse
					/>
					<EndorsementsRow
						list={endorsements.bottom}
						duration={125}
						reverse
					/>
					<EndorsementsRow
						list={endorsements.bottom}
						duration={125}
						reverse
					/>
				</div>

				<div className="absolute top-0 bottom-0 right-0 w-24 z-10 bg-gradient-to-l from-primary to-transparent" />
			</div>
		</div>
	)
}
