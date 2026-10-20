# Supabase Content Platform

Last updated: 2026-10-20

Status: Schema and security design. All listed migrations are applied to the
hosted project except `20261020120000_retire_scheduled_status.sql` and
`20261020180000_media_storage_api_operations.sql`, which are written and
awaiting review (section 8)

Related migrations:

- `supabase/migrations/20260729190000_core_auth_locales_media.sql`
- `supabase/migrations/20260729191000_content_schema.sql`
- `supabase/migrations/20260729192000_content_rls.sql`
- `supabase/migrations/20260812110000_team_profile_model.sql`
- `supabase/migrations/20260818100000_media_library_safe_operations.sql`
- `supabase/migrations/20260903120000_article_inline_media_guard.sql`
- `supabase/migrations/20261005120000_legal_pages.sql`
- `supabase/migrations/20261008120000_legal_pages_policy_recursion_fix.sql`
- `supabase/migrations/20261020120000_retire_scheduled_status.sql` (not applied yet)
- `supabase/migrations/20261020180000_media_storage_api_operations.sql` (not applied yet)

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
- Migrations are applied by the Supabase GitHub integration when the commit
  that adds them is pushed, not with a manual `supabase db push` (section
  7.2). Review happens before the push.
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

**Alt text (admin audit X-09, slice 4).** The alt text of a file lives in
`media_asset_translations`, once per locale ("library alt text"), and is
edited only in the Media library. Record forms never write it, so saving one
record cannot change what another record shows for the same file. A use can
carry its own alt text where the schema already has a place for it:

| Use | Alt text shown | Edited in |
| --- | --- | --- |
| Partner logo (also on endorsements of that partner) | `partner_translations.alt_text` when set, else the library alt text | the partner's locale tab |
| Inline article image | the node's `attrs.alt` (required by the article contract) | the image block |
| Person and endorsement portraits, service and sector icons, article covers, country flags and outlines | the library alt text | the Media library (the editor shows it read-only, with a link) |

`resolveAlt` in `src/lib/media-alt.mjs` implements the rule. An image without
any alt text is still left out publicly, as before; a person portrait falls
back to English and then to "Portrait of …". Publishing content whose
icon, cover, flag, outline or endorsement portrait has no library alt text
in that locale is refused with a link to the Media library; a partner needs
its own alt text or the library's.

No per-use columns were added for the uses in the last row: these images
describe the same subject wherever they appear (a person, a flag, a cover
photo), public pages render catalogue icons as decorative (`alt=""`), and
seven new nullable columns in six translation tables would have doubled the
places where the same description is translated. If a use ever needs its
own text, add a nullable `*_alt_text` column to its translation table and
pass it as `useAlt`.

**Kinds.** The image picker filters by portrait, icon, cover, logo and flag.
There is no kind column: an asset's kinds are its current uses
(`src/lib/media-rules.mjs`) plus the kind chosen at upload, kept in the
Storage path `library/<kind>/YYYY/MM/<uuid>.<ext>` (older uploads:
`library/YYYY/MM/…`, `people/…`, `catalogue/…`, `newsroom/…`).

