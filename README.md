# Time&Place Consulting

The `v2` rebuild of the Time&Place Consulting website.

The application uses Next.js App Router, TypeScript, Tailwind CSS,
`next-intl`, and hosted Supabase services.

## Requirements

- Node.js 24 LTS
- npm
- Access to the hosted Supabase project

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and provide:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
   ```

3. Start the application:

   ```bash
   npm run dev
   ```

## Quality checks

```bash
npm run lint
npm run typecheck
npm run build
```

Run all checks with:

```bash
npm run check
```

## Contact form

The Contact page (`/contact`) sends each message through SMTP with
nodemailer from a Server Action. All variables are server-only and are read
when a message is sent; never give them a `NEXT_PUBLIC_` prefix.

| Variable | Purpose |
| --- | --- |
| `CONTACT_SMTP_HOST` | SMTP server, for example `smtppro.zoho.com` (the legacy provider). |
| `CONTACT_SMTP_PORT` | `465` for implicit TLS; any other port must offer STARTTLS. |
| `CONTACT_SMTP_USER` | The mailbox that sends the messages; it is also the From address. |
| `CONTACT_SMTP_PASSWORD` | That mailbox's (application) password. |
| `CONTACT_TO_EMAIL` | Where messages are delivered. |
| `CONTACT_FORM_SECRET` | At least 32 random characters; signs the anti-spam cookie. Required in production; development falls back to a fixed development-only value. |
| `CONTACT_MAIL_TRANSPORT` | Development only: `json` logs the generated message to the server console instead of sending it. Ignored in production. |

The visitor's address is only the Reply-To, never the sender. TLS certificates
are always verified. If the SMTP variables are missing or invalid, visitors
see a generic error and the server log names the variables (never their
values).

Spam protection: a hidden honeypot field, a minimum fill time of 3 seconds
measured from a signed, HttpOnly cookie (`tp_contact_form`) that the proxy
sets on the Contact page, and a limit of 5 accepted messages per 15 minutes
per client address. The rate limit lives in each server instance's memory: on
serverless hosting every instance and cold start has its own count, so it only
slows down a single client and is not a shared quota. The client address comes
from `x-forwarded-for`/`x-real-ip`, which is reliable only behind a proxy that
overwrites them (such as Vercel). See control tower §15.10 and §19.

To try the form locally without sending mail:

```bash
CONTACT_MAIL_TRANSPORT=json npm run dev
```

## Project plan

The high-level source of truth is
[`docs/control-tower.md`](docs/control-tower.md).

The rebuild is developed directly on `v2`. The legacy website remains on
`main` until the production cutover.
