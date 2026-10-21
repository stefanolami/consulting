# Admin dashboard audit

Audit of the v2 admin (`/admin`) on 2026-10-19, against `next dev` on
`http://localhost:3000` (Next.js 16.2.12, React 19.2.8, TipTap 3.20) and the
hosted development Supabase project. No application code was changed.

Method: every section was exercised in Chrome with a staff session, using
production content from `main` (team, newsroom, sector/service texts, partner
and endorsement logos) and the legacy Our Outreach data. After each save the
database row was read back through the staff session (Supabase REST) and the
public page was checked in the same locale. The code under
`src/app/(admin)/admin/` and `src/components/admin/` was read in full.

Each finding is marked **verified** when it was reproduced in the browser or in
the database, **validator** when it was reproduced by running the shared
validator against the exact JSON the editor produced, or **code** when it comes
from reading the code only.

Screenshots are in [`docs/admin-audit/`](./admin-audit/).

---

## 1. Summary: top 10 problems

| # | Problem | Severity | Where |
| --- | --- | --- | --- |
| 1 | **Fixed in slice 2.** Links, numbered lists and quotations are rejected on save in every rich-text editor except Legal. Each toolbar button produces JSON that the strict validator refuses, and the error appears as raw Zod JSON. | blocker | People, Catalogue, Newsroom, Our Outreach |
| 2 | **Fixed in slice 1.** React resets every `<form action>` after the action. Status selects revert to their first-rendered option (the next save silently unpublishes), media selects revert to "No media" (the next save silently detaches the icon, cover or flag), and a failed save wipes every uncontrolled field. | blocker | All editors except Legal and Media |
| 3 | **Fixed in slice 1.** In People, any server-side validation error throws. The page is replaced by "This page couldn't load" and everything typed is lost. There is no admin error boundary. | blocker | People (create and every save) |
| 4 | **Fixed in slice 2.** Fields labelled optional are effectively required, because the client sends `null` where the schemas expect a string or nothing. Seeded profiles that have a role without a card label (Glenn Cezanne) cannot be saved at all. A country translation cannot be saved once the country has an assigned service or a statistic. | blocker | People, Our Outreach, Site settings |
| 5 | **Fixed in slice 4 (migration `20261020180000_media_storage_api_operations.sql`, applied and verified on 2026-10-21).** Media "Replace file" and "Delete" both fail with `42501 Direct deletion from storage tables is not allowed` because the database functions delete from `storage.objects` directly. | blocker | Media |
| 6 | **Fixed in slice 3.** `published_at` is re-stamped with the current time on every save of a published translation. Article dates and newsroom order change whenever someone fixes a typo, and legacy articles cannot keep their original date. | major | All translation saves |
| 7 | **Fixed in slice 3.** Scheduling does not work end to end. Nothing ever publishes a scheduled row. Every save shifts the time shown in `datetime-local` by the UTC offset (3 h in Bucharest) and the server parses the time in the server's time zone. Archiving an article wipes its schedule, and "Restore" does nothing. | major | Catalogue, Newsroom, Outreach, Partners |
| 8 | **Fixed in slice 1.** Language tabs leak state. Article sources from one locale are saved into another, and office, region, partner and endorsement tabs show the previous locale's values and status. Notices follow you to other tabs, and switching tabs silently discards unsaved edits. | major | Newsroom, Our Outreach, Partners, People |
| 9 | **Fixed in slice 3.** Public pages are revalidated with `revalidateTag(tag, 'max')` (stale-while-revalidate), so the first public view after a save, archive or restore shows the old content. Editors think the save failed. | major | All sections |
| 10 | **Fixed in slice 4.** Alt text is stored per media asset, not per use. Saving a catalogue entry, country, partner or endorsement overwrites the alt text of every other record that uses the same file. In this test, a new service's alt text overwrote the Energy sector icon's. | major | Catalogue, Outreach, Partners, Newsroom |

---

## 2. Cross-cutting findings

These patterns repeat across editors. Fixing the shared piece fixes many
section findings at once; the section IDs each one covers are listed.

### X-01 React form reset desynchronises the form from the database (blocker, bug) — Fixed in slice 1

- **Cause:** every editor except Legal and Media uses `<form action={…}>`, with
  or without `useActionState`. React resets the form after the action, so
  uncontrolled `<select>`s return to their first-rendered option, and inputs
  return to their first-rendered `defaultValue` when the server props did not
  change (for example after a failed save). Controlled inputs keep their React
  state while the DOM is reset, so they show one value and submit another.
  §15.11 fixed exactly this in the legal editor (dispatch from `onSubmit` with
  `preventDefault`, then take the values the database returns); no other editor
  received the fix.
- **Verified effects:**
  - Status reverts after a save. People (en and de), Catalogue (de), Newsroom
    (en, de), Outreach. A second unchanged save unpublished Flávia Guerra's
    German profile (`/de/who-we-are/flavia-guerra` went from live to 404,
    [screenshot](./admin-audit/people-de-unpublished-after-resave.jpg)).
  - Media selects revert after a save or upload. The sector icon was detached
    by the next "Save shared details" while the page said "Shared catalogue
    details saved." (PPL/CAT-05). The article cover select and the country flag
    select show "No media" after save or upload (NEWS-07, OUT-07).
  - A failed save wipes the form. On a rejected create, stable key, name, slug,
    summary, kind, cover, cover alt text and status were all cleared; only the
    editor body and picker state survived
    ([catalogue](./admin-audit/catalogue-link-rejected-form-reset.jpg),
    [newsroom](./admin-audit/newsroom-link-rejected-form-reset.jpg)). In Site
    settings the edited footer note reverted to its saved value.
  - Controlled inputs drift from what they show. After a failed country save the
    statistic "Year" showed empty while state held 2024, so typing produced
    20242024. The social platform select showed "linkedin" while "youtube" was
    saved.
- **Fix:** one shared admin form helper built on the legal pattern: `onSubmit` +
  `preventDefault`, call the action, then reset the fields to the values the
  action returns (or remount the form with a key from `updated_at`). Make the
  media and status selects controlled.
- **Covers:** PPL-02, CAT-04, CAT-05, NEWS-04, NEWS-07, OUT-06, OUT-07, PAR-04,
  SET-02, RED-01.

### X-02 Validation feedback: crashes, raw JSON, no field association (blocker, UX) — Fixed in slice 1

- People actions `throw` (actions.ts:126, 205 and others), which in dev shows
  the overlay and otherwise "This page couldn't load", so all input is lost
  ([screenshot](./admin-audit/people-crash-page-lost.jpg)). No
  `src/app/(admin)/**/error.tsx` exists.
- The other actions return `error.message`. For a `ZodError` that is the JSON
  array of issues, which is shown verbatim
  ([screenshot](./admin-audit/outreach-country-translation-blocked.jpg)).
  `validationMessage()` in `rich-text-rules.mjs` already turns issues into
  sentences, but only Legal uses it.
- No error names or focuses the failing field, and none is linked with
  `aria-describedby` (Legal does this correctly).
- **Fix:** return `{ fieldErrors, formError }` from every action and render
  errors next to the fields, as Legal does. Add `app/(admin)/admin/error.tsx`
  as a safety net.

### X-03 `null` versus `undefined` schema mismatches (blocker, bug) — Fixed in slice 2

**Slice 2:** every optional field of every admin schema now comes from one set
of helpers in `src/lib/admin-schema.mjs` (`optionalText`, `optionalUuid`,
`optionalNumber`, `optionalHttpUrl`, `optionalEmail`, `optional`), which accept
a missing key, `undefined`, `null`, an empty string or whitespace and store
`null`. The actions pass form values through unchanged. The JSON row schemas
(roles, country services, statistics, service copy, statistic labels, calls to
action) live in the same module with unit tests
(`scripts/admin-schema.test.mjs`). The country form no longer sends `locale`
inside its per-locale rows, and empty endorsement attributions are left out.
Verified in the browser: Glenn Cezanne's profile, Sweden with a service
without coverage level and a statistic without source URL, and a call to
action with only its English label.


`optionalText()` is `z.string().optional()`, so it accepts a string or nothing
but rejects `null`. The JSON payloads built by the client send `null` for empty
fields.

| Payload field | Sent when empty | Effect | Status |
| --- | --- | --- | --- |
| People role `cardLabel` | `null` | Any role without "Short card label" (labelled optional) fails. Seeded Glenn Cezanne has three such roles, so his profile can never be saved ([screenshot](./admin-audit/people-existing-profile-cannot-save.jpg)). | verified |
| Country `serviceAssignments[].coverageLevel` | `null` | Assigning a service without a coverage level fails. | verified |
| Country `statistics[].sourceUrl` | `null` | A statistic without a source URL fails. | verified |
| Country `serviceCopies[].summary` and `statisticLabels[].displayValue` | `null`, plus an extra `locale` key that `.strict()` rejects | Every country translation save fails once a service or statistic exists ([screenshot](./admin-audit/outreach-country-translation-blocked.jpg)). | verified |
| Site settings CTA `labels.it`, `pt-BR` and `pt-PT` | `null` | A call to action needs all five labels although four say "(optional)". | verified |

