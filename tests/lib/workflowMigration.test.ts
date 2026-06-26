import { describe, it, expect } from 'vitest'
import { migrateWorkflow, migrateWorkflowEdges } from '../../src/lib/workflowMigration'
import { makeChat, makeAgent, edge } from '../helpers/graphBuilders'

describe('workflowMigration', () => {
  it('adds default handles to legacy edges', () => {
    const chat = makeChat('c')
    const agent = makeAgent('a')
    const nodes = [chat, agent]
    const migrated = migrateWorkflowEdges(nodes, [edge('e1', 'c', 'a')])
    expect(migrated[0].sourceHandle).toBe('message')
    expect(migrated[0].targetHandle).toBe('context')
  })

  it('migrateWorkflow returns nodes and edges', () => {
    const chat = makeChat('c')
    const agent = makeAgent('a')
    const result = migrateWorkflow([chat, agent], [edge('e1', 'c', 'a')])
    expect(result.edges[0].sourceHandle).toBeTruthy()
    expect(result.nodes[0].width).toBe(340)
    expect(result.nodes[1].width).toBe(260)
  })
})
