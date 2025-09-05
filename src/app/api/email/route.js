import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request) {
	const { email, name, subject, message } = await request.json()

	const transport = nodemailer.createTransport({
		/* service: 'Zoho', */
		host: 'smtppro.zoho.com',
		port: 465,
		secure: true,
		auth: {
			user: process.env.MY_EMAIL,
			pass: process.env.MY_PASSWORD,
		},
		tls: {
			rejectUnauthorized: false,
		},
	})

	const mailOptions = {
		from: process.env.MY_EMAIL,
		to: process.env.MY_EMAIL,
		// cc: email, (uncomment this line if you want to send a copy to the sender)
		subject: `Consulting Contact Form - ${subject} - from ${name} (${email})`,
		text: `Message from ${name} (${email}) with subject - ${subject}:\n\n${message}`,
	}

	const sendMailPromise = async () =>
		new Promise((resolve, reject) => {
			transport.sendMail(mailOptions, function (err) {
				if (!err) {
					resolve('Message sent')
				} else {
					reject(err.message)
				}
			})
		})

	try {
		await sendMailPromise()
		return NextResponse.json({ message: 'Message sent' })
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err })
	}
}
