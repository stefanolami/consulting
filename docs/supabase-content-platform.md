# Supabase Content Platform

Last updated: 2026-07-29

Status: Initial schema and security design

Related migrations:

- `supabase/migrations/20260729190000_core_auth_locales_media.sql`
- `supabase/migrations/20260729191000_content_schema.sql`
- `supabase/migrations/20260729192000_content_rls.sql`

## 1. Purpose

This document defines the first database, authentication, publishing, and media
architecture for the Consulting website rebuild.

The schema is intentionally broad enough to support the agreed website and
admin scope while keeping page composition in code. It does not seed current or
provisional website content. Authoritative content will be migrated separately
after the admin workflows and public renderers exist.

## 2. Operating model

Development uses the hosted Supabase `main` branch directly.

- No local Supabase database is required.
- No Docker-based Supabase stack is required.
- Every schema change is represented by a committed migration.
- Migrations are inspected with `db push --dry-run` before being applied.
- The current live website remains unaffected until the rebuilt application is
  launched because it does not use this content platform.
- After launch, the current Supabase branch becomes production and a persistent
  development branch will be created.

Dashboard-only schema changes are discouraged. If an emergency change is made
through the SQL editor, it must be captured in a migration immediately.

## 3. Schema overview

### 3.1 Staff authorization and locales

- `profiles`
  - One row per invited Supabase Auth user.
  - Stores the application role and active state.
  - New users are inactive by default.
- `locales`
  - Seeds `en`, `de`, `it`, `pt-BR`, and `pt-PT`.
  - Supports adding more locales without changing the entity schemas.

The application starts with two roles:

- `admin`
- `editor`

Both roles can create, edit, and publish content. Permanent deletion of primary
content records and staff-role management are admin-only.

### 3.2 Media

- `media_assets`
  - Canonical metadata for an object in Supabase Storage.
- `media_asset_translations`
  - Localized alt text and captions.
- `public-media` Storage bucket
  - Public reads for website delivery.
  - Authenticated, active staff only for object writes.
  - Initial file-size limit of 15 MiB.
  - Allows GIF, JPEG, PNG, SVG, WebP, and PDF files.

Static brand assets, icons, and decorative page artwork remain in the
repository. The bucket is for media colleagues need to manage through the admin
panel.

### 3.3 People

- `people`
  - Shared identity used for team members, article authors, or both.
  - Contains public website contact details, portrait, ordering, and flags.
- `people_translations`
  - Localized slug, job title, biographies, SEO, and publication state.

Contact fields on `people` are website-facing editorial fields, not private
staff-account data. Authentication identities remain in `profiles`.

### 3.4 Newsroom

- `articles`
- `article_translations`
- `article_authors`
- `tags` and `tag_translations`
- `article_tags`
- `article_services`
- `article_sectors`
- `article_relations`

Article bodies use TipTap-compatible JSON in `jsonb`. Sources are stored as a
JSON array. Authors are ordered and refer to the shared people records.

`articles.kind` is a controlled text key rather than an enum so future newsroom
formats can be introduced without replacing the core article model.

### 3.5 Services and sectors

- `services` and `service_translations`
- `sectors` and `sector_translations`
- `service_people`
- `sector_people`

The schema does not seed the provisional catalogue found in Figma. Publication
state and display order will be managed through the admin panel after the
catalogue is confirmed.

### 3.6 Our Outreach

- `regions` and `region_translations`
- `countries` and `country_translations`
- `country_statistics` and `country_statistic_translations`
- `country_services` and `country_service_translations`
- `country_people`
- `offices` and `office_translations`
- `country_offices`

Countries use ISO 3166-1 alpha-2 codes. Map configuration is optional JSON for
exceptional presentation data that cannot be derived from the local map
geometry.

Statistics use extensible metric rows rather than fixed population, GDP, or
other columns. This lets the content shown per country follow the final design
and available research.

### 3.7 Other editorial content

- `partners` and `partner_translations`
- `endorsements` and `endorsement_translations`
- `site_settings`
- `redirects`

