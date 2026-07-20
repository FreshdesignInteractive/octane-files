// Run: npx tsx scripts/process-car-data-inbox.ts
// (or double-click "Post New Cars.command" on the Desktop, which just runs this)
//
// "Car Data/" has one permanent subfolder per live car (named by slug,
// seeded by scripts/seed-car-data-folders.ts) — an editorial Claude session
// drops files into the matching car's folder; this script never creates or
// deletes those top-level folders itself. A top-level folder whose name
// starts with "_" (or ".") is never scanned as a car — that's the reserved
// space for the script's own _imported/_needs-attention archives and for
// any shared cross-car reference material (e.g. a cluster notes file
// covering several cars at once) that shouldn't be duplicated per car.
//
// Scans every car folder that currently has files in it, validates the CSV
// pair against the exact same rules the admin bulk-import UI enforces
// (lib/bulk-import.ts / bulk-import-schema.ts — no parallel logic, no drift
// possible between this and the manual path), plus one check the manual
// path doesn't need: every resolved car must match the *folder's own*
// slug, not just match each other — a file dropped in the wrong folder
// that happens to name a different real car is caught, not silently
// imported into the wrong place.
//
// Auto-commits only what's perfectly clean. Anything even slightly off is
// never partially written — the car's files are archived into that same
// folder's own _needs-attention/<timestamp>/ subfolder instead, with a
// plain-English reason logged. There is no per-car approval step by design
// (Raj can't evaluate car-domain content and doesn't want to upload
// file-by-file) — the validation itself is the gate, not a human glancing
// at a diff. On success, files move to that folder's own
// _imported/<timestamp>/ subfolder, alongside a full field-level diff and a
// pre-import snapshot for rollback — the top-level per-car folder itself
// always stays in place, empty and ready, for the next revision pass.
//
// Before any of that, a pre-pass across the whole batch checks for
// conflicting MarqueFullName values proposed by different cars sharing the
// same marque in this run — the admin UI surfaces this as a warning banner
// a human can accept or reject; there's no human here, so this script
// refuses (flags to needs-attention) every car in a conflicting group
// rather than picking a winner silently.
//
// Uses the service-role key, not the admin-session-gated API routes —
// this is a trusted local script, not a public endpoint, so it bypasses
// RLS directly. Never expose this script's logic behind a web route.

import { config } from 'dotenv'
import { resolve, join, basename } from 'path'
import { readFileSync, readdirSync, statSync, mkdirSync, renameSync, appendFileSync, writeFileSync } from 'fs'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { parseCsvToRows } from '../lib/csv-parse'
import {
  resolveGeneration, parseEnrichmentFields, diffEnrichmentFields, buildRelationInserts,
  type EnrichmentValue, type FieldDiff, type ResolvedGeneration,
} from '../lib/bulk-import'
import type { EnrichmentFieldKey } from '../lib/bulk-import-schema'

const INBOX = '/Users/rajeshsidharthan/Library/CloudStorage/Dropbox/Claude/Octane Files/Car Data'
const LOG_FILE = join(INBOX, 'import-log.md')

function isReservedName(name: string): boolean {
  return name.startsWith('_') || name.startsWith('.')
}

function log(line: string) {
  const stamp = new Date().toISOString()
  appendFileSync(LOG_FILE, `- **${stamp}** — ${line}\n`)
  console.log(line)
}

function timestampSuffix(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

// Moves every non-reserved file currently at the top of `folder` into
// folder/_archiveSubdir/<timestamp>/, optionally alongside extra generated
// files (the diff/snapshot JSON) — archives the batch that was just
// processed (success or failure) without touching the car's own permanent
// top-level folder.
function archiveFolderContents(folder: string, archiveSubdir: '_imported' | '_needs-attention', extraFiles?: Record<string, string>) {
  const dest = join(folder, archiveSubdir, timestampSuffix())
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(folder)) {
    if (isReservedName(entry)) continue
    renameSync(join(folder, entry), join(dest, entry))
  }
  for (const [filename, content] of Object.entries(extraFiles ?? {})) {
    writeFileSync(join(dest, filename), content)
  }
}