**Fix:** use `z.string().nullish()` (normalised to `null`) in these schemas,
and stop sending `locale` inside per-locale arrays. Add a unit test that feeds
each editor's empty-state payload to its schema.

### X-04 The rich-text contract and its editors disagree (blocker, bug) — Fixed in slice 2

**Slice 2:** one editor, `src/components/admin/rich-text-editor.tsx`, is
configured per content type (catalogue, country, article, profile, legal) and
offers exactly what that contract stores. It saves
`fromEditorDocument(editor.getJSON())` (`src/lib/editor-document.mjs`): link
`href` only, ordered-list `start` only, and each paragraph of a quotation as a
quotation of text; stored documents load through `toEditorDocument`. The
contracts are unchanged and live in `src/lib/rich-text-contracts.mjs` (legal in
`legal-document.mjs`); every error names the block ("Block 9 (quotation): …").
The editor has the legal styles, whole-box editing, an in-page link dialog
(the contract's link rule, script links refused, remove link), auto-links that
follow the contract's link rule, and toolbar buttons that keep the focus in
the text. All 308 stored documents still validate, with byte-identical output
(`npm run rich-text:validate`).


The strict validators (`rich-text-rules.mjs`, `article-document.ts`,
`team-profile-document.ts`) reject what TipTap 3 emits:

| TipTap output | Rejected by | Status |
| --- | --- | --- |
| Link mark `attrs: { href, target, rel, class, title }` | catalogue, country, article: `Unsupported properties: target, rel, class, title` | verified in Catalogue and Newsroom, validator |
| `orderedList` `attrs: { start, type }` | all four: `Unrecognized key: "type"` | verified in People, validator |
| `blockquote` containing `paragraph` | catalogue, country, article: `expected "text"` | validator |

Links are also created automatically by `autolink: true` whenever an editor
types or pastes a URL, so editors hit the error without touching the link
button. The profile validator strips extra link attributes, so People accepts
links but still rejects numbered lists.

Other editor problems, everywhere except Legal:

- The link button uses `window.prompt` and `window.alert`
  (`profile-document-editor.tsx:78`, `catalogue-rich-text-editor.tsx:31`,
  `article-rich-text-editor.tsx:69`). These are native dialogs (and they block
  the browser automation used for this audit, so they were not clicked).
- The shared `profile-rich-text` class has no styles, so headings, lists and
  quotations look like plain paragraphs while editing (verified in all four).
  This is §15.11 fix 2, applied only to Legal.
- Only the first line of the editor box is editable; clicking the empty area
  does nothing (verified). This is §15.11 fix 3, applied only to Legal. In the
  country editor the editor sits inside a `<label>` (`Field`), so a click on
  the empty area moves focus to the Bold button and the keystrokes are lost
  (verified).

**Fix:** normalise in the editor before serialising (keep `href` only; keep
`start`; flatten or accept `blockquote > paragraph`) and make the validators
accept the normalised shape. Move the legal editor's styles, focus behaviour
and in-page link dialog into one shared `ControlledRichTextEditor`.

### X-05 Publication timestamps and scheduling (major, bug) — Fixed in slice 3

*Slice 3:* `published_at` is kept by every save, unpublish, archive and
restore; articles have an editable "Publication date" (it is `published_at`);
"Scheduled" is a published row with a future `published_at`, hidden by RLS
until then and shown as Scheduled in the admin; times are entered in the
editor's time zone and sent as UTC ISO strings (unit tests in
`scripts/publication.test.mjs`); every schedule needs a future time. See the
platform doc §4 and control tower §17.1.


- `published_at` is set to `new Date()` on every save with status Published
  (actions.ts:170, 215, 516, 603, 813, 906; partners/actions.ts:63;
  legal/actions.ts:136). Verified: an unchanged People save moved `published_at`
  from 10:49 to 10:52, and saving Romania's text moved it from the seeded
  2026-09-03 to today. Articles show this date publicly and are ordered by it.
- There is no editable publication date, so legacy newsroom articles (for
  example 24 June 2026 and 10 September 2025 in `main`) cannot be migrated with
  their dates (verified: the new article shows "October 19, 2026").
- Scheduled rows never go live (verified: a service scheduled for 11:08 UTC was
  still hidden at 11:09 and later). The platform document says a job is
  required, but the admin offers "Scheduled" with no hint that nothing will
  publish it.
- `datetime-local` values are rendered with `toISOString().slice(0, 16)`, which
  is UTC shown as local time (article-editor.tsx:43, catalogue-editor.tsx:81,
  country-editor.tsx:71, outreach-record-editors.tsx:41, partner-records.tsx:83).
  Verified: 15:00 local was stored correctly as 12:00 UTC but shown as "12:00",
  so the next save moves it 3 hours earlier. The server parses the naive string
  in its own time zone, which on a UTC host shifts every schedule by the
  editor's offset. `legal-editor.tsx:267` does this correctly.
- Article scheduling has no "must be in the future" check (code).
- **Fix:** keep `published_at` unless the status changes to Published. Add an
  optional publication date for articles. Either build the scheduled-publish
  job or hide "Scheduled". Reuse the legal date helper and send ISO strings with
  an offset.

### X-06 Language-tab state (major, bug) — Fixed in slice 1

- Forms not keyed by locale: the article `TranslationForm`
  (article-editor.tsx:36) keeps `sources` and notice state across tabs, and the
  English source was saved into the German translation (verified).
  `RegionTranslationForm` and `OfficeTranslationForm`
  (outreach-record-editors.tsx:24, 34) and the partner and endorsement
  translation forms (partner-records.tsx:51, 69) keep the previous locale's DOM
  values. The office "de" tab showed the English name, city, address and
  "Published" for a translation that did not exist (verified,
  [screenshot](./admin-audit/outreach-office-de-shows-en.jpg)). Partners and
  endorsements use the same pattern (code).
- Forms that are keyed (People, Catalogue, Country) discard unsaved edits
  silently when you switch tabs (verified in People).
- Only Legal shows each locale's status on its tab and supports arrow keys.
- **Fix:** key every translation form by locale. Warn before switching tabs or
  leaving with unsaved changes. Reuse the legal tab strip (status badge,
  roving tabindex, `aria-controls`).

### X-07 Cache invalidation is stale-while-revalidate (major, bug) — Fixed in slice 3

*Slice 3:* every admin action calls `updateTag(tag)`; the tag-to-action table
is in control tower §17.1. Creating a profile and creating a tag now expire
their tags too.


All admin actions call `revalidateTag(tag, 'max')` (19 calls). In Next 16 that
marks the tag stale: the next request is served the old page while it
regenerates. Verified repeatedly: new team members, archived and restored
profiles, the restored sector and the published article appeared only on the
second or third public load. **Fix:** use `updateTag(tag)` in Server Actions
(read-your-own-writes), or `revalidateTag(tag, { expire: 0 })`.

### X-08 Feedback, pending states and placement (major, UX) — Fixed in slice 1

| Editor | Pending state | Success message | Where messages appear |
| --- | --- | --- | --- |
| People (all forms) | none | none (create redirects silently) | none |
| Catalogue, Newsroom, Outreach, Partners, Settings, Redirects | spinner and disabled button | yes | under the form; several notices can be visible at once and they persist across tabs |
| Media | one global `busy` flag | yes | top of the page, out of view of the inspector buttons |
| Legal | yes | yes, with "Last saved" | next to the button |

No editor shows "last saved by/at" except Legal (§12.1 audit information). No
editor warns about unsaved changes (§12.1). **Fix:** one `SubmitButton`
(`useFormStatus`) and one inline `FormNotice` that clears on change and on tab
switch; add a "Last saved" line.

### X-09 Shared media alt text is overwritten per use (major, bug) — Fixed in slice 4

*Slice 4:* record forms no longer write `media_asset_translations`; the
library alt text is edited only in the Media library. Partner logos keep
their own alt text (`partner_translations.alt_text`, the only per-use alt
column) and inline article images keep theirs (`attrs.alt`); public pages
use it when set, otherwise the library alt text (`src/lib/media-alt.mjs`).
Portraits, icons, covers, flags and outlines use the library alt text,
shown read-only in their editors with a link to the Media library; no
column was added (platform doc §3.2). Verified in the browser: changing
Slice One Partner's logo alt text changed only that logo on Why Us, while
the Slice One Tester profile and the Slice Tester endorsement, which show
the same file, kept "Portrait of the slice tester"; saving Event
Organisation left the Energy icon's alt text untouched. The content log
shows one overwrite during testing (`environment-energy.png`), already
restored; nothing else needed restoring.


`saveCatalogueIconAlt`, `saveCountryMediaAlts`, `saveArticleCoverAlt` and
partners `saveMediaAlt` all upsert `media_asset_translations` for the asset.
Verified: choosing the existing `environment-energy.png` as the icon of the new
service "Event Organisation" and saving its alt text changed the Energy
sector's icon alt text (restored afterwards). **Fix:** store per-use alt text
on the usage (translation rows already have room), or make the media alt text
read-only in these editors with a link to the Media library.

