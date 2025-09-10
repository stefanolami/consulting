import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

const NewsroomBlock = ({ article }) => {
	return (
		<div className="grid grid-rows-[3fr_2fr] border border-primary shadow-md hover:shadow-xl transition-shadow duration-300">
			<div className="relative w-full h-full">
				<Image
					src={`/newsroom/${article.image}`}
					alt={article.title}
					fill
					className="object-cover"
				/>
			</div>
			<div className="bg-white text-primary p-2 lg:p-3 flex flex-col gap-2 lg:gap-3 border-t border-primary">
				<h3 className="font-unna font-bold text-lg lg:text-xl leading-6">
					{article.title}
				</h3>
				<span className="block bg-grey rounded-sm w-fit text-xs lg:text-sm py-1 px-2 text-primary font-jose">
					{article.tag}
				</span>
				<p className="font-jose text-xs lg:text-sm mt-1">
					{article.subTitle}
				</p>
				<div className="flex flex-row items-center justify-between">
					<div className="flex flex-col">
						<span className="font-jose text-xs lg:text-sm text-wrap">
							{article.author},
						</span>
						<span className="font-jose text-xs lg:text-sm">
							{article.date}
						</span>
					</div>
					<Link
						href={article.path}
						className="font-jose text-xs lg:text-base text-primary border border-primary p-2 shadow-md hover:scale-[1.02]"
					>
						Read more
					</Link>
				</div>
			</div>
		</div>
	)
}

export default NewsroomBlock
