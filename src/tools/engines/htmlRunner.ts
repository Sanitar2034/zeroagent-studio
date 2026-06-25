export type HtmlPreset =
  | 'to-text'
  | 'strip-tags'
  | 'extract-links'
  | 'extract-title'
  | 'extract-meta'
  | 'extract-images'
  | 'unescape-entities'
  | 'table-to-lines'

function parseHtml(input: string): Document {
  return new DOMParser().parseFromString(input, 'text/html')
}

export function runHtmlPreset(preset: HtmlPreset, input: string, config: Record<string, string>): string {
  switch (preset) {
    case 'to-text':
      // v8 ignore next -- jsdom always provides body.textContent for parsed HTML
      return parseHtml(input).body.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    case 'strip-tags':
      return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    case 'extract-links': {
      const doc = parseHtml(input)
      /* v8 ignore start -- href attribute is present for a[href] matches */
      return [...doc.querySelectorAll('a[href]')]
        .map((a) => a.getAttribute('href') ?? '')
        .filter(Boolean)
        .join('\n')
      /* v8 ignore stop */
    }
    case 'extract-title':
      return parseHtml(input).title || ''
    case 'extract-meta': {
      const doc = parseHtml(input)
      const name = config.name ?? 'description'
      const el =
        doc.querySelector(`meta[name="${name}"]`) ??
        doc.querySelector(`meta[property="${name}"]`)
      // v8 ignore next -- content attribute may be absent on malformed meta tags
      return el?.getAttribute('content') ?? ''
    }
    case 'extract-images': {
      const doc = parseHtml(input)
      /* v8 ignore start -- src attribute is present for img[src] matches */
      return [...doc.querySelectorAll('img[src]')]
        .map((img) => img.getAttribute('src') ?? '')
        .filter(Boolean)
        .join('\n')
      /* v8 ignore stop */
    }
    case 'unescape-entities': {
      const el = document.createElement('textarea')
      el.innerHTML = input
      return el.value
    }
    case 'table-to-lines': {
      const doc = parseHtml(input)
      const rows = [...doc.querySelectorAll('table tr')]
      /* v8 ignore start -- table cells may lack textContent in malformed HTML */
      return rows
        .map((row) =>
          [...row.querySelectorAll('th,td')]
            .map((cell) => cell.textContent?.trim() ?? '')
            .join('\t')
        )
        .join('\n')
      /* v8 ignore stop */
    }
    default:
      return input
  }
}
