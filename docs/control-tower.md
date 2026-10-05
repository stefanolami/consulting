# Consulting Website Rework — Control Tower

Last updated: 2026-10-05

Status: High-level plan and architectural source of truth

Rebuild branch: `v2`

Current production branch: `main`

## 1. Purpose of this document

This document is the high-level source of truth for the complete Time&Place
Consulting website rework.

It records:

- The goals and scope of the rebuild.
- The agreed technical and repository strategy.
- The target content and data architecture.
- The planned admin, newsroom, internationalization, and Our Outreach features.
- The order in which the work should be implemented.
- The decisions that are confirmed and the questions that remain open.

Detailed database definitions, component specifications, implementation notes,
and acceptance criteria should be kept in separate documents as the relevant
work begins. When a high-level decision changes, this document must be updated.

The initial database, publication, RLS, and Storage design is recorded in
[`docs/supabase-content-platform.md`](./supabase-content-platform.md).

## 2. Project goals

The website will be rebuilt as a new application rather than incrementally
refactoring the legacy implementation.

The primary goals are:

- Reproduce the existing Consulting website's required content and behavior
  using the new Figma design.
- Establish a maintainable TypeScript and Next.js architecture.
- Add internationalization from the beginning.
- Move frequently changing content out of JavaScript files and into Supabase.
- Provide an internal admin panel so colleagues can maintain content without
  developer involvement.
- Build a full newsroom/articles area with rich content, authors, tags,
  filtering, publishing controls, and SEO.
- Rebuild the legacy map as the polished, accessible Our Outreach feature backed
  by database content.
- Preserve or intentionally redirect existing public URLs.
- Deliver a fast, accessible, secure, and search-friendly production website.

## 3. Guiding principles

### 3.1 Rebuild, do not reproduce legacy structure

The legacy applications are behavior and content references. Their component
hierarchies, local data formats, unsafe HTML rendering, and old dependencies are
not architecture to preserve.

The legacy presentation layer is a different matter. The Figma proposal keeps
the legacy site's visual language, so legacy markup, styling, and static assets
may be used as a starting point for new presentation components (see section
15.2). Its data access, hard-coded content, and inaccessible interaction
patterns are still not carried over.

### 3.2 Use the CMS for editorial content, not page construction

The admin panel should manage content that colleagues genuinely need to change.
It should not become a generic visual page builder.

Page composition, layout, interaction, and design-system behavior stay in code.
Editorial entities and their translations live in Supabase.

### 3.3 Server-first public website

Public pages should use Next.js Server Components and server-side Supabase
queries by default. Client Components should be limited to genuinely
interactive areas such as the map, filters that require immediate interaction,
forms, and the rich-text editor.

### 3.4 Stable identifiers over display text

Database relationships must use stable UUIDs or standard identifiers. Examples:

- Countries use ISO 3166 codes, not camel-cased country names.
- Content relationships use record IDs, not titles or slugs.
- Slugs are public routing attributes and may change without changing identity.

### 3.5 Security at the database boundary

Admin UI checks improve user experience, but authorization must be enforced by
Supabase Row Level Security and server-side validation.

## 4. Repository and branch strategy

### 4.1 One repository

The rebuild stays in the existing GitHub repository.

A new repository is not needed because:

- The existing repository contains the production history.
- `v2` already contains the correct rebuild foundation.
- Keeping both generations together simplifies content comparison, URL
  migration, deployment handover, and rollback.

### 4.2 Branch responsibilities

- `main` remains the deployable legacy website until the rebuild is ready.
- Development happens directly on `v2`, with coherent commits for completed
  work batches.
- Feature branches are optional and should be used only when a change genuinely
  benefits from isolation; they are not part of the default workflow.
- Urgent production content changes may continue on `main`.
- Recent content changes from `main` must be included in the final migration;
  the content currently present on `v2` is not authoritative.
- At launch, the completed rebuild will replace or merge into `main`.

### 4.3 Local reference applications

The workspace contains two ignored legacy directories:

- `old-consulting`: legacy Consulting implementation and content reference.
- `old-funding`: legacy Funding implementation and Our Outreach map reference.

These directories are references only and are not part of the new production
application. Required assets or data must be deliberately migrated into the
rebuild rather than imported from the ignored applications at runtime.

## 5. Current rebuild foundation

The `v2` branch already provides:

- Next.js App Router.
- React and strict TypeScript.
- Tailwind CSS v4.
- shadcn/ui and Radix primitives.
- `next-intl` routing and message scaffolding.
- Supabase browser and server clients.
- Supabase SSR cookie/session refresh through the Next.js proxy.

Before feature implementation, this foundation needs to be reviewed and
stabilized:

- Update to current compatible patched versions.
- Replace `"latest"` dependency ranges with intentional pinned versions.
- Confirm strict TypeScript settings and remove transitional JavaScript
  allowances when legacy data migration no longer requires them.
- Add scripts for linting, type checking, tests, and production builds.
- Add continuous integration for those checks.
- Replace starter metadata and README content.
- Establish the final folder and route-group conventions.

## 6. Target application architecture

The public site and admin panel will be part of one Next.js application.

```text
Next.js application
├── Public localized website
│   ├── Marketing and legal pages
│   ├── Team pages
│   ├── Newsroom/articles
│   └── Our Outreach
├── Protected admin panel
├── Server Actions and Route Handlers
└── Supabase
    ├── Auth
    ├── Postgres
    └── Storage
```

Suggested route separation:

```text
src/app/[locale]/(site)/...
src/app/(admin)/admin/...
```

The admin area does not need localized URLs. The content edited inside it can
have multiple locale variants.

## 7. Supabase development and release workflow

### 7.1 Confirmed remote-only workflow

The project will not run a local Supabase database or local Docker Supabase
stack.

During the rebuild:

- Development connects directly to the hosted Supabase `main` branch.
- The hosted `main` branch acts as the pre-production development database.
- The current live website is unaffected because it does not depend on the new
  Supabase content platform.
- Real launch content may be entered and reviewed there throughout development.
- Database migrations are still stored in Git for history, review,
  reproducibility, and future branching.
- Migrations are applied to the hosted Supabase branch.
- Destructive schema changes should be avoided; prefer additive, reversible
  migrations and take backups before material changes.

No automatic GitHub-to-Supabase branching needs to be enabled during the
initial build.

### 7.2 Production handover

When the website is complete:

1. Freeze structural database changes.
2. Back up the database and exported Storage assets.
3. Run final content, permission, migration, and media checks.
4. Deploy the new application with the existing hosted Supabase `main`
   credentials.
5. Treat that Supabase branch as production from that point onward.
6. Create a persistent Supabase development branch for post-launch work.
7. Connect persistent Supabase and Git development branches when the ongoing
   development workflow requires it.

Supabase Git integration should be configured only when the Git production and
development branch mapping is unambiguous.

### 7.3 Schema management

The repository should contain:

- `supabase/config.toml`
- `supabase/migrations/*`
- Generated TypeScript database types
- Documented migration and type-generation commands

A local database is not required to keep the schema in version control.
Dashboard changes, if any, must be captured back into migrations so the
database does not become an undocumented source of schema drift.

## 8. Content ownership

### 8.1 Content that belongs in Supabase

The initial CMS scope includes:

- People and team profiles.
- Authors.
- Newsroom/articles.
- Tags, sectors, and other article taxonomy.
- Countries and regions used by Our Outreach.
- Services available in each country.
- Country summaries and detailed country-page content.
- Partners and client logos.
- Endorsements.
- Offices and contact locations.
- Service and sector catalogue content.
- Media uploaded for those entities.

Legal content and downloadable documents may also move into Supabase if
colleagues need to maintain them. That scope should be confirmed before the
schema is finalized.

### 8.2 Content that normally stays in code

- Page structure and layout.
- Navigation and component behavior.
- Design tokens.
- Fixed interface text and validation messages.
- Technical SEO behavior.
- Highly structured marketing sections that do not require regular editorial
  changes.

Legal-page content can stay in localized files or move into Supabase depending
on who is expected to maintain it.

## 9. Internationalization

### 9.1 Library

Use `next-intl`.

It is already scaffolded on `v2` and is a strong fit for:

- Next.js App Router and Server Components.
- Locale-aware routing and navigation.
- ICU message formatting.
- Static and dynamic rendering.
- Metadata and SEO.
- Localized static paths and CMS-driven slugs.
- Type-safe message keys.

### 9.2 Split between interface and CMS translations

- Fixed UI messages live in `messages/{locale}.json`.
- Dynamic editorial content lives in per-entity Supabase translation tables.
- Shared identity and non-language metadata live on the canonical entity row.

The confirmed initial locale set is:

- English (`en`) as default.
- German (`de`).
- Italian (`it`).
- Brazilian Portuguese (`pt-BR`).
- European Portuguese (`pt-PT`).

The locale model must remain extensible because additional languages are
expected in the future.

### 9.3 URL strategy

Recommended default:

- English remains unprefixed to preserve existing paths.
- Other languages use a locale prefix.
- Example: `/services` and `/de/services`.
- Dynamic article and country slugs may be localized.
- Canonical, alternate, and `hreflang` metadata must be generated.
- Old and changed slugs must resolve through permanent redirects.

An unpublished translation should not silently present the default-language
content as if it were translated. Locale availability and fallback behavior
must be explicit.

## 10. Target data model

The following is a conceptual model. Exact columns, constraints, enums, and RLS
policies will be defined in a dedicated schema document and migrations.

### 10.1 Admin users and authorization

- `app_users`
  - References `auth.users`.
  - Stores application role and account status.
- Roles:
  - `admin`
  - `editor`
  - A separate `publisher` role can be introduced later if approval workflow
    requires it.

Authorization data must not rely on user-editable metadata.

### 10.2 People and team

- `people`
  - Canonical identity, name, image reference, and shared contact information.
- `team_profiles`
  - Team visibility, group, ordering, status, and profile-specific metadata.
- `team_profile_translations`
  - Locale, role/title, introduction, biography content, and SEO fields.

A person may be:

- A team member.
- An article author.
- Both.
- An external contributor without a public team profile.

This avoids forcing article authors and team members into separate,
duplicated identity systems.

### 10.3 Articles

- `articles`
  - Canonical record, lifecycle status, cover media, publication timestamps,
    feature flags, and audit metadata.
- `article_translations`
  - Locale, title, slug, excerpt, rich-text body, and SEO metadata.
- `article_authors`
  - Ordered many-to-many relationship between articles and people.
- `tags` and `tag_translations`
- `article_tags`
- `sectors` and `sector_translations`
- `article_sectors`

Expected lifecycle:

- Draft.
- Scheduled.
- Published.
- Archived.

Publishing may be controlled per translation so incomplete translations do not
block the default-language article.

### 10.4 Our Outreach

- `regions`
- `region_translations`
- `countries`
  - Stable ISO code, region relationship, coverage status, and any map
    configuration that cannot be derived from geometry.
- `country_translations`
  - Localized name, slug, summary, detailed content, and SEO fields.
- `services`
- `service_translations`
- `country_services`
  - Availability and country-specific service copy.
- Optional office/contact-location tables if required by the design.

### 10.5 Cross-cutting content records

Consider:

- `slug_history` for permanent redirects.
- `content_revisions` for recoverable editorial history.
- `created_by` and `updated_by` on editable entities.
- Consistent `created_at`, `updated_at`, and publication timestamps.
- A controlled media metadata table if Storage paths alone are insufficient.

## 11. Supabase Auth, RLS, and Storage

### 11.1 Authentication

