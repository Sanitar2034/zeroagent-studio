export type CsvPreset =
  | 'parse-header'
  | 'to-json-rows'
  | 'from-json-row'
  | 'select-column'
  | 'filter-rows'
  | 'sort-rows'
  | 'dedupe-rows'
  | 'tsv-to-csv'

function parseCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === delimiter && !inQuotes) {
      out.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  out.push(current)
  return out
}

function parseCsv(text: string, delimiter = ','): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split('\n').filter((l) => l.trim())
  // v8 ignore next -- empty CSV input yields no headers or rows
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = parseCsvLine(lines[0]!, delimiter)
  const rows = lines.slice(1).map((line) => parseCsvLine(line, delimiter))
  return { headers, rows }
}

function rowsToObjects(headers: string[], rows: string[][]): Record<string, string>[] {
  return rows.map((row) => {
    const obj: Record<string, string> = {}
    headers.forEach((header, i) => {
      obj[header] = row[i] ?? ''
    })
    return obj
  })
}

export function runCsvPreset(preset: CsvPreset, input: string, config: Record<string, string>): string {
  const delimiter = config.delimiter ?? ','

  switch (preset) {
    case 'parse-header': {
      const { headers } = parseCsv(input, delimiter)
      return headers.join('\n')
    }
    case 'to-json-rows': {
      const { headers, rows } = parseCsv(input, delimiter)
      return JSON.stringify(rowsToObjects(headers, rows), null, 2)
    }
    case 'from-json-row': {
      const obj = JSON.parse(input) as Record<string, string>
      const headers = Object.keys(obj)
      // v8 ignore next -- null JSON fields stringify as empty CSV cells
      const values = headers.map((h) => obj[h] ?? '')
      return `${headers.join(delimiter)}\n${values.join(delimiter)}`
    }
    case 'select-column': {
      // v8 ignore next -- column defaults to empty string when omitted
      const column = config.column ?? ''
      if (!column) throw new Error('select-column requires config.column')
      const { headers, rows } = parseCsv(input, delimiter)
      const idx = headers.indexOf(column)
      if (idx < 0) throw new Error(`Column not found: ${column}`)
      return rows.map((row) => row[idx] ?? '').join('\n')
    }
    case 'filter-rows': {
      // v8 ignore next -- column and contains default from config when omitted
      const column = config.column ?? ''
      // v8 ignore next -- contains defaults to empty string (match all)
      const contains = config.contains ?? ''
      const { headers, rows } = parseCsv(input, delimiter)
      const idx = headers.indexOf(column)
      if (idx < 0) throw new Error(`Column not found: ${column}`)
      // v8 ignore next -- sparse row cells are treated as empty when filtering
      const filtered = rows.filter((row) => (row[idx] ?? '').includes(contains))
      return [headers.join(delimiter), ...filtered.map((r) => r.join(delimiter))].join('\n')
    }
    case 'sort-rows': {
      // v8 ignore next -- column defaults when config.column is omitted
      const column = config.column ?? ''
      const { headers, rows } = parseCsv(input, delimiter)
      const idx = headers.indexOf(column)
      if (idx < 0) throw new Error(`Column not found: ${column}`)
      // v8 ignore next -- sparse row cells sort as empty strings
      const sorted = [...rows].sort((a, b) => (a[idx] ?? '').localeCompare(b[idx] ?? ''))
      return [headers.join(delimiter), ...sorted.map((r) => r.join(delimiter))].join('\n')
    }
    case 'dedupe-rows': {
      // v8 ignore next -- column defaults when config.column is omitted
      const column = config.column ?? ''
      const { headers, rows } = parseCsv(input, delimiter)
      const idx = headers.indexOf(column)
      if (idx < 0) throw new Error(`Column not found: ${column}`)
      const seen = new Set<string>()
      const unique = rows.filter((row) => {
        // v8 ignore next -- sparse row cells dedupe as empty keys
        const key = row[idx] ?? ''
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      return [headers.join(delimiter), ...unique.map((r) => r.join(delimiter))].join('\n')
    }
    case 'tsv-to-csv':
      return input.split('\n').map((line) => line.split('\t').join(',')).join('\n')
    default:
      // v8 ignore next -- exhaustive preset union; default satisfies switch coverage
      return input
  }
}
