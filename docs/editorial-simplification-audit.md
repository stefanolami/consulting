# Editorial simplification audit

A light-touch review of the v2 admin from the point of view of an everyday
editor, carried out on 2026-10-29 on branch `v2` (commit `b5748e2`) against
the development database, signed in as `stefano` (admin). No code, schema or
seeds were changed. Test content is listed in section 6.

The goal is a little simplification, not a rework: the publishing flow, the
screen layouts and the schema stay as they are. The earlier bug and UX audit
is in [`admin-audit.md`](./admin-audit.md) and is not repeated here.

**The editor:** a non-technical colleague who edits a few times a month and
does not read help text. Their tasks: publish a news article, fix a typo, add
or update a team member, translate an item, update a country, add an
endorsement, and rarely change contact details.

---

## 1. Summary

Walking through those tasks, most of the friction comes from fields the
editor never needs to touch but sees first, and from labels written for a
developer:

- **Publishing an article** shows 21 inputs; the cursor starts in "Stable key
  \*", and eleven controls come before the title. The editor also has to
  type a URL slug.
- **Adding a team member** asks for a stable key and a URL slug, both
  required and both typed by hand, plus an "Order within group" number.
- **A country page** shows map coordinates, ordering and statistic metric
  keys before the text, and the country list opens on all 249 countries
  rather than the 41 covered ones.
- **Language tabs** are labelled `de`, `pt-BR`, `pt-PT`, and fields are
  called "Localized title", "Excerpt", "Controlled article content".

The proposed changes, all in one session, no schema change:

1. **Move technical fields out of the way** into a collapsed "Advanced"
   section at the bottom of each editor, visible to everyone.
2. **Prefill stable keys and slugs** from the title or name (still editable).
3. **Clearer labels** (language names, plain field names).
4. **Small defaults:** the country list opens on covered countries; Redirects
   leaves the editor's navigation.

Effect on the most frequent tasks (inputs visible when the page opens):

| Task | Inputs today | After |
| --- | --- | --- |
| Publish an article | 21, two of them invented by the editor (key, slug) | 19, none invented; the title comes first |
| Add a team member | 18, two invented | 15, none invented |
| Edit a country page | 36 | about 26 |
| Create a service, region, office, partner or endorsement | one stable key each | none |

Section 4 lists optional extras, and section 5 ideas deliberately left out.

---

## 2. Walkthrough notes

Each task was done end to end with real content from `main`
(`src/data/newsroom.js`, `team.js`, `data.js`).

| Task | What happened | Friction that this audit addresses |
| --- | --- | --- |
| Publish an article ("We are hiring…") | One long form (4.6 screen heights); created and published | Stable key first, with autofocus; slug typed by hand; "Localized title", "Excerpt", "Controlled article content" |
| Fix a typo (Market Research summary) | One save; worked | The text sits below "Stable key" and "Display order"; "Save en translation" |
| Add a team member (Marie Kubasiak) | Created and published | Stable key and "English URL slug" both typed; "Order within group" duplicates the list's arrows |
| Translate the article into German | Published | Tabs show codes, not language names |
| Add a service to Romania | Worked after two saves | List opens on all 249 countries; map focus, order and metric keys shown first |
| Add an endorsement (Pieter Allers) | Created and published | Stable key |
| Change contact details | Inspected only | Nothing in scope (see 4) |

Other friction was noted but is outside this light-touch scope (section 5).

---

## 3. Proposed changes

> **Implemented on 2026-10-29** on `v2`: 3.1 to 3.4 as proposed, no schema
> change. `AdvancedSection` is in `src/components/admin/form/`, and the slug
> helper is `src/lib/slug.mjs`. A few details differ from the text below:
> the region create form has no shared section (all its fields are in
> Advanced); the Media library's Check Storage has its own Advanced section
> at the bottom of the page; tag and region slugs keep their own labels and
> get no "page address" hint, because they are not page addresses; the
> country list's "All countries" option is `?coverage=all`; and the article
> title is not focused on load, because it sits below the shared details.
> Editors cannot open Redirects or run its actions. Its entries are also
> left out of their dashboard's "Recently updated" list.

### 3.1 Move technical fields into a collapsed "Advanced" section

An `AdvancedSection` component: a collapsible section titled "Advanced",
closed by default, placed at the bottom of the form it belongs to (just above
its Save button), and visible to every staff member. No role check. The
fields stay in the form, so they are submitted and saved exactly as today;
only their position changes.