`site_settings` is for small structured values such as the external POE URL or
social links. It is not a generic page builder.

## 4. Translation and publication model

Canonical rows contain identity, relationships, media, and non-language
metadata. Their translation rows contain localized display content and
publication state.

Each editorial translation can be:

- `draft`
- `scheduled`
- `published`
- `archived`

Published rows require `published_at`. Scheduled rows require `scheduled_for`.
The initial admin implementation will set both status and timestamp explicitly.
Automatic scheduled publishing will require a trusted scheduled job; merely
reaching `scheduled_for` does not change a row's status.

This model permits an English article or country page to be published while a
German or Portuguese translation remains a draft. Public queries must always
request the current locale explicitly.

Localized slugs are unique within their entity type and locale. The `redirects`
table retains changed and legacy paths.

## 5. Security model

### 5.1 Authentication

Admin access is invite-only. Public sign-up will not be implemented.

An Auth trigger creates a corresponding inactive `profiles` row. Activation and
role assignment are deliberate administrative actions. Role information is
never accepted from user-editable Auth metadata.

### 5.2 Row Level Security

RLS is enabled on every exposed application table.

| Actor | Read published | Read drafts | Create/update/publish | Delete relations | Delete primary content | Manage staff |
| --- | --- | --- | --- | --- | --- | --- |
| Anonymous | Yes | No | No | No | No | No |
| Inactive account | Same as public | No | No | No | No | No |
| Editor | Yes | Yes | Yes | Yes | No | No |
| Admin | Yes | Yes | Yes | Yes | Yes | Yes |

The private `is_staff()` and `is_admin()` database helpers are
`SECURITY DEFINER` functions with an empty search path. They centralize the
protected role lookup and avoid recursive policies on `profiles`.

Public policies require an active canonical row where applicable and at least
one published translation. Translation policies expose only rows whose
`published_at` is not in the future.

Route protection and server-side validation are still required. They provide
good errors and defend trusted server operations, while RLS remains the final
data boundary.

### 5.3 Secret key

`SUPABASE_SECRET_KEY` is server-only and is not required by the public website.
It will be used by a separate trusted Supabase client for Auth Admin operations
such as inviting colleagues.

The key bypasses RLS. It must never:

- Use a `NEXT_PUBLIC_` name.
- Be passed into Client Components.
- Be logged.
- Be committed.
- Be used as the normal public or staff-session database client.

## 6. First administrator bootstrap

The inactive-by-default rule means the first administrator must be bootstrapped
exactly once. The preferred application-assisted flow is:

1. Complete the hosted Auth configuration in section 6.2.
2. Confirm `.env.local` contains `SUPABASE_SECRET_KEY`.
3. Run the guarded bootstrap command:

```powershell
npm run auth:bootstrap-admin -- first.admin@example.com http://localhost:3000
```

The command:

- Refuses to run when an active administrator already exists.
- Sends the invitation through Supabase Auth Admin.
- Activates the corresponding profile with the `admin` role.
- Never prints the server-only key.

If the invitation is created but profile activation fails, open the Supabase
SQL editor and run the following recovery statement with the intended email:

```sql
update public.profiles
set
  role = 'admin',
  is_active = true
where email = 'first.admin@example.com';
```

Confirm exactly one row was updated and do not rerun the invitation command.

The Dashboard-only fallback is to send the first invitation from
**Authentication → Users**, then run the same SQL statement. After the protected
staff-management screen exists, activate and assign roles there instead of
using either bootstrap path.

Invitation redirect URLs and production SMTP must be configured before
colleagues are onboarded.

### 6.1 Application authentication routes

The application deliberately exposes no registration route. Its staff
authentication routes are:

- `/auth/sign-in`
- `/auth/forgot-password`
- `/auth/callback`
- `/auth/update-password`
- `/auth/access-pending`

Add the deployed and local callback URLs to the Supabase Auth redirect allow
list. Invitation and recovery emails must return to:

