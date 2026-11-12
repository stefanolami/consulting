-- Service audiences (control tower section 23.10, settled by the product
-- owner on 2026-11-12; platform doc section 3.5).
--
-- The public Services page highlights the services meant for one audience:
-- Business, Government Institute or Academia (Figma 6393:6, 6633:100,
-- 6633:32). Editors choose them per service in the admin ("Show for").
--
-- Model: one column on services, a text array of audience keys. The three
-- keys are fixed in code (src/lib/audiences.mjs), where their labels, themes
-- and messages live; the database stores only membership. An empty array
-- means the service is shown at full strength only when no audience is
-- chosen. Sectors have no audiences.
--
-- Security: no policy or grant changes. services already grants select to
-- anon and authenticated at table level, and its row policies (an active row
-- with a published translation for the public; every row for active staff)
-- now cover this column too. Staff update it under the existing staff write
-- policy, in the same row update as the other shared details.

alter table public.services
  add column audiences text[] not null default '{}'
    constraint services_audiences_vocabulary
    check (audiences <@ array['business', 'government', 'academia']::text[]);

comment on column public.services.audiences is
  'Audiences the service is highlighted for on the public Services page: any of business, government, academia (src/lib/audiences.mjs). Empty when none.';

-- Seed the Figma mapping by stable key. A key that does not exist yet
-- changes nothing; a service created later gets its audiences in the admin.
-- On 2026-11-12 the development project had association-management,
-- government-relations, market-research, project-management,
-- public-funds-finance-procurement, event-organisation and
-- visibility-communications; the other keys below are the ones the admin
-- would suggest for the remaining Figma services.
update public.services as service
set audiences = mapping.audiences
from (
  values
    ('association-management', array['government']::text[]),
    ('business-strategy-development', array['business']::text[]),
    ('compliance-certification', array['academia']::text[]),
    ('engineering-technical-consulting', array['academia']::text[]),
    ('event-organisation', array['business']::text[]),
    ('government-relations', array['government']::text[]),
    ('market-research', array['academia']::text[]),
    ('project-management', array['business']::text[]),
    ('public-funds-finance-procurement', array['government']::text[]),
    ('reputation-management', array['business', 'government']::text[]),
    ('stakeholder-management', array['academia']::text[])
) as mapping (stable_key, audiences)
where service.stable_key = mapping.stable_key;