### X-10 Media pickers (major, UX) — Fixed in slice 4

*Slice 4:* one `MediaPicker` (`src/components/admin/form/media-picker.tsx`)
in People, Catalogue, Newsroom (cover and inline image blocks), Our Outreach
(flag and outline), Partners and Endorsements: the chosen image with a
thumbnail; a dialog with every library asset (no 200 or 300 limit), search,
a filter by kind (portrait, icon, cover, logo, flag; derived from current
uses and the upload path), a "none" choice and "Upload new", which uploads
through the Media library's checks and selects the file without leaving the
form, also before the first save. A selected asset outside the filter stays
visible. The per-editor upload buttons, which wrote to Storage from the
browser without the server's content check, are gone.


Icon, cover, flag, outline, logo and portrait pickers are plain `<select>`s of
file names, mixing portraits, flags, icons and PDFs, with no thumbnail. Most
are limited to the newest 200 or 300 assets. Partners, endorsements and
countries cannot upload in place, so a new logo means Media first, then the
editor. Catalogue and Newsroom can upload only after the first save. **Fix:**
one `MediaPicker` dialog (thumbnail grid, type filter, search, "Upload new").

### X-11 Pointer cursor and focus (minor, UI and a11y) — Pointer cursor fixed in slice 1; focus ring fixed in slice 5a

*Slice 5a:* one focus ring across the admin: a 2 px outline offset 2 px,
navy on light surfaces and white in the sidebar (`.admin-ui :focus-visible`
in `globals.css`, and the same values in `Button`, `Input` and the
rich-text editor box).


All 28 `<button>`s, the 5 `role="tab"` buttons and all `<select>`s on the
article page compute to `cursor: default` (Tailwind 4 removed the button
pointer from preflight); only links and the file-upload labels show a pointer.
Focus rings exist on buttons but are faint (0.8 px). **Fix:** a base rule
`button:not(:disabled), [role=tab], select, summary { cursor: pointer }` and a
stronger shared focus ring.

### X-12 Locale tabs and lists lack semantics (minor, a11y) — Language tabs fixed in slice 1; the rest fixed in slice 5a

*Slice 5a:* the Services/Sectors and Partners/Endorsements switches were
`role="tab"` buttons without panels; they are now links in a labelled `nav`
with `aria-current`, since each view has its own URL. Every search and
filter has a label; each country "Coverage level" input is named after its
service. The tag creator and redirect search were already labelled.


`role="tab"` buttons have no `aria-controls`, no tabpanel, no roving tabindex
and no arrow keys (People, Catalogue, Newsroom, Media, Partners). Region and
office tabs are plain buttons without `role`. Several inputs rely on
placeholders as labels (tag creator, redirect search, country "Coverage level",
which shares one `aria-label` across every row).

### X-13 Partial writes are not transactional (minor, bug, code)

Create flows insert the canonical row, then the translation, then relations,
then alt text, as separate requests. A failure part-way leaves an orphan (for
example "The shared profile was created, but the English translation could not
be saved"); a retry then fails on the duplicate stable key. Re-ordering (people,
catalogue, partners) rewrites `display_order` and `updated_by` on every row in
the list (verified: moving one sector touched all seven). **Fix:** Postgres
functions for create, replace-relations and reorder.

### X-14 Stale and inconsistent copy (polish, UX)

The Catalogue, Newsroom and Outreach intros say "Public … templates remain
deferred", and the Catalogue restore panel says "eligible for later public
rendering"; all of these public templates now exist. Headings and button
placement differ between editors: Outreach uses `text-lg` section titles and
puts "Save shared details" at the top, while the others use `font-robo text-2xl`
and put it at the bottom. Admin pages for People, Catalogue, Newsroom and
Outreach entries have no `metadata.title`, so their tabs read "Admin | Time&Place
Consulting" instead of "… | Time&Place Admin".

---

## 3. Findings per section

Format: **ID**: title (severity, type, status). Then reproduction, expected,
actual and fix where it is not obvious from the title.

### Dashboard

- **DASH-01: The summary numbers are hard-coded** **Fixed in slice 5a.** Counts come from count queries on each table (`src/lib/admin-dashboard.ts`); every number was checked against a direct count. (major, bug, verified).
  `page.tsx:98-100` renders "3 / 2 / 5". With 10 profiles and 9 published, the
  dashboard still says 3 and 2. *Fix:* query real counts.
- **DASH-02: The dashboard has none of the §12.1 content** **Fixed in slice 5a.** "Needs attention" lists drafts (countries only when covered, since every country has a seeded draft row), translations going live in the next 14 days, content live in English but not in each other launch language (active `locales` rows; one count per type and language, linked to the filtered newsroom and country lists), and images on live content without alt text in a live language (the public page leaves those out). "Recently updated" lists the ten latest changes with links. (major, UX, code):
  no drafts, no recently updated content, no translation status, no scheduled
  items. *Fix:* "Needs attention" (drafts, scheduled with no job, English not
  published, missing alt text) and "Recently updated" lists.
- **DASH-03: The area cards are not links and four of ten areas are missing** **Fixed in slice 5a.** One linked card per admin area, nine in all, each with its live counts.
  (minor, UX, verified). The cards have `href` values that are never rendered,
  Our Outreach has none, and Media, Partners, Legal, Settings and Redirects are
  absent. The only button is "Manage team".
- **DASH-04: "Good morning" at any time of day** **Fixed in slice 5a.** No greeting; the page is titled "Dashboard". (polish, UI, code).

### Navigation and shell

- **NAV-01: Every navigation link has `aria-current="page"`, and none looks
  active** **Fixed in slice 5a.** `AdminNavigation` (`usePathname`, nested routes match their section) marks one link with `aria-current="page"`, drawn white on the navy sidebar. The narrow-screen bar has its own copy, hidden at desktop widths, so one marked link is ever visible. (minor, a11y and UI, verified; `admin-shell.tsx:85`). All ten links
  have the same `bg-white/10`. *Fix:* use `usePathname()` with a prefix match,
  `aria-current` only on the active link, and a distinct active style.
- **NAV-02: Sign out is unreachable on short viewports** **Fixed in slice 5a.** The links scroll inside the sidebar and the account block with Sign out stays at the bottom (verified at 1440 × 700 and 1536 × 639). (minor, UI, verified).
  The fixed sidebar has no `overflow-y`: at a 639 px viewport "Sign out" sits
  44 px below the bottom edge. *Fix:* `overflow-y-auto` on the nav, or a sticky
  footer.
- **NAV-03: Hidden previous routes keep duplicate `id`s** **Fixed in slice 1.** The upload alt-text fields are read through refs and every shared field gets a `useId` id; hidden previous routes still stay in the DOM. (minor, bug,
  verified). With `cacheComponents`, the previous page stays in the DOM, hidden.
  Upload handlers read `document.getElementById('portrait-alt' | 'new-icon-alt'
  | 'new-cover-alt')`, so two editors in the DOM mean duplicate ids; the first
  match won in this test, but the order is not guaranteed. *Fix:* use refs or
  `useId`.

### People

- **PPL-01: Numbered lists cannot be saved** **Fixed in slice 2.** (blocker, bug, verified).
  Reproduce: in "New team profile", add a numbered list to the introduction and
  click "Create profile". Actual: the page crashes with
  `Unrecognized key: "type"` ([screenshot](./admin-audit/people-numbered-list-error.jpg)).
  See X-04.
- **PPL-02: Publication status resets to Draft after each save** **Fixed in slice 1.** (blocker, bug,
  verified). This is the known issue, and it is still present. Reproduce: on
  the de tab, choose Published, save; the select shows Draft; save again and the
  German profile is unpublished. See X-01.
- **PPL-03: Every validation error crashes the page** **Fixed in slice 1.** (blocker, bug, verified).
  For example a stable key "Alberto Cassia" or a role without a card label. See
  X-02 ([screenshot](./admin-audit/people-role-null-card-label.jpg)).
- **PPL-04: Seeded profiles with roles without a card label cannot be saved**
  **Fixed in slice 2.** (blocker, bug, verified). Glenn Cezanne's profile fails on any "Save en
  translation" (no data was written by the test). See X-03.
- **PPL-05: No pending state and no success message** **Fixed in slice 1.** Create, saves, archive and reorder show a pending state and an inline notice; create opens the new profile. (major, UX, verified).
  "Create profile", "Save … translation", "Save profile details", archive and
  reorder all give no feedback; create redirects without a message.
- **PPL-06: Switching language tabs discards unsaved edits** **Fixed in slice 1.** (major, UX,
  verified). See X-06.
- **PPL-07: New profiles default to order 0 and jump to the top of their
  group** **Fixed in slice 5a.** New profiles, catalogue entries, partners, endorsements, regions and offices go to the end of their list (`endOfListOrder`); the create forms no longer ask for an order. (minor, UX, verified). The three new members appeared above Omar and
  Stefano publicly. *Fix:* default to the end of the group.