Recommended starting point:

- Invite-only admin accounts.
- No public registration.
- Email/password or passwordless email authentication.
- Production SMTP configured before colleagues are onboarded.
- Password reset and invitation callback routes implemented and tested.

### 11.2 Authorization

RLS is required on all exposed tables.

High-level policies:

- Anonymous visitors can read only active, published, locale-appropriate
  content.
- Editors can create and update permitted editorial content.
- Admins can manage all editorial content and user roles.
- Drafts and archived records are never exposed through public policies.
- UI route protection and Server Action checks complement but do not replace
  RLS.

The Supabase secret key must never be exposed to the browser. It should be used
only in trusted server contexts for operations such as inviting admin users
when necessary.

### 11.3 Media

Use Supabase Storage for:

- Team photos.
- Article covers.
- Article inline media.
- Country and service media.
- Other CMS-managed public assets.

Expected approach:

- Public read access for published website media.
- Authenticated and role-checked upload, replace, and delete operations.
- File type and size restrictions.
- Unique generated object paths rather than trusting original filenames.
- Required alt text where media is editorial.
- Clear handling of unused/orphaned uploads.
- Backup/export procedure for Storage assets before launch and material
  migrations.

## 12. Admin panel

The admin panel is an internal editorial application inside the main Next.js
codebase.

### 12.1 Core capabilities

- Sign in, sign out, invitation acceptance, and password recovery.
- Protected admin layout and navigation.
- Dashboard showing drafts, recently updated content, and translation status.
- Form validation and actionable errors.
- Unsaved-change protection.
- Audit information.
- Preview before publication.
- Publish, unpublish, archive, and restore flows as appropriate.

### 12.2 Team management

- Create, edit, archive, and restore people/team profiles.
- Manage managing-team/team grouping.
- Reorder team members.
- Upload and replace profile images.
- Edit localized role, introduction, biography, contact, and SEO information.
- Preview list cards and profile pages.

### 12.3 Article management

- Create and edit drafts.
- Manage translations.
- Generate and edit slugs.
- Select ordered authors.
- Manage tags and sectors.
- Upload cover and inline images.
- Set publication date and status.
- Preview the public rendering.
- Publish, schedule, unpublish, and archive.
- Show validation for missing required metadata, images, alt text, or content.

### 12.4 Our Outreach management

- Enable or disable country coverage.
- Edit country translations and detail-page content.
- Assign services to countries.
- Manage country-specific service summaries.
- Preview how a country appears in the map panel and full page.

## 13. Newsroom and rich-text content

### 13.1 Editor choice

Use TipTap and store its document JSON in Postgres `jsonb`.

Do not store arbitrary editor-generated HTML as the source of truth.

Each rich-text document should include or be associated with a schema version
so future editor changes can be migrated deliberately.

### 13.2 Controlled content schema

The initial article schema should support:

- Paragraphs.
- Headings.
- Bold, italic, and links.
- Ordered and unordered lists.
- Block quotes.
- References/sources if required.
- Controlled image blocks.
- Additional designed callouts only when they have a clear public component.

Custom image blocks should include:

- Storage path or canonical media reference.
- Alt text.
- Optional caption.
- Layout preset:
  - `content`
  - `wide`
  - `fullBleed`

The public renderer maps those presets to design-system components. Editors do
not control arbitrary CSS, dimensions, classes, or HTML.

The implemented article document contract is version 2. A document root carries
`attrs.schemaVersion: 2`; legacy version-1 documents without root attributes are
accepted only so they can be normalized safely. An image is a top-level
`articleImage` node with a managed-media UUID, required localized alt text, an
optional localized caption, and one of the three layout presets above. The
strict validator rejects unknown attributes, nested image nodes, direct image
URLs, HTML, CSS, classes, and dimensions. Links remain limited to complete
`http` and `https` URLs.

The admin editor selects image assets from the managed media library. Server
validation verifies that every referenced UUID exists, has an image MIME type,
and is public before a translation can be published or scheduled. The public
renderer resolves only public managed assets and never trusts a URL from the
document. Media-reference reporting now scans article documents as well as
direct foreign keys.

Migration `20260903120000_article_inline_media_guard.sql` replaces the existing
`delete_media_asset(uuid)` function body without changing its signature. It
adds an article-JSON reference check before deletion; no table, column, stored
content, or generated TypeScript type changes. Rolling it back means restoring
the previous function body, which is data-preserving but intentionally removes
the new deletion safeguard. A rollback should therefore be accompanied by a
manual article-reference audit.

### 13.3 Public newsroom

The public experience should support:

- Article listing.
- Featured content if present in the design.
- Filtering by tags, sectors, authors, and potentially date.
- Search if required.
- URL-based filter state.
- Pagination.
- Localized article pages.
- Author pages or filters if required.
- Related articles based on explicit taxonomy.
- Structured metadata and social sharing images.

### 13.4 Legacy newsroom initialization

The two active articles in the checked-in `src/data/news.js` reference are now
covered by a version-controlled, dry-run-first import workflow:

```powershell
npm run newsroom:bootstrap
```

The command validates the legacy articles, three canonical author identities,
two tags, two local cover files, two original-position body images, and their accessibility metadata, hosted
database records, and the `public-media` Storage folder. Dry-run is the default;
`--apply` performs only the reported creates. Existing records are never
overwritten, and any difference in canonical identity, publication content,
cover metadata, author order, or tag relationship blocks apply.

The English baseline preserves the legacy titles, slugs, excerpts, publication
dates, controlled paragraph/heading/list content, source URLs, byline order,
and taxonomy. It publishes only the two articles and the minimum English author
name, tag, and cover-alt translations required by the public contract. It does
not invent services, sectors, related articles, SEO fields, biographies, or
other locales. The legacy body images `latam-content.jpg` and
`space-content.jpg` are uploaded as managed media and inserted immediately
after their original legacy sections using localized alt text and the controlled
`wide` preset.

On 2026-09-03 the hosted dry run proposed 26 creates with no conflicts. Apply
created 2 Storage objects, 2 media records and translations, 3 author records
and translations, 2 tags and translations, 2 articles and translations, 4
author relationships, and 2 tag relationships. The immediate verification run
proposed 0 creates, skipped all 26 records, and found 0 conflicts. Anonymous
public rendering then returned both English listing cards, both detail routes,
their managed covers, the `space` tag filter, and the `mathias-gerstner` author
filter.

On 2026-09-03 the version-2 dry run proposed 6 additive media operations and 2
safe article-translation upgrades with no conflicts. Apply uploaded the two body
images, created their managed records and English alt metadata, and upgraded
only the two exact deterministic version-1 article bodies. The immediate rerun
proposed 0 creates and 0 updates, skipped all 32 checks, and found 0 conflicts.

### 13.5 Representative visual-test content

The remaining CMS-backed public templates have a separate deterministic seed:

```powershell
npm run visual-test:bootstrap
```

Its checked-in version-two scope deliberately remains a representative visual
test rather than a broad migration. It selects five active profiles from the
tracked legacy team source—Glenn Cezanne and Corina Cătălina Gheorgheza in the
managing team, plus Omar Cutajar, Guilherme Crispim Ferreira, and Mathias
Gerstner in the team—and preserves their English introductions, sections,
endorsements, roles, contact emails, portraits, groups, and order. The three
author identities created by the Newsroom bootstrap are promoted to team
profiles only while they still match that exact author-only baseline.

The seed also publishes six representative legacy services and six sectors in
English, uploads the five locally available matching sector icons, and leaves
Space in the intentional icon-placeholder state. Source-supported contact
relationships exercise the catalogue sidebars: Glenn for Association
Management and Government Relations, Omar for Space, and Mathias for
International Trade. The two published articles are related to Space and
International Trade respectively so catalogue-to-Newsroom rendering can be
reviewed. No other relationships or editorial copy are inferred.

On 2026-09-03 the hosted dry run proposed 73 creates and 6 safe author-profile
updates with no conflicts. Apply completed those operations. The immediate
verification run proposed 0 creates and 0 updates, skipped all 75 planned
entities/relationships, and found 0 conflicts. Anonymous rendering verified
the three listing routes, representative profile/catalogue detail content,
managed media, contact panels, related Newsroom cards, and all 17 seeded detail
routes with no HTTP failures.

Version 2 adds one complete English golden-country proof for Brazil, selected
because the legacy sources contain three named office locations, a shared local
email address, an explicitly Brazil-focused senior profile, and related
international-market experience. It fills the country summary, coverage
summary, controlled rich content, SEO, four ordered service assignments and
localized service bodies, one office-count statistic, three offices, Glenn
Cezanne as expert, and managed flag and outline media. The flag is a public-domain
Wikimedia asset; the outline is deterministically generated from the checked-in
Natural Earth topology. The legacy sources do not provide street addresses,
office phones, coordinates, an office-data publication year or public source
URL, a coverage tier, or Brazil-specific alternative-language copy, so those
fields remain null or absent.

The same repeat-safe workflow adds a deliberately small global-content proof:
the legacy EFFA partner/logo and website, Alexander Mohr's linked endorsement,
and the legacy public contact/footer and social-link settings. No POE external
URL or reusable CTA is seeded because the legacy implementation supplies no
approved external POE URL or reusable CTA contract. The home test harness rendered
the exact-locale published partner and endorsement plus public settings through
anonymous RLS (replaced on 2026-10-05 by the designed homepage, whose partner
band, the Why Us endorsements and the footer now render the same data;
section 15.9). Partner, settings, and shared-media actions invalidate the new
hourly global-content cache.

Version 3 (2026-09-28) makes every seeded service and sector a full detail
page, at the product owner's request, so the Figma templates can be reviewed
with complete content. It deliberately departs from the source-only rule
above:

- Every service and sector gets the same lorem-ipsum body
  (`placeholderCatalogueContent`: paragraphs, a level-3 heading and a bullet
  list). The legacy sources have no body copy; replace it before launch.
- Contacts beyond the four source-backed ones rotate the five visual-test
  profiles, so four pages show two contacts. These assignments are invented for
  testing, not editorial fact.
- Both published articles are related to every service and sector, so every
  page shows two article cards, and the newsroom's service and sector filters
  return both articles for every value.
- Icons are unchanged: services and Space still show placeholders.

The version-2 empty bodies are promoted only while the row still matches that
exact baseline (checked again at write time through `updated_at`). Any edited
body is a conflict that blocks apply. The hosted dry run proposed 34 creates
(12 contacts, 12 article–service and 10 article–sector links) and 12 body
promotions with no conflicts. Apply completed them; the rerun proposed 0
creates and 0 updates and found 0 conflicts. The seed writes directly to the
database, so public pages may show the previous data for up to an hour (the
hourly cache) unless an admin save invalidates it first.

Version 4 (2026-09-28) adds 16 placeholder newsroom articles, at the product
owner's request, so the newsroom grid, filters, pagination and detail template
can be reviewed with more than the two legacy articles
(`scripts/lib/placeholder-articles-bootstrap.mjs`, data under
`placeholderArticles` in `scripts/data/visual-test-bootstrap.json`):

- English only, lorem-ipsum titles, excerpts and one shared version-2 body;
  every stable key and slug starts with `placeholder-`. Remove them before
  launch.
- They cover every labelled kind (newsletter, announcement, event, video,
  vodcast, podcast, book, media, article), publication dates from 2024 to
  August 2026, and four with no cover. `placeholder-01-newsletter` is the one
  featured article, so the lead card shows.
