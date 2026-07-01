// Parses the of_cars CSV and generates lib/mock-data.ts
const fs = require('fs')
const path = require('path')

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const rows = []
  let i = 0
  while (i < text.length) {
    const row = []
    while (i < text.length && text[i] !== '\n') {
      if (text[i] === '"') {
        i++
        let cell = ''
        while (i < text.length) {
          if (text[i] === '"' && text[i + 1] === '"') { cell += '"'; i += 2 }
          else if (text[i] === '"') { i++; break }
          else { cell += text[i++] }
        }
        row.push(cell)
        if (text[i] === ',') i++
      } else {
        let cell = ''
        while (i < text.length && text[i] !== ',' && text[i] !== '\n') cell += text[i++]
        row.push(cell.trim())
        if (text[i] === ',') i++
      }
    }
    if (text[i] === '\n') i++
    if (row.length > 1) rows.push(row)
  }
  return rows
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function slugify(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function mapClass(raw) {
  const c = raw.toLowerCase()
  if (c.includes('supercar') || c.includes('exotic')) return 'Exotic'
  if (c.includes('grand tour') || c.startsWith('gt /') || c === 'gt / sports car' || c === 'gt / luxury' || c === 'gt / sports') return 'Grand Tourer'
  if (c.includes('luxury') || c.includes('personal luxury') || c.includes('executive') || c.includes('full-size luxury') || c.includes('full-size / luxury')) return 'Luxury'
  if (c.includes('muscle') || c.includes('pony') || c.includes('car-based pickup')) return 'Muscle'
  if (c.includes('off-road') || c.includes('suv')) return 'Off-Road'
  if (c.includes('historic') || c.includes('race car') || c.includes('racing car') || c.includes('concept')) return 'Icons'
  return 'Sports'
}

function mapCountry(raw) {
  const c = raw.trim()
  if (c === 'United States') return 'USA'
  if (c === 'Germany') return 'Germany'
  if (c === 'UK') return 'UK'
  if (c === 'Japan') return 'Japan'
  if (c === 'Italy') return 'Italy'
  if (c === 'France') return 'France'
  if (c === 'Sweden') return 'Sweden'
  if (c === 'Australia') return 'Australia'
  return 'Other'
}

function parseYears(raw) {
  // "1953–1962" or "1953–present" or "2005–present" or "1964–1969, 2005–present"
  const cleaned = raw.replace(/–/g, '-').replace(/—/g, '-').replace(/–/g, '-')
  // Take only the first range if multiple
  const first = cleaned.split(',')[0].trim()
  const parts = first.split('-')
  const start = parseInt(parts[0])
  const endRaw = parts[parts.length - 1].trim()
  const end = endRaw === 'present' || isNaN(parseInt(endRaw)) ? null : parseInt(endRaw)
  return { year_start: isNaN(start) ? 1900 : start, year_end: end }
}

function parseBodyStyles(raw) {
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

// ── Main ──────────────────────────────────────────────────────────────────────
const csvPath = path.join(process.env.HOME, 'Downloads', 'of_cars_ORIGINAL - Cars.csv')
const text = fs.readFileSync(csvPath, 'utf-8')
const rows = parseCSV(text)

// Skip header row
const dataRows = rows.slice(1)

const seenSlugs = new Set()
const cars = []
let id = 1

for (const row of dataRows) {
  // Columns: Make+Model, Make, Model, Description, Generation, Production Years, Body Styles, Class, Country, Image, Wikipedia Link, Engine Layout, Drive Layout, Notable Trims
  const [makeModel, make, model, description, generation, productionYears, bodyStylesRaw, classRaw, countryRaw, image, wikipedia, engineLayout, driveLayout, notableTrims] = row

  if (!make || !model) continue

  const gen = (generation || '').trim() || null
  const { year_start, year_end } = parseYears(productionYears || '')

  // Build slug from make + model + generation
  const slugBase = [make, model, gen].filter(Boolean).join(' ')
  let slug = slugify(slugBase)
  // Deduplicate slugs
  if (seenSlugs.has(slug)) {
    // Try with year
    slug = slugify([make, model, gen, year_start].filter(Boolean).join(' '))
    if (seenSlugs.has(slug)) continue // skip true duplicate
  }
  seenSlugs.add(slug)

  const carClass = mapClass(classRaw || '')
  const country = mapCountry(countryRaw || '')
  const bodyStyles = parseBodyStyles(bodyStylesRaw || '')
  const heroImage = (image || '').trim() || null

  cars.push({
    id: String(id++),
    slug,
    make: make.trim(),
    model: model.trim(),
    generation: gen,
    year_start,
    year_end,
    class: carClass,
    country,
    body_styles: bodyStyles,
    drivetrain: (driveLayout || '').trim() || null,
    engine_layout: (engineLayout || '').trim() || null,
    units_produced: null,
    overview: (description || '').trim() || null,
    hero_image: heroImage,
    gallery_images: [],
    specs: [],
    market_data: null,
    maintenance: null,
    resources: [],
    wikipedia: (wikipedia || '').trim() || null,
    notable_trims: (notableTrims || '').trim() || null,
    created_at: '',
    updated_at: '',
  })
}

// ── Generate TypeScript ───────────────────────────────────────────────────────
const carLines = cars.map(car => {
  const esc = s => s ? s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') : ''
  const bodyStylesStr = JSON.stringify(car.body_styles)
  const overviewStr = car.overview ? `\`${esc(car.overview)}\`` : 'null'
  const heroStr = car.hero_image ? `\`${esc(car.hero_image)}\`` : 'null'
  const genStr = car.generation ? `'${car.generation.replace(/'/g, "\\'")}' ` : 'null'
  const yearEndStr = car.year_end !== null ? String(car.year_end) : 'null'
  const driveStr = car.drivetrain ? `'${car.drivetrain.replace(/'/g, "\\'")}'` : 'null'
  const engineStr = car.engine_layout ? `'${car.engine_layout.replace(/'/g, "\\'")}'` : 'null'

  return `  {
    id: '${car.id}',
    slug: '${car.slug}',
    make: '${car.make.replace(/'/g, "\\'")}',
    model: '${car.model.replace(/'/g, "\\'")}',
    generation: ${genStr !== 'null' ? `'${car.generation.replace(/'/g, "\\'")}'` : 'null'},
    year_start: ${car.year_start},
    year_end: ${yearEndStr},
    class: '${car.class}',
    country: '${car.country}',
    body_styles: ${bodyStylesStr},
    drivetrain: ${driveStr},
    engine_layout: ${engineStr},
    units_produced: null,
    overview: ${overviewStr},
    hero_image: ${heroStr},
    gallery_images: [],
    specs: [],
    market_data: null,
    maintenance: null,
    resources: [],
    created_at: '',
    updated_at: '',
  }`
}).join(',\n')

const output = `import type { Car, CarSummary } from './types'

export const MOCK_CARS: Car[] = [
${carLines}
]

export const MOCK_CAR_SUMMARIES: CarSummary[] = MOCK_CARS.map(
  ({ id, slug, make, model, generation, year_start, year_end, class: c, country, hero_image, units_produced }) => ({
    id, slug, make, model, generation, year_start, year_end, class: c, country, hero_image, units_produced,
  })
)
`

const outPath = path.join(__dirname, '..', 'lib', 'mock-data.ts')
fs.writeFileSync(outPath, output, 'utf-8')
console.log(`✓ Generated ${cars.length} cars → lib/mock-data.ts`)

// Print class distribution
const classCounts = {}
cars.forEach(c => { classCounts[c.class] = (classCounts[c.class] || 0) + 1 })
console.log('Class breakdown:', classCounts)

// Print country distribution
const countryCounts = {}
cars.forEach(c => { countryCounts[c.country] = (countryCounts[c.country] || 0) + 1 })
console.log('Country breakdown:', countryCounts)
