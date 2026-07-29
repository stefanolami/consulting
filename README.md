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

## Project plan

The high-level source of truth is
[`docs/control-tower.md`](docs/control-tower.md).

The rebuild is developed directly on `v2`. The legacy website remains on
`main` until the production cutover.
