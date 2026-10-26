'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
	Accordion,
	AccordionItem,
	AccordionTrigger,
	AccordionContent,
} from '@/components/ui/accordion'

function TrainerCard({ trainer }) {
	const card = (
		<>
			<Image
				alt={`${trainer.name} Picture`}
				src={trainer.img}
				fill
				sizes="(max-width: 1024px) 40vw, 15vw"
			/>
			<div className="w-full h-[20%] absolute bottom-0 bg-primary group-hover:bg-primary-light z-20 text-white font-jose text-xs lg:text-sm text-center flex items-center flex-col justify-center px-2">
				<span className="font-bold">{trainer.name}</span>
				<span>{trainer.role}</span>
			</div>
		</>
	)

	const className =
		'block w-40 lg:w-52 shrink-0 aspect-[265/390] relative shadow-md mx-auto lg:mx-0'

	if (trainer.href) {
		return (
			<Link
				href={trainer.href}
				className={`${className} hover:shadow-2xl group`}
			>
				{card}
			</Link>
		)
	}

	return <div className={className}>{card}</div>
}

export default function TrainingPage({ title, subtitle, courses }) {
	return (
		<div className="pt-8 xl:pt-20 pb-16 xl:pb-32 w-[90%] xl:w-[75%] max-w-[1200px] mx-auto">
			<div className="text-center text-primary mb-10 lg:mb-16">
				<h1 className="font-unna font-bold text-xl lg:text-[48px]">
					{title}
				</h1>
				{subtitle && (
					<p className="font-unna text-base lg:text-[28px] mt-2">
						{subtitle}
					</p>
				)}
			</div>
			<Accordion
				type="single"
				collapsible
				className="w-full"
			>
				{courses.map((course) => (
					<AccordionItem
						key={course.id}
						value={course.id}
						className="border-b border-primary/20"
					>
						<AccordionTrigger className="py-5 lg:py-6 text-primary font-jose text-sm lg:text-xl font-semibold hover:no-underline cursor-pointer">
							{course.title}
						</AccordionTrigger>
						<AccordionContent className="font-jose text-primary text-xs md:text-sm lg:text-base text-justify leading-relaxed pb-6">
							<div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-10">
								<div className="flex-1 space-y-4">
									{course.content.map((paragraph, index) => (
										<p key={index}>{paragraph}</p>
									))}
									<p>
										<span className="font-semibold">
											Course available in:
										</span>{' '}
										{course.languages}.
									</p>
									<p>
										<Link
											href={`/contact?training=${course.id}`}
											className="text-primary-light underline hover:text-primary transition-colors"
										>
											Click here to receive a
											personalised offer
										</Link>
									</p>
								</div>
								<TrainerCard trainer={course.trainer} />
							</div>
						</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>
		</div>
	)
}
