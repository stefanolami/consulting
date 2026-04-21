import { NextResponse } from 'next/server'

export async function POST(request) {
	const { email } = await request.json()

	if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return NextResponse.json(
			{ error: 'Please provide a valid email address.' },
			{ status: 400 },
		)
	}

	const API_KEY = process.env.MAILCHIMP_API_KEY
	const AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID

	if (!API_KEY || !AUDIENCE_ID) {
		console.error('Mailchimp credentials are not configured.')
		return NextResponse.json(
			{ error: 'Newsletter service is not configured.' },
			{ status: 500 },
		)
	}

	const dc = API_KEY.split('-').pop()

	try {
		const response = await fetch(
			`https://${dc}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}/members`,
			{
				method: 'POST',
				headers: {
					Authorization: `Basic ${Buffer.from(`anystring:${API_KEY}`).toString('base64')}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email_address: email,
					status: 'subscribed',
				}),
			},
		)

		const data = await response.json()

		if (response.ok) {
			return NextResponse.json({
				message: 'Thanks for subscribing!',
			})
		}

		if (data.title === 'Member Exists') {
			return NextResponse.json(
				{ error: 'This email is already subscribed.' },
				{ status: 400 },
			)
		}

		console.error('Mailchimp error:', data)
		return NextResponse.json(
			{ error: 'Something went wrong. Please try again later.' },
			{ status: 500 },
		)
	} catch (error) {
		console.error('Newsletter subscription error:', error)
		return NextResponse.json(
			{ error: 'Something went wrong. Please try again later.' },
			{ status: 500 },
		)
	}
}