| Screen | Fields moved to Advanced |
| --- | --- |
| Article | Stable key, Featured order |
| Tag | Stable key, Display order |
| Person | Stable key, Order within group |
| Service / sector | Stable key, Display order |
| Country | Region, Display order, Optional map focus (longitude, latitude, zoom), Country statistics (metric key, value, unit, year, source, order) and their labels |
| Region | Stable key, Display order, Map longitude / latitude / zoom |
| Office | Stable key, Display order |
| Partner / endorsement | Stable key, Display order |
| Media library | Storage path, Original filename, Check Storage |

The SEO title and description fields stay visible: they are optional and
clearly labelled, and moving them is a matter of taste rather than
confusion.

Country statistic labels live in the per-language form, so that form gets its
own Advanced section for them.

**Details to get right:**

- A collapsed section must open by itself when a field inside it has a
  validation error (for example a duplicate stable key), otherwise the error
  is invisible. Use a `<details>` element or a controlled disclosure that
  opens when the form reports an error for one of its fields.
- Required fields inside it (stable keys) are filled by the prefill in 3.2,
  so the editor does not need to open it to save.
- The section's open or closed state does not need to be remembered.

### 3.2 Prefill stable keys and slugs

On create, fill the stable key and the English URL slug from the title or
name as the editor types (lowercase, hyphens, accents removed), until the
editor edits them by hand. They remain editable and the server rules are
unchanged; a duplicate is still refused on save. On a new translation, fill
the slug from the translated title the same way.

Only on create: existing keys are never changed, because the bootstrap
scripts match records by stable key.

Add one line of hint under the slug of a published item: "Changing this
changes the page address; old links will stop working." (Redirects are not
applied to the site.)

### 3.3 Clearer labels

| Today | Proposed |
| --- | --- |
| Language tabs `en`, `de`, `it`, `pt-BR`, `pt-PT` | English, German, Italian, Portuguese (Brazil), Portuguese (Portugal) |
| Save en translation / Save de translation | Save English / Save German |
| Localized title / name | Title / Name |
| Localized URL slug | Page address (slug) |
| Excerpt | Summary (shown on the newsroom card) |
| Controlled article content / Controlled rich-text content | Text |
| Landing summary | Summary |
| Ordered authors | Authors |
| Explicitly related articles | Related articles |
| Display name | Name |
| Public email / Public phone | Email / Phone (shown on the website) |
| Country experts | Contact people |
| Detailed content (country) | Country page text |
| Canonical display name (partner) | Company name |
| Attribution name / Localized attribution title | Person's name / Title and company |
| Localized quote | Quote |

The hints that explain technical behaviour can stay; they are harmless.

### 3.4 Small defaults

- **Country list:** default the Coverage filter to "Covered" (41 rows instead
  of 249). The filter can still be cleared.
- **Navigation:** hide Redirects for editors and guard the route with
  `requireAdmin()` (defined in `src/lib/auth/authorization.ts`, unused today).
  The registry is not applied to the site, so editors have no use for it.

### 3.5 Implementation (one session)

1. `AdvancedSection` component (collapsed, opens on a field error); move the
   fields in 3.1.
2. Slug helper and prefill (3.2).
3. Labels (3.3).
4. Country list default (3.4).
5. Redirects: hide the navigation item for the editor role and guard the
   route (the only role check in this slice).
6. Check each editor: create and save with Advanced closed, provoke a
   duplicate-key error and confirm the section opens; check Redirects with an
   editor account.

No schema change, no change to the public site or the publication rules.

---

## 4. Optional: fields the public site never shows

These fields are stored and editable but appear nowhere on the public site.
Hiding them (UI only; the data stays) would shorten some forms further. Each
is your call: some may be wanted later.

| Field | Where | Why it might stay |
| --- | --- | --- |
| Coverage level per country service ("Full", "Partner network") | Country | Could be shown on the country page later |
| Office latitude and longitude | Office | Could place a pin on the Contact map (open decision 23.15) |
| Office primary country | Office | Informational for the admin |
| Partner website URL | Partner | Could link the logo on Why Us later |
| Partner localized description | Partner | Could be shown later |
| Region URL slug | Region | Not used in any URL today |
| Footer note | Site settings | The page already says it has no visible effect |
| Approved calls to action | Site settings | The page already says no page uses them |

