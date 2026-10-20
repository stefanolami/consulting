export const PUBLIC_CATALOGUE_CACHE_TAG = 'public-catalogue'
export const PUBLIC_GLOBAL_CACHE_TAG = 'public-global-content'
export const PUBLIC_NEWSROOM_CACHE_TAG = 'public-newsroom'
export const PUBLIC_OUTREACH_CACHE_TAG = 'public-outreach'
export const PUBLIC_TEAM_CACHE_TAG = 'public-team'
export const PUBLIC_LEGAL_CACHE_TAG = 'public-legal'

/**
 * The time-based revalidation of every public reader (`unstable_cache`).
 * Admin saves expire their tags at once with `updateTag`, so this lifetime is
 * not what makes edits appear. It bounds how long a scheduled translation
 * (status published, `published_at` in the future) stays hidden after its
 * time: a cached result keeps the rows that were public when it was read, and
 * after this many seconds the next visit refreshes it in the background, so a
 * scheduled item appears on the second visit after at most about a minute.
 */
export const PUBLIC_CACHE_REVALIDATE_SECONDS = 60
