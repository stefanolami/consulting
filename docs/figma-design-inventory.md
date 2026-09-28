# Figma design inventory

Status: initial inventory complete; re-verified against the working copy

Inspected: 2026-07-29

Re-verified: 2026-09-28

Working Figma file (read through the Figma MCP server):
[T P Websites](https://www.figma.com/design/YWMif5AfcKTi4QTZghneHG/T-P-Websites?node-id=5408-616&m=dev)
— file key `YWMif5AfcKTi4QTZghneHG`, single page `0:1`.

Original source file (work account, not MCP-accessible):
[T P Websites](https://www.figma.com/design/EkXraQhczuS2gxSS36eaxq/T-P-Websites?node-id=5408-187&m=dev)

The working file is a duplicate of the original. Every frame node ID listed in
this document was preserved and resolves in the working file. If the original
design changes, the working copy must be refreshed deliberately; it does not
sync automatically.

The working file defines no Figma variables (`get_variable_defs` returns an
empty set), so design tokens are defined in code from observed values (see
section 5).

## 1. Scope

The Figma file contains designs for several websites on one large page. Only
these two labelled areas belong to this rebuild:

- `georgios design proposal` — desktop.
- `georgios design proposal (FOR mobile)` — mobile.

Everything outside those areas is out of scope unless it contains an asset that
is deliberately reused later.

The Figma proposal is the visual source of truth. It is not a complete content,
responsive, accessibility, or interaction specification. The legacy Consulting
and Funding projects remain references where Figma is silent.

## 2. Inventory summary

The relevant proposal currently contains:

- 50 desktop frames, including repeated content-detail variants and five
  Our Outreach interaction states.
- 9 mobile frames.
- Desktop examples for all 12 service detail pages and all 20 sector detail
  pages.
- Mobile examples for the seven main marketing pages, one service detail, and
  one sector detail.
- No mobile designs for Our Outreach, country details, team profiles, or
  publication details.

The many service and sector frames are content variants of shared templates.
They must not become separate hard-coded page implementations.

## 3. Desktop frames

### 3.1 Main pages

| Design | Figma node | Intended template/route |
| --- | --- | --- |
| Homepage | `5408:616` | `/` |
| Who We Are / team listing | `5408:15` | `/who-we-are` |
| Services | `5408:128` | `/services` |
| Services (revised, all 12 services) | `6393:6` | `/services` |
| Sectors | `5408:187` | `/sectors` |
| Why Us | `5408:311` | `/why-us` |
| Publications | `5408:334` | `/newsroom` |
| Contact | `5408:348` | `/contact` |

### 3.2 Our Outreach

The frames themselves retain the former `YOUR ACCESS` name. The confirmed
product name is **Our Outreach**, and the intended internal route is
`/our-outreach`.

`POE` is a separate external platform on another project and domain. It remains
in the website navigation as an external link; it is not this map feature and
is not implemented in this repository.

| State | Figma node | Interpretation |
| --- | --- | --- |
| Global map | `5741:2` | Region list plus full-world map |
| Region selected | `5741:51` | Europe selected and map zoomed |
| Country selected | `5741:100` | Country list expanded and Romania highlighted |
| Country summary | `5741:156` | Desktop side panel with summary, coverage, services, and `Read more` |
| Country detail | `5741:293` | Dedicated Romania detail page |

The intended desktop flow is:

1. Select a region.
2. Select a country from the list or map.
3. Open a summary side panel without leaving the map.
4. Follow `Read more` to the localized country page.

The map itself should be rebuilt with geographic data and `d3-geo`; the visual
map in Figma is a reference, not an exportable production component.

### 3.3 Publication and team detail examples

| Design | Figma node | Shared template |
| --- | --- | --- |
| Newsletter/article detail | `5534:989` | `/newsroom/[slug]` |
| Video or podcast detail | `5542:2` | `/newsroom/[slug]` with media-specific blocks |
| Corina Cătălina Gheorgheza profile (`OUR TEAM`) | `5494:162` | `/who-we-are/[slug]` |
| Glenn Cezanne profile | `5408:536` | `/who-we-are/[slug]` |
| Wilson Caldeira profile | `5494:891` | `/who-we-are/[slug]` |
| Benjamin Wunnerlich profile | `5494:972` | `/who-we-are/[slug]` |

These frames establish variant content, not four different profile templates.
One profile renderer should support optional biography sections, quotes,
credentials, languages, contact details, and related articles.

Implemented 2026-09-28 (control tower section 15.4). Variation observed across
the four frames: Corina has no portrait, Wilson and Benjamin have no articles,
Benjamin's hero omits the name (treated as a design slip), section counts range
from three to six, and languages appear as an ordinary section. The contact
blocks show an office address that the people contract does not store.

### 3.4 Service details

All of these use one `/services/[slug]` template. Until the service catalogue
is reviewed with stakeholders, the union of all 12 Figma detail designs is the
provisional catalogue:

| Service | Figma node |
| --- | --- |
| Association Management | `5488:464` |
| Business & Strategy Development | `5488:683` |
| Compliance & Certification | `5488:551` |
| Engineering & Technical Consulting | `5488:772` |
| Event Organisation | `5488:507` |
| Government Relations | `5488:728` |
| Market Research | `5488:595` |
| Project Management | `5488:816` |
| Public Funds, Finance & Procurement | `5488:639` |
| Reputation Management | `5488:860` |
| Stakeholder Management | `5488:926` |
| Visibility & Communications | `5488:970` |

A service requires, at minimum:

- Localized name, slug, introduction, and body.
- Illustration/icon.
- Display order and publishing state.
- Assigned team contacts.
- Related articles.
- A short landing-page summary for the mobile alternating-card treatment.

Implemented 2026-09-28 (control tower section 15.5). All 12 frames share one
layout: navy hero with a large white line illustration, name and summary;
"WHAT DO WE DO" body; "Get in Touch with the Team" with one or two contacts
(portrait, phone, email, address, no name); three article cards. They differ
only in content and in the number of contacts and articles.

### 3.5 Sector details

All of these use one `/sectors/[slug]` template:

| Sector | Figma node |
| --- | --- |
| Agrifood | `5408:267` |
| AI | `5480:511` |
| Anti-Illicit Trade | `5480:555` |
| Aviation | `5480:598` |
| Circular Economy | `5480:643` |
| Culture & Creativity | `5480:729` |
| The Consumer | `5480:686` |
| Defence | `5480:772` |
| E-Mobility | `5480:819` |
| Energy | `5480:862` |
| Gambling | `5480:907` |
| Innovation | `5480:1122` |
| International Trade | `5480:993` |
| Machine Learning & 6G | `5480:1208` |
| Open Source | `5480:950` |
| Quantum & Cybersecurity | `5480:1165` |
| Standardisation | `5480:1036` |
| Sport | `5480:1251` |
| Space | `5480:1079` |
| Tourism | `5480:1294` |

A sector requires, at minimum:

- Localized name, slug, introduction, and body.
- Illustration/icon.
- Display order and publishing state.
- Assigned team contacts.
- Related projects or articles.
- A short landing-page summary for the mobile alternating-card treatment.

Implemented 2026-09-28 with the service template (control tower section 15.5).
The sector frames match the service frames except that the article section is
headed "{name} Projects" (implemented as "Articles for {name}", because the
data is articles) and some frames (`5480:511`) show two article cards without
the teal marker or byline.

## 4. Mobile frames

The mobile proposal uses unusually large Figma frame dimensions but clearly
expresses a narrow-screen layout. We should reproduce its responsive intent,
not copy its raw coordinates.

| Design | Figma node | Coverage |
| --- | --- | --- |
| Homepage | `5651:631` | Mobile header, hero, newsroom feature, client logos |
| Who We Are | `5651:258` | Two-column team grid |
| Services | `5651:347` | Alternating title/summary cards |
| Sectors | `5651:406` | Alternating title/summary cards |
| Why Us | `5651:450` | Stacked content and endorsement cards |
| Publications | `5651:90` | Single-column article cards |
| Contact | `5651:504` | Office grid; form area unresolved |
| Association Management | `5695:437` | Representative service detail |
| Agrifood | `5695:370` | Representative sector detail |

Responsive behavior that is not supplied by Figma must be designed in code:

- Mobile Our Outreach, country summary, and country detail.
- Team profile pages.
- Newsletter/article and video/podcast detail pages.
- Contact form layout.
- Tablet and intermediate desktop widths.
- Long translated text, large result sets, empty states, and validation states.

For Our Outreach, the preferred mobile approach remains a searchable,
list/cards-first experience with the map as an enhancement. This must be
validated with an early prototype.

## 5. Visual foundations

### 5.1 Recurring color palette

The proposal repeatedly uses:

| Role | Observed value |
| --- | --- |
| Primary deep navy | `#27335A` |
| Brand blue | `#274882` |
| Supporting blue | `#354B83` / `#354B84` |
| Bright interactive accent | `#1976D2` |
| Teal accent | `#004A6A` |
| Light blue-grey | `#CBD2E1` |
| Light neutral | `#E4E4E4` / `#F7F7F7` |
| Base | `#FFFFFF` / `#000000` |

These are observed values, not yet final semantic tokens. Contrast and state
colors must be validated before they are locked.

Implemented as `tp-*` palette and semantic tokens in `src/app/globals.css`
(control tower section 15.3). White text on `#1976D2` measures about 4.6:1, so
the bright accent is used for the language toggle and controls, not small text
on navy; focus rings are white on navy and azure on light surfaces.

### 5.2 Typography

The relevant frames primarily use:

- `Unna` for large display headings and selected editorial text.
- `Roboto Serif` for headings, navigation, and body copy.
- `Josefin Sans` for selected labels, cards, and supporting text.

`Gasoek One` appears only as a small outlier and should not be adopted without
checking the exact nodes that use it.

The codebase should define a small semantic type scale instead of reproducing
every raw Figma font size. The common observed sizes are 14, 16, 18, 20, 26,
28, 30, 36, 48, 64, and 72 pixels.

### 5.3 Visual language

Recurring patterns include:

- Deep-navy hero areas.
- White continuous-line illustrations.
- Centered editorial headings.
- Blue circular service tiles and square sector tiles.
- Alternating blue cards on mobile.
- Circular team portraits with outlined rings.
- White and light-grey content sections.
- A deep-navy global footer.
- Bright-blue language and menu controls.

### 5.4 Interaction annotations

The canvas contains free-standing designer notes with arrows pointing at the
affected elements. They are the only interaction specification in the file:

- `FLIP When hovered` / `Flip When Selected` / `sequence flip for all cards
  when page loads` — card flips.
- `Slide When hovered` / `sequence slide for all cards when page loads`.
- `animated` — repeated on service and sector detail illustrations.
- `news scroll with slide effect` — homepage newsroom carousel.
- `NUMBERS COUNT UP UNTIL REACHING FINAL METRIC` — statistics.
- `SCROLL OF ENDORSEMENT LOGOS & DESCRIPTIONS`.
- `focus card effect` and `Comet card effect`.
- `animated ripple gif for selected point` — Our Outreach map selection.
- `TITLE, E-MAIL & PHONE NUMBER CHANGE BASED ON SELECTION` — Contact offices.
- `DROP-DOWN MENU: pages`, `DROP-DOWN MENU: CALENDAR`, and
  `DROP-DOWN MENU: CATEGORIES` — navigation and newsroom filters.

Every motion effect must respect `prefers-reduced-motion`, and hover-only
effects need an equivalent focus or tap behavior.

## 6. Code component inventory

Figma uses raw frames and layers rather than reusable component instances. It
has no local paint styles, no local text styles, and only a small generic
variable collection that is not sufficient as an implementation token system.

The reusable system therefore needs to be created in code:

- `SiteHeader` and desktop/mobile navigation (implemented).
- `LocaleSwitcher` (implemented).
- `MobileMenu` (implemented).
- `PageHero` with swappable line illustration (implemented).
- `SectionHeading`.
- `SiteFooter` (implemented).
- `SocialLinks` (implemented).
- `DownloadSnapshotLink` (implemented; PDF and icon pending).
- `TeamPortrait` and `TeamCard` (implemented).
- `SnapshotCta` (implemented; PDF and icon pending).
- `ArticleCard` with controlled visual variants (related-article variant
  implemented as `ArticleSummaryCard`).
- `RelatedContentGrid`.
- `ServiceCard` and `SectorCard` (implemented as one `CatalogueTile`).
- `ContactPerson` (implemented for services and sectors as
  `CatalogueContacts`).
- `OfficeCard`.
- `LogoCloud`.
- `EndorsementCard`.
- `CountryMap`.
- `RegionFilter`.
- `CountryList`.
- `CountrySummaryPanel`.
- `CountryStats`.
- `ContactForm`.

The line illustrations, logo, icons, portraits, photographs, partner logos,
flags, and country/office marks require an asset inventory. Assets are not
exported from Figma: existing brand assets are used, and missing ones are shown
as placeholders and logged in [`figma-asset-needs.md`](./figma-asset-needs.md).
Figma MCP asset URLs are temporary and must never be committed.

## 7. CMS and schema implications

The visual review confirms the planned CMS entities and adds several likely
editorial relationships:

- People can be team members, article authors, service contacts, sector
  contacts, and country experts.
- Articles need a type, author(s), publication date, hero media, excerpt,
  structured body, tags, related services/sectors, and related articles.
- Services and sectors need icons, summaries, contacts, and related content.
- Countries need ISO identifiers, localized summaries, flags, statistics with
  years/sources, service coverage, assigned experts, office/coverage marks, and
  `last reviewed` dates.
- Offices are structured content used by Contact and country coverage.
- Partners/client logos appear on the homepage.
- Endorsements appear on Why Us.
- Downloadable snapshot/PDF assets appear in the footer and team page.

Offices, partners/client logos, and endorsements are confirmed as admin-managed
content. Whether legal and downloadable content is admin-managed remains a
product decision.

## 8. Design gaps and inconsistencies

These should be resolved as each affected feature begins:

1. The service inventory is inconsistent:
   - The original desktop landing page (`5408:128`) shows 9 services. The
     revised desktop landing page (`6393:6`) shows all 12 as circular tiles
     and adds a `Business` / `Government Institute` / `Academia` audience
     selector that appears to highlight a subset of services. Whether that
     audience grouping is editorial (CMS-managed) data must be confirmed
     before it is implemented. The implemented services page (2026-09-28)
     omits the selector until control tower decision 23.10 is made.
   - Mobile landing page shows 11 services.
   - 12 desktop service detail designs exist.
   - For initial implementation, seed the union of all 12 as provisional
     records. Publication status and ordering remain CMS-managed so the final
     stakeholder-approved catalogue can be applied without code changes.
2. Navigation labels in Figma are outdated or inconsistent. The implemented
   navigation must contain both internal Our Outreach and external POE links.
   Resolved 2026-09-28: the shell follows the revised desktop header
   (`6393:6`): POE, Who we are, Our outreach, Services, Sectors, Why us,
   Publications, Contact, and the language toggle. The desktop homepage frame
   (`5408:616`) has no header. The "DROP-DOWN MENU: pages" annotations
   (`5704:94`, `5774:314`, `5774:332`, `5774:351`, `5774:423`, `5774:442`)
   describe the mobile burger panel, not a desktop drop-down.
3. No mobile Our Outreach design exists.
4. The mobile Contact frame shows offices but leaves a large unresolved area
   where the desktop form and head-office details would normally appear.
5. Publication detail designs cover newsletter/article and video/podcast
   examples, but other card types need to use the same extensible content
   model.
6. Several publication-detail areas are obvious media/content placeholders.
7. Team profiles vary greatly in length and section composition.
8. Legal pages are linked in the footer but have no relevant proposal frames.
9. Some frames omit or vary the header/footer and navigation labels.
10. No tablet breakpoint, loading state, empty state, error state, form state,
    search results state, or admin design is supplied. Loading states are
    defined in code as template-shaped skeletons (control tower section 15.6).
11. Much of the copy is placeholder text and must not define the final data
    model.
12. Tiny text, hover-dependent map discovery, and color-only states in the
    proposal must be corrected during accessible implementation.

## 9. Implementation interpretation

Use Figma for visual intent and hierarchy, with these rules:

- Build fluid responsive layouts; do not translate absolute coordinates.
- Build one database-backed template per content type.
- Use semantic design tokens and shared components.
- Treat supplied mobile frames as examples, then design the missing responsive
  states consistently.
- Keep map selection available through keyboard-accessible lists as well as the
  visual map.
- Preserve the line-art identity using exported source assets.
- Use real content and realistic translation lengths during validation.
- Resolve a documented design gap before implementing the affected feature
  rather than silently copying an inconsistent frame.

## 10. Recommended implementation sequence from the design

The CMS-backed data layer and functional public templates for team, services,
sectors, newsroom, and Our Outreach already exist (control tower, Phase 5).
This sequence now applies the visual design to them. Each step follows the
legacy-presentation porting approach in control tower section 15.2: brand
assets, fonts, and component markup come from `old-consulting` where an
equivalent exists and are then corrected against Figma.

1. Establish brand assets, colors, type tokens, containers, header, footer,
   and hero primitives.
2. Apply the design to the Who We Are/team templates to prove responsive
   templates, CMS media, translations, and related content (done 2026-09-28).
3. Implement the reusable service and sector indexes/details (done
   2026-09-28).
4. Implement the newsroom card system and extensible article detail renderer.
5. Prototype and then implement Our Outreach.
6. Complete Why Us, Contact, homepage composition, legal pages, and remaining
   content migration.
