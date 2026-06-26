import { describe, it, expect, beforeEach } from 'vitest'
import {
  db,
  saveWorkflow,
  loadWorkflows,
  deleteWorkflow,
  clearAllWorkflows,
  saveApiKeys,
  loadApiKeys,
  deleteApiKeys,
  hasIndexedDbApiKeys,
} from '../../src/db'

describe('IndexedDB — offline persistence for users without servers', () => {
  beforeEach(async () => {
    await db.workflows.clear()
    await db.settings.clear()
  })

  it('saves and loads workflow on flaky connection (IndexedDB survives refresh)', async () => {
    const id = await saveWorkflow({
      name: 'Homework helper',
      nodes: [],
      edges: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    expect(id).toBeGreaterThan(0)

    const workflows = await loadWorkflows()
    expect(workflows[0].name).toBe('Homework helper')
  })

  it('updates existing workflow without duplicating', async () => {
    const id = await saveWorkflow({
      name: 'Draft v1',
      nodes: [],
      edges: [],
      createdAt: 1,
      updatedAt: 1,
    })
    await saveWorkflow({
      id,
      name: 'Draft v2',
      nodes: [{ id: 'n1' } as never],
      edges: [],
      createdAt: 1,
      updatedAt: 1,
    })

    const all = await loadWorkflows()
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('Draft v2')
  })

  it('deletes workflow when student cleans up old projects', async () => {
    const id = await saveWorkflow({
      name: 'Old',
      nodes: [],
      edges: [],
      createdAt: 1,
      updatedAt: 1,
    })
    await deleteWorkflow(id)
    expect(await loadWorkflows()).toHaveLength(0)
  })

  it('stores API keys locally — never leaves device', async () => {
    await saveApiKeys({ openrouter: 'sk-or-secret', groq: 'gsk_secret' })
    const keys = await loadApiKeys()
    expect(keys.openrouter).toBe('sk-or-secret')
    expect(keys.groq).toBe('gsk_secret')
  })

  it('returns empty keys for first-time user', async () => {
    expect(await loadApiKeys()).toEqual({})
    expect(await hasIndexedDbApiKeys()).toBe(false)
  })

  it('deletes stored API keys', async () => {
    await saveApiKeys({ openrouter: 'sk-or-secret' })
    expect(await hasIndexedDbApiKeys()).toBe(true)
    await deleteApiKeys()
    expect(await loadApiKeys()).toEqual({})
    expect(await hasIndexedDbApiKeys()).toBe(false)
  })

  it('treats whitespace-only keys as absent', async () => {
    await saveApiKeys({ openrouter: '   ', groq: '' })
    expect(await hasIndexedDbApiKeys()).toBe(false)
  })

  it('orders workflows by most recently updated (student finds latest draft)', async () => {
    await saveWorkflow({
      name: 'Old',
      nodes: [],
      edges: [],
      createdAt: 1,
      updatedAt: 100,
    })
    await new Promise((r) => setTimeout(r, 5))
    await saveWorkflow({
      name: 'New',
      nodes: [],
      edges: [],
      createdAt: 1,
      updatedAt: Date.now(),
    })

    const list = await loadWorkflows()
    expect(list[0].name).toBe('New')
  })

  it('clearAllWorkflows removes every saved workflow', async () => {
    await saveWorkflow({
      name: 'One',
      nodes: [],
      edges: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    await saveWorkflow({
      name: 'Two',
      nodes: [],
      edges: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    expect((await loadWorkflows()).length).toBe(2)
    await clearAllWorkflows()
    expect(await loadWorkflows()).toEqual([])
  })
})
