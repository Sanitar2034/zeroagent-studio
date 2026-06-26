import type {
  ExampleCategory,
  ExampleDifficulty,
  ExampleWorkflowGroup,
  ExampleWorkflowId,
  ExampleWorkflowMeta,
} from './types'

export const EXAMPLE_CATEGORY_ORDER: ExampleCategory[] = [
  'starter',
  'research',
  'pipeline',
  'data',
  'voice',
  'power',
]

export const EXAMPLE_CATEGORY_LABELS: Record<ExampleCategory, string> = {
  starter: 'Starter',
  research: 'Research & web',
  pipeline: 'Pipelines',
  data: 'Data & transforms',
  voice: 'Voice',
  power: 'Power (API key)',
}

const DIFFICULTY_ORDER: Record<ExampleDifficulty, number> = {
  easy: 0,
  medium: 1,
  advanced: 2,
}

export const EXAMPLE_WORKFLOWS: ExampleWorkflowMeta[] = [
  {
    id: 'quick-start',
    name: 'Hello, Agent',
    description: 'Your first reply in seconds — chat wired to an AI helper',
    flow: 'Chat → Agent',
    category: 'starter',
    difficulty: 'easy',
    featured: true,
    tryPrompt: 'What can you help me build today?',
  },
  {
    id: 'snack-verdict',
    name: 'Snack verdict',
    description: 'Scrape a food page and get an instant AI judgment',
    flow: 'Chat + Web Scraper → Agent',
    category: 'starter',
    difficulty: 'easy',
    featured: true,
    tryPrompt: 'Is this a healthy snack? Summarize in 3 bullets.',
  },
  {
    id: 'writer-editor',
    name: 'Writer & editor',
    description: 'Two agents in a row — draft, then polish',
    flow: 'Chat → Agent → Agent',
    category: 'starter',
    difficulty: 'medium',
    tryPrompt: 'Write a 2-sentence product tagline for a coffee mug that never spills.',
  },
  {
    id: 'explain-my-url',
    name: 'Explain my link',
    description: 'Paste any URL — get host, path, and params explained plainly',
    flow: 'Chat → Parse URL → Agent',
    category: 'starter',
    difficulty: 'easy',
    tryPrompt: 'https://github.com/zeroclaw/zeroclaw',
  },
  {
    id: 'meme-math',
    name: 'Math hotline',
    description: 'Send a math expression — calculator computes, tutor makes it fun',
    flow: 'Chat → Calculator → Agent',
    category: 'starter',
    difficulty: 'easy',
    tryPrompt: 'What is (42 * 17) + 3? Make it funny.',
  },
  {
    id: 'research-stack',
    name: 'Research party',
    description: 'Question + live page scrape + timestamp fused into one briefing',
    flow: 'Chat + Web Scraper + Date & Time → Agent',
    category: 'research',
    difficulty: 'medium',
    tryPrompt: 'What are the key facts about this topic?',
  },
  {
    id: 'hacker-headlines',
    name: 'Hacker headlines',
    description: 'Fetch live JSON from the web, summarize, capture — no chat needed',
    flow: 'Fetch JSON → Agent → Text Output',
    category: 'research',
    difficulty: 'medium',
  },
  {
    id: 'readme-reader',
    name: 'Read my notes',
    description: 'Pick a local text file, summarize it, save to capture',
    flow: 'File Reader → Agent → Text Output',
    category: 'research',
    difficulty: 'medium',
  },
  {
    id: 'capture-only',
    name: 'Silent scraper',
    description: 'Scrape and clean a page into capture — zero AI, zero chat',
    flow: 'Web Scraper → HTML To Text → Text Output',
    category: 'research',
    difficulty: 'easy',
  },
  {
    id: 'script-pipeline',
    name: 'Script laboratory',
    description: 'JSON in, sandbox script transforms it, AI explains the result',
    flow: 'Chat → JSON Tool → Custom Script → Agent',
    category: 'pipeline',
    difficulty: 'advanced',
    tryPrompt: '{"items":["apple","banana","cherry"],"mode":"uppercase"}',
  },
  {
    id: 'json-glow-up',
    name: 'JSON glow-up',
    description: 'Paste messy JSON — pretty-print, then get a plain-English summary',
    flow: 'Chat → JSON Tool → Agent',
    category: 'pipeline',
    difficulty: 'easy',
    tryPrompt: '{"name":"Ada","skills":["rust","wasm"],"active":true}',
  },
  {
    id: 'context-briefing',
    name: 'Context briefing',
    description: 'Three parallel context blocks — message, clock, and fresh ID',
    flow: 'Chat + Date & Time + UUID → Agent',
    category: 'pipeline',
    difficulty: 'medium',
    tryPrompt: 'Draft a one-line status update using all context blocks.',
  },
  {
    id: 'tool-only',
    name: 'No chat needed',
    description: 'Clipboard + timestamp briefing — run straight from the Agent block',
    flow: 'Date & Time + Clipboard → Agent',
    category: 'pipeline',
    difficulty: 'medium',
  },
  {
    id: 'encode-boomerang',
    name: 'Encode boomerang',
    description: 'Text survives a Base64 round-trip before the AI answers',
    flow: 'Chat → Base64 Encode → Base64 Decode → Agent',
    category: 'data',
    difficulty: 'medium',
    tryPrompt: 'Hello from the encoding pipeline!',
  },
  {
    id: 'jwt-inspector',
    name: 'JWT inspector',
    description: 'Paste a token — decoded claims explained in human language',
    flow: 'Chat → JWT Decode → Agent',
    category: 'data',
    difficulty: 'medium',
    tryPrompt:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  },
  {
    id: 'regex-hunter',
    name: 'Regex hunter',
    description: 'Pull emails and URLs from messy text, then summarize findings',
    flow: 'Chat → Regex Emails → Agent',
    category: 'data',
    difficulty: 'easy',
    tryPrompt: 'Contact: ada@example.com or visit https://example.com/docs',
  },
  {
    id: 'diff-detective',
    name: 'Diff detective',
    description: 'Compare two texts — similarity score plus a human summary',
    flow: 'Chat → Similarity → Agent',
    category: 'data',
    difficulty: 'medium',
    tryPrompt: 'The quick brown fox jumps over the lazy dog.',
  },
  {
    id: 'id-factory',
    name: 'ID factory',
    description: 'Timestamp + UUID turned into a paste-ready support ticket line',
    flow: 'Date & Time + UUID → Agent → Text Output',
    category: 'data',
    difficulty: 'medium',
  },
  {
    id: 'scraper-cleanup',
    name: 'Wiki to podcast',
    description: 'Scrape Wikipedia, summarize, hear it spoken aloud',
    flow: 'Web Scraper → HTML To Text → Agent → Speech',
    category: 'voice',
    difficulty: 'advanced',
    featured: true,
  },
  {
    id: 'voice-reply',
    name: 'Voice reply',
    description: 'Ask a question — read the answer out loud',
    flow: 'Chat → Agent → Speech',
    category: 'voice',
    difficulty: 'easy',
    tryPrompt: 'Give me one fun fact about the moon in two sentences.',
  },
  {
    id: 'describe-image',
    name: 'Describe a photo',
    description: 'Send an image URL — Gemini Vision describes it, Agent explains (pick file in inspector if needed)',
    flow: 'Chat → Gemini Vision → Agent',
    category: 'power',
    difficulty: 'medium',
    requiresKey: 'gemini',
  },
  {
    id: 'transcribe-me',
    name: 'Transcribe me',
    description: 'Pick audio in Groq Transcribe, then get an AI summary — add a free Groq key',
    flow: 'Chat → Groq Transcribe → Agent',
    category: 'power',
    difficulty: 'advanced',
    requiresKey: 'groq',
  },
]