- Covers reuse the four managed legacy newsroom images; nothing is uploaded.
  Authors rotate the three article authors; tags, services, sectors and three
  explicit related-article pairs are invented for testing, not editorial fact.
- Create-only: a missing reference or an existing placeholder that differs is
  a conflict that blocks apply. The hosted dry run proposed 96 creates with no
  conflicts and no change to the earlier baselines; apply completed them and
  the rerun proposed 0 creates and found 0 conflicts. The listing then showed
  18 articles over two pages.

The hosted version-2 dry run proposed 35 creates and 2 exact-baseline Brazil
updates with no conflicts. Apply completed those operations; the immediate rerun
proposed 0 creates and 0 updates, skipped all 112 baseline and proof checks, and
found 0 conflicts. The version-controlled anonymous verifier confirmed both
version-2 article images; Brazil's content, services, statistic, offices, expert,
media, and SEO; the partner, endorsement, and two public settings; exact-locale
omission; and the hiding of an unpublished country translation. Production HTTP
checks returned 200 for the English home, both article details, Outreach
overview and selected-country panel, and Brazil detail, including expected alt
text and relationship content.

## 14. Our Outreach

### 14.1 Product behavior

Our Outreach is a discoverable view of the company's geographic presence and
services.

Expected journey:

1. The user views and navigates the world map.
2. Covered countries are visually identifiable.
3. Selecting a country opens a panel or modal with a concise summary and
   available services.
4. The user can continue to a full localized country page.
5. The full page contains deeper country and service information.

The selected country should be reflected in the URL or otherwise support
browser back/forward behavior and shareable state.

### 14.2 Rebuild strategy

Rebuild the map rather than porting the old component wholesale.

Reuse only suitable reference material:

- Country and regional coverage.
- Relevant topology source after validation.
- Useful interaction ideas.

Do not preserve:

- Camel-cased country-name identifiers.
- Placeholder popup/detail behavior.
- Console-driven prototype logic.
- `react-simple-maps` as a mandatory dependency.

### 14.3 Planned map technology

For a branded, flat world map:

- Local TopoJSON/GeoJSON geometry.
- `d3-geo` for geographic projection and SVG paths.
- `topojson-client` when TopoJSON is retained.
- ISO country codes matched to Supabase records.
- A dynamically loaded Client Component for map interaction.

MapLibre should be reconsidered only if the final Figma design requires a true
basemap, street-level navigation, labels, vector tiles, or deep geographic
zoom.

### 14.4 Accessibility and responsive behavior

- Covered countries must be available through an accessible list as well as
  the visual map.
- Keyboard users must be able to select countries.
- Focus behavior must be predictable when a panel opens and closes.
- Information cannot be communicated by color alone.
- Touch, pinch, drag, and scroll interactions need intentional conflict
  handling.
- Reduced-motion preferences must be respected.
- Mobile may use a list/cards-first interface instead of a compressed desktop
  map.

An early interaction prototype should validate projection, zoom, touch,
keyboard, and panel behavior before the full feature is designed.

### 14.5 Canonical catalogue initialization

Our Outreach now has a version-controlled, dry-run-first bootstrap workflow:

```powershell
npm run outreach:bootstrap
```

The command reads `scripts/data/outreach-geography.json`, checks it against the
local topology and, when the ignored reference checkout is present, cross-checks
its frozen coverage snapshot against `old-funding/src/data/regions.js`. It then
reads the current hosted records and prints the complete proposed plan. The
version-controlled snapshot means clean checkouts and CI do not depend on the
ignored legacy application. Dry-run is the default. `--apply` is the only
mutation mode and must be used only after the dry-run report has been reviewed
and explicitly approved.

The reference scope is all 249 official ISO 3166-1 alpha-2 entries exposed by
the pinned `i18n-iso-countries` data, grouped into the six existing business
regions using UN M49. The 40 countries in the legacy map are the sole source of
initial `is_covered` values and retain their legacy region assignments. Taiwan
uses its legacy Asia assignment because it has an official ISO alpha-2 code but
is omitted from the UN M49 overview. Antarctica is retained as an uncovered
canonical ISO record without a region because M49 leaves its region blank.

The bootstrap creates only canonical region identity, country ISO identity,
region relationships, legacy-derived coverage, and English reference names and
deterministic slugs. English translations start as drafts. It never creates
other locales, publishes translations, or generates summaries, SEO, services,
statistics, offices, experts, people, media, or map presentation fields.
Existing editorial values are not overwritten; a missing country region may be
filled, while non-null region differences, coverage differences, and English
name or slug differences are reported as conflicts. Duplicate codes, slug
collisions, unmapped legacy names, topology gaps, and region conflicts are
validated before apply. No schema migration was required because the ISO code
primary key, region stable key, nullable relationship, `is_covered`, and
per-locale publication model already support the workflow.

The 2026-09-03 hosted dry run found an empty Outreach catalogue and proposed
510 creates with no updates, skips, or conflicts. After explicit approval, the
bootstrap created 6 regions, 6 English region drafts, 249 country records, and
249 English country drafts. The immediate verification dry run found all 510
records unchanged and proposed 0 creates, 0 updates, 510 skips, and 0 conflicts.
After a subsequent explicit request to make the functional template visible,
the 6 English region translations and the 40 legacy-covered English country
translations were published without adding summaries or other editorial
material. Anonymous verification returned all 6 regions and all 40 covered
countries, and the local English Outreach template rendered the country list.
The other 209 English country references remain drafts and every non-English
translation remains absent.
No covered legacy country is missing from the topology. The low-detail topology
omits 76 official ISO entries, including Antarctica and small countries or
territories; the accessible list remains authoritative. Its three map-only
features without reliable ISO identifiers—Kosovo, Northern Cyprus, and
Somaliland—are reported and deliberately excluded pending an explicit
product/data decision.

## 15. Figma design implementation

Using the connected Figma design:

1. Inventory all pages, variants, responsive states, and interactive flows.
2. Extract foundations:
   - Color.
   - Typography.
   - Spacing.
   - Grid and container behavior.
   - Radius, border, elevation, and motion.
3. Identify reusable components and variants.
4. Map Figma components to code components where appropriate.
5. Identify content that must be CMS-managed before locking the schema.
6. Implement shared foundations and page shells before isolated page details.
7. Validate responsive behavior and content extremes, not only the supplied
   desktop frames.

The initial inventory is recorded in
[`docs/figma-design-inventory.md`](./figma-design-inventory.md). It identifies
the relevant desktop and mobile proposal areas, exact frame IDs, reusable page
templates, visual foundations, CMS implications, and unresolved design gaps.

The Figma design is the visual source of truth. The legacy website remains the
content and behavior reference where the new design is silent.

### 15.1 Figma access

The design is read directly by Claude Code through the hosted Figma MCP server
(`https://mcp.figma.com/mcp`), authenticated with a Pro-plan Dev seat. Because
the original file lives in a work account without MCP access, implementation
reads a duplicated working file whose frame node IDs match the original. File
keys and the frame inventory are recorded in
[`docs/figma-design-inventory.md`](./figma-design-inventory.md). The working
copy does not sync with the original; design changes must be re-duplicated or
applied to it deliberately.

The file defines no variables, text styles, or reusable components, so
semantic design tokens and the component system are defined in code from the
observed values.

### 15.2 Implementation approach: port the legacy presentation

The new design is close to the legacy site in layout and style: the same
palette, the same three typefaces, the same line-art illustrations, and a
similar header, hero, card, and footer structure. Rebuilding every visual
component from a blank file would repeat work already done. Each public
presentation component is therefore produced as follows:

1. Start from the corresponding `old-consulting` component's markup, Tailwind
   classes, and static assets where one exists.
2. Convert it to strict TypeScript and a Server Component by default, replace
   hard-coded content with the existing v2 CMS contracts and `next-intl`
   messages, and use locale-aware navigation.
3. Correct accessibility and layout: keyboard-operable menus and card
   interactions, focus states, `prefers-reduced-motion`, fluid responsive
   sizing instead of fixed pixel heights, and no absolutely positioned page
   chrome.
4. Compare the rendered result with the Figma frame at desktop and mobile
   widths and resolve the differences in favor of Figma.

Static brand assets (logo, line illustrations, icons, social icons) are copied
deliberately from the legacy `public/` folder into the v2 repository; nothing is
imported from the ignored legacy directories at runtime. Designs with no legacy
equivalent — Our Outreach, the revised services selector, and publication
detail pages — are built new against Figma.

Figma assets are not exported from the working file. The frontend uses brand
assets that already exist (repository or legacy site); where the design needs
one we do not have, the code renders a visible placeholder and the asset is
logged in [`docs/figma-asset-needs.md`](./figma-asset-needs.md) so it can be
sourced from the shared drive. Every frontend handoff lists the placeholders it
added.

### 15.3 Design foundations and global shell

Implemented on 2026-09-28:

- Semantic tokens in `src/app/globals.css` (`@theme`): brand palette
  (`tp-navy`, `tp-blue`, `tp-blue-muted`, `tp-azure`, `tp-teal`, `tp-mist`,
  `tp-cloud`, `tp-stone`), semantic colours (`brand`, `brand-strong`,
  `on-brand`, `action`, `surface-tint`, `surface-soft`, `surface-muted`,
  `focus`, `focus-on-dark`), a fluid type scale (`text-display`,
  `text-heading-1…3`, `text-lead`, `text-body-lg`, `text-body`, `text-label`),
  containers (`content`, `shell`), spacing (`gutter`, `section`) and radii
  (`control`, `panel`, `pill`). Font families: `font-display` (Unna),
  `font-serif` (Roboto Serif), `font-label` (Josefin Sans); the legacy
  `font-unna`, `font-robo`, `font-jose` classes remain as aliases. The admin's
  shadcn tokens are unchanged.
- Self-hosted fonts in `src/app/fonts/` via `next/font/local`, built from the
  google/fonts OFL sources: Latin, Latin-1 and Latin Extended-A; weight
  400–700; Unna regular and bold, Roboto Serif and Josefin Sans variable
  upright and italic.
- `src/components/shell/`: `SiteHeader` (legacy look and hide-on-scroll
  behaviour; Figma links, menu structure and language toggle), `MobileMenu`
  (Figma "pages" drop-down), `LocaleSwitcher`, `SiteFooter`, `SocialLinks`,
  `DownloadSnapshotLink`, `PoeLink`, `PageHero`, `SkipLink`. Navigation
  labels follow Figma (`Publications` links to `/newsroom`; `Who we are`
  links to `/team` for now). Links to the legal pages target their intended
  paths and return 404 until those pages exist (Why us exists since section
  15.8, Contact since section 15.10).
- The POE link reads the existing public `poe_external_link` site setting and
  is hidden while it is empty.
- Interface strings live in the `Shell` message namespace. Non-English
  strings are provisional and marked with `_meta.provisionalNamespaces` in
  each locale file; `scripts/messages.test.mjs` checks key parity.
- `npm run visual:screenshots` (Playwright, development only) captures local
  pages at 1440 and 390 pixels into the git-ignored `visual-output/`.

### 15.4 Who We Are and team profiles

Implemented on 2026-09-28 against Figma `5408:15` (desktop listing), `5651:258`
(mobile listing) and the profile examples `5494:162`, `5408:536`, `5494:891`
and `5494:972`:

