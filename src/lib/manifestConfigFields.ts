export interface ManifestConfigField {
  key: string
  label: string
  placeholder?: string
  hint?: string
  type?: 'text' | 'number'
}

const FIELDS: Record<string, ManifestConfigField[]> = {
  'json-get-path': [{ key: 'path', label: 'Dot path', placeholder: 'user.name', hint: 'Required — e.g. items.0.title' }],
  'json-set-path': [
    { key: 'path', label: 'Dot path', placeholder: 'user.name' },
    { key: 'value', label: 'Value (JSON or text)', placeholder: '"Alice"' },
  ],
  'json-delete-path': [{ key: 'path', label: 'Dot path', placeholder: 'user.secret' }],
  'json-merge': [{ key: 'other', label: 'Other JSON object', placeholder: '{"role":"admin"}' }],
  'json-pick-keys': [{ key: 'keys', label: 'Keys (comma-separated)', placeholder: 'name,email' }],
  'json-omit-keys': [{ key: 'keys', label: 'Keys to remove', placeholder: 'password,token' }],
  'join-lines': [{ key: 'separator', label: 'Separator', placeholder: ', ' }],
  'join-words': [{ key: 'separator', label: 'Separator', placeholder: ' ' }],
  'merge-lines-flow': [{ key: 'separator', label: 'Separator', placeholder: ' ' }],
  'replace-all': [
    { key: 'search', label: 'Search', placeholder: 'old' },
    { key: 'replace', label: 'Replace with', placeholder: 'new' },
  ],
  'indent-lines': [{ key: 'prefix', label: 'Line prefix', placeholder: '  ' }],
  'grep-lines': [
    { key: 'pattern', label: 'Regex pattern', placeholder: 'error' },
    { key: 'flags', label: 'Flags', placeholder: 'i' },
  ],
  'grep-lines-inverse': [
    { key: 'pattern', label: 'Regex pattern', placeholder: 'debug' },
    { key: 'flags', label: 'Flags', placeholder: 'i' },
  ],
  'count-lines-matching': [
    { key: 'pattern', label: 'Regex pattern', placeholder: 'WARN' },
    { key: 'flags', label: 'Flags', placeholder: 'i' },
  ],
  'group-by-prefix': [{ key: 'delimiter', label: 'Prefix delimiter', placeholder: '/' }],
  'zip-lines': [
    { key: 'other', label: 'Second list (lines)', placeholder: 'b1\nb2' },
    { key: 'separator', label: 'Join separator', placeholder: ' | ' },
  ],
  'sample-lines': [{ key: 'n', label: 'Sample size', placeholder: '3', type: 'number' }],
  'head-lines': [{ key: 'n', label: 'Line count', placeholder: '5', type: 'number' }],
  'tail-lines': [{ key: 'n', label: 'Line count', placeholder: '5', type: 'number' }],
  'nth-line': [{ key: 'n', label: 'Line index (0-based)', placeholder: '0', type: 'number' }],
  'default-if-empty': [{ key: 'default', label: 'Default value', placeholder: 'N/A' }],
  'if-empty': [{ key: 'message', label: 'Empty message', placeholder: 'No input' }],
  template: [{ key: 'template', label: 'Template', placeholder: 'Hello {{input}}!' }],
  'line-template': [{ key: 'template', label: 'Per-line template', placeholder: '- {{line}}' }],
  'add-prefix': [{ key: 'prefix', label: 'Prefix', placeholder: '[tag] ' }],
  'add-suffix': [{ key: 'suffix', label: 'Suffix', placeholder: ' — end' }],
  'wrap-text': [{ key: 'width', label: 'Wrap width', placeholder: '80', type: 'number' }],
  'truncate-words': [{ key: 'max', label: 'Max words', placeholder: '50', type: 'number' }],
  'math-eval': [{ key: 'expression', label: 'Expression', placeholder: '2 + 2 * 3', hint: 'Uses input when empty' }],
  'math-clamp': [
    { key: 'min', label: 'Minimum', placeholder: '0', type: 'number' },
    { key: 'max', label: 'Maximum', placeholder: '100', type: 'number' },
  ],
  'math-max': [{ key: 'b', label: 'Second number (B)', placeholder: '0', type: 'number' }],
  'math-mod': [{ key: 'b', label: 'Modulo (B)', placeholder: '2', type: 'number' }],
  'math-percent': [{ key: 'percent', label: 'Percent', placeholder: '10', type: 'number' }],
  'format-number': [
    { key: 'locale', label: 'Locale', placeholder: 'en-US' },
    { key: 'fractionDigits', label: 'Decimal places', placeholder: '2', type: 'number' },
  ],
  'format-date': [{ key: 'format', label: 'Locale', placeholder: 'en-US' }],
  'add-days': [{ key: 'days', label: 'Days to add', placeholder: '7', type: 'number' }],
  'add-hours': [{ key: 'hours', label: 'Hours to add', placeholder: '2', type: 'number' }],
  'add-minutes': [{ key: 'minutes', label: 'Minutes to add', placeholder: '15', type: 'number' }],
  'relative-days': [{ key: 'days', label: 'Day offset', placeholder: '3', type: 'number' }],
  'diff-days': [{ key: 'other', label: 'Other date (ISO)', placeholder: '2025-01-01' }],
  'is-before-date': [{ key: 'other', label: 'Compare date (ISO)', placeholder: '2025-01-01' }],
  'matches-regex': [
    { key: 'pattern', label: 'Regex pattern', placeholder: '^[a-z]+$' },
    { key: 'flags', label: 'Flags (optional)', placeholder: 'i' },
  ],
  'regex-extract-first': [
    { key: 'pattern', label: 'Regex pattern', placeholder: '\\d+' },
    { key: 'flags', label: 'Flags', placeholder: 'g' },
  ],
  'regex-extract-all': [
    { key: 'pattern', label: 'Regex pattern', placeholder: '[A-Za-z]+' },
    { key: 'flags', label: 'Flags', placeholder: 'g' },
  ],
  'regex-replace': [
    { key: 'pattern', label: 'Regex pattern', placeholder: '\\s+' },
    { key: 'replacement', label: 'Replacement', placeholder: ' ' },
    { key: 'flags', label: 'Flags', placeholder: 'g' },
  ],
  'regex-split': [
    { key: 'pattern', label: 'Regex pattern', placeholder: ',' },
    { key: 'flags', label: 'Flags', placeholder: '' },
  ],
  'regex-test': [
    { key: 'pattern', label: 'Regex pattern', placeholder: '^https://' },
    { key: 'flags', label: 'Flags', placeholder: 'i' },
  ],
  'regex-capture-groups': [
    { key: 'pattern', label: 'Regex with groups', placeholder: '([0-9]+)-([0-9]+)' },
    { key: 'flags', label: 'Flags', placeholder: '' },
  ],
  'random-int': [
    { key: 'min', label: 'Minimum', placeholder: '0', type: 'number' },
    { key: 'max', label: 'Maximum', placeholder: '100', type: 'number' },
  ],
  'random-string': [{ key: 'length', label: 'Length', placeholder: '12', type: 'number' }],
  'random-hex': [{ key: 'bytes', label: 'Byte count', placeholder: '8', type: 'number' }],
  'lorem-ipsum': [{ key: 'words', label: 'Word count', placeholder: '20', type: 'number' }],
  'html-extract-meta': [{ key: 'name', label: 'Meta name/property', placeholder: 'description' }],
  'md-read-time': [{ key: 'wpm', label: 'Words per minute', placeholder: '200', type: 'number' }],
  'csv-select-column': [{ key: 'column', label: 'Column name', placeholder: 'email' }],
  'csv-filter-rows': [
    { key: 'column', label: 'Column name', placeholder: 'status' },
    { key: 'contains', label: 'Contains text', placeholder: 'active' },
  ],
  'csv-sort-rows': [{ key: 'column', label: 'Sort by column', placeholder: 'name' }],
  'csv-dedupe-rows': [{ key: 'column', label: 'Unique by column', placeholder: 'id' }],
  'text-equals': [{ key: 'other', label: 'Compare to', placeholder: 'expected' }],
  'text-contains': [{ key: 'other', label: 'Substring', placeholder: 'needle' }],
  'text-starts-with': [{ key: 'other', label: 'Prefix', placeholder: 'https://' }],
  'text-ends-with': [{ key: 'other', label: 'Suffix', placeholder: '.json' }],
  'line-diff-count': [{ key: 'other', label: 'Other text (lines)', placeholder: 'line1\nline2' }],
  'similarity-ratio': [{ key: 'other', label: 'Compare to', placeholder: 'other text' }],
  'contains-text': [{ key: 'text', label: 'Substring', placeholder: 'hello' }],
  'equals-ignore-case': [{ key: 'text', label: 'Compare to', placeholder: 'Hello' }],
  'min-length': [{ key: 'min', label: 'Minimum length', placeholder: '3', type: 'number' }],
  'max-length': [{ key: 'max', label: 'Maximum length', placeholder: '100', type: 'number' }],
  'in-range': [
    { key: 'min', label: 'Minimum', placeholder: '0', type: 'number' },
    { key: 'max', label: 'Maximum', placeholder: '100', type: 'number' },
  ],
  'pad-start': [
    { key: 'length', label: 'Target length', placeholder: '20', type: 'number' },
    { key: 'char', label: 'Pad character', placeholder: ' ' },
  ],
  'pad-end': [
    { key: 'length', label: 'Target length', placeholder: '20', type: 'number' },
    { key: 'char', label: 'Pad character', placeholder: ' ' },
  ],
  'truncate-text': [{ key: 'max', label: 'Max length', placeholder: '100', type: 'number' }],
  'repeat-text': [{ key: 'times', label: 'Repeat count', placeholder: '3', type: 'number' }],
  'fetch-json': [{ key: 'url', label: 'URL (optional if wired)', placeholder: 'https://api.example.com/data' }],
}

export function getManifestConfigFields(toolId: string): ManifestConfigField[] {
  return FIELDS[toolId] ?? []
}
