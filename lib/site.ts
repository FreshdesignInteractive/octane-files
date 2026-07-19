// Canonical production origin — matches the host-based redirect in
// next.config.ts (octanefiles.com -> https://www.octanefiles.com). Single
// source so sitemap.ts and robots.ts don't each hardcode the same string.
export const SITE_URL = 'https://www.octanefiles.com'
