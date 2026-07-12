<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:octanefiles-styling-rules -->
# Styling rules (non-negotiable)

This site uses a single token-based Tailwind v4 styling system. There is exactly one styling method — Tailwind utility classes plus the shared `@layer components` classes, both defined in `app/globals.css`. Follow these rules on every page and component, including new ones:

- **No inline styles.** `style={{...}}` is forbidden in JSX. The only exception is a genuinely data-driven dynamic value that cannot be expressed as a class — e.g. a background-image URL from the database, or an inline SVG's brand-mandated fill color (like the Google "G" logo in `SiteHeader.tsx`, which must stay literal because it's a third-party brand mark, not a design choice). If you reach for `style={{}}` for anything else, stop and find or add the token/class instead.
- **All colors, font sizes, font weights, letter-spacing, line-height, spacing, radii, shadows, and z-index come from the token system.** Colors and other custom tokens live in the `@theme` block in `app/globals.css`, under semantic names (`--color-text-secondary`, `--radius-card`, `--shadow-modal`, `--tracking-heading`, `--z-overlay`), never raw value names. Font weight and spacing already come from Tailwind's own default scale (`font-medium`, `p-4`, `gap-6`, etc.), and so do most letter-spacing and line-height needs (`tracking-tight`/`wide`/`wider`/`widest`, `leading-tight`/`relaxed`/`loose`) — don't re-invent parallel tokens or hand-type a decimal (`tracking-[0.08em]`, `leading-[1.7]`) for values Tailwind's defaults already cover closely enough; check `node_modules/tailwindcss/theme.css` before assuming a value needs a new token.
- **Never invent a new raw value.** No new hex colors, no new one-off pixel/em/decimal values in an inline `style` or an arbitrary Tailwind value (`text-[13px]`, `bg-[#f2f2f2]`, `tracking-[0.06em]`, `leading-[1.8]`, `z-[300]`, etc.) unless you've first checked it isn't already one of: an existing token, an exact-or-close match in Tailwind's own default scale, or a genuinely one-off data-driven value. Before adding one, grep the codebase for the same CSS property already in arbitrary-value form (`grep -rn "tracking-\[" app components`, etc.) — if something similar already exists, that's a sign to reuse it or centralize it, not add a fourth slightly-different variant next to three others nobody noticed. If a new *repeated* value is truly needed, add it to the `@theme` block with a semantic name — don't scatter the same magic number across files.
- **Adjust the source, not the call site.** When a value needs to change, change it in exactly one place — the `@theme` token, the shared `@layer components` class, or the `@layer base` heading rule — never by patching the same magic number at each place it's used. If you find yourself editing the same value in more than one file, stop: that's the sign it should already be centralized. This codebase has been burned by exactly this — six different hand-typed `tracking-[...]` decimals and five different `leading-[...]` decimals accumulated across files, all doing the same two or three jobs, before a full audit consolidated them back down to shared tokens and Tailwind's own native scale.
- **Repeated visual patterns are shared classes, not copy-pasted utility strings.** Cards, buttons, pills, form fields, stat grids, tables, and prose blocks already have shared classes (`.card`, `.btn-primary`, `.btn-secondary`, `.pill`/`.pill-active`, `.field`/`.field-label`/`.input`/`.textarea`/`.select`, `.stat-grid`/`.stat-cell`, `.table`, `.avatar`, `.eyebrow`, `.prose`, `.site-container`) in `app/globals.css`. Reuse them. If a new pattern repeats 3+ times, add a class for it there rather than re-typing the same utility string on every instance.
- **Don't redefine what a standard Tailwind name means.** Don't override Tailwind's own default `--breakpoint-*`, `--shadow-sm/md/lg`, or numbered `--radius-*`/`--text-*` scale keys in `@theme` — a future reader who sees `shadow-lg` or `lg:` should be able to trust it means the Tailwind-standard value everywhere in this codebase. Give a new token a distinct semantic name instead (see `--shadow-modal`, `--container-page`).
- **Page-level containers use `.site-container`** (1440px max-width, 24px horizontal padding, fluid below that) for public content pages. Internal tooling (`/admin`) is a deliberate, disclosed exception — it uses its own narrower widths because a dense table/form stretched to the public site's content width visibly hurts usability; don't "fix" that inconsistency by forcing it to match without discussing it first.
<!-- END:octanefiles-styling-rules -->

<!-- BEGIN:octanefiles-data-rules -->
# Data rules (non-negotiable)

