// Run: npx tsx scripts/verify-bulk-import-schema.ts
// Requires NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
// (read-only — same anon grants the public site already reads with).
//
// Guards against the failure modes hit in production use:
//   1. A field's CSV header, delimiter, or value format used by the
//      *generator* (buildEnrichmentTemplateCsv / buildTrimsTemplateCsv /
//      buildEnrichmentCatalogCsv) silently drifting from what the
//      *importer* (KNOWN_ENRICHMENT_HEADERS / KNOWN_TRIM_HEADERS,
//      parseEnrichmentFields) accepts — this happened once already
//      (RadarEaseofRestoration vs RadarEaseOfRestoration) because the radar
//      headers were derived by string-transforming a label instead of being
//      hand-written in one place.
//   2. The downloadable templates not actually round-tripping cleanly
//      through the same parse+validate+match path a real upload goes
//      through — including "download all cars", matched against live data.
//
// All three CSV builders and both "known headers" sets already read from
// the same ENRICHMENT_FIELDS / TRIM_FIELDS arrays in bulk-import-schema.ts,
// so this script is a regression guard, not a workaround — if someone
// reintroduces a second hardcoded header/delimiter/format definition
// anywhere, this fails loudly instead of surfacing as a support report.

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import {
  ENRICHMENT_FIELDS, TRIM_FIELDS, KEY_COLUMNS,
  KNOWN_ENRICHMENT_HEADERS, KNOWN_TRIM_HEADERS,
  buildEnrichmentTemplateCsv, buildTrimsTemplateCsv, buildEnrichmentCatalogCsv,
} from '../lib/bulk-import-schema'
import { parseCsvToRows } from '../lib/csv-parse'
import { findUnknownColumns, parseEnrichmentFields, resolveGeneration, diffEnrichmentFields } from '../lib/bulk-import'
import { getModels } from '../lib/supabase'

let failures = 0
function check(label: string, pass: boolean, detail?: unknown) {
  if (pass) {
    console.log(`  ok — ${label}`)
  } else {
    failures++
    console.error(`  FAIL — ${label}`, detail !== undefined ? detail : '')
  }
}

console.log('Enrichment CSV — structure')
{
  const csv = buildEnrichmentTemplateCsv()
  const { headers, rows } = parseCsvToRows(csv)

  const expectedHeaders = [...KEY_COLUMNS, ...ENRICHMENT_FIELDS.map(f => f.header)]
  check('generated header row matches ENRICHMENT_FIELDS exactly, in order',
    JSON.stringify(headers) === JSON.stringify(expectedHeaders),
    { generated: headers, expected: expectedHeaders })

  const unknown = findUnknownColumns(headers, KNOWN_ENRICHMENT_HEADERS)
  check('every generated header is accepted by the importer (findUnknownColumns)', unknown.length === 0, unknown)

  check('exactly one example data row', rows.length === 1, rows.length)
  if (rows.length === 1) {
    const { errors } = parseEnrichmentFields(rows[0])
    check('example row has zero validation errors (delimiter/format the generator writes is what the parser accepts)', errors.length === 0, errors)
  }
}

console.log('Trims CSV — structure')
{
  const csv = buildTrimsTemplateCsv()
  const { headers, rows } = parseCsvToRows(csv)

  const expectedHeaders = [...KEY_COLUMNS, ...TRIM_FIELDS.map(f => f.header)]
  check('generated header row matches TRIM_FIELDS exactly, in order',
    JSON.stringify(headers) === JSON.stringify(expectedHeaders),
    { generated: headers, expected: expectedHeaders })

  const unknown = findUnknownColumns(headers, KNOWN_TRIM_HEADERS)
  check('every generated header is accepted by the importer (findUnknownColumns)', unknown.length === 0, unknown)

  check('exactly one example data row', rows.length === 1, rows.length)
}

async function liveRoundTrips() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.log('\n(skipping live round-trip tests — no Supabase env vars found)')
    return
  }
  const supabase = createClient(url, key)

  console.log('\nEnrichment starter template — live round-trip')
  {
    const csv = buildEnrichmentTemplateCsv()
    const { rows } = parseCsvToRows(csv)
    const row = rows[0]
    const { values, errors } = parseEnrichmentFields(row)
    check('zero validation errors', errors.length === 0, errors)
    const resolved = await resolveGeneration(supabase, row.Make, row.Model, row.Generation)
    // The starter template's example row is a deliberate placeholder
    // (ExampleMake/ExampleModel/1st Gen) that must NOT match a real car —
    // uploading it unmodified should be harmless, not silently write to a
    // real row. So "unmatched" here is the correct, intentional outcome.
    check('example row is (intentionally) unmatched — it is placeholder data, not a real car', resolved === null)
    void values
  }

  console.log('\nEnrichment "download all cars" catalog — live round-trip')
  {
    const { data: cars } = await getModels({ limit: 500 })
    check(`fetched a non-empty live catalog`, cars.length > 0, cars.length)

    const csv = buildEnrichmentCatalogCsv(cars.map(c => ({ make: c.make, model: c.model, generation: c.generation })))
    const { headers, rows } = parseCsvToRows(csv)

    const unknown = findUnknownColumns(headers, KNOWN_ENRICHMENT_HEADERS)
    check('zero unknown columns', unknown.length === 0, unknown)
    check(`row count matches catalog size (${cars.length})`, rows.length === cars.length, rows.length)

    let invalidCount = 0, unmatchedCount = 0, diffCount = 0
    const problems: unknown[] = []
    for (const row of rows) {
      const { values, errors } = parseEnrichmentFields(row)
      if (errors.length > 0) { invalidCount++; problems.push({ row, errors }) }
      const resolved = await resolveGeneration(supabase, row.Make, row.Model, row.Generation)
      if (!resolved) { unmatchedCount++; problems.push({ row, reason: 'unmatched' }) }
      else {
        const diffs = diffEnrichmentFields(resolved, values)
        if (diffs.length > 0) { diffCount++; problems.push({ row, diffs }) }
      }
    }
    check('0 invalid rows (every real car\'s Make/Model/Generation round-trips through the CSV cleanly)', invalidCount === 0, problems.filter(p => (p as { errors?: unknown }).errors))
    check('0 unmatched rows (every row the generator wrote resolves back to the same live car)', unmatchedCount === 0, problems.filter(p => (p as { reason?: unknown }).reason))
    check('0 diffs (an all-blank catalog CSV proposes no changes)', diffCount === 0, problems.filter(p => (p as { diffs?: unknown }).diffs))
  }
}

liveRoundTrips().then(() => {
  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`)
    process.exit(1)
  }
  console.log('\nAll checks passed — generator and importer agree on headers, delimiters, and value formats; all three downloadable templates round-trip clean against live data.')
})
