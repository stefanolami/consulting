import Image from 'next/image'
import Link from 'next/link'

const NewsArticle = ({ article }) => {
	const renderContentWithReferences = (content, references) => {
		return content.map((paragraph, index) => {
			// Replace [1], [2], etc. with clickable reference links
			const processedText = paragraph.replace(
				/\[(\d+)\]/g,
				(match, refId) => {
					const ref = references.find((r) => r.id === parseInt(refId))
					if (ref) {
						return `<sup><a href="#ref-${refId}" class="text-blue-600 hover:underline text-xs font-medium cursor-pointer no-underline" title="${ref.title}">[${refId}]</a></sup>`
					}
					return match
				}
			)

			return (
				<p
					key={index}
					dangerouslySetInnerHTML={{ __html: processedText }}
					className="mb-4 text-primary leading-relaxed text-sm md:text-base"
				/>
			)
		})
	}

	return (
		<div className="min-h-screen bg-grey pb-10 lg:pb-20">
			<div className="h-16 -mt-16 lg:-mt-24 lg:h-24 w-full bg-primary"></div>
			{/* <div className="relative w-full h-64 md:h-80 lg:h-96 xl:h-[450px]">
				<Image
					src={`/newsroom/${article.image}`}
					alt={article.title}
					fill
					className="object-cover object"
				/>
			</div> */}
			<div className="relative w-full aspect-video md:aspect-[16/7] lg:aspect-[16/6] xl:aspect-[16/5]">
				<Image
					src={`/newsroom/${article.image}`}
					alt={article.title}
					fill
					className="object-cover object"
				/>
			</div>
			<article className="w-[90%] md:w-3/4 max-w-[800px] mx-auto bg-grey">
				{/* Article Content */}
				<div className="px-3 py-6 md:p-8">
					{/* Title */}
					<h1 className="font-unna font-bold text-2xl md:text-4xl text-primary mb-4 leading-tight">
						{article.title}
					</h1>

					{/* Tag */}
					<span className="inline-block bg-primary text-white text-xs md:text-sm px-3 py-1 rounded mb-4">
						{article.tag}
					</span>

					{/* Subtitle */}
					<p className="text-lg md:text-xl text-gray-600 mb-6 font-jose">
						{article.subTitle}
					</p>

					{/* Author & Date */}
					<div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-4 border-b">
						<div>
							<span className="text-primary font-jose font-medium">
								By {article.author}
							</span>
							<span className="block md:inline md:ml-4 text-gray-500 font-jose">
								{article.date}
							</span>
						</div>
					</div>

					{/* Article Sections */}
					<div className="prose max-w-none">
						{article.paragraphs.map((section, index) => (
							<section
								key={index}
								className="mb-8"
							>
								<h2 className="font-unna font-bold text-xl md:text-2xl text-primary mb-4">
									{section.title}
								</h2>
								<div className="space-y-4 font-jose text-base lg:text-lg">
									{renderContentWithReferences(
										section.content,
										article.references
									)}
								</div>
							</section>
						))}
					</div>

					{/* References Section */}
					{article.references &&
						article.references.some(
							(ref) => ref.title && ref.url
						) && (
							<div className="mt-12 pt-8 border-t">
								<h3 className="font-unna font-bold text-xl text-primary mb-6">
									References
								</h3>
								<ol className="space-y-3">
									{article.references.map((ref, index) => {
										if (!ref.title || !ref.url) return null
										return (
											<li
												key={index}
												id={`ref-${
													ref.id || index + 1
												}`}
												className="text-sm"
											>
												<span className="font-medium">
													[{ref.id || index + 1}]
												</span>{' '}
												<a
													href={ref.url}
													target="_blank"
													rel="noopener noreferrer"
													className="text-blue-600 hover:underline"
												>
													{ref.title}
												</a>
											</li>
										)
									})}
								</ol>
							</div>
						)}

					{/* Back to Newsroom */}
					<div className="mt-12 pt-6 border-t">
						<Link
							href="/#newsroom"
							className="inline-flex items-center text-primary hover:underline font-jose"
						>
							← Back to Newsroom
						</Link>
					</div>
				</div>
			</article>
		</div>
	)
}

export default NewsArticle