- Supabase is the ONLY source of truth for all site content and user data.
- Never store or cache Supabase data in localStorage or sessionStorage. Client-side state may hold fetched data in memory for the current view only.
- When data changes in Supabase, affected pages must show the updated data. Before adding or changing any caching behavior (Next.js fetch caching, route revalidation settings, or any client-side caching layer), explain the staleness trade-off in plain English and get approval first.
- Always re-fetch from Supabase before any export or download of saved data — never serve from a cached copy.
<!-- END:octanefiles-data-rules -->

<!-- BEGIN:octanefiles-admin-access-notes -->
# Admin access (non-negotiable)

Single source of truth: the `admins` table (`user_id`, seeded as data via SQL, never a literal email in app code or policy SQL) plus the `is_admin()` Postgres function (`SECURITY DEFINER`, checks `auth.uid()` against `admins`). Nothing hardcodes an admin email anywhere anymore.

- `lib/is-admin.ts` — `checkIsAdmin(supabase)` calls `supabase.rpc('is_admin')`. Dependency-free enough to use from client components (`SiteHeader`'s avatar menu) as well as server code (`lib/admin-auth.ts`'s `requireAdmin()`, the admin API routes).
- The database independently enforces the same thing: every admin-write RLS policy (`makes`/`models`/`generations`/`trims`, the `car-images` storage bucket) checks `is_admin()` directly, not a role/grant proxy. Admin writes from the app go through the signed-in admin's own session (not a service-role bypass), so a bug in the app-level check alone can't let a write through — the database's own RLS still gates it.

To add a second admin: insert a row into `admins` for their `auth.users.id`. Nothing else needs to change — no code, no policy — since both layers read from the same table.
<!-- END:octanefiles-admin-access-notes -->

<!-- BEGIN:octanefiles-car-data-model -->
# Car data model (non-negotiable)

Cars are normalized as `makes` → `models` → `generations` (`generations` is "the car" — public URLs are `/cars/[generation-slug]`, flat, never nested by make/model). `lib/car-schema.ts` is the single source of truth for every `generations` field: enum vocabularies (`CAR_CLASSES`, `BODY_STYLES`, `DRIVETRAIN_TYPES`, `ENGINE_LAYOUTS`, `DESIRABILITY_TIERS`, `VALUE_TRAJECTORIES`, `RADAR_AXES`) and the `GenerationRecord`/`GenerationInput` shape. The admin form, the public detail page, and any future CSV import all read field definitions from this one file — don't hardcode a parallel copy of an enum's values anywhere else.

- **Controlled vocabularies are enforced at the DB level** (real Postgres enum types), not just in the form — `class`, `body_styles`, `drivetrain`, `engine_layout`, `desirability_tier`, `value_trajectory`. Adding a new allowed value means a migration (`ALTER TYPE ... ADD VALUE`), not just a form change.
- **`archived_at` is the only removal mechanism.** Cars are never hard-deleted except a rare, explicitly-approved cleanup of confirmed duplicate data entry (an irreversible action requiring its own atomic migration with a before/after count gate — see `imports/step11_delete_true_duplicates.sql` for the only precedent). Archived cars are fully restorable via the admin's Unarchive action (`/admin/archived`) and excluded from every public query (`archived_at IS NULL` is non-negotiable in `lib/supabase.ts`).
- **`desirability_tier_legacy`** holds pre-enum compound strings (e.g. "Solid, High (ZR-1)") that haven't yet been manually remapped to a single headline tier. Read-only reference for that remap, never form-editable, never shown publicly.
- **New Car creation is deliberate, never inferred.** Adding a make or model is an explicit "+ Add new" action in the admin form, not something that happens implicitly from typing an unrecognized name. A live debounced check blocks creating a duplicate `(model, generation code)` pair before the form is even submitted.
<!-- END:octanefiles-car-data-model -->

<!-- BEGIN:octanefiles-content-tone -->
# Content tone (non-negotiable)

Free-text encyclopedia fields — Overview, Why Collectible, Buyer's Guide, Callout, Claim to Fame, Variants to Know, Driving Character, Design Notes, Motorsport Pedigree, Cultural Notes, Known Issues, Maintenance — are written in Octane Files' voice: direct, specific, enthusiast-to-enthusiast. Never marketing copy, never a paraphrased Wikipedia summary. Say what makes the car matter, not just what it is. Short paragraphs over long ones.

This applies identically whether content is entered through the admin edit form or a bulk CSV import — see `imports/CSV_TEMPLATE_GUIDE.md` for the CSV-specific version of this note.
<!-- END:octanefiles-content-tone -->
