import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import Mail from 'nodemailer/lib/mailer'

export async function POST(request) {
	const { email, name, subject, message } = await request.json()

	const transport = nodemailer.createTransport({
		/* service: 'Zoho', */
		host: 'smtppro.zoho.eu',
		port: 465,
		secure: true,
		authMethod: 'LOGIN',
		auth: {
			user: process.env.MY_EMAIL,
			pass: process.env.MY_PASSWORD,
		},
	})

	const mailOptions = {
		from: process.env.MY_EMAIL,
		to: process.env.MY_EMAIL,
		// cc: email, (uncomment this line if you want to send a copy to the sender)
		subject: `Funding Contact Form - ${subject} - from ${name} (${email})`,
		text: `Message from ${name} (${email}) with subject - ${subject}:\n\n${message}`,
	}

	const sendMailPromise = () =>
		new Promise() <
		string >
		((resolve, reject) => {
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
