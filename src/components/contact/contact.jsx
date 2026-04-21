import Image from 'next/image'
import ContactForm from './contact-form'
import ContactMapMobile from './contact-map-mobile'
import ContactMapDesktop from './contact-map-desktop'

const offices = [
	{
		id: 'europe',
		title: 'Europe HQ',
		address: ['Rue de la Loi 81A', '1040 Brussels – Belgium'],
		email: 'info@timeandplace.consulting',
		phone: '+32 (0) 485 38 22 21',
	},
	{
		id: 'latam',
		title: 'LATAM HQ',
		address: ['Av. Paulista 1636', 'São Paulo – Brazil'],
		email: 'info@timeandplace.consulting',
		phone: '+55 11 9 5020 2057',
	},
]

function ContactRow({ icon, alt, children }) {
	return (
		<div className="flex flex-row items-center gap-3 mb-2 lg:mb-3">
			<div className="w-9 lg:w-11 h-9 lg:h-11 relative shrink-0">
				<Image
					src={icon}
					alt={alt}
					fill
					sizes="(max-width: 640px) 10vw, 5vw"
				/>
			</div>
			<div>{children}</div>
		</div>
	)
}

export default function Contact() {
	return (
		<div className="w-[90%] lg:w-[75%] max-w-[1100px] mx-auto pt-8 lg:pt-20 pb-16 lg:pb-32 ">
			<div className="w-full lg:flex flex-row items-start justify-center gap-32 mb-12 lg:mb-24">
				<ContactForm />
				<div className="w-full lg:w-[45%] mt-10 flex flex-col gap-10 sm:flex-row sm:items-start sm:gap-6 lg:flex-col lg:gap-12">
					{offices.map((office, i) => (
						<div
							key={office.id}
							className={
								'sm:flex-1 lg:flex-none' +
								(i === 1
									? ' sm:pl-6 sm:border-l sm:border-primary/20 lg:pl-0 lg:border-l-0 lg:pt-10 lg:border-t lg:border-primary/20'
									: '')
							}
						>
							<h2 className="font-unna font-bold text-lg lg:text-2xl text-center text-primary mb-4 lg:mb-5">
								{office.title}
							</h2>
							<div className="w-full flex items-center justify-center">
								<div className="flex flex-col items-start justify-center">
									<ContactRow
										icon="/contact/contact-address.png"
										alt="Address logo"
									>
										{office.address.map((line) => (
											<span
												key={line}
												className="block font-jose text-xs lg:text-base font-primary"
											>
												{line}
											</span>
										))}
									</ContactRow>
									<ContactRow
										icon="/contact/contact-email.png"
										alt="Email logo"
									>
										<span className="block font-jose text-xs lg:text-base font-primary">
											{office.email}
										</span>
									</ContactRow>
									<ContactRow
										icon="/contact/contact-phone.png"
										alt="Phone logo"
									>
										<span className="block font-jose text-xs lg:text-base font-primary">
											{office.phone}
										</span>
									</ContactRow>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
			<ContactMapMobile />
			<ContactMapDesktop />
		</div>
	)
}