- **PPL-08: The directory row controls overflow** **Fixed in slice 5a.** Columns are profile, languages, English status and a fixed actions column; the role appears once. No control is clipped at 1280, 1440 or 1536 px and the Edit buttons line up. (minor, UI, verified). In the
  directory grid the status column is 7 rem but holds the badge and three icon
  buttons, so at 1536 px and below the move-down and Edit buttons are clipped by
  `overflow-hidden`, and the controls shift with the badge width ("draft" versus
  "published")
  ([1280 px](./admin-audit/people-list-1280-clipped.jpg),
  [row alignment](./admin-audit/people-list-row-controls.png)). The role is
  shown twice per row (under the name and in "English title").
- **PPL-09: Reorder ignores search and archive state** **Fixed in slice 5a.** Moves skip archived profiles, the first and last active profiles cannot move further, and reordering is off while a search is active, with a note saying why (`src/lib/display-order.mjs`, unit tests). Catalogue and Partners follow the same rules. (minor, bug, code). Move
  buttons stay enabled on the first and last rows and for archived profiles;
  `movePersonAction` includes inactive members in the sequence.
- **PPL-10: Profile section titles are about 200 px wide and sections cannot be
  reordered** **Fixed in slice 5a.** Section titles take the full width; sections move up and down; removing one asks first (in-page dialog). (minor, UI, verified;
  [screenshot](./admin-audit/people-section-title-narrow.png)). The `Field`
  inside `flex justify-between` does not grow; long titles like "Corporate
  Venture & Open Innovation Leadership in Portugal (2021-2024)" are cut off. No
  up or down controls exist for sections. Removing a section has no undo.
- **PPL-11: Portrait replacement leaves the old asset orphaned** **Fixed in slice 4.** The portrait is chosen or uploaded in the picker, with its alt text and the size limit shown up front, and saved with the profile details; a replaced portrait stays in the library as an unused asset (the "Unused" filter lists it) for reuse or deletion. (minor, bug,
  code). `attachPersonPortraitAction` inserts a new media asset each time. The
  alt text for a new portrait comes from a separate field above the button
  (pre-filled "Portrait of …"), and the size limit is stated only after an
  error. The error text is styled like ordinary help text.
- **PPL-12: Production portraits exceed the limits** (minor, UX, verified).
  `main:public/team/*` includes 19–25 MB PNGs (alberto, christoph, cristiane,
  liga, sebastiano, at 6055×8910) against a 15 MiB client limit and a 16 MB
  Server Action body limit. *Fix:* resize on upload, or document an export size.
- **PPL-13: "Scheduled" maps to Draft** **Fixed in slice 3.** People offer Scheduled like every other translation. (minor, bug, code). The translation
  status select offers no Scheduled, and a scheduled row is rendered as Draft.
- **PPL-14: Archive has no confirmation and no message** (minor, UX, verified).
  The restore copy is accurate; feedback is only the panel changing at the
  bottom of the page.
- **PPL-15: Dashboard-style counters only count locales** **Fixed in slice 5a.** The counters are active profiles, live in English, and live in every language (published translations). (polish, UX, code).
  "Fully translated 0/10" counts rows, not published translations.

### Catalogue (services and sectors)

- **CAT-01: Links, numbered lists and quotations are rejected** **Fixed in slice 2.** (blocker, bug,
  verified and validator). Reproduce: in a new sector, type a sentence with a
  URL (autolinked), a numbered list and `> quote`, then create. Actual: raw
  JSON `Unrecognized keys: "target", "rel", "class", "title"` and the form
  wiped. See X-04.
- **CAT-02: The brief's acceptance case cannot pass** **Fixed in slice 2.** Verified by editing Circular Economy (icon and contacts) with an auto-link, a dialog link, a heading, a numbered list and a quotation; a new entry uses the same editor and contract. (blocker, verified). An
  entry with an icon, a link, a numbered list, a quotation and contacts cannot
  be created. The test entries use only paragraphs, headings and bullets.
- **CAT-03: The icon select is a filename dropdown** **Fixed in slice 4.** (major, UX, verified).
  Icons cannot be uploaded until after the first save, and the list mixes
  portraits and flags. See X-10.
- **CAT-04: The status select reverts after each save** **Fixed in slice 1.** (blocker, bug,
  verified: de "translation saved." while showing Draft). See X-01.
- **CAT-05: Uploading or selecting an icon, then saving shared details,
  detaches it** **Fixed in slice 1.** (blocker, bug, verified). After "Upload replacement" the icon
  select still shows "No icon selected" and does not even list the new file;
  "Save shared details" then stored `icon_media_id = null` with a success
  message. After re-selecting and saving, the select reverted again.
- **CAT-06: Alt text overwrites other entries' icons** **Fixed in slice 4.** (major, bug, verified).
  See X-09.
- **CAT-07: Scheduling never publishes and the time drifts** **Fixed in slice 3.** (major, bug,
  verified). See X-05.
- **CAT-08: "Archived" is offered as an initial status on create** **Fixed in slice 3.** A translation that does not exist yet offers Draft, Scheduled and Published only, in every editor. (polish, UX,
  verified).
- **CAT-09: The Services/Sectors tab is not in the URL** **Fixed in slice 5a.** `?kind=sectors` selects Sectors; the switch is a pair of links with `aria-current`, and the search is in the URL too. (polish, UX, verified).
  Returning from an editor always lands on Services.
- **CAT-10: Two editors write the same relation** (minor, bug, code). The
  catalogue "Related articles" and the article "Related services/sectors" both
  replace rows in `article_services` and `article_sectors`, with no
  concurrency check; the last save wins.
- **CAT-11: Archive and restore work but appear late** **Fixed in slice 3.** Verified: the first public load after archive and after restore. (minor, verified). See
  X-07.

### Newsroom

- **NEWS-01: Links, numbered lists and quotations are rejected** **Fixed in slice 2.** (blocker, bug,
  verified for links, validator for the others;
  [screenshot](./admin-audit/newsroom-link-rejected-form-reset.jpg)). Article
  bodies are where links matter most.
- **NEWS-02: Sources leak between locales** **Fixed in slice 1.** (major, bug, verified). Saving
  German stored the English sources. See X-06.
- **NEWS-03: Restore does nothing** **Fixed in slice 3.** Archive keeps each translation's date and schedule; Restore returns each archived translation to published (or scheduled) at its kept date. (major, bug, verified).
  `setArticleArchivedAction` (actions.ts:900) only stamps `updated_by` on
  restore. Translations stay `archived`, the panel keeps saying "Restore this
  article", and the message claims "Article restored". Archive also clears
  `scheduled_for`, so a scheduled article loses its time.
- **NEWS-04: The status select reverts after each save** **Fixed in slice 1.** (blocker, bug,
  verified). See X-01.
- **NEWS-05: There is no publication date, and dates change on every save** **Fixed in slice 3.**
  (major, bug, verified). See X-05.
- **NEWS-06: Scheduled articles never publish; the time drifts; no future
  check** **Fixed in slice 3.** (major, bug, verified and code). See X-05.
- **NEWS-07: The cover select shows empty after an upload** **Fixed in slice 1.** (major, bug,
  verified). The next "Save shared details" detaches the cover; a published
  article would then fail its own cover rule on the next translation save.
- **NEWS-08: Publishing a new article takes too many steps** **Fixed in slice 4.** The cover can be uploaded from the picker in the create form. (minor, UX,
  verified). A cover must already exist in Media to publish on create; otherwise
  create a draft, upload the cover, then publish.
- **NEWS-09: No search, filter or pagination; titles are not links** **Fixed in slice 5a.** Search (titles and slugs in any language), filters for state, language and kind, 20 per page; the state is in the URL; titles are links. (minor,
  UX, verified). 18 articles in one table; only an "Edit" button opens a row.
- **NEWS-10: Tags are English-only and cannot be edited or archived** (minor,
  UX, code). The tag form uses placeholders as labels. Non-English newsroom
  pages therefore show no tag filter.
- **NEWS-11: Article kind is free text** (minor, UX, verified). It says "a
  controlled key for the approved newsroom format" but accepts any slug.
- **NEWS-12: The inline image block lacks guidance** **Fixed in slice 4, except the click target.** The block uses the picker (thumbnail, upload), plain layout names ("Text width", "Wide", "Full width") and one short help line, and can be added before the library has an image. Clicking into its fields inside the editable surface is unchanged (slice 5). (minor, UX, verified). No
  thumbnail; raw preset names ("fullBleed"); clicking into a block's fields is
  awkward because the block is inside the editable surface; the managed-image
  help sits inside every block.
- **NEWS-13: The newsroom list shows only English state** **Fixed in slice 5a.** Each row shows every language’s state as a chip (published, scheduled, draft, archived, not started). (polish, UX, code).

### Our Outreach

- **OUT-01: A country translation cannot be saved once a service or statistic
  exists** **Fixed in slice 2.** (blocker, bug, verified;
  [screenshot](./admin-audit/outreach-country-translation-blocked.jpg)). See
  X-03. Romania's English text was saved only by submitting with the service
  copy and statistic label payloads emptied; Romania's statistic is therefore
  unlabelled and hidden publicly.
- **OUT-02: Coverage level and statistic source URL are effectively required**
  **Fixed in slice 2.** (major, bug, verified). See X-03.
