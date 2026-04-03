'use client'

//import Image from 'next/image'
import {
	Accordion,
	AccordionItem,
	AccordionTrigger,
	AccordionContent,
} from '@/components/ui/accordion'

export default function PublicFundsPage({ title, subtitle, intro, services }) {
	return (
		<>
			{/* <div className="bg-primary -mt-16 xl:-mt-24 flex flex-col justify-end">
				<div className="w-full bg-primary h-40 xl:h-8"></div>
				<div className="relative w-full aspect-[5444/1583] hidden md:block">
					<Image
						src="/hero/hero-services.png"
						alt="services hero illustration"
						fill
						sizes="100vw"
						className="z-10"
						loading="eager"
					/>
				</div>
				<div className="relative w-full aspect-[4000/1583] md:hidden">
					<Image
						src="/hero/hero-services.png"
						alt="services hero illustration"
						fill
						sizes="100vw"
						className="z-10"
						loading="eager"
					/>
				</div>
			</div> */}
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
				<div className="w-[90%] md:w-[80%] max-w-[1000px] mx-auto font-jose text-center text-primary text-sm lg:text-lg mb-10 lg:mb-16">
					<p>{intro}</p>
				</div>
				<Accordion
					type="single"
					collapsible
					className="w-full"
				>
					{services.map((service, index) => (
						<AccordionItem
							key={index}
							value={`item-${index}`}
							className="border-b border-primary/20"
						>
							<AccordionTrigger className="py-5 lg:py-6 text-primary font-jose text-sm lg:text-xl font-semibold hover:no-underline cursor-pointer">
								{service.title}
							</AccordionTrigger>
							<AccordionContent className="font-jose text-primary text-xs md:text-sm lg:text-base text-justify leading-relaxed pb-6">
								{service.content}
								{service.link && (
									<p className="mt-4">
										<a
											href={service.link.href}
											target="_blank"
											rel="noopener noreferrer"
											className="text-primary-light underline hover:text-primary transition-colors"
										>
											{service.link.label}
										</a>
									</p>
								)}
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			</div>
		</>
	)
}
