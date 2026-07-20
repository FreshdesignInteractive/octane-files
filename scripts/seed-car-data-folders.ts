// Run: npx tsx scripts/seed-car-data-folders.ts
//
// Creates one permanent subfolder per live car under "Car Data/", named by
// slug (matches the car's own public URL exactly — unambiguous, no
// collisions, easy for an editorial session to look up). Idempotent: only
// creates folders that don't already exist, never touches or removes one
// that does (whether empty or mid-batch). Safe to re-run any time new cars
// get added to the catalog — it'll just create folders for the new ones.
//
// Also regenerates octane-files-catalog-index.csv (Make/Model/Generation,
// live cars only, sorted) every run — this is the file an editorial Claude
// session matches Rivals/Lineage naming against, so it must never go stale
// relative to what's actually live. Always overwritten in full, since it's
// a derived index, not hand-edited content.

import { config } from 'dotenv'
import { resolve, join } from 'path'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
config({ path: resolve(process.cwd(), '.env.local') })

import { getModelSlugs, getModels } from '../lib/supabase'

const INBOX = '/Users/rajeshsidharthan/Library/CloudStorage/Dropbox/Claude/Octane Files/Car Data'
const CATALOG_INDEX = '/Users/rajeshsidharthan/Library/CloudStorage/Dropbox/Claude/Octane Files/Claude Handoff Docs for Projects/octane-files-catalog-index.csv'

function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

async function regenerateCatalogIndex(): Promise<number> {
  const { data } = await getModels({ limit: 1000 })
  const sorted = [...data].sort((a, b) =>
    a.make.localeCompare(b.make) || a.model.localeCompare(b.model) || a.generation.localeCompare(b.generation)
  )
  const lines = ['Make,Model,Generation', ...sorted.map(c => [c.make, c.model, c.generation].map(csvField).join(','))]
  writeFileSync(CATALOG_INDEX, lines.join('\n') + '\n')
  return sorted.length
}

async function main() {
  mkdirSync(INBOX, { recursive: true })
  const slugs = await getModelSlugs()

  let created = 0
  for (const slug of slugs) {
    const folder = join(INBOX, slug)
    if (!existsSync(folder)) {
      mkdirSync(folder, { recursive: true })
      created++
    }
  }

  console.log(`${slugs.length} live cars checked — ${created} new folder(s) created, ${slugs.length - created} already existed.`)

  const indexed = await regenerateCatalogIndex()
  console.log(`Catalog index regenerated — ${indexed} live car(s) written to ${CATALOG_INDEX}`)
}

main()