- **OUT-03: Office (and region) language tabs show the previous locale** **Fixed in slice 1.** (major,
  bug, verified for offices, code for regions;
  [screenshot](./admin-audit/outreach-office-de-shows-en.jpg)). See X-06.
- **OUT-04: Country rich text rejects links, numbered lists and quotations**
  **Fixed in slice 2.** (blocker, bug, validator). It uses the catalogue validator. See X-04.
- **OUT-05: Clicking the editor's empty area focuses the Bold button** **Fixed in slice 2.** A click anywhere in the box focuses the text. (major,
  bug and a11y, verified). See X-04.
- **OUT-06: A failed save resets the covered checkbox and dates and desyncs
  controlled inputs** **Fixed in slice 1.** (major, bug, verified). See X-01.
- **OUT-07: The flag select shows "No media" after a save** **Fixed in slice 1.** (major, bug,
  verified). The next save detaches the flag.
- **OUT-08: About 250 countries in one list** **Fixed in slice 5a.** Search (names and slugs in any language), filters for coverage, region, language and state, 50 per page, all in the URL, with per-language chips. (major, UX, verified). No search,
  no filter by covered, region or status, no pagination; the order column is 0
  everywhere.
- **OUT-09: Statistic labels need a reload; the display override is ignored
  without a label** (minor, bug, code). New statistic rows have no id until a
  reload, so their localized label fields do not appear. "Display value
  override" only updates an existing label row, so typing it first does
  nothing.
- **OUT-10: Renaming a metric key deletes the statistic and its labels**
  (minor, bug, code). `replaceCountryRelations` deletes by missing
  `metric_key`.
- **OUT-11: Offices are listed by stable key** **Fixed in slice 5a.** The country editor lists offices by their English name. (minor, UX, verified). The
  country editor shows `romania-bucharest`, not "Time&Place Bucharest".
- **OUT-12: The new-office form mixes shared and English fields** (minor, UX,
  verified). One grid with no grouping. "Archive office" and "Archive region"
  sit next to "Save shared details" as neutral buttons, with no confirmation.
- **OUT-13: Country service copy appears only for services saved before the
  tab opened** (minor, bug, code). Services added in the same session do not
  appear until a reload.
- **OUT-14: The country page loads slowly** (polish, verified). It runs 14
  parallel queries; it rendered after about 5 s in dev.

### Media

- **MED-01: Replace file fails** **Fixed in slice 4 (migration `20261020180000_media_storage_api_operations.sql`, applied; verified on 2026-10-21: the row switched and the old file was removed).** The function now only switches the row and returns the previous path; the server action uploads first and removes the old file through the Storage API afterwards (`src/lib/media-operations.mjs`). Before the migration was applied, a replace was refused and the uploaded file was removed again (verified on 2026-10-20). (blocker, bug, verified). `replace_media_asset`
  runs `delete from storage.objects`
  (`20260818100000_media_library_safe_operations.sql:62`), which Supabase now
  refuses (`42501 … Use the Storage API instead`). The uploaded replacement is
  removed again, so no data is lost.
- **MED-02: Delete fails** **Fixed in slice 4 (migration applied; verified on 2026-10-21: the throwaway asset, its alt text rows and its file are gone, and an asset used only by an inline article image is refused).** The function keeps every reference check, deletes the row and returns the file location; the server action then removes the file through the Storage API. An interruption leaves an orphaned file, never a row without its file; `npm run media:orphans` and "Check Storage" in the Media library list orphans. (blocker, bug, verified by calling
  `rpc/delete_media_asset` directly on a throwaway asset). Same cause
  (`…safe_operations.sql:160`, `…inline_media_guard.sql:110`). *Fix:* split
  into "check references and delete the row" in SQL and
  `storage.from(bucket).remove()` from the server action.
- **MED-03: Delete uses `window.confirm`** **Fixed in slice 4.** An in-page dialog (`confirm-dialog.tsx`, the slice 1 unsaved-changes dialog made shared): focus starts on Cancel, Escape cancels (verified). (minor, UX and a11y, code;
  `media-library.tsx:65`). Not clicked during the audit. *Fix:* an in-page
  confirmation dialog, as for the legal link dialog. Deleting an in-use asset
  is correctly blocked (the button is disabled and the references are listed,
  verified).
- **MED-04: After a successful upload the page throws** **Fixed in slice 1.** The upload form now goes through the shared form layer, which empties it after a successful upload and selects the new asset. (major, bug, verified).
  `event.currentTarget.reset()` runs after `await`, when `currentTarget` is
  `null` (`media-library.tsx:40, 61`), producing
  `TypeError: Cannot read properties of null (reading 'reset')`. The form stays
  filled (inviting a duplicate upload), `router.refresh()` is skipped, and the
  inspector stays on the previous asset.
- **MED-05: Notices appear at the top of the page** **Fixed in slice 1.** Each inspector form shows its own pending state and notice next to its button; there is no page-wide busy flag. (minor, UX, verified).
  They are out of view when saving alt text, replacing or deleting in the
  inspector. A single `busy` flag disables the whole page.
- **MED-06: One file at a time; no type filter** **Fixed in slice 4.** Several files at once, each checked in the browser before sending (type and size, with a sentence that names the file) and shown with its own status; filters by kind, "Unused" and file type (verified). (minor, UX, verified).
- **MED-07: The preview keeps the previous image until the next one loads**
  **Fixed in slice 4 (code only).** The preview image is keyed by its file URL, so another selection or a replaced file starts a new image; not re-checked visually. (polish, UI, verified).
- **MED-08: The reference scan does not scale** **Fixed in slice 4.** Each table is read once for its rows that have a media id (no `in.(…)` list of every asset id), and only article translations that contain an inline image are loaded. (minor, bug, code).
  `mediaReferencesByAssetId` passes every asset id in one `in.(…)` filter and
  loads all `article_translations` on every Media page load; the URL will
  exceed PostgREST limits as the library grows.

### Partners and endorsements

- **PAR-01: Logos must be uploaded in Media first** **Fixed in slice 4.** (major, UX, verified). There
  is no upload in the editor, and the pickers are filename dropdowns. See X-10.
- **PAR-02: English logo alt text is edited in two places** **Fixed in slice 4.** Only the per-locale "Logo alt text for this partner" remains, and it no longer writes the library alt text. (minor, UX, code).
  "English logo alt text" in shared details and "Localized logo alt text" on
  the en tab write the same thing, and also overwrite the media asset's alt
  text (X-09).
- **PAR-03: Translation tabs are not keyed by locale** **Fixed in slice 1.** (major, bug, code). Same
  pattern as OUT-03. See X-06.
- **PAR-04: Status and media selects revert after save** **Fixed in slice 1.** (blocker, bug, code,
  same mechanism as X-01).
- **PAR-05: Partners have no public consumer** (minor, UX, verified). The
  partners band was removed from Home, so published partners appear nowhere;
  only endorsements show (Why Us). The editor should say where the content
  appears.
- **PAR-06: Several partners can share order 0** **Fixed in slice 5a.** New records go to the end, and equal orders are listed by name and renumbered by the first move. (polish, verified). ADV and
  the seeded EFFA are both 0 until someone reorders.
- **PAR-07: Scheduling has no future check and the time drifts** **Fixed in slice 3.** (minor, bug,
  code). See X-05.

### Legal pages

Legal is the reference implementation: locale tabs with status badges and arrow
keys, field errors with focus, an in-page link dialog with clear refusals
(`/de/cookie-use` was refused with an explanation), a suggested "Last updated"
date, styled editing, and the status kept after save (all verified).

- **LEG-01: `published_at` is re-stamped on every save** **Fixed in slice 3.** (minor, bug, code;
  `legal/actions.ts:136`). Less visible here because "Last updated" is a
  separate field.
- **LEG-02: Delete translation uses `window.confirm`** **Fixed in slice 4.** The shared in-page dialog (verified, cancelled). (minor, UX, code;
  `legal-editor.tsx:226`). Not clicked.
- **LEG-03: SEO title help omits the site-name suffix** (minor, UX, verified).
  Entering "Privacy Policy | Time&Place Consulting" produced the page title
  "Privacy Policy | Time&Place Consulting | Time&Place Consulting". The same
  applies to every SEO title field. *Fix:* "The site name is added
  automatically."
- **LEG-04: The legal editor's patterns are not shared** **Fixed in slice 1.** (major, UX, code). Its
  submit flow, rich-text editor, tabs and field errors should become the shared
  admin components (fix plan slice 1).

### Site settings

- **SET-01: Optional CTA labels are rejected as `null`** **Fixed in slice 2.** (major, bug,
  verified). See X-03.
- **SET-02: A failed save reverts edits; the social platform select desyncs** **Fixed in slice 1.**
  (major, bug, verified). See X-01.
- **SET-03: "Footer note" and calls to action have no public effect** (major,
  UX, verified and code). The footer prints code-owned copy
  ("© 2026 Time&Place Consulting. All rights reserved."), not `footerNote`.
  `approved_calls_to_action` is not read by `public-global-content.ts`. Editors
  change these with no visible result. *Fix:* wire them up, or label them "not
  used yet".
