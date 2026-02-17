# Consulting Website Rebuild — Control Tower (Source of Truth)

Last updated: 2026-01-23
Branch: `v2`

## 1) Project Summary

We are rebuilding the Consulting website from scratch rather than modifying the legacy implementation.

Primary goals:

- Rebuild the website using **TypeScript** (App Router).
- Add **i18n** using **next-intl**.
- Add a **small admin panel** backed by **Supabase** to manage dynamic content.
- Move previously local content (JS data files) into **Supabase**:
    - Team members
    - Newsroom/blog articles (with editor + tagging/filtering)
- Reuse and integrate the **interactive map** from the Funding project (Your Access).
- Implement a **new Figma design** (visual + structural changes).

## 2) Repositories / Code Sources

This workspace contains:

- Current rebuild: `consulting/` (branch `v2`)
- Legacy reference website: `old-consulting/`
- Legacy map source: `old-funding/`

We treat:

- `old-consulting/` as the **behavior + content reference**.
- `old-funding/` as the **map module reference**.
- `consulting/` (`v2`) as the **new production codebase**.

## 3) Current State of the New Codebase (consulting v2)

### 3.1 Tech stack already present

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- shadcn/ui base components (in `src/components/ui/*`)
- next-intl already configured
- Supabase SSR helpers already present

### 3.2 i18n (next-intl) — current wiring

The project already has the correct next-intl “plumbing” in place:

- Routing config: `src/i18n/routing.ts` (locales: `en`, `de`, `it`; default `en`)
- Request config: `src/i18n/request.ts` (loads messages from `messages/{locale}.json`)
- Navigation helpers: `src/i18n/navigation.ts`
- Middleware/proxy: `src/proxy.ts` (combines next-intl middleware + Supabase session refresh)
- Locale layout: `src/app/[locale]/layout.tsx` (validates locale, sets locale, provides `NextIntlClientProvider`)

Messages currently exist at:

- `messages/en.json`, `messages/de.json`, `messages/it.json`

### 3.3 Supabase — current wiring

Supabase is already set up at “starter-kit foundation” level:

- Browser client: `src/lib/supabase/client.ts`
- Server client: `src/lib/supabase/server.ts`
- Session refresh in middleware: `src/lib/supabase/proxy.ts` used by `src/proxy.ts`

This means:

- Auth cookies/session refresh flow is already scaffolded.
- We still need to implement:
    - Database schema + RLS
    - Admin panel routes/UI
    - Content querying/writing

### 3.4 Content sources (temporary)

Currently, team and newsroom content is still local:

- Team: `src/data/team.js`
- Newsroom: `src/data/news.js`

These match the legacy shapes and will be migrated to Supabase.

## 4) Legacy Website (old-consulting) — What We’re Rebuilding

### 4.1 Pages / routes in the legacy site

Legacy routes include (non-exhaustive):

- Home (`/`)
- Who we are (`/who-we-are`) + dynamic team member pages (`/who-we-are/[name]`)
- Services (`/services`)
- Sectors (`/sectors`)
- Why us (`/why-us`)
- Contact (`/contact`)
- Legal pages:
    - Cookie use (`/cookie-use`)
    - Terms (`/terms-and-conditions`)
    - Privacy (`/privacy-policy`)
- Newsroom dynamic articles: `/newsroom/[slug]`

### 4.2 Team model + rendering patterns

Legacy team data is split into two objects:

- `managingTeam`
- `team`

Each member includes:

- `name`, `path` (slug), `img`, `imgName`, `imgTitle`
- `titles[]`
- `contact` (email/phone/address optional)
- `introduction[]`
- `introductionEndorsement?`
- `paragraphs[]` each with `{ title, content[], list?, endorsement? }`

Legacy routes:

- List page renders card grids and links by `path`.
- Detail page resolves member by `path` and renders long-form content.

### 4.3 Newsroom model + rendering patterns

Legacy newsroom articles include:

- `title`, `slug`, `path`, `author`, `date`, `tag`
- `intro` (can contain HTML)
- `image`
- `paragraphs[]` where `content[]` can contain:
    - strings
    - objects like `{ type: 'unordered-list'|'ordered-list', items: [...] }`
- Optional: `tags` (string)
- Optional: `conclusion` with HTML + contact list
- Optional: `sources[]` (URLs)

Legacy rendering:

- Article page looks up by `slug`.
- Article component renders paragraphs and supports basic inline formatting and reference-style superscripts.

Important note for the rebuild:

- In the new CMS, we should avoid free-form unsafe HTML input; we need a controlled editor format.

## 5) Interactive Map (old-funding) — What We’re Reusing

### 5.1 Where it lives

The map feature is implemented as “Your Access”:

