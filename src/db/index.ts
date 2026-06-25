import Dexie, { type EntityTable } from 'dexie'
import type { Workflow, ApiKeys } from '../types'

class ZeroAgentDB extends Dexie {
  workflows!: EntityTable<Workflow, 'id'>
  settings!: EntityTable<{ id: string; apiKeys: ApiKeys }, 'id'>

  constructor() {
    super('ZeroAgentStudio')
    this.version(1).stores({
      workflows: '++id, name, updatedAt',
      settings: 'id',
    })
  }
}

export const db = new ZeroAgentDB()

export async function saveWorkflow(workflow: Omit<Workflow, 'id'> & { id?: number }): Promise<number> {
  const now = Date.now()
  if (workflow.id) {
    await db.workflows.update(workflow.id, { ...workflow, updatedAt: now })
    return workflow.id
  }
  const id = await db.workflows.add({ ...workflow, createdAt: now, updatedAt: now })
  return id as number
}

export async function loadWorkflows(): Promise<Workflow[]> {
  return db.workflows.orderBy('updatedAt').reverse().toArray()
}

export async function deleteWorkflow(id: number): Promise<void> {
  await db.workflows.delete(id)
}

export async function clearAllWorkflows(): Promise<void> {
  await db.workflows.clear()
}

export async function saveApiKeys(apiKeys: ApiKeys): Promise<void> {
  await db.settings.put({ id: 'api-keys', apiKeys })
}

export async function loadApiKeys(): Promise<ApiKeys> {
  const record = await db.settings.get('api-keys')
  return record?.apiKeys ?? {}
}

export async function deleteApiKeys(): Promise<void> {
  await db.settings.delete('api-keys')
}

export async function hasIndexedDbApiKeys(): Promise<boolean> {
  const record = await db.settings.get('api-keys')
  const keys = record?.apiKeys
  if (!keys) return false
  return !!(keys.openrouter?.trim() || keys.groq?.trim() || keys.gemini?.trim())
}