- **SET-04: A new social row defaults to a platform already in use** (minor,
  UX, verified). It defaults to "linkedin"; the select does not exclude used
  platforms, so the save fails on duplicates.
- **SET-05: One save button for four independent settings** (minor, UX,
  verified). An error in any section blocks all four and resets the whole page.
  Removing a social link or CTA has no undo (recoverable only by not saving).
- **SET-06: The POE link works** (verified): the header POE link points to
  `poeontap.com`. The footer contact details and social icons update after a
  reload (X-07).

### Redirects

- **RED-01: Raw JSON errors and a reset form** **Fixed in slice 1.** (major, UX, verified). For
  example "The source must be a single-leading-slash site path." arrives inside
  a JSON array. See X-01 and X-02.
- **RED-02: Empty registry says "No redirects match this view"** (polish, UX,
  verified). It should be an empty state that explains what redirects are for.
- **RED-03: The search input has no label; notices stack** **Fixed in slice 1.** The search input has a label, each row shows one notice (the last action), the edit form closes after a save, and the create notice clears on the next edit. (minor, a11y and UX,
  verified). The create notice stays after later edits; the edit form stays
  open after "Save redirect".
- **RED-04: Dates use US format** (polish, UI, verified). "10/19/2026,
  5:39:07 PM" (`toLocaleString()` with no locale) while the rest of the admin
  uses en-GB.
- **RED-05: The registry is not executed** (info). This is clearly explained by
  the banner and matches §20 Phase 4. Enable and disable work without
  confirmation, which is fine for a reversible toggle (verified).

---

## 4. Content log

All records below were created or changed in the development database on
2026-10-19 by the staff account `stefano`. IDs are full UUIDs unless noted.
Everything under "Created" can be kept as seed content or removed. "Changed"
lists pre-existing records that the tests had to alter.

### Created

| Area | Record | ID | State |
| --- | --- | --- | --- |
| People | Flávia Guerra (`flavia-guerra`) | `3a2f5a0b-91ad-43d0-b2ad-b6c47044efc1` | en + de published; portrait media `dc7a2557-2945-45f1-9e42-999b99f1208f`; intro, endorsement, one section |
| People | Georgios Chatziadam (`georgios-chatziadam`) | `35e2d0bb-9642-449a-8828-3a16ec152cbb` | en published; portrait media `ae3cc5c7-0f54-4fae-8fa6-36f8b54c4728`; two sections |
| People | Alberto Cassia (`alberto-cassia`) | `d86d555e-811d-4003-84c0-b7e8bdec6b2f` | en published, two roles; portrait media `f7b0a694-d72f-41df-afad-7663806caf3a` (resized copy of the 19 MB original); archived and restored |
| Catalogue | Sector Circular Economy (`circular-economy`) | `aa0e911f-565b-439f-926d-8229314335ad` | en + de (Kreislaufwirtschaft) published; icon `ef9c4dbc-920a-40d9-a96c-c54170b9c9f2`; contacts Flávia, Georgios; archived and restored |
| Catalogue | Service Event Organisation (`event-organisation`) | `eb658b33-dbce-4c51-bf92-ef08b2c3fe55` | en scheduled for 2026-10-19 11:08 UTC (never published); icon = shared `environment-energy.png`; contact Alberto |
| Newsroom | Tag Hiring (`hiring`) | `60e36d73-ab55-4fa8-8b7f-097f5bc52160` | en published |
| Newsroom | Article "We are hiring an Advocacy & Communication Intern!" | `a83d2212-cfc0-4e02-a4e2-cc7e6054dd23` | en + de published; cover `13d7ed0a-f265-4875-84ca-42bc89ba6624`; inline image; authors Mathias, Omar; tag Hiring; service Event Organisation; sector Circular Economy; related LATAM article; de translation carries the English source (NEWS-02) |
| Newsroom | Article "Regulating Artificial Intelligence: A Multipolar Perspective" | `50d7da11-8b93-4d4b-b7d7-f80c31a0bf32` | en scheduled for 2026-10-20 06:00 UTC; cover `383ea281-8806-4366-81df-9d1ec1555a7c`; author Guilherme; sector International Trade; related to the hiring article; archived, failed restore, re-scheduled |
| Outreach | Office Time&Place Bucharest (`romania-bucharest`) | `7e545f2b-5fee-4617-9bc4-673f6cb7ed32` | en + de (Bukarest) published; primary country RO |
| Outreach | Romania statistic `population` | `6c206a84-d42a-4571-b24a-15bb52a5c42c` | 19.05 million, 2024, no label |
| Outreach | Sweden statistic `population` | (id not recorded) | 10.6 million, 2024, no label |
| Partners | ADV – German Airports Association (`adv`) | `311c01b9-574b-48e9-9e67-f14ce35ed6c5` | en published; logo `c5f8667e-1bee-4b8b-941f-55af45bfe530` |
| Partners | AIJN – European Fruit Juice Association (`aijn`) | `51508ffd-f6a9-47ce-98d1-54ff1896f95f` | en published; logo `af6ab68e-723f-42f7-8fcb-0703499ab469` |
| Partners | CharIN e.V. (`charin`) | `8ac70fe9-f5ae-4774-ba86-f245aeb45072` | en published; logo `49e4200e-7d60-4fb3-8a5b-f73cdab7265d` |
| Endorsements | Wouter Lox (`wouter-lox-aijn`) | `2c1115fd-4017-413a-b3f8-f9d0638c2abb` | en published; partner AIJN |
| Endorsements | Pieter Allers (`pieter-allers-linkage`) | `b4f55c96-7ca7-438a-a38d-550d0012c788` | en published |
| Legal | Privacy policy, English | (translation of `privacy-policy`) | published; last updated 2026-10-19; short excerpt of the legacy text, not the full policy |
| Legal | Privacy policy, German | (translation of `privacy-policy`) | draft |
| Redirects | `/services/public-funds-business` → `/services/public-funds-finance-procurement` | `80bbfafa-e03c-4f8e-8d5e-6e39bd24ce65` | 301, disabled |
| Media | `newsroom-doors.png` | `13d7ed0a-f265-4875-84ca-42bc89ba6624` | article cover and inline image |
| Media | `newsroom-global-gateway-1600.jpg` | `383ea281-8806-4366-81df-9d1ec1555a7c` | cover of the AI article |
| Media | `sectors-circular-economy.png` | `ef9c4dbc-920a-40d9-a96c-c54170b9c9f2` | sector icon |
| Media | `romania-flag.svg` | `8076d6d6-8a23-4aab-8777-bb42148e3cba` | Romania flag (made for the test) |
| Media | `team-flavia.png`, `team-georgios.jpg`, `team-alberto-1200.jpg` | see People | portraits |
| Media | `partners-adv.png`, `partners-aijn.png`, `partners-charin.jpg` | see Partners | logos; the ADV replace attempt failed (MED-01) |
| Media | `endorsements-linkage.png` ("Audit throwaway asset") | `1f04c1aa-48f5-4838-82fd-e3497a464474` | unreferenced; could not be deleted (MED-02). Remove once deletion is fixed |

### Changed (pre-existing records)

| Record | Change | Original value |
| --- | --- | --- |
| Team order (Team group) | Moving Georgios below Omar rewrote `display_order` and `updated_by` of every Team member, including Omar, Stefano, Test Testf, Guilherme and Mathias | previous orders not recorded |
| Sector order | Moving Circular Economy up rewrote `display_order` of all seven sectors; Space is now 6 | Space was 5 |
| Media `environment-energy.png` (`c08e85a9-d074-4fa5-88d4-ba10ef37fc8a`) | en alt text overwritten by X-09, then restored | "Energy sector icon." (restored; `updated_at` changed) |
| Country RO | flag, last reviewed 2026-10-19, map focus [25, 46] zoom 4, services Government Relations ("Full") and Public Funds, Finance & Procurement ("Partner network"), experts Corina and Alberto, office Bucharest, statistic; en summary, coverage summary, content, flag alt, SEO title; `published_at` re-stamped | covered, region Europe, no relations, `map_config {}`, en published 2026-09-03T10:33:31Z with empty summary |
| Country SE | covered on, last reviewed, service Association Management ("Full"), experts Mathias and Georgios, statistic; en summary, coverage summary, SEO title; draft → published | not covered, en draft, no relations |
| Site settings `contact_footer` | footer note "© 2025 …" → "© 2026 Time&Place Consulting, a pillar of Time&Place Group. All rights reserved." | "© 2025 Time&Place Consulting, a pillar of Time&Place Group. All rights reserved." |
| Site settings `approved_calls_to_action` | added `contact-us` → `/contact` with labels in all five locales | empty list |
| Site settings `social_links` | YouTube added and removed again; the value is the original three links | facebook, instagram, linkedin |

### Slice 2 test content (2026-10-20)

Written through the admin by the staff account `stefano` during the slice 2
browser checks. The test texts can be removed by editing the records.

