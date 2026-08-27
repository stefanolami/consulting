# Consulting Website Rework — Control Tower

Last updated: 2026-08-27

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
- Contact-form delivery and spam protection.
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

### Phase 6 — End-to-end editorial validation and remaining Figma pages

- Implement the global shell, navigation, footer, and shared sections.
- Build remaining marketing, services, sectors, why-us, contact, and legal
  pages.
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
6. Search requirements for the newsroom.
7. Analytics, consent, monitoring, SMTP, and spam-protection providers.
8. Post-launch Git and persistent Supabase development branch naming.
9. Final published service catalogue and ordering after stakeholder review.

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

1. Regenerate and verify database TypeScript types after the Supabase CLI is
   safely linked back to this project; do not edit the generated file manually.
2. Keep MailerSend/SMTP configuration and live colleague-auth onboarding
   deferred; retain the existing invite-only architecture without expanding it.
3. Treat the completed Phase 4 admin workflows as stable content contracts and
   defer further admin polish until realistic end-to-end editorial testing.
4. Validate the completed public services and sectors templates with realistic
   authored content in every intended locale, including unpublished-translation
   and cross-entity revalidation scenarios.
5. Continue Phase 5 with the localized newsroom listing, discovery, and article
   detail templates; activate links from catalogue-related article summaries as
   part of that slice.
6. Review the implemented localized route and metadata behavior before connecting the
   redirect registry to public request handling.

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