A middle way is to move them into the collapsed Advanced section with the
fields in 3.1 instead of hiding them.

---

## 5. Noted, deliberately left out

Ideas that came up during the walkthrough but would change how editing
works. Listed only for the record; none is proposed now.

- Save draft / Publish buttons instead of the status select.
- English-first editing with translations as a separate step, and the English
  text shown beside the translation fields.
- Asking for missing image alt text inline instead of in the Media library
  when publishing a translation.
- Attaching a company logo directly to an endorsement instead of through a
  partner record.
- A task-oriented dashboard for editors.
- Locking slugs after publication.

---

## 6. Content log

All writes were made on 2026-10-29 through the admin at
`http://localhost:3000` by `stefano`, between 13:54 and 14:00 local time
(Europe/Bucharest). The three created records were **archived** afterwards
(hidden from the site, restorable), not deleted: the admin has no permanent
delete for them.

### Created (now archived)

| Area | Record | ID | State |
| --- | --- | --- | --- |
| Newsroom | Article "[Audit] We are hiring an Advocacy & Communication Intern!" (`audit-simplification-hiring`) | `c3229ebc-f9ea-4193-aec4-16d7bfd82549` | en (`audit-simplification-hiring`) and de (`audit-simplification-praktikum`) published, then archived; cover `newsroom-doors.png`; tag Hiring; no authors |
| People | "[Audit] Marie Kubasiak" (`audit-marie-kubasiak`) | `ca0d1350-d595-495d-8aab-bbac762a9412` | en published, team group Team; one role, introduction, one section; no portrait; archived |
| Endorsements | "[Audit] Pieter Allers" (`audit-pieter-allers`) | `7b796bf2-6957-4bb2-9018-fb425aa942fa` | en published; no partner or portrait; archived |

### Changed and restored

| Record | Change | Final state |
| --- | --- | --- |
| Service Market Research, en (`e7e0e751-c852-4a0c-a40d-fa343c73854b`) | Summary edited and restored (two saves) | Text as before; `updated_at` changed |
| Country RO | Service Market Research added, then removed (two saves) | Services as before; relation rows rewritten; `updated_at` changed |

---

### Implementation check (section 3)

These records were created on 2026-10-29 between 18:00 and 18:17 local
time through `http://localhost:3000` by `stefano`, then archived. All of
them were drafts in English only.

| Area | Record | ID | State |
| --- | --- | --- | --- |
| Newsroom | Article "[Test] Editorial simplification: Café & Straße One" (`test-editorial-simplification-cafe-strasse-one`) | `eb8b874a-50f2-4fda-8588-9c6eb76b582a` | Archive run; it had no published or scheduled translation, so it stays an English draft |
| Newsroom tags | "[Test] Simplification tag" (`test-simplification-tag`) | `7d335d99-1cb8-473e-927a-7c6a79196ecf` | Archived |
| People | "[Test] Jörg O’Neill" (`test-jorg-oneill`) | `04cda983-139a-48a0-8c51-d6cd49ec52a7` | Archived |
| Catalogue | Service "[Test] Simplification Service" (`test-simplification-service`) | `8078e9a6-669f-4e18-a3c4-1f65a2c402c6` | Shared details saved once, then archived |
| Our Outreach | Region "[Test] Simplification Region" (`test-simplification-region`) | `bc798a01-ad00-40ec-a0a3-59d4f52836d0` | Archived |
| Our Outreach | Office "[Test] Simplification Office" (`test-simplification-office`) | `86d42d2b-e25b-4d34-9307-fe749a0ebae1` | Archived |
| Partners | Partner "[Test] Simplification Partner" (`test-simplification-partner`) | `f9bf190f-fb1e-46b4-bda3-19110ea55eac` | Archived |
| Partners | Endorsement "[Test] Simplification Endorser" (`test-simplification-endorser`) | `94dace99-476d-4e4f-ad46-71d7622df495` | Archived |

Romania was opened, and its English form was submitted once with a
statistic display value and no label, to check the error. That save was
refused, so nothing was written.

---

## 7. Not assessed

- **Uploads:** no image file was available, so the upload dialogs were read
  in code only.
- **The editor role:** only an admin account was available. Both roles see
  the same screens today and will after this slice, apart from Redirects,
  which needs one check with an editor account.
- **Legal pages, offices, regions, tags and the Media library detail panel**
  were reviewed from code and labels, not walked through.
- **Mobile widths** were not checked.