export function getExampleWorkflowMeta(id: ExampleWorkflowId): ExampleWorkflowMeta | undefined {
  return EXAMPLE_WORKFLOWS.find((example) => example.id === id)
}

export function sortExampleWorkflows(workflows: ExampleWorkflowMeta[]): ExampleWorkflowMeta[] {
  return [...workflows].sort((a, b) => {
    if (a.featured && !b.featured) return -1
    if (!a.featured && b.featured) return 1

    const catA = EXAMPLE_CATEGORY_ORDER.indexOf(a.category)
    const catB = EXAMPLE_CATEGORY_ORDER.indexOf(b.category)
    if (catA !== catB) return catA - catB

    const diffA = DIFFICULTY_ORDER[a.difficulty]
    const diffB = DIFFICULTY_ORDER[b.difficulty]
    if (diffA !== diffB) return diffA - diffB

    return a.name.localeCompare(b.name)
  })
}

export function listExampleWorkflows(): ExampleWorkflowMeta[] {
  return sortExampleWorkflows(EXAMPLE_WORKFLOWS)
}

export function groupExampleWorkflows(workflows: ExampleWorkflowMeta[] = EXAMPLE_WORKFLOWS): ExampleWorkflowGroup[] {
  const sorted = sortExampleWorkflows(workflows)
  const groups: ExampleWorkflowGroup[] = []

  const featured = sorted.filter((item) => item.featured)
  if (featured.length > 0) {
    groups.push({ kind: 'featured', label: 'Featured', items: featured })
  }

  for (const category of EXAMPLE_CATEGORY_ORDER) {
    const items = sorted.filter((item) => item.category === category && !item.featured)
    if (items.length === 0) continue
    groups.push({
      kind: 'category',
      category,
      label: EXAMPLE_CATEGORY_LABELS[category],
      items,
    })
  }

  return groups
}

export function getExampleKeyBadgeLabel(requiresKey?: ExampleWorkflowMeta['requiresKey']): string | null {
  if (!requiresKey) return null
  if (requiresKey === 'gemini') return 'Gemini key'
  if (requiresKey === 'groq') return 'Groq key'
  return 'API key'
}
