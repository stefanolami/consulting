import Image from 'next/image'
import Link from 'next/link'

const NewsArticle = ({ article }) => {
	const renderContentWithReferences = (content, references) => {
		return content.map((item, index) => {
			// Handle list objects
			if (typeof item === 'object' && item.type) {
				if (item.type === 'unordered-list') {
					return (
						<ul
							key={index}
							className="list-disc list-inside mb-4 space-y-2 ml-4"
						>
							{item.items.map((listItem, listIndex) => {
								const processedItem = listItem.replace(
									/\[(\d+)\]/g,
									(match, refId) => {
										const ref = references.find(
											(r) => r.id === parseInt(refId)
										)
										if (ref) {
											return `<sup><a href="#ref-${refId}" class="text-blue-600 hover:underline text-xs font-medium cursor-pointer no-underline" title="${ref.title}">[${refId}]</a></sup>`
										}
										return match
									}
								)
								return (
									<li
										key={listIndex}
										dangerouslySetInnerHTML={{
											__html: processedItem,
										}}
										className="text-primary"
									/>
								)
							})}
						</ul>
					)
				}

				if (item.type === 'ordered-list') {
					return (
						<ol
							key={index}
							className="list-decimal list-inside mb-4 space-y-2 ml-4"
						>
							{item.items.map((listItem, listIndex) => {
								const processedItem = listItem.replace(
									/\[(\d+)\]/g,
									(match, refId) => {
										const ref = references.find(
											(r) => r.id === parseInt(refId)
										)
										if (ref) {
											return `<sup><a href="#ref-${refId}" class="text-blue-600 hover:underline text-xs font-medium cursor-pointer no-underline" title="${ref.title}">[${refId}]</a></sup>`
										}
										return match
									}
								)
								return (
									<li
										key={listIndex}
										dangerouslySetInnerHTML={{
											__html: processedItem,
										}}
										className="text-primary"
									/>
								)
							})}
						</ol>
					)
				}

				return null // Handle unknown types
			}

			// Handle regular text paragraphs
			const processedText = item.replace(/\[(\d+)\]/g, (match, refId) => {
				const ref = references.find((r) => r.id === parseInt(refId))
				if (ref) {
					return `<sup><a href="#ref-${refId}" class="text-blue-600 hover:underline text-xs font-medium cursor-pointer no-underline" title="${ref.title}">[${refId}]</a></sup>`
				}
				return match
			})

			return (
				<p
					key={index}
					dangerouslySetInnerHTML={{ __html: processedText }}
					className="mb-4 text-primary leading-relaxed"
				/>
			)
		})
	}

	return (
		<div className="min-h-screen bg-white pb-10 lg:pb-20">
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
			<article className="w-[90%] md:w-3/4 max-w-[800px] mx-auto bg-white">
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
								{section.image && (
									<div className="relative w-full aspect-video md:aspect-[16/7] lg:aspect-[16/6] xl:aspect-[16/5] my-6 lg:my-10">
										<Image
											src={`/newsroom/${section.image}`}
											alt={section.title}
											fill
											className="object-cover object"
										/>
									</div>
								)}
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

					{/* Tags Section */}
					{article.tags && (
						<div className="mt-12 pt-8">
							<p className="font-jose text-base lg:text-lg text-primary">
								{article.tags}
							</p>
						</div>
					)}

					{/* Conclusion Section */}
					{article.conclusion && (
						<div className="mt-8 pt-8 border-t">
							<p className="font-jose text-base lg:text-lg text-primary mb-6">
								{article.conclusion.content}
							</p>
							{article.conclusion.contact &&
								article.conclusion.contact.length > 0 && (
									<div className="space-y-2">
										{article.conclusion.contact.map(
											(email, index) => (
												<p key={index}>
													<a
														href={`mailto:${email.trim()}`}
														className="text-blue-600 hover:underline font-jose"
													>
														{email.trim()}
													</a>
												</p>
											)
										)}
									</div>
								)}
						</div>
					)}

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

					{/* Sources Section */}
					{article.sources && article.sources.length > 0 && (
						<div className="mt-12 pt-8 border-t">
							<h3 className="font-unna font-bold text-xl text-primary mb-6">
								Sources
							</h3>
							<ul className="space-y-3">
								{article.sources.map((source, index) => (
									<li
										key={index}
										className="text-sm"
									>
										<a
											href={source}
											target="_blank"
											rel="noopener noreferrer"
											className="text-blue-600 hover:underline break-all"
										>
											{source}
										</a>
									</li>
								))}
							</ul>
						</div>
					)}

					{/* Back to Newsroom */}
					{/* <div className="mt-12 pt-6 border-t">
						<Link
							href="/#newsroom"
							className="inline-flex items-center text-primary hover:underline font-jose"
						>
							← Back to Newsroom
						</Link>
					</div> */}
				</div>
			</article>
		</div>
	)
}

export default NewsArticle