- Routes moved from `/team` to the legacy `/who-we-are` and
  `/who-we-are/[slug]` (locale-prefixed for non-English). Printed business-card
  QR codes link to the English, unprefixed legacy profile URLs, so these paths
  must stay stable. `next.config.ts` permanently redirects the interim `/team`
  paths. Profile URLs keep working only while each English slug equals the
  legacy path (`glenn-cezanne`, …): the Phase 7 migration must preserve them,
  and an editor who renames a slug breaks that person's QR code until the
  redirect registry is connected to public routing (section 25, item 9).
- Public team reads moved into `src/lib/public-team.ts` (anonymous client,
  hourly cache, `public-team` tag), with the same publication filters as
  before. People and media admin actions invalidate the tag; only their
  revalidation calls changed. Links elsewhere use `teamPath()` from
  `src/lib/team-paths.ts`. "Articles by" uses the existing `article_authors`
  relation through `getPublishedArticlesByAuthor` in the newsroom loader.
- Listing: navy `PageHero` with intro copy (`Team` messages), an `OUR TEAM`
  band with circular `TeamPortrait`/`TeamCard` items (managing team as a row
  of two, then rows of three, last row centred; two columns on mobile), and the
  shared `SnapshotCta` band.
- Profile: one template. Navy header with name (new `tp-silver` token, about
  5.2:1 on navy), ordered roles, introduction and a portrait-format photo;
  profiles without a portrait use the full width. Body sections, endorsement
  panels, contact and "Articles by" all render only when present. There is no
  mobile profile design; narrow screens stack name, photo and introduction.
- Deviations from Figma: body copy is left-aligned rather than justified; the
  name is always shown (the Benjamin frame omits it); the office address in the
  contact block is not rendered because the people contract has no address
  field (flagged, not added).
- Unknown or unpublished profiles render the localized not-found page with
  `noindex` inside the stream (HTTP 200), as on the other dynamic templates.

### 15.5 Services and sectors

Implemented on 2026-09-28 against Figma `6393:6` (revised services), `5408:128`
(original services), `5408:187` (sectors), the mobile indexes `5651:347` and
`5651:406`, the detail examples `5488:464`, `5488:683`, `5488:926`, `5408:267`
and `5480:511`, and the mobile details `5695:437` and `5695:370`:

- Routes are unchanged. The legacy site served only `/services` and
  `/sectors` (no detail pages), which match v2, so no redirects are needed.
- One shared implementation in `src/components/catalogue/`: `CatalogueTile`
  (one link per item), `CatalogueContacts`, `CatalogueArticles`, the restyled
  `CatalogueRichText` and the loading skeletons (section 15.6). All are Server
  Components. `ArticleSummaryCard`
  (`src/components/newsroom/article-summary-card.tsx`) was extracted from the
  team "Articles by" block and is shared with it.
- Index: navy `PageHero` with line illustration and intro (services copy from
  Figma `6393:6`; the sectors frame is placeholder text, so the legacy sectors
  copy is used), then a light band of tiles. From `lg`, round (service) or
  square (sector) blue tiles, three per row with the last row centred, showing
  the CMS icon faintly behind the title. Below `lg`, the Figma mobile rows: a
  title cell and a navy summary cell, alternating sides. Items without a summary
  use a full-width title cell.
- Motion (Figma annotations): the summary slides up over the tile on hover
  **and** keyboard focus; tiles fade in with a short stagger on page load
  (`--animate-tile-in`). Both run only without `prefers-reduced-motion`; the
  summary then appears instantly. The title names the link and the summary
  describes it (`aria-describedby`), so assistive technology gets both at
  every width. Deferred: the 3D card flip (it hides the title), tap-to-flip
  (the tile is a link, and the mobile layout already shows the summary), and
  "animated" detail illustrations (they need SVG artwork; CMS icons are
  static images).
- Detail: one template. A navy hero with the CMS icon as a centred emblem,
  the name and the summary; then "What we do" (only when the body has text),
  "Get in Touch with the Team", and "Articles for {name}". Each section renders
  only when it has content. Contacts reuse `TeamPortrait` and add the name
  linking to the profile, which Figma omits; the office address is not
  rendered because the people contract has no address field (flagged, as in
  section 15.4). The sector frames' "{name} Projects" heading is shown as
  "Articles for {name}" because the data is articles.
- Related articles now come from the public newsroom listing filtered by the
  service or sector (`getPublishedNewsroomListing`), so the cards have covers
  and authors under the newsroom publication rules. The catalogue loader's own
  related-article query was removed; no schema or contract changed. Up to three
  are shown, newest first, with a "View all" link to the filtered newsroom when
  there are more. The link is omitted for slugs that the newsroom filters reject
  (for example the legacy `culture-&-creativity` style).
- The Business / Government Institute / Academia audience selector on `6393:6`
  is omitted until open decision 23.10 is resolved; all tiles are shown at full
  strength.
- Placeholders: the sectors hero skyline (`hero-sectors-industry`) and every
  missing CMS icon (dashed outline in tiles, labelled emblem box on details;
  none of the seeded services has an icon). The services hero uses
  `public/hero/hero-services-white.png`, a white-on-transparent copy derived
  from the legacy `hero-services.png`. See
  [`docs/figma-asset-needs.md`](./figma-asset-needs.md).
- Deviations from Figma: body copy is left-aligned rather than justified;
  "WHAT DO WE DO" reads "What we do"; contacts show names; empty details
  collapse to the hero.
- New `Catalogue` strings are provisional in the non-English locales (listed
  per key in `_meta.provisionalNamespaces`).

### 15.6 Loading states

Figma supplies no loading states (inventory section 8, item 10). Implemented on
2026-09-28 for the templates designed so far; every new template follows the
same pattern:

- `Skeleton` (`src/components/ui/skeleton.tsx`, added with the shadcn CLI) has
  a `tone`: `default` keeps the shadcn look for the admin, `light` is for white
  and soft-blue bands, `brand` is for the navy heroes. Shapes are `aria-hidden`
  and pulse only under `motion-safe`.
- `src/components/loading/`: `LoadingRegion` is the one accessible wrapper
  (`aria-busy`, a single polite `role="status"` with the localized label,
  visuals hidden); `SkeletonText` draws lines at exactly the real text's line
  height (`1lh`, given the same typography classes); `SkeletonSection` and
  `SkeletonSectionHeading` cover titled and ruled body sections;
  `LoadingMessage` is the only client piece, a leaf that resolves the label
  where the server has no locale (`loading.tsx`, and fallbacks rendered before
  route params resolve).
- Each presentation component exports its own skeleton next to it, sharing
  its layout classes so the two cannot drift: `PageHeroSkeleton`,
  `ProfileHeroSkeleton`, `TeamCardSkeleton`/`TeamGridSkeleton`,
  `ArticleSummaryCardSkeleton`/`ArticleSummarySectionSkeleton`,
  `CatalogueContactsSkeleton`. Page skeletons compose them
  (`TeamProfileSkeleton`, `CatalogueDetailSkeleton`, `CatalogueGridSkeleton`).
- Streaming boundaries: static heroes (listings) render outside Suspense and
  only the data grid streams, so the service and sector listing `loading.tsx`
  files were removed. Detail pages show the full template skeleton (route
  `loading.tsx` for services and sectors, the page Suspense fallback for
  profiles). "Articles by" and "Articles for" stream separately with their own
  skeleton and label instead of appearing from nothing.
- `getPublishedTeamProfile` and `getPublishedCatalogueDetail` are wrapped in
  React `cache()` so `generateMetadata` and the page share one read per
  request; results are unchanged.
- Checked at 1440 and 390 with the loaders delayed in development: one status
  per region in English and German, no pulse under reduced motion, measured
  CLS 0 on the team listing, profile and service and sector details, and
  skeleton heroes within about 15 px of the loaded heroes.
- The Our Outreach loading state is still the pre-Figma placeholder; it gets
  a template skeleton when that page receives the Figma design. The newsroom
  received its skeletons in section 15.7.

### 15.7 Newsroom listing and article detail

Implemented on 2026-09-28 against Figma `5408:334` (desktop Publications),
`5651:90` (mobile Publications), `5534:989` (newsletter/article detail) and
`5542:2` (video/podcast detail). Routes are unchanged (`/newsroom`,
`/newsroom/[slug]`).