| Record | Change | Before |
| --- | --- | --- |
| Sector Circular Economy, en (`aa0e911f-565b-439f-926d-8229314335ad`) | Appended: a paragraph with an auto-linked URL, a dialog link, the heading "Slice 2 heading", a two-item numbered list and two quotations; saved twice | 3 blocks; `published_at` 2026-10-19T11:01:52Z (re-stamped, X-05) |
| Article "We are hiring…", en (`a83d2212-cfc0-4e02-a4e2-cc7e6054dd23`) | Appended the same blocks (one quotation); saved three times | `published_at` re-stamped (X-05) |
| Flávia Guerra, en (`3a2f5a0b-91ad-43d0-b2ad-b6c47044efc1`) | Introduction: appended an auto-link, a dialog link, a line break and a numbered list; saved twice | `published_at` re-stamped (X-05) |
| Glenn Cezanne, en (`402f4522-ad61-490d-a823-350c054d4be4`) | Saved once without changes (roles without card labels) | `published_at` 2025-09-01T00:00:00Z, now the save time (X-05); roles deleted and re-inserted with the same ids and values (as every People save does) |
| Country SE | Added service Market Research (`e7e0e751-c852-4a0c-a40d-fa343c73854b`, no coverage level) and statistic `slice-2-check` (`08095e46-37b1-465b-97de-1fdda04ced95`, value 3, no source URL, en label "Slice 2 check value"); en content: the test blocks; en service copy rows created for Association Management (empty) and Market Research (an auto-link and a numbered list); saved twice | one service (Association Management), one statistic (`population`), empty en content; `published_at` re-stamped (X-05) |
| Legal privacy policy, en | Appended an auto-link, a link to `/cookie-use`, a heading, a numbered list and a quotation; saved twice | `published_at` re-stamped (X-05) |
| Site settings `approved_calls_to_action` | Added `slice-2-check` with only an English label, saved, removed, saved | same items as before; all four settings rows have a new `updated_at` |

Not changed: the save attempt on Glenn Cezanne's profile failed validation
before any write. "Test Testf" (`e06cf4ef-3642-483e-80b9-30b3f4afb6e6`), a
pre-existing draft profile, was left as found apart from the reorder above.

### Slice 3 test content (2026-10-20)

Written through the admin by the staff account `stefano` during the slice 3
browser checks, 18:03–18:18 UTC. Scheduling a translation sets its
`published_at` to the scheduled time by design, so the scheduled records keep
that time. No canonical row, relation or text was changed.

| Record | Change | Before → after (`published_at`, status) |
| --- | --- | --- |
| Article "We are hiring…", en (`a83d2212-…`) | Saved twice; date set to 10 Sep 2025 09:00 (Bucharest); archived and restored (en and de); date set back to 20 Oct 2026 14:16 (Bucharest) | 2026-10-20T11:16:49.842Z → 2026-10-20T11:16:00Z, published (minute precision of the date field) |
| Article "We are hiring…", de | Archived and restored with the article | 2026-10-19T11:11:36.154Z, published (unchanged) |
| Article "Regulating Artificial Intelligence", en (`50d7da11-…`) | Legacy `scheduled` row: scheduled for 18:10Z, archived and restored before that time (stayed scheduled), went live at 18:10Z, then set to Draft | `scheduled` (scheduled_for 2026-10-20T06:00Z) → draft, 2026-10-20T18:10:00Z |
| Service Event Organisation, en (`eb658b33-…`) | Legacy `scheduled` row: scheduled for 18:10Z, went live, then set to Draft | `scheduled` (scheduled_for 2026-10-19T11:08Z) → draft, 2026-10-20T18:10:00Z |
| Georgios Chatziadam, en (`35e2d0bb-…`) | Scheduled for 18:10Z; profile archived and restored | 2026-10-19T10:54:07.227Z → 2026-10-20T18:10:00Z, published |
| Country SE, en | Scheduled for 18:10Z | 2026-10-20T14:34:31.658Z → 2026-10-20T18:10:00Z, published |
| Office Time&Place Bucharest, en (`7e545f2b-…`) | Scheduled for 18:10Z, then again for 18:15Z | 2026-10-19T11:14:52.206Z → 2026-10-20T18:15:00Z, published |
| Region "Slice One Region", en (`da2f9043-…`) | Scheduled for 18:10Z | 2026-10-20T09:34:56.182Z → 2026-10-20T18:10:00Z, published |
| Partner CharIN, en (`8ac70fe9-…`) | Scheduled for 18:10Z | 2026-10-19T11:24:23.031Z → 2026-10-20T18:10:00Z, published |
| Endorsement Pieter Allers, en (`b4f55c96-…`) | Scheduled for 18:10Z; record archived and restored | 2026-10-19T11:25:12.277Z → 2026-10-20T18:10:00Z, published |
| Legal privacy policy, en | Scheduled for 18:10Z; saved twice; archived, then published again | 2026-10-20T14:35:56.633Z → 2026-10-20T18:10:00Z, published |
| Sector Circular Economy (`aa0e911f-…`) | Archived and restored; en saved twice | unchanged (2026-10-20T11:15:11.986Z) |
| Glenn Cezanne, en; Country RO, en; Region Africa, en; Partner AIJN, en; Endorsement Wouter Lox, en | Saved twice without changes | unchanged |

Every save also moved the row's `updated_at`. The repair script
(`npm run publication:repair`) was run as a dry run only; nothing was
restored.

### Slice 4 test content (2026-10-20)

Written through the admin by the staff account `stefano` during the slice 4
browser checks, 20:44–20:53 UTC. Migration
`20261020180000_media_storage_api_operations.sql` was not applied, so no
replace or delete succeeded; both were refused before any change.

| Record | Change | Before → after |
| --- | --- | --- |
| Media `slice4-logo.png` (`f6e6d87c-af85-4593-bb1f-67ce94123f7e`) | Uploaded in the Media library, kind Logo, en alt "Slice 4 test logo" | new; unused |
| Media `slice4-flag-a.png` (`83470351-1f53-4f74-aac4-7774d4155d93`), `slice4-flag-b.png` (`6ba14db3-b704-4f0f-b5d0-92c3b0bd7316`) | Uploaded together, kind Flag, no alt text | new; unused |
| Media `slice4-icon.png` (`7db0dc71-775a-435c-9d43-9d8d9cdccff8`) | Uploaded from the icon picker of Event Organisation, en alt "Slice 4 test icon"; not attached (the form was not saved with it) | new; unused |
| Media `endorsements-linkage.png` (`1f04c1aa-…`) | Delete and replace attempted; both refused by the old database functions; the uploaded replacement was removed again | unchanged (deleted on 2026-10-21, below) |
| Service Event Organisation, en (`eb658b33-…`) | Saved without changes; a German translation was refused by the publish check (no German icon alt text) and not saved | unchanged apart from `updated_at` |
| Endorsement Slice Tester (`7c6aa807-…`) | Associated partner set to Slice One Partner, then back to none | partner none → none |
| Partner Slice One Partner, en (`46d815b2-…`) | Logo alt text set to "Slice One Partner logo (slice 4 per-use check)", then restored | "Slice one partner logo" → same |
| Person Slice One Tester (`a09e910a-…`) | "Save profile details" without changes (portrait kept) | unchanged apart from `updated_at` |
| Article "We are hiring…", en (`a83d2212-…`) | Saved without changes (inline image kept) | unchanged apart from `updated_at` |
| Country RO, en | Saved without changes (flag alt text check passed) | unchanged apart from `updated_at` |

No library alt text of an existing asset changed (checked by `updated_at`).
Storage holds 36 files for 36 assets, with no orphan and no missing file
(`npm run media:orphans`). Found but not in any content log, so left as it
is: the German library alt text of `slice1-test-portrait.png`
(`9609ac0c-…`) is "Slice-Eins-Partnerlogo", written by a slice 1 partner
save (X-09), so the German Slice One Tester profile uses that text for its
portrait (not checked in the browser). The original is not known (probably no German text); correct it
in the Media library if the test content is kept.

### Slice 4 checks after the migration (2026-10-21)

Run by the staff account `stefano` at 09:07–09:10 UTC, after
`20261020180000_media_storage_api_operations.sql` was applied.

| Record | Change | Before → after |
| --- | --- | --- |
| Media `endorsements-linkage.png` (`1f04c1aa-48f5-4838-82fd-e3497a464474`) | Replaced with `endorsements-linkage-v2.png` (320 × 180), then deleted | path `library/2026/10/b287c0dd-….png` → `library/other/2026/10/2961f55c-….png` (old file removed) → row, its en and de alt text rows and the file removed |
| Article "Regulating Artificial Intelligence", en (`50d7da11-…`, draft) | An image block with `slice4-flag-a.png` added and saved, then removed and saved | same blocks; still draft; `published_at` unchanged; `updated_at` moved |

Storage and the library hold 35 files for 35 assets, with no orphan and no
missing file. The read-only SQL checks wrote nothing.

### Slice 5a test content (2026-10-21)

Written through the admin by the staff account `stefano` at about 10:06
UTC (13:06 in the browser), during the slice 5a browser checks. Every other check only read
data.

