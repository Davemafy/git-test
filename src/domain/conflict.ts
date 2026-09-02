import type { OperationChange, Project, Proposal, ResponsiveProps } from './types'

export interface ProposalConflict {
  componentId: string
  breakpoint: OperationChange['breakpoint']
  key: keyof ResponsiveProps
  human: ResponsiveProps[keyof ResponsiveProps]
  agent: ResponsiveProps[keyof ResponsiveProps]
}

export function conflictsForProposal(base: Project, current: Project, proposal: Proposal): ProposalConflict[] {
  const conflicts: ProposalConflict[] = []
  for (const operation of proposal.operations) {
    const before = base.nodes[operation.componentId]?.responsive[operation.breakpoint] ?? {}
    const now = current.nodes[operation.componentId]?.responsive[operation.breakpoint] ?? {}
    for (const [rawKey, agentValue] of Object.entries(operation.patch)) {
      const key = rawKey as keyof ResponsiveProps
      const baseValue = before[key]
      const currentValue = now[key]
      if (currentValue !== baseValue && currentValue !== agentValue) {
        conflicts.push({ componentId: operation.componentId, breakpoint: operation.breakpoint, key, human: currentValue, agent: agentValue })
      }
    }
  }
  return conflicts
}

export function removeOperationAt(operations: OperationChange[], index: number) {
  return operations.filter((_, operationIndex) => operationIndex !== index)
}