**Uploads.** Every upload goes through the server action
`uploadMediaAssetAction` (the Media library and the picker's "Upload new"):
type and size are checked in the browser with the same rules
(`mediaFileProblem`), then again on the server with the file contents. The
earlier per-editor buttons that wrote to Storage straight from the browser
are gone.

**Replace and delete (MED-01, MED-02).** Supabase refuses SQL that deletes
from `storage.objects`, so files are removed through the Storage API by the
server action, with the staff session (the bucket's staff delete policy
allows it; no secret key is needed), after the database function has
changed the row (`src/lib/media-operations.mjs`):

- *Replace:* upload the new file to a new path → `replace_media_asset`
  switches the row to it (refused: the new file is removed again) → remove
  the old file.
- *Delete:* `delete_media_asset` checks every reference, including inline
  article images, and deletes the row → remove the file.

A failure or crash between the steps leaves an orphaned file, never a row
that points to a missing file. To find orphans:

- In the Media library, **Check Storage** lists orphaned files and assets
  whose file is missing (read-only, staff session).
- `npm run media:orphans` prints the same report with the secret key;
  `npm run media:orphans -- --remove` also removes orphans older than one day
  (younger files may belong to an upload in progress).

### 3.3 People

- `people`
  - Shared identity used for team members, article authors, or both.
  - Contains public website contact details, portrait, ordering, and flags.
- `people_translations`
  - Localized slug, card name, structured profile document, SEO, and publication
    state.
- `people_profile_roles`
  - Ordered localized roles with exactly one selected card role and an optional
    shorter card label.

Team membership has a controlled group (`managing_team` or `team`) and the
existing display order is interpreted within that group. The version-one
`profile_document` has only three fixed areas: intro rich text, an optional
intro endorsement, and ordered titled sections that each contain rich text and
an optional endorsement. It is server-validated; it is not a generic page
builder. The existing biography fields remain during the additive migration so
existing published profiles can be converted safely.

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

### 3.8 Legal pages

- `legal_pages` and `legal_page_translations`

Three code-owned pages (privacy policy, terms and conditions, cookie use) whose
text staff edit and publish per locale. See section 11.

## 4. Translation and publication model

Canonical rows contain identity, relationships, media, and non-language
metadata. Their translation rows contain localized display content and
publication state.

Each editorial translation is stored as:

- `draft`
- `published`
- `archived`

Published rows require `published_at`. The model (admin audit slice 3,
`src/lib/publication.mjs`, applied by every admin translation action):

- **The publication date is kept.** `published_at` is set once, on the first
  publish, and kept by every later save, unpublish (draft), archive, restore
  and republish. Draft and archived rows may therefore hold a `published_at`;
  only `status = 'published'` makes a row public.
- **Articles have an editable date.** The article editor's "Publication date"
  is `published_at` itself: the date shown on the article and the newsroom
  order. A legacy article keeps its original date by setting it there. A date
  that has passed can be set with Published; a future date requires
  Scheduled. There is no separate display date, because a second date would
  let the shown date, the order and the moment the article goes public
  disagree.
- **Scheduling needs no job.** "Scheduled" is derived, not stored: a
  scheduled translation is `status = 'published'` with a future
  `published_at`. The RLS policies (section 5.2: `status = 'published'` and
  `published_at <= now()`) and the public readers, which filter the same way,
  hide it until that moment. The admin shows such rows as "Scheduled". Public
  caches refresh every 60 seconds, so a scheduled item appears within about a
  minute of its time (control tower §17.1). The other content types have no
  visible date field; their "Publish at" field appears only with Scheduled.
- **Time zones.** Editors enter and see times in their own time zone. The
  browser sends UTC ISO strings with an offset; naive strings are refused.
- **Archive and restore.** Canonical rows with `is_active` (people, services,
  sectors, regions, offices, partners, endorsements) archive without touching
  their translations. Articles have no `is_active`: archiving sets their
  published and scheduled translations to `archived` and keeps
  `published_at`; restoring returns each to published at its kept date
  (scheduled again when that date is ahead), or to draft when it was never
  published.

The enum value `scheduled` and the column `scheduled_for` remain, unused.
Migration `20261020120000_retire_scheduled_status.sql` converts the rows that
still had the old status. Until it is applied, the admin reads such a row as
scheduled at `scheduled_for`, and saving it writes the new form.

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
such as inviting colleagues. The command-line scripts (`npm run
media:orphans`, the bootstrap and repair scripts) read it from `.env.local`;
the admin's media actions do not need it.

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

Migrations are applied by the Supabase GitHub integration: pushing the commit
that adds a file under `supabase/migrations/` applies it to the hosted project.
Nobody runs `supabase db push` by hand, so review a migration before it is
pushed, and never push a migration file that has not been reviewed. Since
2026-10-08 (the legal pages policy fix) this is how migrations reach the
hosted project.

The CLI is still used read-only to inspect the result:

```powershell
supabase migration list
supabase db push --dry-run   # shows what is pending; applies nothing
```

`supabase migration list` must show the same timestamps locally and remotely
after a push. A migration that is pending remotely after its commit was pushed
means the integration did not run; investigate rather than pushing manually.

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

### `20260812110000_team_profile_model.sql`

- Adds the controlled team-profile model described in section 3.3: team
  groups, ordered localized roles, and the version-one `profile_document`.

### `20260818100000_media_library_safe_operations.sql`

- Adds the `replace_media_asset` and `delete_media_asset` staff-only
  `SECURITY DEFINER` functions so media metadata and Storage objects change
  together, and deletion is refused while any direct CMS reference remains.
- Their `delete from storage.objects` is now refused by Supabase, so both
  functions always failed (admin audit MED-01, MED-02);
  `20261020180000_media_storage_api_operations.sql` replaces their bodies.

### `20260903120000_article_inline_media_guard.sql`

- Replaces the `delete_media_asset(uuid)` body, keeping its signature, so
  deletion is also refused while a version-2 `articleImage` node in article
  JSON references the asset. See control tower section 13.2 for rollback
  notes.

### `20261005120000_legal_pages.sql`

- Creates `legal_pages` with exactly three fixed rows and
  `legal_page_translations`, with RLS, grants and update triggers. Additive
  only: no existing table, policy or function changes. See section 11.
- Applied to the hosted project on 2026-10-05. Its select policies on the two
  tables refer to each other, so every RLS-filtered read failed with
  `42P17` until the next migration (section 11.6).

### `20261008120000_legal_pages_policy_recursion_fix.sql`

- Drops and recreates only the two `legal_pages` select policies, so they no
  longer read `legal_page_translations` (section 11.6). No grant, trigger,
  function or translation-policy change.
- Applied to the hosted project on 2026-10-08 by the Supabase GitHub
  integration.

### `20261020120000_retire_scheduled_status.sql`

- Data and comments only (admin audit slice 3, section 4). In each of the 11
  translation tables, a row with status `scheduled` whose `scheduled_for` is
  still ahead becomes `published` with `published_at = scheduled_for`; any
  other `scheduled` row (its time passed unpublished) becomes a `draft` that
  keeps the intended time in `published_at`. A legal row also needs
  `last_updated_on` to be published. `scheduled_for` is cleared on every
  converted row. Updates the comments on `content_status`,
  `article_translations.published_at` and
  `legal_page_translations.last_updated_on`.
- Not applied yet; the Supabase GitHub integration applies it on push. On
  2026-10-20 the development database had no row left with status
  `scheduled` (the two test rows were saved in the new form during the slice
  3 checks), so it changes nothing there.

### `20261020180000_media_storage_api_operations.sql`

- Replaces the bodies of `replace_media_asset` and `delete_media_asset`
  (admin audit slice 4, section 3.2). Both keep their names, arguments,
  `jsonb` return type, `SECURITY DEFINER`, the active-staff check, the row
  lock, every reference check (delete still refuses an asset used by any
  direct CMS column or inline article image), their error codes and
  messages, and their grants (restated: `authenticated` and `service_role`
  may execute, `public` and `anon` may not).
- Neither deletes from `storage.objects` any more. `replace_media_asset`
  switches the row to the uploaded file and also returns `bucket_id` and
  `previous_object_path`; `delete_media_asset` deletes the row and also
  returns `bucket_id` and `object_path`. The server action removes those
  files through the Storage API afterwards. `delete_media_asset` no longer
  reads the storage schema, so its `search_path` drops `storage`.
- No table, policy, bucket, data or other function changes.
- Not applied yet; the Supabase GitHub integration applies it on push. Until
  then replace and delete are refused with a message that names this
  migration, and nothing changes (verified on 2026-10-20). Rollback: re-run
  the function bodies from the two earlier media migrations.

## 9. Deliberately deferred work

- Legacy-data migration beyond the dry-run-first bootstrap and representative
  visual-test seeds (control tower sections 13.4, 13.5, and 14.5).
- Final service catalogue and ordering.
- Final country coverage and country statistics.
- ~~Automatic scheduled-publishing job.~~ Not needed: scheduling is a future
  `published_at` (section 4).
- Content revision history.
- Orphaned-media cleanup automation. Orphaned files can be listed (Media
  library "Check Storage", `npm run media:orphans`) and removed by hand with
  `npm run media:orphans -- --remove` (section 3.2); unused assets stay in
  the library until someone deletes them.
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

## 11. Legal pages

Status: designed on 2026-10-05 and implemented on 2026-10-08 (control tower
section 15.11). Migrations `20261005120000_legal_pages.sql` and
`20261008120000_legal_pages_policy_recursion_fix.sql` are applied to the
hosted project; both were applied by the Supabase GitHub integration on push,
not by a manual `supabase db push` (section 7.2). The admin, public pages,
validator and seed script exist; the seed has not been applied, and no legal
text is published. This settles control tower open decision 23.2 for legal
content: the privacy policy, terms and conditions and cookie use pages are
admin-managed. Downloadable documents remain open.

### 11.1 Tables

`legal_pages` (canonical, one row per page):

| Column | Notes |
| --- | --- |
| `id` | `uuid` primary key, like every other canonical entity. |
| `stable_key` | Unique, limited by a check to `privacy-policy`, `terms-and-conditions` and `cookie-use`. Kebab-case like every other `stable_key`. |
| `is_active` | Default `true`. An operator kill switch that the API cannot write (section 11.2). |
| `created_by`, `updated_by`, `created_at`, `updated_at` | Standard audit fields; `updated_at` is maintained by `private.set_updated_at()`, and `updated_by` is stamped by `private.stamp_legal_audit()` (section 11.6). |

`legal_page_translations` (one row per page and locale, primary key
`(legal_page_id, locale)`):

| Column | Notes |
| --- | --- |
| `title` | Required, 1–160 characters after trimming. The page `h1`. |
| `content` | Legal document `jsonb` (section 11.4). Defaults to an empty version-1 document. |
| `last_updated_on` | `date`, the "Last updated" date shown to visitors. Required when `status = 'published'`. |
| `seo_title`, `seo_description` | Optional, as on other translations. |
| `status`, `scheduled_for`, `published_at` | The shared publication model (section 4) with the same checks. |
| `created_by`, `updated_by` | Per-locale audit, stamped from `auth.uid()` by a trigger (section 11.6). Other translation tables lack these (section 11.9). |
| `created_at`, `updated_at` | Standard. |

The migration inserts the three canonical rows with `on conflict do nothing`.

Columns deliberately left out:

- **No slug.** Public paths are the legacy ones, owned by code in
  `LEGAL_NAV` (`src/components/shell/navigation.ts`): `/privacy-policy`,
  `/terms-and-conditions` and `/cookie-use`, prefixed with the locale outside
  English (`/de/privacy-policy`). Printed material, the contact form notice and
  the legal texts themselves link to these paths. A localized slug would let an
  editor break those links and would need redirect handling. If open decision
  23.3 later translates static segments, that is done in code through
  `next-intl` pathnames, not in the database.
- **No display order or summary.** The footer order and labels are interface
  text in code (`Shell.footer.*` messages).
- **No media.** The legacy pages have none, so the media-deletion guard needs
  no change.

`last_updated_on` is not derived from `published_at`, because every admin
save of a published translation stamps `published_at` with the current time
(see `publicationFields` in `src/app/(admin)/admin/actions.ts`). A typo fix
would then move the legal "last updated" date. The editor sets the date
deliberately, and the admin form suggests today when publishing.

### 11.2 Fixed keys

The set of pages is owned by code. Editors cannot create or delete legal pages,
only edit their content:

- The `stable_key` check permits only the three keys. A fourth page needs a
  migration and a route.
- The migration first runs `revoke all` on both tables from `anon` and
  `authenticated`. Supabase's default privileges give those roles full
  table-level privileges on every new table in `public`, and a table-level
  `UPDATE` covers every column. Without the revoke, the column grant below
  would restrict nothing, and `legal_pages_staff_update` would let staff change
  `stable_key` and `is_active`. The revoke resets both tables to the grants
  this design intends, so the guarantees below hold under Supabase's default
  privileges.
- After the revoke, staff have no `insert` or `delete` privilege on
  `legal_pages`, and no insert or delete policy exists. Not even an admin can
  add or remove a page through the API.
- After the revoke, the only update privilege staff hold on `legal_pages` is
  the column-level `update (updated_by)`. The combination of the revoke and
  the column grant means `stable_key` cannot be swapped and `is_active` cannot
  be switched off from the admin. RLS limits which rows can be updated; it does
  not limit columns. This is the first column-level grant in the schema; it is
  used because the canonical row has no editorial fields.

### 11.3 Roles

This matches the existing model (section 5.2, and the control tower decision
that editors may publish):

| Actor | Read published | Read drafts | Edit and publish translations | Delete a translation | Create or delete a page | Toggle `is_active` |
| --- | --- | --- | --- | --- | --- | --- |
| Anonymous or inactive | Yes | No | No | No | No | No |
| Editor | Yes | Yes | Yes | No | No | No |
| Admin | Yes | Yes | Yes | Yes | No | No |
| Service role or migration | Yes | Yes | Yes | Yes | Yes | Yes |

Whether publishing legal text should be admin-only is a question for the
product owner. If so, a restrictive policy on `legal_page_translations` for
insert and update (`with check (status <> 'published' or private.is_admin())`)
enforces it without changing anything else.

### 11.4 Document contract: legal document version 1

The body reuses the catalogue contract (`src/lib/catalogue-document.ts`):
paragraphs, `h2`/`h3` headings, block quotes, bullet and ordered lists nested
at most three levels, and bold, italic and link marks. It adds the two things
the legacy pages need that the catalogue contract lacks:

1. **`hardBreak` inline node** (no attributes, no marks). The legacy pages use
   line breaks for the data-controller address and for the bold lead of each
   cookie category. TipTap's StarterKit already includes the node.
2. **Locale-neutral internal links.** The legacy pages link to `/cookie-use`
   and `/privacy-policy`, but the catalogue contract accepts only complete
   `http`/`https` URLs. A legal link may also be a root-relative path matching
   `^/(?!/)[a-z0-9/-]*$` that does not start with a locale segment. The
   renderer passes it to the `next-intl` `Link`, so `/cookie-use` becomes
   `/de/cookie-use` in German. External links keep the catalogue rules.

The root carries `attrs.schemaVersion: 1`, following the article contract
and control tower section 13.1. The catalogue contract has no version.

Not included, because the legacy texts do not use them: tables, images,
`mailto:` links (the legacy email addresses are plain text), and any HTML,
class or style attribute. If the product owner wants cookie tables later, a
`legalTable` node can be added as version 2.

Implementation: a shared validator in `src/lib/legal-document.mjs` with a
`.d.mts` declaration (the `contact-rules.mjs` pattern), so the Server Action
and the seed script use the same rules. Where practical, it reuses the
catalogue inline and block rules through an options parameter rather than a
third copy.

### 11.5 Missing translations

Every locale's footer and the contact form link to the three pages, but
publication rules forbid an English content fallback. Recommendation:

- **Links stay locale-prefixed and static.** The footer keeps linking to
  `/{locale}/privacy-policy`. It needs no database read, and its targets do not
  change with publication state.
- **Exact-locale read.** The route reads only the published translation for
  the requested locale.
- **When it is missing but English is published**, the route renders a short
  localized notice instead of legal text. The notice uses interface messages
  (a new `Legal` namespace), not CMS content. It shows the localized page name
  as `h1` (reusing the `Shell.footer.*` label), a sentence such as "This page
  is not available in German yet. Read it in English.", and a link to the
  English path with `hrefLang="en"` and `lang="en"` on the English link text.
  The response is a normal 200 with `robots: noindex` and a canonical URL
  pointing to the English page. Its hreflang alternates list only the locales
  with a published translation, plus `x-default` for English.
- **When English is also missing**, the route returns `notFound()` in every
  locale. Publishing all three English pages is therefore a launch blocker.

Rejected alternatives:

- Rendering the English body under `/de/...`: this is a content fallback.
- A redirect to the English page: it silently changes the visitor's locale
  and hides why.
- A 404 for the missing locale: the footer would link to an error page and the
  legal information would be unreachable.
- Footer links that switch to the English URL per locale: every page would need
  a publication read, and link targets would change with editorial state. This
  can be added later as a refinement; the notice is still needed for direct
  visits and old links.

### 11.6 Row Level Security and grants

| Table | Role | Grant | Policy |
| --- | --- | --- | --- |
| `legal_pages` | `anon` | select | `legal_pages_public_select`: the page is active. |
| `legal_pages` | `authenticated` | select, update (`updated_by` only) | `legal_pages_authenticated_select`: the page is active, or the user is active staff. `legal_pages_staff_update`: active staff. |
| `legal_page_translations` | `anon` | select | `legal_page_translations_public_select`: published, `published_at` has passed, and the parent page is active. |
| `legal_page_translations` | `authenticated` | select, insert, update, delete | `..._authenticated_select`: the public condition, or active staff. `..._staff_insert` and `..._staff_update`: active staff. `..._admin_delete`: active admins. |
| both | `service_role` | all | Bypasses RLS (seed script only). |

The grant column is the complete set of privileges. The migration revokes
everything from `anon` and `authenticated` before granting (section 11.2), so
Supabase's default table privileges add nothing.

In plain words:

- Anyone can see that each of the three pages exists while it is active.
  That reveals nothing new: the keys are fixed by code and every footer links
  to all three paths.
- Visitors can read a translation only when it is published, its publication
  time has passed and its page is active. Signed-in users who are not active
  staff get the same view.
- Active staff (admins and editors) can read every page and translation,
  including inactive pages, drafts, scheduled, archived and future-dated
  text, and can create, edit and publish translations. Only active admins can
  delete one. Nobody can add, delete or re-key a page or switch it off
  through the API.

Unlike the other translation tables, the public translation policy also
requires the parent row to be active. This keeps `is_active` effective even
for a direct API query.

**Lesson: two tables' policies must not read each other.** The first
migration also required a published translation in the `legal_pages`
policies. PostgreSQL applies a table's policies to every subquery that reads
that table, and expands them when the query is planned, not row by row. The
`legal_pages` policy read the translations, whose policy read `legal_pages`
again, so every RLS-filtered query on either table failed with `42P17`
("infinite recursion detected in policy"); an `or private.is_staff()` branch
does not help, because the expansion happens before any condition is
evaluated. Migration `20261008120000_legal_pages_policy_recursion_fix.sql`
removed the translation check from the `legal_pages` policies. Every other
canonical and translation pair already has the cross-table check on one side
only: on the canonical side for services, sectors, people and tags (active
and has a published translation; their translation policies do not check the
parent), and now on the translation side for the legal tables. When a policy
needs a condition on a related table, check that the related table's policies
do not refer back. A `SECURITY DEFINER` helper is not the fix here: `anon`
has no `USAGE` on the `private` schema, and granting it would expose every
private function.

Attribution cannot be spoofed. A `BEFORE INSERT OR UPDATE` trigger runs
`private.stamp_legal_audit()` on both tables. The function has a pinned empty
`search_path`, is not `SECURITY DEFINER`, and has `EXECUTE` revoked from
`public` and `anon`. PostgreSQL checks that privilege when a trigger is
created, not when it fires.

- When `auth.uid()` is set (any signed-in request), the trigger ignores
  client-supplied values. It sets `updated_by` to the acting user. On
  `legal_page_translations` it also sets `created_by` on insert, and keeps the
  stored `created_by` on update.
- When `auth.uid()` is null (the service role, the seed script, migrations),
  the supplied values are kept, so the seed can leave them null or set them.

The admin therefore sends neither field.

### 11.7 Seeding the legacy English text

The seed is a script that a person runs later. It follows the
`scripts/bootstrap-*.mjs` pattern:

- Files: `scripts/bootstrap-legal.mjs`, `scripts/lib/legal-bootstrap.mjs`,
  `scripts/data/legal-pages.json`, `scripts/legal-bootstrap.test.mjs`, and
  `npm run legal:bootstrap -- [--dry-run | --apply]`, using `.env.local` and
  `SUPABASE_SECRET_KEY`.
- The JSON holds the three English documents transcribed from
  `old-consulting/src/app/{privacy-policy,terms-and-conditions,cookie-use}/page.jsx`
  as version-1 legal documents. It is checked in, so the transcription can be
  reviewed as a diff. The wording is unchanged. Only the structure is mapped:
  a bold numbered lead (`<strong>1. Data Controller</strong><br/>`) and the
  terms `h2` become `h2` headings; address lines become `hardBreak`s; a cookie
  category becomes a list item with a bold lead, a `hardBreak` and its text;
  `<Link href>` becomes an internal link; external `<a>` becomes an `https`
  link; and HTML entities become plain characters. Titles: "Privacy Policy",
  "Terms and Conditions", "Cookie Use".
- Dry run is the default. It validates every document with the shared
  validator and reads the hosted `legal_pages`. It refuses if the three keys
  are not all present, which means the migration has not been applied. For
  each page it reports create (no English translation yet) or skip (one
  exists, with a note when its content differs from the seed).
- `--apply` only inserts the missing English translations, as `draft` with
  `last_updated_on` null. It never updates or overwrites an existing
  translation, never publishes, and never touches other locales. Rerunning it
  creates nothing.
- Publication is a human step in the admin after legal review. The editor
  sets the "last updated" date then.

**Content change for the product owner, not seeded.** The cookie policy must
list the strictly necessary `tp_contact_form` cookie (control tower 15.10 and
section 19). The seed keeps the legacy text verbatim, so this addition is a
separate, visible edit to approve. Proposed wording for the "Strictly Necessary
Cookies" item:

> `tp_contact_form`: set by Time&Place Consulting when you open the Contact
> page. It contains only a signed timestamp, used to protect the contact form
> against automated spam. It holds no personal data, cannot be read by
> scripts on the page, and expires after 24 hours.

Other legacy content points the product owner should review are listed in
control tower section 10.6.

### 11.8 Caching

- New tag `public-legal` (`PUBLIC_LEGAL_CACHE_TAG` in `src/lib/cache-tags.ts`),
  used by the public legal reader and by legal sitemap entries. Hourly
  `cacheLife`, like the other public readers, so a future `published_at`
  appears within the hour. *Slice 3:* the lifetime is now 60 seconds for
  every public reader (`PUBLIC_CACHE_REVALIDATE_SECONDS`), so a scheduled
  translation appears within about a minute.
- Invalidated with `updateTag(PUBLIC_LEGAL_CACHE_TAG)` (until slice 3,
  `revalidateTag(PUBLIC_LEGAL_CACHE_TAG, 'max')`, which served the old page
  once) by each
  admin action that changes legal content: saving a translation with any
  status (draft, publish, unpublish, archive), deleting a translation (admin),
  and updating the canonical row. The admin paths are refreshed with
  `revalidatePath` as elsewhere.
- No other tag is affected: footer links are static code, and legal pages
  reference no other entity. The seed script runs outside Next.js; it only
  creates drafts, which are not public, so no invalidation is needed.

### 11.9 Inconsistencies noted while designing

These are not changed by this slice:

- Public policies on the existing translation tables do not check that the
  parent is active, so an archived service's published translation can be read
  directly through the API. The public readers filter, so pages are correct.
- Translation tables have no `created_by` or `updated_by`, and translation
  saves do not touch the canonical `updated_by`, so per-locale edits are not
  attributed. Elsewhere, the application sets `created_by` and `updated_by` on
  canonical rows, so a client can send any profile id. Legal tables add the
  columns to translations and stamp both tables from `auth.uid()` with a
  trigger (section 11.6). The existing tables could adopt the same trigger
  later.
- Existing migrations grant table-level `insert, update, delete` to
  `authenticated` and rely on RLS, which already matches Supabase's default
  privileges. Only the legal tables need the explicit revoke, because only
  they use a column-level grant.
- ~~Every save of a published translation re-stamps `published_at`, so it
  means "last saved while published" rather than "first published".~~ Fixed in
  slice 3: `published_at` is kept (section 4).
- The catalogue document has no schema version, although control tower 13.1
  asks for one. The catalogue and article validators duplicate their inline
  and link rules.

### 11.10 Follow-up implementation checklist

Once the migration has been reviewed and applied:

1. **Types.** Push the reviewed migration (the GitHub integration applies it,
   section 7.2), confirm it with `supabase migration list`, then regenerate `src/types/database.generated.ts` (section 7.3) and
   commit it.
2. **Document contract.** Add `src/lib/legal-document.mjs` and `.d.mts`
   (version 1, section 11.4), with unit tests: hard breaks, internal and
   external links, locale-prefixed or protocol-relative paths rejected,
   `javascript:` and `mailto:` rejected, tables and images rejected, depth and
   size limits.
3. **Admin UI.** Add `/admin/legal`, listing exactly the three pages with
   per-locale status, and a per-page editor with locale tabs. The editor has
   title, `last_updated_on` (required to publish; today is suggested), SEO
   fields, status and schedule, and a TipTap editor built from
   `CatalogueRichTextEditor` plus hard break (Shift+Enter) and a link dialog
   that accepts internal paths. The Server Actions call `requireActiveStaff`,
   validate with the shared validator, and invalidate the tag. They do not send
   `created_by` or `updated_by`; the audit trigger stamps them. To record a
   touch on the canonical row, update `updated_by` with any value, since the
   trigger replaces it. There is no create, delete or archive-page control; an
   admin-only "delete translation" is optional. Add a navigation entry and a
   preview.
4. **Public pages.** Add
   `src/app/[locale]/{privacy-policy,terms-and-conditions,cookie-use}/page.tsx`,
   which can share one component keyed by `stable_key`. Add a cached reader
   `getPublishedLegalPage(key, locale)` in `src/lib/public-legal.ts`, a
   renderer that maps internal links to `next-intl` `Link` and external links
   to safe anchors, and a visible "Last updated" date formatted per locale.
   Metadata: title and description from the SEO fields or the title, a
   canonical URL, and hreflang only for published locales. Add the
   missing-translation notice (section 11.5) and template skeletons on the
   loading foundation. Use the Figma design if a legal template exists,
   otherwise the legacy layout on the design tokens.
5. **Seed script.** Add the files in section 11.7, with tests for document
   validity, idempotent planning, never overwriting, and transcription fidelity
   (section headings and key sentences match the legacy JSX).
6. **Footer and links.** Remove the "pages are not built yet" comment in
   `navigation.ts`. Links stay static. Check that the footer, the contact
   form notice and the in-text links reach the right locale path. Add the
   legal pages to the sitemap for published locales.
7. **Messages.** Add a `Legal` namespace (notice text, "Last updated" label,
   English link text) in all five locales; provisional outside English.
8. **Tests and checks.** Run lint, typecheck, `npm test` and build. Against the
   hosted database, verify that anonymous users cannot read drafts, archived or
   future-dated legal translations, or any translation of an inactive page;
   that editors cannot insert or delete `legal_pages` or change `stable_key`
   or `is_active` (expect a permission error, not zero rows); that editors
   cannot delete translations but admins can; that a client-supplied
   `created_by` or `updated_by` is replaced by the acting user and an update
   cannot change `created_by`; and that the service role keeps the values it
   supplies.
   Check pages at 375, 768, 1024 and 1440 px: one `h1`, heading order, focus,
   and the notice in a locale with no translation.
9. **Content.** Run the seed, have the product owner approve the
   `tp_contact_form` addition and the other flagged points, publish English,
   then translate.