```text
https://<application-origin>/auth/callback?next=/auth/update-password
```

For local development, allow the equivalent URL on the selected local port.
The callback supports both PKCE authorization codes and `token_hash` email
templates. A custom invite template can link to:

```text
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/auth/update-password
```

`SiteURL` must be the application origin without a trailing slash when using
that template. Password-recovery emails receive the callback URL from the
application.

After password setup, active staff continue to `/admin`. Authenticated users
whose `profiles.is_active` value is false remain on `/auth/access-pending`.

### 6.2 Hosted pre-test checklist

Complete these settings in the hosted Supabase Dashboard before sending the
first invitation:

1. In **Authentication → URL Configuration**:
   - Set the development Site URL to `http://localhost:3000`.
   - Add
     `http://localhost:3000/auth/callback?next=/auth/update-password`
     to the redirect allow list.
2. In **Authentication → Providers → Email**:
   - Disable public email sign-ups.
   - Keep email/password sign-in enabled.
3. In **Authentication → Email Templates → Invite user**:
   - Use the `token_hash` callback link from section 6.1.
4. In **Authentication → Email Templates → Reset password**:
   - Keep `{{ .ConfirmationURL }}` as the recovery link. The application passes
     the callback URL through `redirectTo`.
5. Confirm the project's default email service can send to the intended test
   address, or configure custom SMTP.

Do not send the first invitation until all five checks are complete. The hosted
project currently has no staff profiles, so this bootstrap remains a one-time
operation.

## 7. Hosted migration workflow

### 7.1 One-time CLI setup

Authenticate the CLI without committing credentials:

```powershell
supabase login
```

Link this repository to the existing hosted project:

```powershell
supabase link --project-ref <project-ref>
```

The project reference is the subdomain in
`NEXT_PUBLIC_SUPABASE_URL`. The CLI may request the hosted database password.

### 7.2 Inspect and apply migrations

Always inspect the remote migration state first:

```powershell
supabase migration list
supabase db push --dry-run
```

Apply pending migrations:

```powershell
supabase db push
```

Never run `supabase db reset --linked`. This project deliberately develops
against the hosted branch and that command is destructive.

### 7.3 Generate TypeScript database types

After migrations are applied:

```powershell
supabase gen types typescript --linked --schema public `
  > src/types/database.generated.ts
```

Generated types must be committed and regenerated after every schema change.
Application-level types may wrap them, but the generated file should not be
edited manually.

## 8. Migration contents

### `20260729190000_core_auth_locales_media.sql`

- Creates roles, publication status, profiles, locales, and media metadata.
- Adds Auth profile creation and authorization helpers.
- Adds RLS and grants for these core tables.
- Creates and protects the public media bucket.

### `20260729191000_content_schema.sql`

- Creates the canonical and translated content entities.
- Adds keys, constraints, indexes, audit fields, and update timestamps.
- Establishes all content relationships.

### `20260729192000_content_rls.sql`

- Enables RLS on the content schema.
- Grants the minimum API table privileges required for policies to operate.
- Adds staff write policies and admin-only primary deletion.
- Adds publication-aware anonymous and authenticated read policies.

## 9. Deliberately deferred work

- Content seeds and legacy-data migration.
- Final service catalogue and ordering.
- Final country coverage and country statistics.
- Automatic scheduled-publishing job.
- Content revision history.
- Orphaned-media cleanup automation.
- Private media bucket, unless future requirements include non-public files.
- Database tests that require authenticated test users; these will run against
  the hosted development database after the first admin bootstrap.

## 10. Acceptance checks before admin implementation

- All migrations apply cleanly to the linked hosted project.
- Every exposed table has RLS enabled.
- Anonymous access cannot read drafts or archived translations.
- Inactive authenticated accounts receive public access only.
- Editors can read and mutate drafts but cannot permanently delete primary
  records or change staff roles.
- Admins can manage staff and permanently delete content.
- Only active staff can write Storage objects.
- The secret key is available only to trusted server code.
- Generated database types match the applied schema.
