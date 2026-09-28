type ProfileContactProps = {
	email: string | null
	labels: { email: string; heading: string; phone: string }
	phone: string | null
}

// Figma contact block: heading, full-width rule, then the contact lines. The
// designs also show an office address, which the people contract does not
// hold (control tower §15.4), so only email and phone render.
export function ProfileContact({ email, labels, phone }: ProfileContactProps) {
	if (!email && !phone) return null
	const linkClass = 'rounded-control underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus'
	return (
		<section aria-labelledby="profile-contact-heading">
			<h2 className="border-b-2 border-black pb-3 font-display text-heading-2 font-bold text-black" id="profile-contact-heading">{labels.heading}</h2>
			<dl className="mt-4 space-y-1 font-label text-body-lg text-black">
				{phone ? <div><dt className="sr-only">{labels.phone}</dt><dd><a className={linkClass} href={`tel:${phone.replace(/[^+\d]/g, '')}`}>{phone}</a></dd></div> : null}
				{email ? <div><dt className="sr-only">{labels.email}</dt><dd><a className={`${linkClass} break-all`} href={`mailto:${email}`}>{email}</a></dd></div> : null}
			</dl>
		</section>
	)
}