- Page: `old-funding/src/app/[locale]/your-access/page.jsx`
- Main component: `old-funding/src/components/your-access/YourAccess.jsx`

### 5.2 Key dependencies & assets

- Uses `react-simple-maps`
- Uses `ZoomableGroup`, `ComposableMap`, `Geographies`, `Geography`
- Uses a topojson file:
    - `old-funding/public/worldNoAntarctica.json`
        - country entries include `properties.name` and `properties.value`

### 5.3 Data model feeding the map

- Regions list + coverage is defined in:
    - `old-funding/src/data/regions.js`
- Country value keys are camelCased and must match `properties.value` in the topojson.
- There is a helper script illustrating how topojson values were generated:
    - `old-funding/src/utils/updateGeoJson.js`

### 5.4 Porting notes

- `old-funding` uses older next-intl APIs and older dependency versions.
- The map itself is mostly isolated UI + data + topojson asset.
- In `consulting v2`, we’ll port the components + data and adapt styling and routing as required by the new design.

## 6) Admin Panel + CMS Requirements

We need an internal admin panel so non-developers can manage content.

### 6.1 Team management (simpler)

Required capabilities:

- CRUD team members
- Manage order / grouping (managing team vs team)
- Upload/manage profile images
- Edit long-form fields (titles, intro, paragraphs, endorsements, contact)

### 6.2 Newsroom management (more complex)

Required capabilities:

- Rich editor for articles (no “developer involvement” to publish)
- Support draft/publish workflow
- Manage:
    - title, slug, excerpt/intro, cover image
    - body content (rich text)
    - authors
    - tags, sectors, categories
    - publish date
- Public-facing functionality:
    - list with filters (tag/sector/author/date)
    - pagination
    - SEO metadata

### 6.3 CMS editor choice (decided)

We will use **TipTap** and store article bodies as **rich-text JSON** (ProseMirror doc).

Key requirement: **full control over image sizing/layout**.

Implementation approach:

- Images are a custom block node (e.g. `ImageBlock`), not arbitrary inline HTML.
- The editor exposes a small set of presets (predictable + on-brand):
    - `content` (within article text column)
    - `wide` (wider than text column)
    - `fullBleed` (edge-to-edge / page-width)
- The public renderer maps these presets to Tailwind wrappers (so design controls styling, not editor defaults).

Uploads:

- Supabase Storage for images (team photos, newsroom cover/inline images)

Permissions:

- Use Supabase Auth + RLS.
- Define “admin/editor” roles (via a profile table or JWT claims).

## 7) Supabase Data Architecture (Draft)

We have not implemented this yet; this section is the target direction.

Team (conceptual):

- `team_members`
    - identity: `id`, `slug`
    - presentation: `name`, `role_title`, `group` (managing/team)
    - content: `titles[]`, `intro[]`, `sections[]` (or normalized tables)
    - media: `image_path`
    - metadata: `sort_order`, `created_at`, `updated_at`

Newsroom (conceptual):

- `articles`
    - `id`, `slug`, `title`, `excerpt`, `content` (markdown or JSON)
    - `cover_image_path`
    - `status` (draft/published/archived)
    - `published_at`
- `authors` (or reuse team_members if appropriate)
- `tags`, `sectors`, `categories`
- join tables: `article_tags`, `article_sectors`, etc.

## 8) Open Decisions / Questions (Must Decide Before Building)

1. CMS editor choice (resolved): TipTap rich-text JSON with `ImageBlock` layout presets (`content` / `wide` / `fullBleed`).
2. Relationship between authors and team members:
    - Same entity, or separate “authors” table?
3. Locale strategy for CMS content:
    - Do we translate newsroom/team into `de/it`?
    - If yes: store per-locale fields (translation tables) or duplicate rows per locale.
4. Public URLs:
    - Keep the same route paths as legacy?
    - Newsroom slug strategy (stable, locale-aware?).
5. Auth strategy:
    - SSO? password auth? invite-only?

## 9) Execution Plan (High Level)

Phase 1 — Foundations

- Confirm Figma page list + design system constraints.
- Finalize Supabase schema + RLS + storage buckets.
- Lock editor format.

Phase 2 — Content Platform

- Implement admin panel skeleton.
- Implement Team CRUD + public pages.
- Implement Newsroom CRUD + public pages + filtering.

Phase 3 — Map Integration

- Port Your Access map into the new site.
- Adapt styling & UX to the new design.

Phase 4 — Remaining Pages + Polish

- Rebuild remaining marketing/legal pages per Figma.
- SEO, sitemap, analytics, performance, accessibility.

## 10) Notes / Caveats

- The current root README is still the Supabase starter kit README; we will replace it once the new site is established.
- Legacy newsroom rendering uses HTML injection for intro/conclusion and inline formatting; in the new CMS we should standardize this safely.