- Listing: navy `PageHero` titled "Publications" (the navigation label) with
  the intro, then a filter bar, a centred results heading ("Latest
  publications", or the kind label when filtered by kind), the result count,
  the cards and pagination. The hero is static and renders at once; the bar,
  cards and pagination stream behind a Suspense boundary keyed by the filters
  and page, so each new query shows the skeleton.
- Filter bar, as in Figma: a grey search pill with a round search button, and
  round calendar and categories buttons that open native disclosures sharing
  one `name` (opening one closes the other). Calendar offers the publication
  years that have published articles in the locale; Categories offers type
  (kind), tag, service, sector and author. Everything is one GET form, so
  every choice lives in the URL (`q`, `year`, `kind`, `tag`, `service`,
  `sector`, `author`, `page`). `NewsroomFilterForm` is the only client piece:
  it wraps `next/form` for client-side navigation and leaves empty fields out
  of the URL; without JavaScript the form still submits. Active filters show as
  removable chips with a "Clear filters" link. The "Subscribe to Newsletter"
  button is omitted because there is no subscription feature (section 23).
- Cards (`src/components/newsroom/newsroom-card.tsx`): Figma's three
  variants. On two columns, white and navy alternate like a chequerboard
  (Figma rows one and three), and navy cards split on desktop with the picture
  on the side facing the other column; in the single mobile column the tones
  simply alternate (5651:90) and the picture is always on top. In a split card
  the text column takes three fifths and the kind icon moves onto the kind line
  so long titles keep the full column. The lead story
  (`NewsroomLeadCard`, Figma "NEWS 3") is the full-width cover card behind an
  80 % navy scrim (white text stays above 5:1 on any photograph); it is the
  featured article (`is_featured`, lowest `featured_order`, then newest), only
  on the unfiltered first page, and it leaves the regular sequence so it never
  appears twice. Each card is one link (the title, stretched over the card);
  "Read more" is its visual affordance, not a second link; the focus ring
  wraps the whole card. Cards fade in with the existing `tile-in` stagger
  under `motion-safe` only.
- Kind: the public card now carries the canonical `articles.kind`. Known keys
  (`article`, `newsletter`, `announcement`, `event`, `video`, `vodcast`,
  `podcast`, `book`, `media`) get a localized label (`Newsroom.kinds`) and an
  icon; an unknown key shows neither and is not offered as a filter. Every
  seeded article is `article`. No schema or admin change.
- Pagination keeps crawlable URL pages (previous, "Page x of y", next) in the
  Figma "LOAD MORE" button style instead of a load-more control.
- Detail (`src/components/newsroom/newsroom-article.tsx`): Figma leaves the top
  as an empty navy block (5534:989) or a full-bleed photograph (5542:2), so the
  navy header carries the kind, title, excerpt, linked authors and date, and
  the cover follows at full width (up to 90 rem) with its caption. Then the
  body (restyled `ArticleRichText`: Josefin 18 px, bold upper-case Roboto Serif
  sub-titles), "Related topics" (tags, services and sectors as links to the
  filtered listing), "Sources", "More about the author(s)" and "Similar
  articles". Each renders only with content. "More about the author" reuses
  `CatalogueContacts` with the author's published team profile
  (`getPublishedTeamProfile`, already cached per request), so authors without a
  public profile appear only in the byline; it streams with its own skeleton.
  "Similar articles" are the explicit related articles as
  `ArticleSummaryCard`s; the video frame's "Similar Videos & Podcasts" heading
  is not varied by kind.
- Loading: `NewsroomToolbarSkeleton`, `NewsroomCardSkeleton` and the listing
  skeleton (bar, heading, count, four cards, two on mobile) inside a
  `LoadingRegion`; `NewsroomDetailSkeleton` for the article (route
  `loading.tsx` for `[slug]` and the page Suspense fallback). The hard-coded
  English `NewsroomLoading` and the listing route `loading.tsx` were removed.
- Loader (`src/lib/public-newsroom.ts`): card paths (listing, "Articles by",
  "Articles for", related articles) select only card columns
  (`article_id, slug, title, excerpt, published_at`); the content, sources and
  SEO columns are read only for the one detail translation. "Articles by" and
  related articles query just their article IDs instead of every published
  translation. `CatalogueArticles` uses the new `getPublishedArticleSelection`
  (filtered cards and a total, no filter options). Search (`q`) matches every
  term, case- and accent-insensitively, against the localized title and
  excerpt; searches bypass the shared cache so arbitrary queries cannot grow
  it. `getPublishedNewsroomDetail` is wrapped in React `cache()` so metadata
  and the page share one read. Existing results were compared before and after
  on 21 listing, filter, profile, service, sector and article URLs: identical.
- Checked at 1440 and 390 against `5408:334`, `5651:90` and `5534:989`
  (`npm run visual:screenshots`), first with the two legacy articles (the lead
  card through a temporary override), then with the version-4 placeholder
  articles (section 13.5), which show the lead card, the full grid rhythm and
  two pages.
  Search, year and kind filters and their combination with tag, service,
  sector and author filters were exercised. Loading states, checked once with
  the loaders delayed in development: one polite status per region in English
  and German, no pulse under reduced motion, CLS 0 on the listing, a search
  and the article.
- Deviations from Figma: card titles use the heading-3 size instead of 36 px
  (real titles are long); body copy is left-aligned rather than justified;
  cards show the author names and date on two lines rather than "Name, date";
  the listing's "NEWSLETTER" heading reads "Latest publications" (or the kind);
  no Subscribe button; pagination instead of "Load more".
- Placeholders: the publications hero (`hero-publications-papers`), the
  newsroom kind icons and the filter-bar icons (Lucide stand-ins). See
  [`docs/figma-asset-needs.md`](./figma-asset-needs.md).
- New and changed `Newsroom` strings (including the title "Publications" and
  "Similar articles") are provisional in the non-English locales.

### 15.8 Why Us

Implemented on 2026-10-05 against Figma `5408:311` (desktop) and `5651:450`
(mobile), with the copy and endorsement behaviour of the legacy
`old-consulting/src/app/why-us/page.jsx` (`Overview`, `ClientCodex`,
`Endorsements`). The new route `/why-us` (locale-prefixed for non-English) is
the legacy path, so no redirect is needed. The header already linked to it;
the link no longer marks nested paths as current.

- Page (`src/components/why-us/why-us-page.tsx`, route
  `src/app/[locale]/why-us/page.tsx`): navy `PageHero` titled "Why us"; a
  soft-grey band with the figures statement ("Our services are provided in 14
  languages across 10 countries in 3 continents", Roboto Serif black italic)
  and six topics (reputation, languages, integrity, geographic presence,
  expertise, experience), each an `h2` and body; the blue-muted "Client codex"
  band (`h2`, introduction, five principles as `h3`); then the endorsements.
  All copy is static and lives in the new `WhyUs` messages. Metadata: localized
  title and description, canonical and hreflang alternates for every locale
  plus `x-default`, as on the other templates.
- Figures (Figma annotation "NUMBERS COUNT UP UNTIL REACHING FINAL METRIC"):
  `CountUp` is the page's only client piece. The server renders the final
  figures; with motion allowed they count up from zero once, on entering the
  viewport. The animated sentence is `aria-hidden` and the complete sentence is
  provided as text, so assistive technology never reads an intermediate
  number. Figma shows "XX", so the figures are provisional and kept in one
  constant (`FIGURES`): 14 is the language list on the page; 10 countries and
  3 continents are those of the offices listed under "Geographic presence"
  (open decision 23.12).
- Endorsements (`src/components/endorsements/`, built for reuse on the
  homepage): `Endorsements` takes only the locale. Its heading is part of the
  streamed content, so a locale without published endorsements renders no
  section at all. While loading, `EndorsementsSkeleton` (heading and a row of
  card shapes) sits in a `LoadingRegion` with one localized status.
  `EndorsementCard` follows the legacy card and the Figma mobile frame: the
  logo on white above a navy panel with name, title and quote, marked up as
  `figure`, `blockquote` and `figcaption` (the quote precedes the attribution
  in the DOM; the attribution is shown first). The picture is the linked
  partner's public logo, else the endorsement portrait, else the partner name
  as text, so all cards keep one rhythm. Layout: fewer than three
  endorsements are centred statically; from three they scroll in a CSS
  marquee (Figma "SCROLL OF ENDORSEMENT LOGOS & DESCRIPTIONS"), and from six
  in two rows moving in opposite directions (contiguous halves, so the reading
  order stays the editorial order). Each row repeats its cards until a half
  holds at least six, so the loop never shows a gap, and only the first copy
  of each card is exposed to assistive technology. A visible Pause/Play button
  (`EndorsementMarquee`, the section's only client piece) satisfies WCAG
  2.2.2; hovering also pauses. Under `prefers-reduced-motion` nothing moves:
  the copies and the button are removed and the cards wrap, centred. The
  `marquee` keyframes and `--animate-marquee(-reverse)` tokens are in
  `globals.css` (`@theme inline`, so the per-track `--marquee-duration` and
  `--marquee-state` apply).
- Data: `getPublishedGlobalContent` keeps its contract (active record, exact
  locale, published translation whose `published_at` is not in the future, no
  English fallback). It now also returns, per endorsement, `logo` (the linked
  partner's logo while that partner is itself public in the locale) and
  `portrait` (public media with localized alt text; without that the portrait
  is omitted and the endorsement still shows). Both use the existing media
  read. No schema, admin or cache-tag change; the homepage test harness is
  unchanged.
- Checked with `/why-us` (one published English endorsement, EFFA) and
  `/de/why-us` (none) at 375, 768, 1024 and 1440: no horizontal overflow, one
  `h1` and the heading outline above, `aria-current` on "Why us", visible
  focus on the Pause button. German renders no endorsements section. The
  marquee was exercised with the English endorsement temporarily repeated
  eight times: two rows, Pause stops both, the duration scales with the cards,
  and reduced motion shows the eight originals wrapped. The skeleton was
  checked with the loader temporarily delayed: one polite status in English
  and German, no pulse under reduced motion. Both overrides were removed.
- Deviations from Figma: the hero intro is omitted (Figma has placeholder
  Latin and the legacy page had none); body copy is left-aligned at every
  width (the mobile frame centres it) with a 1.6 line height instead of
  22 px on 18 px; topic and principle headings use the heading-3 size (28 px
  rather than 30 px); the trailing "…" after the figures is dropped; the
  office list fixes the legacy typos "Dubin" and "São Paolo"; endorsement text
  is 16–18 px (the Figma and legacy cards use about 10–14 px); the
  endorsements get a Pause control that the design does not show.
- Placeholder: the hero laptop-and-coffee line drawing (`hero-why-us-laptop`).
  The legacy `hero-why-us.png` is a different drawing (a certificate). See
  [`docs/figma-asset-needs.md`](./figma-asset-needs.md).
- The `WhyUs` and `Endorsements` namespaces are provisional in the non-English
  locales.

### 15.9 Home

Implemented on 2026-10-05 against Figma `5408:616` (desktop) and `5651:631`
(mobile), with the structure of the legacy
`old-consulting/src/components/home/` (`home-page.jsx`, `hero.jsx`,
`partners.jsx`). The route `/` (and `/de`, `/it`, `/pt-BR`, `/pt-PT`) is
unchanged; the test harness that occupied it is gone.

- Page (`src/components/home/home-page.tsx`, route `src/app/[locale]/page.tsx`
  in the Why Us shape): the navy `PageHero` with the display title "Your point
  of access for IMPACT" (the only `h1`); the mist "snapshot" band with the
  `h2` "Time&Place Consulting", "A Time&Place Group pillar", the blue rule,
  "Us in a snapshot" and the two intro paragraphs (Figma copy, newer than the
  legacy text); then the partner logos. "Time&Place Group" links to
  `https://www.groupontap.com/en` in a new tab, as on the legacy site, with a
  small external-link icon and a visually hidden "(opens in a new tab)".
  Copy lives in the `HomePage` messages. Metadata: localized title (absolute,
  so the layout's "| Time&Place Consulting" suffix is not doubled) and
  description, canonical and hreflang alternates for every locale plus
  `x-default`.
- Partners (`src/components/partners/partners-section.tsx`, shaped like
  `Endorsements` and reusable): `Partners` takes only the locale and streams
  behind Suspense; `PartnersSkeleton` (a centred wall of 14 logo cells) sits in
  a `LoadingRegion` with one localized status; a locale with no published
  partner renders no section at all. It reads `partners` from
  `getPublishedGlobalContent`, unchanged: active record, exact locale,
  published translation whose `published_at` is not in the future, logo
  through public managed media with localized alt text, no English fallback,
  and only `http(s)` website URLs. Logos sit in fixed cells (seven a row at
  1440 px as in Figma, five at 768, three at 375) with `object-contain`. A
  logo with a website is one link whose name is the logo's alt text plus
  "(opens in a new tab)"; without a website it is a plain image. The band is
  static, so it needs no pause control; the hover zoom runs only under
  `motion-safe`. Figma shows no heading, so the section is labelled by a
  visually hidden `h2` ("Partners and clients") to keep the outline.
- Removed: the sign-in link, the template-testing route list,
  `src/components/home/global-content-proof.tsx` (nothing else used it) and the
  `HomePage` keys only the harness used (`title`, `signIn`, `testNavigation`,
  `team`, `services`, `sectors`, `newsroom`, `outreach`, `partners`,
  `endorsements`, `contact`, `socials`) in all five locales. The footer
  already renders the public contact and social settings that the harness
  proved; sign-in remains at `/auth/sign-in`.
- Deferred, not built and with no empty slot: the Figma newsroom feature
  ("STAY UPDATED WITH OUR TIME&PLACE NEWSROOM", the "NEWS SCROLL" card with
  arrows, annotation "news scroll with slide effect"). Its content rules
  (which articles, how many, autoplay) are open decision 23.13. The newsroom
  and Our Outreach code are untouched.
- Checked with `/` (one published English partner, EFFA), `/de` and `/pt-BR`
  (none) at 375, 768, 1024 and 1440: no horizontal overflow, one `h1`, the
  outline `h1` → `h2` ("Time&Place Consulting") → `h2` (partners), metadata
  and alternates as above, no text under 14 px in `main`. German and
  Portuguese render no partner section. Keyboard order on `/`: skip link,
  header, Time&Place Group, the EFFA logo, footer; every stop shows a focus
  outline. The wall was checked with EFFA temporarily repeated twenty times
  (three rows of seven at 1440, three a row at 375, no overflow), and the
  skeleton with the loader temporarily delayed: one polite status in English
  and German, no pulse under reduced motion. Both overrides were removed.
- Deviations from Figma: the intro paragraphs have a narrower measure (52 rem
  rather than about 65 rem) and are left-aligned below 768 px (Figma centres
  them at every width); "Time&Place Group" is underlined and has an
  external-link icon because it is a link; the intro uses the fluid lead size
  (18–20 px) and the title the heading-1 size (32–48 px); the partner band
  shows CMS logos in uniform cells instead of the flat image; no newsroom
  feature; the homepage does not show endorsements (Figma has none there,
  although section 15.8 anticipated reuse).
- Placeholder: the hero doors line drawing (`hero-homepage-doors`, already
  logged). Partner logos are CMS content and need authoring, not a
  placeholder. See [`docs/figma-asset-needs.md`](./figma-asset-needs.md).
- The `HomePage` and new `Partners` namespaces are provisional in the
  non-English locales.

### 15.10 Contact

Implemented on 2026-10-05 against Figma `5408:348` (desktop) and `5651:504`
(mobile), with the structure and behaviour of the legacy
`old-consulting/src/components/contact/` (`contact.jsx`, `contact-form.jsx`,
`contact-map-desktop.jsx`, `contact-map-mobile.jsx`) and the legacy Zoho route
`old-consulting/src/app/api/email/route.js`. The new route `/contact`
(locale-prefixed for non-English) is the legacy path, so no redirect is
needed; the header already linked to it.

- Page (`src/components/contact/contact-page.tsx`, route
  `src/app/[locale]/contact/page.tsx` in the Why Us shape): navy `PageHero`
  titled "Contact" without an introduction (Figma has placeholder Latin and
  the legacy page had none); "Our global network"; then the blue-muted band
  with the form ("Send us a message") and the head office. Copy lives in the
  new `Contact` messages. Metadata: localized title and description,
  canonical and hreflang alternates for every locale plus `x-default`.
- Office network (`office-network.tsx`, `office-network-explorer.tsx`): the
  CMS offices grouped by country, read by `getPublishedOfficeNetwork`
  (`src/lib/public-offices.ts`) through `country_offices`, the relation the
  admin country editor orders. Every level must be public in the exact
  locale: an active office with a published office translation, a covered
  country with a published country translation, each with `published_at` not
  in the future; there is no English fallback. Countries follow
  `countries.display_order`, then the localized name; cities follow the
  relation order, then `offices.display_order`. A country shows its office
  cities (`office_translations.city`, else the office name) and the distinct
  office email addresses: the schema has no country-level email, and the
  offices of a country share one address as on the legacy page. The read uses
  the hourly cache with the existing `public-outreach` tag, which office and
  country admin actions already invalidate. No schema migration. The heading
  is part of the streamed content, so a locale without published offices
  renders no section. `OfficeNetworkSkeleton` (heading, card shapes below
  `lg`, buttons, panel and map from `lg`) sits in a `LoadingRegion`.
- Country choice (Figma annotation "TITLE, E-MAIL & PHONE NUMBER CHANGE BASED
  ON SELECTION"; legacy country buttons): the server markup lists every
  country as a card (the mobile design). After hydration, from `lg`, a group
  of real `<button aria-pressed>` toggles (one per country, `aria-controls`
  the panel) selects the country shown in one panel (`role="region"`,
  `aria-live="polite"`), starting with the first country as the legacy page
  did; below `lg` the cards stay. Without JavaScript the cards show at every
  width. Hover pins and the map interaction of the legacy page are not
  rebuilt; Our Outreach code is not used.
- Head office (`head-office.tsx`): address, email (`mailto:`) and phone
  (`tel:`, digits with the "(0)" trunk prefix removed) from the public
  `contact_footer` site setting, streamed with its own skeleton; only the
  details that are set are shown, and without any the block is omitted. The
  heading reads "Head office" because the address is CMS data.
- Form (`contact-form.tsx`, the page's form client piece): name, email,
  subject and message, each with a visible label, a required marker and
  `autocomplete` where it applies. It posts to the Server Action
  `submitContactForm` (`src/lib/contact/contact-action.ts`) through
  `useActionState`, so it works without JavaScript: the browser's own checks
  (`required`, `minLength`, `maxLength`, `type="email"`) apply and the page is
  re-rendered with the result and the visitor's input. With JavaScript the form
  sets `noValidate` and runs the same rules as the server before sending;
  errors appear under their fields (`aria-invalid`, `aria-describedby`), focus
  moves to the first invalid field or to the result, and one polite status
  announces the outcome. React's automatic form reset restores the returned
  values after an error and clears the form after success. A short notice
  links to the planned `/privacy-policy` route.
- Validation (`src/lib/contact/contact-rules.mjs`, shared by the client and
  the Server Action, zod): every field is trimmed and bounded (name 2–100,
  email up to 254 and a valid address, subject 2–150, message 10–5,000
  characters); name, email and subject reject control characters, line breaks
  and the Unicode line and paragraph separators; the message allows line feeds
  and tabs and normalizes CRLF. Errors are codes that the interface localizes.
- Delivery (`src/lib/contact/contact-delivery.ts`, `contact-mail.mjs`): the
  legacy Zoho SMTP route ported to nodemailer 10.0.14 (pinned). TLS
  certificates are verified (the legacy `rejectUnauthorized: false` is gone);
  port 465 uses implicit TLS, any other port must use STARTTLS. Credentials
  come from server-only `CONTACT_SMTP_HOST`, `CONTACT_SMTP_PORT`,
  `CONTACT_SMTP_USER`, `CONTACT_SMTP_PASSWORD` and `CONTACT_TO_EMAIL`,
  validated when a message is sent (README "Contact form"). The message is
  plain text, sent from the configured mailbox with the visitor only as
  `replyTo`; header text is stripped of control characters and line breaks
  and bounded. Missing configuration shows the visitor a generic localized
  error and logs the variable names, never values. `CONTACT_MAIL_TRANSPORT=json`
  uses nodemailer's jsonTransport outside production and prints the generated
  message instead of sending it.
- Spam protection (`src/lib/contact/contact-guard.mjs`, no third-party
  CAPTCHA while decision 23.7 is open): a hidden honeypot field; a minimum fill
  time of 3 seconds measured from a signed timestamp in the HttpOnly
  `tp_contact_form` cookie, which the proxy (`src/proxy.ts`) issues on a GET of
  the Contact page when none is valid and keeps for 24 hours, so prefetches and
  reloads do not restart it (`CONTACT_FORM_SECRET`, required in production);
  and a sliding-window limit of 5 accepted messages per 15 minutes per client
  address. A tripped honeypot or a too-fast submission is answered as if sent
  and logged; a missing, forged or expired cookie gets a visible "send again"
  error and a fresh cookie, so a visitor who blocks cookies cannot send. The
  rate limit is in memory: on serverless hosting each instance and cold start
  counts separately, so it only slows a single client; a shared store is
  needed for a real quota. The client address comes from `x-forwarded-for` or
  `x-real-ip`, trustworthy only behind a proxy that overwrites them. The token
  is a cookie rather than a hidden field because streamed markup is inserted by
  script and would not reach a visitor without JavaScript.
- Tests: `scripts/contact-rules.test.mjs` (schema, lengths, characters,
  `tel:`) and `scripts/contact-guard.test.mjs` (honeypot, token timing and
  forgery, rate limit, path matching, client address, mail configuration and
  message headers). The shared logic is plain `.mjs` with `.d.mts`
  declarations so `node --test` can import it.
- Checked in development with jsonTransport: `/contact` (Brazil, the only
  published office country) and `/de/contact` (no offices) at 375, 768, 1024
  and 1440: no horizontal overflow, one `h1`, outline `h1` → `h2` network →
  `h3` countries → `h2` form → `h2` head office, no text under 14 px in
  `main`, hreflang as above; German renders no network section. The selector
  and the Figma rhythm (five then three buttons, panel and map) were checked
  with the eight legacy countries through a temporary loader override, and the
  skeletons with a temporary delay (one polite status per region in English
  and German, no pulse under reduced motion); both were removed. Form
  scenarios: success (message logged with the mailbox as sender and the
  visitor as Reply-To), each validation error on the client and on the server,
  honeypot, too fast, missing cookie, rate limit (the sixth accepted message
  within the window is refused), missing SMTP configuration, and a submission
  with JavaScript disabled. Keyboard order: skip link, header, country
  buttons, the panel email, the four fields, the privacy link, Send, head
  office email and phone; every stop shows a focus outline.
- Known limit: without JavaScript the streamed sections (office network, head
  office, and the footer's CMS details on every page) keep their skeletons,
  because React reveals streamed content with inline scripts. The office
  network renders every country without JavaScript once its markup is in the
  page, but making it part of the initial HTML needs prerendered data
  (`'use cache'`), which would make builds depend on the CMS (section 20,
  Phase 5); see open decision 23.14.
- Deviations from Figma: the hero intro is omitted; labels sit above the
  fields instead of placeholders inside them, with 3 px borders; the form
  heading reads "Send us a message" rather than a second "CONTACT"; the head
  office heading is "Head office" rather than "Brussels Head Office"; the
  phone and email are links; the address icon is a pin (Figma uses an
  envelope); the country name is repeated below its badge, and small card
  badges show no name; the mobile map behind the country grid is omitted; the
  mobile and tablet form, which Figma does not show (design gap 4), stacks the
  form above the head office, with name and email side by side from 640 px.
- Placeholders: the hero telephone drawing (`hero-contact-telephone`), the
  country icon buttons (`contact-country-icon-<code>`), the world map
  (`contact-world-map`) and the head office icons (Lucide stand-ins). See
  [`docs/figma-asset-needs.md`](./figma-asset-needs.md).
- The `Contact` namespace is provisional in the non-English locales.

## 16. Public routes and legacy parity

The final route inventory will be confirmed against Figma. At minimum, the
legacy scope includes:

- Home.
- Who we are/team listing.
- Team-member details.
- Services.
- Service details where required.
- Sectors.
- Why us.
- Contact.
- Newsroom listing.
- Article details.
- Our Outreach map.
- Country details.
- POE external-platform navigation link.
- Privacy policy.
- Terms and conditions.
- Cookie information.

Before launch:

- Inventory every indexable legacy URL.
- Decide which paths remain unchanged.
- Add permanent redirects for renamed or removed paths.
- Preserve article and team-member routes where practical.
- Generate localized sitemap entries.
- Validate canonical URLs, alternate languages, metadata, robots behavior, and
  social previews.

## 17. Caching and publishing

Public content should be cached where appropriate without making editorial
updates unpredictable.

High-level approach:

- Query published content on the server.
- Tag cached content by entity and listing.
- On publish/update/archive, invalidate the relevant entity and listing tags.
- Admin previews bypass public publication rules through authenticated server
  access.
- Published changes should appear promptly and predictably.

Exact Next.js caching APIs should be selected against the version pinned at
implementation time.

## 18. Quality requirements

### 18.1 Accessibility

Target WCAG 2.2 AA behavior:

- Semantic document structure.
- Keyboard navigation.
- Visible focus.
- Correct labels and error messaging.
- Sufficient contrast.
- Accessible dialogs, menus, filters, and forms.
- Alt text and media validation.
- Reduced-motion support.
- Screen-reader alternatives for map interactions.

### 18.2 Performance

- Server Components by default.
- Minimize client JavaScript.
- Dynamically load heavy interactive features.
- Optimize images and fonts.
- Avoid third-party map tiles unless the product requires them.
- Test Core Web Vitals on representative pages and devices.

### 18.3 Security

- RLS on exposed tables and Storage operations.
- Server-side validation for all mutations.
- No secret keys in client code.
- Sanitized/allowlisted rich-text rendering.
- Safe link protocols and external-link handling.
- Rate limiting and abuse protection for public forms where required.
- Secure admin session and callback handling.
- Dependency and production configuration review before launch.

### 18.4 Testing and CI

Expected checks:

- TypeScript type check.
- ESLint.
- Unit tests for content transformation and utility logic.
- Component/integration tests for complex forms and content rendering.
- End-to-end tests for:
  - Admin authentication.
  - Team creation and publication.
  - Article drafting and publication.
  - Translation behavior.
  - Filters and pagination.
  - Our Outreach selection and country navigation.
- Production build on pull requests.

Database and RLS behavior will be tested against the hosted development
database or a future Supabase development branch, consistent with the agreed
remote-only workflow.

## 19. Analytics, privacy, email, and operations

Before launch, confirm:

- Analytics provider and event requirements.
- Cookie/consent requirements.
- Newsletter provider and migration behavior.
- Contact-form delivery and spam protection. Implemented provisionally
  (section 15.10): SMTP through nodemailer with the legacy Zoho mailbox model
  (`CONTACT_*` server-only variables, TLS verified, visitor as Reply-To), a
  honeypot, a 3-second minimum fill time from a signed HttpOnly cookie, and an
  in-memory limit of 5 accepted messages per 15 minutes per client address.
  Before launch: set the variables and `CONTACT_FORM_SECRET` in production,
  confirm the mailbox and recipient, and decide whether the in-memory limit
  (per instance on serverless) needs a shared store or a CAPTCHA provider
  (open decision 7). The `tp_contact_form` cookie is a strictly necessary
  security cookie holding only a signed timestamp; list it in the cookie
  policy.
- Supabase Auth SMTP provider and templates.
- Error monitoring.
- Backup and recovery procedure for both database and Storage.
- Ownership of production credentials and admin invitations.

Only essential third-party scripts should be loaded, and consent requirements
must be reflected in their loading behavior.

## 20. Implementation roadmap

### Delivery sequencing decision

The current delivery sequence is **admin foundation first, public dynamic
templates second**. The completed team work remains the reference
implementation for controlled localized editorial content, but it is not an
instruction to keep polishing team pages in isolation.

Before building further public CMS-driven pages, complete the agreed admin
workflows and their controlled data contracts for every in-scope editorial
area. Then build the public templates against those stable contracts and run
end-to-end editorial tests using realistic content. Findings from that test
cycle determine the next admin refinements.

This does not turn the admin into a page builder: page composition and visual
design remain in code. It also does not delay necessary schema, RLS, media, or
server-side validation work.

**Update 2026-09-28.** With the admin foundation and the public templates of
Phase 5 in place, the Figma frontend work of Phase 6 starts now, while
colleagues continue to author content and make content decisions in the admin. The
combined editorial smoke test runs alongside the frontend work rather than
before it, using the realistic content as it becomes available. Frontend work
begins with the design foundations and the global shell, then applies the
Figma design to the existing public templates.

### Phase 0 — Discovery and decision lock

- Maintain the completed initial Figma inventory as the proposal evolves.
- Confirm launch locales.
- Confirm CMS-managed content scope.
- Confirm admin roles and publishing permissions.
- Confirm public URL strategy.
- Confirm Our Outreach country/service content requirements.
- Turn confirmed decisions into focused architecture/schema documents.

### Phase 1 — Foundation

- Resume work on `v2`.
- Update and pin the application stack.
- Establish final route groups and project organization.
- Complete `next-intl` routing strategy.
- Validate Supabase SSR auth scaffolding.
- Add environment validation.
- Add lint, typecheck, test, build, and CI workflows.
- Establish Figma-derived design tokens and core UI primitives when available.

### Phase 2 — Supabase content platform

- Apply the drafted version-controlled Supabase migrations to the hosted
  project.
- Validate the drafted schema, constraints, indexes, and RLS against the hosted
  project.
- Validate the drafted Storage bucket and policies.
- Generate database TypeScript types.
- Implement invite-only authentication and the protected admin shell.
- Build an early Our Outreach map interaction prototype to retire technical
  risk.

### Phase 3 — Reference implementation: team

- Build people/team administration.
- Implement image upload.
- Implement translations, ordering, archive/restore, and preview.
- Build the public team list and member detail pages from Supabase.
- Validate caching, revalidation, RLS, media, and SEO end to end.

This is the reference implementation for the controlled editorial patterns used
by later admin areas: shared identity, per-locale publication, media metadata,
structured documents, ordering, archive/restore, and server-side validation.
Further team-page polish is deferred until the cross-area end-to-end test phase.

### Phase 4 — Complete the admin foundation

- Complete services and sectors catalogue management, including translations,
  media, ordering, contacts, SEO, publication, and archive/restore.
- Complete newsroom administration: articles, authors, tags, sectors,
  services, explicit relations, controlled TipTap content, SEO, and
  per-translation publication.
- Complete Our Outreach administration: regions, countries, country services,
  statistics, offices, experts, media, and localized content.
- Complete the remaining agreed editorial administration: partners/client
  logos, endorsements, site settings, redirects, and reusable media metadata.
- Apply the same common safeguards to every workflow: RLS, server-side schema
  validation, actionable form errors, audit metadata, translation status, and
  archive/restore where applicable.

Phase 4 is implemented. The remaining relationship-content workflows manage
ordered partners/client logos and endorsements with media-library selection,
localized alt text and publication controls. Site settings are restricted to a
code-owned contract for contact/footer details, social links, the external POE
link, and reusable localized calls to action. The redirect registry supports
validated permanent records and safe disabling, but is intentionally not read
by public request routing until the Phase 5 localized route strategy is
implemented and reviewed.

### Phase 5 — Public dynamic templates and integration

- Build reusable public services and sectors indexes and detail templates.
- Build newsroom listing, filters, pagination, and article-detail templates.
- Implement the production Our Outreach map, country summary panels, shareable
  selection state, and localized country pages.
- Connect people, contacts, related articles, services, sectors, countries,
  partners, and endorsements through the completed admin contracts.
- Add public SEO, structured data, redirects, caching, and revalidation for
  each entity type.

The first Phase 5 slice is implemented for the shared services and sectors
catalogue. `/services`, `/sectors`, and their localized, localized-slug detail
routes now read through anonymous Supabase RLS with explicit canonical active,
per-locale published, and publication-time filters. The templates render
localized icon metadata, controlled rich text, ordered localized team contacts,
publication-aware related newsroom summaries, localized SEO, canonical URLs,
and only the `hreflang` detail alternates that are actually published. Missing
translations are omitted from listings and return the localized not-found
experience on detail routes; English editorial content is not substituted.

	Public catalogue reads use an hourly shared data cache as a safety net and the
admin catalogue, people, newsroom, and media actions invalidate that cache when
related content changes. Request-time streaming remains in place so builds do
not depend on live CMS availability. No schema migration was required. The
current `article_services` and `article_sectors` relationships do not store an
editorial relationship order and are shared with article taxonomy, so this
slice orders related newsroom summaries by localized publication time. A
separate curated relationship contract should be considered only if editorial
testing shows that manual ordering or taxonomy-independent selections are
	required.

	The localized public newsroom slice is now implemented at `/newsroom` and
	`/newsroom/[slug]`. Listing filters use the existing tag, service, sector,
	and author relationships only, with URL state and basic pagination; search
	remains deliberately deferred. Every public newsroom query requests the
	exact locale and explicitly enforces published translation status and
	publication time. Canonical article availability is checked through the
	canonical record, and related people, taxonomy, articles, and media require
	their own active/published exact-locale records before rendering. There is no
	English editorial fallback. Article pages render the existing controlled
	TipTap document contract, localized sources, ordered authors, localized
	cover metadata, taxonomy, explicit ordered related articles, and localized
	SEO/canonical/hreflang metadata. Shared hourly newsroom caching is
	invalidated by newsroom, people, catalogue, and media actions. Catalogue
	related-article summaries now link to the corresponding localized newsroom
	detail routes. No schema migration was required.

	The current schema permits an `external_media_url` as an alternative to a
	managed cover asset but does not have localized external-media metadata; the
	public template therefore exposes it as a safe external link rather than an
	image. The two complete legacy articles use managed cover and inline media and
	demonstrate no need for localized metadata on a link-only escape hatch. The
	contract deliberately remains unchanged: editorially rendered images belong
	in managed media, while external media remains a validated `http`/`https`
	link. Article authors who are not active team members have localized names
	but no public profile route, so only active team-member authors receive a
	profile link. These are existing content-contract limits, not blockers for
	the present test harness.

	The functional public Our Outreach test harness is now implemented at
	`/our-outreach` and `/our-outreach/[slug]`, with locale-prefixed equivalents
	and localized country slugs. The overview uses local 110 m topology, maps its
	ISO numeric feature identifiers to the canonical ISO alpha-2 country codes,
	and provides a keyboard-operable country list alongside the visual map.
	Country selection uses the shareable `?country=XX` URL state and Next.js
	navigation so browser back and forward restore the selected summary. The map
	remains a functional CMS test harness rather than the final Figma frontend.

	Every outreach read explicitly requires the requested locale, published
	translation status, and a publication time not later than the request. It
	also enforces covered countries and active, public, exact-locale regions,
	services, offices, people, and media before rendering. Country summaries and
	details include the supported localized region, country content, ordered
	services and country copy, statistics, offices, people, media, SEO, canonical
	URL, and only actually published `hreflang` alternates. English editorial
	content is never substituted. Shared hourly outreach caching is invalidated
	by outreach, service, people, and media actions. No schema migration was
	required.

	Country-service copy and country-statistic labels do not have independent
	publication fields in the current schema; their public availability inherits
	from the exact-locale published country and, for services, the exact-locale
	published active service. `country_services.coverage_level` is canonical,
	non-localized text, so the localized public harness does not render it.
	Relationship-specific labels should receive a localized controlled contract
	only if realistic editorial testing proves they are required. The low-detail
	local map omits Antarctica and may not draw every small territory, so the
	accessible list remains the authoritative selection surface for every
	published covered country.

	The Brazil golden-country proof exercises four ordered country-service
	relationships and localized bodies as one coherent country publication. It did
	not reveal a workflow in which an individual country-service translation or
	statistic label needs to be staged independently, so both continue to inherit
	their parent publication rules. The legacy sources also provide no controlled
	coverage vocabulary: assigning an enum or publishing the canonical free-text
	`coverage_level` would invent meaning. It therefore remains nullable and is
	not rendered publicly pending an approved localized taxonomy.

	The realistic article set still uses service and sector relations strictly as
	taxonomy: each imported article has one source-supported sector, filtering is
	set-based, and related-card presentation already has a deterministic
	publication-time order. No evidence supports adding `display_order` to
	`article_services` or `article_sectors`; a future curated-navigation feature
	should use a separate ordered relationship rather than changing taxonomy by
	default.

	The minimum public global-content connection was first proved on the home test
	harness (since replaced by the designed homepage, section 15.9). It filters partners and endorsements by active canonical state, exact
	locale, publication status and time; resolves logos only through public managed
	media with localized alt text; and allowlists public site-setting keys and safe
	external URL protocols. This proves the existing contracts without turning the
	test harness into the final Figma global shell.

### Phase 6 — End-to-end editorial validation and remaining Figma pages

Phase 6 started on 2026-09-28 (see the sequencing update above).

- Establish design tokens, local fonts, and the static brand assets (done
  2026-09-28, section 15.3).
- Implement the global shell, navigation, footer, and shared sections (shell
  done 2026-09-28; shared sections follow with the templates).
- Apply the Figma design to the existing public templates (Who We Are and team
  profiles done 2026-09-28, section 15.4; services and sectors done
  2026-09-28, section 15.5; newsroom done 2026-09-28, section 15.7).
- Build the remaining marketing, contact, and legal pages (Why Us done
  2026-10-05, section 15.8, including the reusable endorsements section; Home
  done 2026-10-05, section 15.9, with the reusable partners section and
  without the deferred newsroom feature; Contact done 2026-10-05, section
  15.10, with the CMS office network, the head office from the site settings
  and the SMTP form; the legal pages remain).
- Complete responsive and interaction states.
- Have realistic profiles, articles, services, sectors, countries, and other
  content authored through the admin and reviewed on their public pages.
- Use the resulting editorial feedback to correct admin UX, validation, and
  controlled document schemas before broad content migration.

### Phase 7 — Content migration and hardening

- Migrate the latest authoritative content from `main`.
- Migrate and verify media.
- Review all migrated rich-text content manually.
- Complete redirect mapping.
- Complete accessibility, performance, security, SEO, and browser testing.
- Configure analytics, consent, email, monitoring, and backups.
- Run stakeholder acceptance testing.

### Phase 8 — Launch

- Freeze legacy content changes or repeat the final content delta migration.
- Back up Supabase database and Storage.
- Run final route, content, RLS, auth, and deployment checks.
- Merge/replace the Git production branch.
- Deploy the new website using the completed Supabase `main` branch.
- Monitor errors, forms, auth, analytics, indexing, and performance.
- Retain an application and data rollback plan.
- Create the post-launch persistent Supabase development branch.

## 21. Confirmed decisions

- Keep the existing repository.
- Keep the legacy website on Git `main` until launch.
- Build the new website on Git `v2`.
- Work directly on `v2` by default rather than requiring feature branches.
- Use Next.js App Router and TypeScript.
- Use Supabase for Auth, Postgres, and Storage.
- Develop against the hosted Supabase `main` branch.
- Do not require a local Supabase database.
- Add the admin panel inside the same Next.js application.
- Use `next-intl` for internationalization.
- Store dynamic CMS translations in Supabase translation tables.
- Start with `en`, `de`, `it`, `pt-BR`, and `pt-PT`, while supporting future
  locale additions.
- Keep English as the unprefixed default locale.
- Use locale prefixes for the other languages.
- Use invite-only email/password authentication for colleagues.
- Start with `admin` and `editor` roles, with editors allowed to publish.
- Keep `/newsroom` as the initial public newsroom route.
- Use one canonical `people` system for team profiles and article authors.
- Allow editorial translations to be published independently.
- Use TipTap JSON for article content.
- Use controlled article image layout presets.
- Name the internal map and country feature `Our Outreach`.
- Keep POE as an external-platform navigation link; POE is not part of this
  application or Supabase schema.
- Rebuild Our Outreach instead of copying the legacy component wholesale.
- Use stable ISO country identifiers.
- Use a summary side panel for desktop Our Outreach country selection, followed
  by a dedicated country detail page.
- Implement the new Figma design as the visual source of truth.
- Complete the agreed admin foundation before expanding the public
  CMS-driven frontend beyond the team reference implementation.
- Start the Figma frontend (Phase 6) while content is authored in parallel;
  the combined editorial smoke test runs alongside it.
- Read the design through the Figma MCP server from the duplicated working
  file.
- Port the legacy presentation layer (markup, styling, static assets) as the
  starting point for public components, then correct it against Figma and the
  accessibility requirements.
- Do not export assets from Figma; use existing brand assets or visible
  placeholders logged in `docs/figma-asset-needs.md`.
- Keep the legacy header look and hide-on-scroll behaviour; take navigation
  labels, menu structure, and the language toggle from Figma.
- Serve team pages at the legacy `/who-we-are` and `/who-we-are/[slug]` paths,
  because printed business-card QR codes link to them (section 15.4).
- Omit the services audience selector until decision 23.10 is made; recolour
  the legacy services hero white; show visible placeholders for missing
  service and sector icons; read catalogue related articles through the
  newsroom listing; label them "Articles for {name}" for both services and
  sectors (section 15.5).

## 22. Confirmed implementation defaults

- `d3-geo` and local topology for the Our Outreach map.
- Public media in Supabase Storage with role-protected writes.
- Initial CMS scope covers team/people, articles, authors, tags, sectors,
  countries, services, partners/client logos, endorsements, and offices.
- Use the union of the 12 Figma service-detail designs as the provisional
  service catalogue; keep service publication status and ordering
  admin-managed until stakeholder review confirms the final set.

## 23. Open decisions

These decisions should be resolved before the affected implementation begins:

1. Whether all migrated content must be translated at launch or whether
   translations can be completed progressively.
2. Whether legal content and downloadable documents are admin-managed.
3. Whether static route segments should be translated or only locale-prefixed.
4. Final Our Outreach country fields, service descriptions, contacts, and calls
   to action.
5. Mobile Our Outreach selection, summary, and map/list interaction.
6. Search requirements for the newsroom. A basic title-and-excerpt search is
   implemented (section 15.7); whether body text, authors or a database-side
   full-text index are needed remains open.
7. Analytics, consent, monitoring, SMTP, and spam-protection providers. The
   contact form (section 15.10) uses SMTP through nodemailer with the
   `CONTACT_*` variables (the legacy Zoho mailbox is the expected provider),
   and a honeypot, a signed-cookie minimum fill time and an in-memory per-IP
   rate limit instead of a CAPTCHA. Still open: the production mailbox and
   recipient, whether a CAPTCHA (and which provider) is wanted, and whether the
   rate limit needs a shared store (the in-memory limit counts per serverless
   instance).
8. Post-launch Git and persistent Supabase development branch naming.
9. Final published service catalogue and ordering after stakeholder review.
10. Whether the `Business` / `Government Institute` / `Academia` audience
    selector on the revised Services page (`6393:6`) is editorial data managed
    in the admin, and which services belong to each audience. The selector is
    omitted from the implemented services page until this is decided
    (section 15.5).
11. Whether the newsroom gets a newsletter subscription (Figma `5408:334`
    "Subscribe to Newsletter") and with which provider, and the approved
    vocabulary of article kinds (`articles.kind` is free text; section 15.7
    labels nine keys). The Subscribe button is omitted until this is decided.
12. The Why Us figures ("Our services are provided in XX languages across XX
    countries in XX continents", Figma `5408:311`), and whether the hero gets
    an introduction (Figma shows placeholder text). The page shows provisional
    figures (14 / 10 / 3, derived from its own copy) and no introduction
    (section 15.8).
13. The homepage newsroom feature (Figma `5408:616` "STAY UPDATED WITH OUR
    TIME&PLACE NEWSROOM", "news scroll with slide effect"): which articles it
    shows (featured, latest, by kind), how many, and whether it advances on
    its own. It is deferred and not built (section 15.9). Also whether the
    homepage should show the endorsements band, which Figma does not include.
14. Whether CMS sections must be visible without JavaScript. Streamed
    sections are revealed by inline scripts, so without JavaScript the
    Contact office network and head office, the footer's CMS details and the
    other CMS sections keep their skeletons (section 15.10). Making them part
    of the initial HTML needs prerendered data (`'use cache'`), which makes
    builds depend on the CMS. The contact form itself works without
    JavaScript.
15. The Contact country icon buttons and world map (Figma `5408:348`): the
    artwork, and whether the map should mark the selected country (the legacy
    page showed a pin). Also which offices and countries to publish: only
    Brazil (three offices, English) is published; the legacy page listed
    Austria, Belgium, France, Germany, Ireland, Portugal and Romania too.

## 24. Definition of completion

The rebuild is complete when:

- All approved Figma pages and responsive states are implemented.
- All required legacy content is migrated and verified.
- Colleagues can safely manage agreed content through the admin panel.
- Published content and translations appear correctly on the public site.
- The newsroom supports the approved editorial and discovery features.
- Our Outreach is complete, accessible, responsive, and database-backed.
- Legacy URL redirects and localized SEO are validated.
- RLS and admin authorization are verified.
- Forms, email, analytics, consent, monitoring, and backups are operational.
- Accessibility, performance, security, and cross-browser acceptance criteria
  are met.
- Production deployment and rollback procedures have been exercised or
  documented.

## 25. Immediate next actions

1. Design foundations and the global shell are in place (section 15.3).
	Source the placeholder assets listed in
	[`docs/figma-asset-needs.md`](./figma-asset-needs.md), set the POE link in
	the admin site settings, and review the provisional shell translations.
2. Apply the Figma design to the existing public templates, one template at a
	 time, following section 15.2. Who We Are and team profiles (section 15.4),
	 services and sectors (section 15.5) and the newsroom listing and article
	 detail (section 15.7) are done, and Why Us (section 15.8), Home
	 (section 15.9) and Contact (section 15.10) are built. Author the
	 remaining legacy offices (Austria, Belgium, France, Germany, Ireland,
	 Portugal and Romania, each with city, country email, a published
	 translation per locale and a `country_offices` link) in the admin, set
	 the `CONTACT_*` variables and `CONTACT_FORM_SECRET` for production, and
	 review the provisional `Contact` translations. Our Outreach is next, with template skeletons
	 built on the loading foundation (section 15.6). Review the provisional
	 `Team`, `Catalogue`, `Newsroom`, `WhyUs`, `Endorsements`, `HomePage` and
	 `Partners` translations with the shell strings, confirm the Why Us figures
	 and hero introduction (open decision 12), decide the homepage newsroom
	 feature (open decision 13), author and publish the remaining legacy
	 endorsements and the homepage partners (logo, alt text, website and a
	 published translation) in each locale through the admin (only the English
	 EFFA endorsement and partner exist), upload white line icons for the services and sectors through the
	 admin media library, and decide open decision 11 (newsletter subscription
	 and the article-kind vocabulary). The 16 `placeholder-*` newsroom articles
	 (section 13.5, version 4) are test content and must be deleted before
	 launch.
3. In parallel, colleagues use the admin to add reviewed English summaries and
	 relationships to the 39 remaining published name-only country references,
	 maintain coverage, and author, translate, review, and publish other locales
	 or countries only when intended.
4. Regenerate and verify database TypeScript types through the safely linked
	 Supabase CLI only when a migration changes typed schema. The article-media
	 guard retained its RPC signature, so this slice required no generated-type edit.
5. Keep MailerSend/SMTP configuration and live colleague-auth onboarding
   deferred; retain the existing invite-only architecture without expanding it.
6. Treat the completed Phase 4 admin workflows as stable content contracts and
   defer further admin polish until realistic end-to-end editorial testing.
7. As realistic content becomes available, run the combined editorial
	smoke-test cycle for team, services/sectors, newsroom, and Our Outreach in
	every intended locale, alongside the frontend work. Include unpublished
	translations, URL state and history, filters, pagination, localized
	relationships and media, not-found behavior, and cross-entity revalidation.
8. Use the combined smoke-test findings to correct contract or rendering issues
	before broad content migration.
9. Review the implemented localized route and metadata behavior before
	connecting the redirect registry to public request handling.

## 26. Primary technical references

- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js internationalization guide](https://nextjs.org/docs/app/guides/internationalization)
- [next-intl documentation](https://next-intl.dev/docs)
- [Supabase SSR authentication](https://supabase.com/docs/guides/auth/server-side)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Branching](https://supabase.com/docs/guides/deployment/branching)
- [Supabase GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [TipTap concepts and JSON content](https://tiptap.dev/docs/editor/core-concepts/introduction)
- [D3 geographic projections](https://d3js.org/d3-geo)