function readCsv(path: string): { headers: string[]; rows: Record<string, string>[] } {
  return parseCsvToRows(readFileSync(path, 'utf-8'))
}

// The script validates format only (headers, enums, ranges, resolves to a
// real car) — it can't judge content. A clean-formatted editorial judgment
// call (a rounded production estimate, a value left blank because it
// couldn't be verified) goes straight to production with no human review
// in this workflow. This is the compromise: pull just the judgment-call
// sections out of that car's verification-note*.md (matched on heading
// wording — "disagreed", "couldn't be confirmed", etc. — not a fixed
// title, so it still works if a future note phrases a heading slightly
// differently) and print them right in the terminal output after a
// successful import. A 30-second read as part of the same double-click,
// not a separate review step.
function extractJudgmentCalls(folder: string): string | null {
  const mdFile = readdirSync(folder).find(f => !isReservedName(f) && /verification/i.test(f) && f.toLowerCase().endsWith('.md'))
  if (!mdFile) return null
  const content = readFileSync(join(folder, mdFile), 'utf-8')
  const sections = content.split(/\n(?=##\s)/)
  const relevant = sections.filter(s => {
    const heading = s.split('\n')[0].toLowerCase()
    return /disagree|could ?n.?t be confirmed|judgment|not verified|left blank|worth (settling|confirming)/.test(heading)
  })
  return relevant.length > 0 ? relevant.join('\n').trim() : null
}

interface CarFolderResult {
  ok: boolean
  reason?: string
  enrichment?: {
    generationId: string
    values: Partial<Record<EnrichmentFieldKey, EnrichmentValue>>
    diffs: FieldDiff[]
    preImage: ResolvedGeneration
    marqueFullName?: string
    make: string
  }
  trims?: {
    rows: { generation_id: string; name: string; years: string | null; description: string | null; production_notes: string | null }[]
    preExisting: { name: string; years: string | null; description: string | null; production_notes: string | null }[]
  }
}

async function validateCarFolder(supabase: SupabaseClient, folder: string): Promise<CarFolderResult> {
  const expectedSlug = basename(folder)
  const files = readdirSync(folder).filter(f => !isReservedName(f) && f.toLowerCase().endsWith('.csv'))
  let enrichmentFile: string | null = null
  let trimsFile: string | null = null

  for (const f of files) {
    const { headers } = readCsv(join(folder, f))
    const isTrims = headers.includes('Name') && headers.includes('ProductionNotes')
    const isEnrichment = headers.includes('Introduction') || headers.includes('MarqueFullName')
    if (isTrims) trimsFile = f
    else if (isEnrichment) enrichmentFile = f
  }

  if (!enrichmentFile && !trimsFile) {
    return { ok: false, reason: `no recognizable enrichment or trims CSV found among: ${files.join(', ') || '(no .csv files)'}` }
  }

  let enrichmentResult: CarFolderResult['enrichment']
  let enrichmentGenId: string | null = null

  if (enrichmentFile) {
    const parsed = readCsv(join(folder, enrichmentFile))
    if (parsed.rows.length !== 1) return { ok: false, reason: `${enrichmentFile}: expected exactly 1 data row, found ${parsed.rows.length}` }
    const row = parsed.rows[0]
    const { values, errors } = parseEnrichmentFields(row)
    if (errors.length > 0) {
      return { ok: false, reason: `${enrichmentFile}: ${errors.length} validation error(s) — ${errors.map(e => `${e.header}: ${e.reason}`).join('; ')}` }
    }
    const resolved = await resolveGeneration(supabase, row.Make, row.Model, row.Generation)
    if (!resolved) return { ok: false, reason: `${enrichmentFile}: unmatched — no live car found for "${row.Make} / ${row.Model} / ${row.Generation}"` }
    if (resolved.archived_at) return { ok: false, reason: `${enrichmentFile}: "${row.Make} ${row.Model} ${row.Generation}" is archived — handle manually via the admin UI` }
    if (resolved.slug !== expectedSlug) {
      return { ok: false, reason: `${enrichmentFile}: resolves to "${resolved.slug}", not this folder's own car ("${expectedSlug}") — file may be in the wrong folder` }
    }
    const diffs = diffEnrichmentFields(resolved, values)
    enrichmentGenId = resolved.id
    enrichmentResult = {
      generationId: resolved.id, values, diffs, preImage: resolved,
      make: row.Make, marqueFullName: values.manufacturer_full_name as string | undefined,
    }
  }

  let trimsResult: CarFolderResult['trims']
  if (trimsFile) {
    const parsed = readCsv(join(folder, trimsFile))
    if (parsed.rows.length === 0) return { ok: false, reason: `${trimsFile}: no data rows` }
    const rows: NonNullable<CarFolderResult['trims']>['rows'] = []
    let trimsGenId: string | null = null
    for (const [i, row] of parsed.rows.entries()) {
      const name = (row.Name ?? '').trim()
      if (!name) return { ok: false, reason: `${trimsFile}: row ${i + 1} is missing Name` }
      const resolved = await resolveGeneration(supabase, row.Make, row.Model, row.Generation)
      if (!resolved) return { ok: false, reason: `${trimsFile}: row ${i + 1} unmatched — no live car found for "${row.Make} / ${row.Model} / ${row.Generation}"` }
      if (resolved.slug !== expectedSlug) {
        return { ok: false, reason: `${trimsFile}: row ${i + 1} resolves to "${resolved.slug}", not this folder's own car ("${expectedSlug}") — file may be in the wrong folder` }
      }
      if (enrichmentGenId && resolved.id !== enrichmentGenId) {
        return { ok: false, reason: `${trimsFile}: row ${i + 1} resolves to a different car than ${enrichmentFile} — files may be mixed up between folders` }
      }
      trimsGenId = resolved.id
      rows.push({
        generation_id: resolved.id, name,
        years: (row.Years ?? '').trim() || null,
        description: (row.Description ?? '').trim() || null,
        production_notes: (row.ProductionNotes ?? '').trim() || null,
      })
    }
    const { data: preExisting } = await supabase.from('trims').select('name, years, description, production_notes').eq('generation_id', trimsGenId!)
    trimsResult = { rows, preExisting: preExisting ?? [] }
  }

  return { ok: true, enrichment: enrichmentResult, trims: trimsResult }
}

async function commitCarFolder(supabase: SupabaseClient, result: CarFolderResult): Promise<{ summary: string; auditJson: string }> {
  const parts: string[] = []
  const audit: Record<string, unknown> = {}

  if (result.enrichment) {
    const row = { generation_id: result.enrichment.generationId, ...result.enrichment.values }
    const { error } = await supabase.rpc('bulk_update_generation_enrichment', { rows: [row] })
    if (error) throw new Error(`bulk_update_generation_enrichment: ${error.message}`)
    const { error: makeError } = await supabase.rpc('bulk_update_make_enrichment', { rows: [row] })
    if (makeError) throw new Error(`bulk_update_make_enrichment: ${makeError.message}`)
    const relations = buildRelationInserts(result.enrichment.generationId, result.enrichment.values)
    if (relations.length > 0) {
      const { error: relError } = await supabase.rpc('bulk_add_car_relations', { rows: relations })
      if (relError) throw new Error(`bulk_add_car_relations: ${relError.message}`)
    }
    parts.push(`${result.enrichment.diffs.length} field(s) changed${relations.length ? `, ${relations.length} rival/lineage entr${relations.length === 1 ? 'y' : 'ies'} added` : ''}`)
    audit.fieldDiffs = result.enrichment.diffs
    audit.preImage = result.enrichment.preImage
    audit.relationsAdded = relations
  }

  if (result.trims) {
    const { error } = await supabase.rpc('bulk_upsert_trims', { rows: result.trims.rows })
    if (error) throw new Error(`bulk_upsert_trims: ${error.message}`)
    parts.push(`${result.trims.rows.length} trim(s) upserted`)
    audit.trimsPreImage = result.trims.preExisting
    audit.trimsSubmitted = result.trims.rows
  }

  return { summary: parts.join('; ') || 'nothing to commit', auditJson: JSON.stringify(audit, null, 2) }
}

function formatDiffsForLog(diffs: FieldDiff[]): string {
  if (diffs.length === 0) return '  (no field changes)'
  return diffs.map(d => `  - ${d.header}: ${JSON.stringify(d.from)} → ${JSON.stringify(d.to)}`).join('\n')
}

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const carFolders = readdirSync(INBOX).filter(name => {
    if (isReservedName(name)) return false
    return statSync(join(INBOX, name)).isDirectory()
  })

  // Only folders that actually have a new CSV sitting at their top level —
  // the hundreds of untouched, still-empty per-car folders are silently
  // skipped, not treated as errors.
  const toProcess = carFolders.filter(name =>
    readdirSync(join(INBOX, name)).some(f => !isReservedName(f) && f.toLowerCase().endsWith('.csv'))
  )

  if (toProcess.length === 0) {
    console.log('Nothing new in Car Data/ — no car folder has fresh files to process.')
    return
  }

  // Pre-pass: validate every folder in the batch first, without committing
  // anything yet, so a cross-folder MarqueFullName conflict can be caught
  // before any of them are written — not after one has already landed.
  const validated = new Map<string, CarFolderResult>()
  for (const name of toProcess) {
    try {
      validated.set(name, await validateCarFolder(supabase, join(INBOX, name)))
    } catch (err) {
      validated.set(name, { ok: false, reason: `unexpected error during validation — ${err instanceof Error ? err.message : String(err)}` })
    }
  }

  const marqueClaims = new Map<string, { name: string; make: string; value: string }[]>()
  for (const [name, result] of validated) {
    const marque = result.enrichment?.marqueFullName
    const make = result.enrichment?.make
    if (!result.ok || !marque || !make) continue
    const key = make.trim().toLowerCase()
    const list = marqueClaims.get(key) ?? []
    list.push({ name, make, value: marque })
    marqueClaims.set(key, list)
  }
  const conflictedFolders = new Set<string>()
  for (const claims of marqueClaims.values()) {
    if (new Set(claims.map(c => c.value)).size > 1) {
      for (const c of claims) conflictedFolders.add(c.name)
      log(`**MarqueFullName conflict** across this batch for "${claims[0].make}": ${claims.map(c => `${c.name}="${c.value}"`).join(' vs. ')} — none of these will be imported this run; resolve and re-run.`)
    }
  }

  let imported = 0, flagged = 0
  for (const name of toProcess) {
    const folder = join(INBOX, name)
    const result = validated.get(name)!
    try {
      if (conflictedFolders.has(name)) {
        log(`**${name}** — needs attention: conflicting MarqueFullName with another car in this same batch (see conflict note above)`)
        archiveFolderContents(folder, '_needs-attention')
        flagged++
        continue
      }
      if (!result.ok) {
        log(`**${name}** — needs attention: ${result.reason}`)
        archiveFolderContents(folder, '_needs-attention')
        flagged++
        continue
      }
      const { summary, auditJson } = await commitCarFolder(supabase, result)
      log(`**${name}** — imported: ${summary}\n${result.enrichment ? formatDiffsForLog(result.enrichment.diffs) : ''}`)
      const judgmentCalls = extractJudgmentCalls(folder)
      if (judgmentCalls) {
        console.log(`\n⚠ ${name} — judgment calls worth a skim:\n${judgmentCalls}\n`)
        log(`**${name}** — judgment calls flagged for review:\n\n${judgmentCalls}\n`)
      }
      archiveFolderContents(folder, '_imported', { 'pre-import-snapshot.json': auditJson })
      imported++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log(`**${name}** — needs attention: unexpected error — ${message}`)
      archiveFolderContents(folder, '_needs-attention')
      flagged++
    }
  }

  console.log(`\nDone — ${imported} car(s) imported, ${flagged} flagged to needs-attention.`)
  console.log(`Full log: ${LOG_FILE}`)
}

main()
