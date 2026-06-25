import type { Edge, Node } from '@xyflow/react'
import type { WorkflowTrigger } from '../types'

function getUpstreamNodeIds(nodeId: string, edges: Edge[]): string[] {
  return edges.filter((e) => e.target === nodeId).map((e) => e.source)
}

function getDownstreamNodeIds(nodeId: string, edges: Edge[]): string[] {
  return edges.filter((e) => e.source === nodeId).map((e) => e.target)
}

/** All ancestors of a node (reverse BFS along edges). */
export function upstreamClosure(nodeId: string, edges: Edge[]): Set<string> {
  const closure = new Set<string>()
  const queue = [nodeId]

  while (queue.length > 0) {
    const current = queue.shift()!
    for (const parent of getUpstreamNodeIds(current, edges)) {
      if (!closure.has(parent)) {
        closure.add(parent)
        queue.push(parent)
      }
    }
  }

  return closure
}

/** All descendants of a node (forward BFS along edges). */
export function downstreamClosure(nodeId: string, edges: Edge[]): Set<string> {
  const closure = new Set<string>()
  const queue = [...getDownstreamNodeIds(nodeId, edges)]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (!closure.has(current)) {
      closure.add(current)
      queue.push(...getDownstreamNodeIds(current, edges))
    }
  }

  return closure
}

/** Agent nodes reachable forward from a start node (BFS downstream). */
export function forwardReachableAgents(startId: string, nodes: Node[], edges: Edge[]): string[] {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const visited = new Set<string>()
  const agents: string[] = []
  const queue = [startId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)

    const node = nodeById.get(current)
    if (node?.type === 'agent') agents.push(current)

    for (const next of getDownstreamNodeIds(current, edges)) {
      /* v8 ignore next */
      if (!visited.has(next)) queue.push(next)
    }
  }

  return agents
}

/** True when any ancestor is Chat or Agent (Run capture is tool-only). */
export function hasChatOrAgentUpstream(nodeId: string, nodes: Node[], edges: Edge[]): boolean {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  for (const id of upstreamClosure(nodeId, edges)) {
    const type = nodeById.get(id)?.type
    if (type === 'chat' || type === 'agent') return true
  }
  return false
}

/** Run capture is valid only for tool-only upstream chains with at least one feeder. */
export function canRunCaptureSink(nodeId: string, nodes: Node[], edges: Edge[]): boolean {
  if (upstreamClosure(nodeId, edges).size === 0) return false
  return !hasChatOrAgentUpstream(nodeId, nodes, edges)
}

/** Nodes that should run for a given workflow trigger.
 *  Sink capture: Text Output plus tool-only upstream feeders.
 *  Per sink agent: the agent itself, upstream feeders (Context/In), and downstream post-agent chains (Out → In). */
export function resolveExecutionScope(
  trigger: WorkflowTrigger,
  nodes: Node[],
  edges: Edge[]
): Set<string> {
  const scope = new Set<string>()

  if (trigger.kind === 'sink') {
    const nodeById = new Map(nodes.map((n) => [n.id, n]))
    scope.add(trigger.nodeId)
    for (const id of upstreamClosure(trigger.nodeId, edges)) {
      if (nodeById.get(id)?.type === 'tool') {
        scope.add(id)
      }
    }
    return scope
  }

  if (trigger.kind === 'tool') {
    scope.add(trigger.nodeId)
    for (const id of downstreamClosure(trigger.nodeId, edges)) {
      scope.add(id)
    }
    for (const n of nodes) {
      if (n.type === 'agent' && scope.has(n.id)) {
        for (const id of upstreamClosure(n.id, edges)) {
          scope.add(id)
        }
      }
    }
    return scope
  }

  const sinkAgents =
    trigger.kind === 'agent'
      ? [trigger.nodeId]
      : forwardReachableAgents(trigger.nodeId, nodes, edges)

  // Legacy: Chat → Tool chains with no Agent still run downstream tools
  if (trigger.kind === 'chat' && sinkAgents.length === 0) {
    for (const id of getReachableNodeIds(trigger.nodeId, edges)) {
      scope.add(id)
    }
    return scope
  }

  for (const agentId of sinkAgents) {
    scope.add(agentId)
    for (const id of upstreamClosure(agentId, edges)) {
      scope.add(id)
    }
    for (const id of downstreamClosure(agentId, edges)) {
      scope.add(id)
    }
  }

  if (trigger.kind === 'chat') {
    scope.add(trigger.nodeId)
  }

  return scope
}

/** @deprecated Use resolveExecutionScope — kept for tests and backward compat */
export function getReachableNodeIds(startId: string, edges: Edge[]): Set<string> {
  const reachable = new Set<string>([startId])
  const queue = [startId]

  while (queue.length > 0) {
    const current = queue.shift()!
    for (const next of getDownstreamNodeIds(current, edges)) {
      if (!reachable.has(next)) {
        reachable.add(next)
        queue.push(next)
      }
    }
  }

  return reachable
}

export { getDownstreamNodeIds as getDownstreamNodes, getUpstreamNodeIds as getUpstreamNodes }
