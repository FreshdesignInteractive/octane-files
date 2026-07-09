// Browser-safe CSV parser (no Node APIs) — ported verbatim from the parsing
// logic in imports/dry_run_phase2b.mjs, proven against real quoted/
// comma-embedded enrichment CSV data. Handles quoted fields, embedded
// commas, and doubled double-quotes for escaping (RFC4180-ish).

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++
        row.push(field); field = ''
        if (row.length > 1 || row[0] !== '') rows.push(row)
        row = []
      } else field += c
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

// Parses CSV text into an array of header-keyed row objects, plus the raw
// header list (so callers can flag unknown columns before mapping).
export function parseCsvToRows(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const [header, ...dataRows] = parseCsv(text)
  const headers = header ?? []
  const rows = dataRows.map(cols => Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? ''])))
  return { headers, rows }
}

// Triggers a browser download of generated CSV text — no server round-trip,
// since the template content is just a pure function of the schema.
export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