| Record | Change | Before → after (`display_order`) |
| --- | --- | --- |
| Partners (all five) | EFFA moved down, then up again: the visible order is unchanged, and the three shared orders are resolved (PAR-06) | ADV 0, EFFA 0, Slice One Partner 0, AIJN 1, CharIN 2 → ADV 0, EFFA 1, Slice One Partner 2, AIJN 3, CharIN 4 |

ADV was not written (its order did not change); the other four rows have a
new `updated_at` and `updated_by`. Partners have no public page (PAR-05).

---

## 5. Proposed fix plan

Five slices in priority order, each sized for one session. Each lists the
findings it closes.

### Slice 1: Shared form foundation (blockers X-01, X-02, X-08)

Build the shared admin form layer from the legal editor and adopt it in every
editor:

- `useAdminForm` / `<AdminForm>`: `onSubmit` + `preventDefault`, call the
  action, apply the returned values, keep fields after errors, and key
  translation forms by locale.
- Actions return `{ ok, values, fieldErrors, formError }`; People actions stop
  throwing. Use `validationMessage` for readable errors with field focus and
  `aria-describedby`.
- `SubmitButton` with pending state; inline `FormNotice` that clears on change
  and tab switch; "Last saved" line.
- Unsaved-change guard for tab switches and navigation; `admin/error.tsx`.
- Controlled status and media selects.

Closes: PPL-02, PPL-03, PPL-05, PPL-06, CAT-04, CAT-05, NEWS-02, NEWS-04,
NEWS-07, OUT-03, OUT-06, OUT-07, PAR-03, PAR-04, SET-02, RED-01, RED-03, NAV-03.
Acceptance: the known People status case, the sector icon case and the office
tab case all pass in a browser test.

### Slice 2: Schemas and the rich-text contract (blockers X-03, X-04) — done

- `nullish` optional fields; no `locale` inside per-locale arrays; a unit test
  per editor that runs its empty payload through its schema.
- Normalise TipTap output (link `href` only, ordered list `start` only,
  quotation handling) and accept it in all four validators, with tests built
  from real `editor.getJSON()` output.
- One shared `ControlledRichTextEditor`: legal styles, whole-box editing, the
  in-page link dialog (no `window.prompt`), not wrapped in `<label>`.

Closes: PPL-01, PPL-04, CAT-01, CAT-02, NEWS-01, OUT-01, OUT-02, OUT-04, OUT-05,
SET-01. Acceptance: the brief's sector (icon, link, numbered list, quotation,
contacts) and a country with services, statistics and labels save in every
locale.

### Slice 3: Publication model and caching (X-05, X-07) — done

Done on 2026-10-20. Differences from the plan below: no job is needed
(scheduling is a future `published_at` on a published row); the date of an
article is `published_at` itself; migration
`20261020120000_retire_scheduled_status.sql` (data only, not applied yet)
converts the rows still stored as `scheduled`; `scripts/repair-published-at.mjs`
(dry run by default) restores the three re-stamped dates the content log
records. Also in this slice: team-profile links accept only http, https and
mailto, and every public rich-text renderer shows a link it would refuse as
plain text.


- Preserve `published_at` unless the status changes to Published; add an
  editable publication date for articles (needed for the legacy migration).
- A scheduled-publish job (Supabase cron or a Vercel cron route), or remove
  "Scheduled" until it exists; a future-time check everywhere.
- Shared time-zone-safe `datetime-local` helpers (from `legal-editor.tsx:267`)
  and ISO strings with offset to the server.
- Article archive keeps the schedule; restore actually restores (status per
  translation, or a separate `is_active` like the other entities).
- `updateTag` instead of `revalidateTag(…, 'max')`.

Closes: NEWS-03, NEWS-05, NEWS-06, CAT-07, CAT-11, PAR-07, LEG-01, PPL-13.

### Slice 4: Media (MED-01, MED-02, X-09, X-10) — done

Done on 2026-10-20. Migration `20261020180000_media_storage_api_operations.sql` was applied and replace and delete
verified on 2026-10-21. Differences from the plan below: no
per-use alt columns were added (X-09 above, platform doc §3.2); the Storage
check in the Media library and `npm run media:orphans` take the place of a
cleanup job; PPL-12 (oversize production portraits) gets a clear size
message only, and resizing stays in slice 5.


- Replace and delete: SQL keeps the reference check and the row change; storage
  removal through the Storage API in the server action; migration via git
  (the Supabase GitHub integration applies it on push).
- In-page confirmation dialogs instead of `window.confirm` (Media, Legal).
- Fix `event.currentTarget` after `await`; inspector-local notices; per-action
  pending state.
- Per-use alt text (or read-only shared alt text with a link to Media).
- `MediaPicker` dialog with thumbnails, type filter, search and in-place upload,
  used by people, catalogue, newsroom, outreach and partners; clean up orphaned
  portraits; scalable reference scan.

Closes: MED-01 to MED-08, CAT-03, CAT-06, PAR-01, PAR-02, PPL-11, NEWS-08,
NEWS-12, LEG-02.

### Slice 5: Navigation, dashboard, lists and accessibility polish

*Slice 5a (navigation, dashboard and list tooling) done on 2026-10-21; no
migration.* Closed: NAV-01, NAV-02, X-11, X-12, DASH-01 to DASH-04, PPL-07
to PPL-10, PPL-15, CAT-09, NEWS-09, NEWS-13, OUT-08, OUT-11, PAR-06. The
pure rules have unit tests: list URLs (`scripts/admin-list-query.test.mjs`),
ordering (`scripts/display-order.test.mjs`) and the dashboard
(`scripts/admin-dashboard-rules.test.mjs`). Slice 5b keeps copy and
consistency (X-13, X-14, LEG-03, SET-03 to SET-05, RED-02, RED-04), NEWS-10,
OUT-09, OUT-10, OUT-12 to OUT-14, CAT-10, PPL-12, PPL-14 and MED-07. Open
decisions, not implemented: NEWS-11 (article kinds), PAR-05 (partners have
no public page) and RED-05 (the registry is not applied).

- Active navigation with a single `aria-current`; scrollable sidebar; pointer
  cursor and stronger focus rings; tab semantics from Legal everywhere; labels
  for placeholder-only inputs.
- Real dashboard: counts, "needs attention", "recently updated", links to every
  area.
- List tooling: search, filters and pagination for countries and articles; the
  People row layout at 1280 and 1440 px; the tab in the URL; titles as links.
- Copy and consistency: remove stale "deferred" text, page titles, consistent
  headings and button placement, SEO-title hint, wire up or label the footer
  note and CTAs, tag management, a sensible default order for new records,
  new social rows excluding used platforms, en-GB dates.

Closes: DASH-01 to DASH-04, NAV-01, NAV-02, PPL-07, PPL-08, PPL-09, PPL-10,
PPL-12, PPL-14, PPL-15, CAT-08, CAT-09, CAT-10, NEWS-09, NEWS-10, NEWS-11,
NEWS-13, OUT-08 to OUT-14, PAR-05, PAR-06, LEG-03, SET-03 to SET-05, RED-02,
RED-04, X-11 to X-14.

---

## 6. Not tested, and why

- **Native-dialog actions:** Media "Delete asset", Legal "Delete translation"
  and the rich-text "Add link" buttons (People, Catalogue, Newsroom, Outreach)
  open `window.confirm`, `window.prompt` or `window.alert`, which block the
  browser automation. They are recorded as findings. Delete itself was tested
  by calling the database function directly (MED-02). *Slices 2 and 4:* all
  three are in-page dialogs now and were tested in the browser.
- **Server log:** the dev server was already running in a terminal outside this
  session, so its log could not be read. Browser console errors were captured
  (MED-04 and the dev overlays). The dev-only "Invariant: … cookies" failure
  recorded in §15.11 did **not** occur: every Server Action worked under
  `next dev`.
- **Exact 1280 and 1440 px windows:** the Chrome window is maximised at
  1536 CSS px (DPR 1.25) and could not be resized. 1280 px was approximated by
  zooming the page root, so breakpoint-dependent layout below `lg` was not
  covered. *Slice 5a:* every admin area was loaded in a same-origin iframe of
  exactly 1280 × 900, 1440 × 900, 1536 × 864 and 1440 × 700 px, so media
  queries saw those widths; widths below `lg` were still not checked.
- **Keyboard-only use of every form:** checked on the article editor (focus
  order and rings), the legal tabs (arrow keys) and the rich-text editors;
  screen-reader announcement was not tested.
- **Region editor, endorsement and partner language tabs:** findings come from
  the code (identical to the verified office pattern), not from the browser.
- **Concurrency (two editors on the same record):** not tested; CAT-10 and
  X-13 come from the code.
- **Scheduled publishing after the job exists:** there is no job to test
  against. *Slice 3:* no job is needed; scheduling was tested end to end in
  the browser (§4, slice 3 test content).
- **Production build:** everything ran against `next dev`. Stale-while-
  revalidate (X-07) should be re-checked against `next build && next start`.
  *Slice 3:* also checked against `next dev` only (`next build` passes);
  `updateTag` is the documented immediate-expiry path in both modes.
