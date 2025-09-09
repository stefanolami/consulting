import NEWS from '@/data/newsroom'
import NewsroomBlock from './newsroom-blocks'

const Newsroom = () => {
	return (
		<div
			className="bg-grey py-10 lg:py-20"
			id="newsroom"
		>
			<div className="w-[90%] md:w-3/4 max-w-[1000px] mx-auto text-primary">
				<h2 className="text-center space-y-4">
					<span className="block text-base lg:text-xl font-unna">
						KEEP YOURSELF UPDATED WITH OUR
					</span>
					<span className="block text-2xl lg:text-4xl font-unna font-bold">
						NEWSROOM
					</span>
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 lg:gap-6 mt-10">
					{NEWS.map((article, index) => (
						<NewsroomBlock
							key={index}
							article={article}
						/>
					))}
				</div>
			</div>
		</div>
	)
}

export default Newsroom
