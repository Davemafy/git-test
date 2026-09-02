import type { Breakpoint, ComponentNode, Constraint, DomainResult, OperationChange, Participant, Project, Proposal, SurfaceAssignment } from './types'

export function getAssignment(assignments:SurfaceAssignment[], breakpoint:Breakpoint, participantId:string){return assignments.find(a=>a.breakpoint===breakpoint&&a.participantId===participantId)}
export function validateScope(assignments:SurfaceAssignment[], actorId:string, actorType:'human'|'agent'|'system', breakpoint:Breakpoint):DomainResult{
  if(actorType==='system') return {ok:true,revision:0}
  const a=getAssignment(assignments,breakpoint,actorId)
  if(!a || a.mode==='read') return {ok:false,error:'SURFACE_NOT_OWNED',message:`${actorId} cannot modify ${breakpoint}`}
  if(actorType==='agent' && a.mode!=='propose') return {ok:false,error:'PERMISSION_DENIED',message:'Agent does not have proposal permission for this surface'}
  return {ok:true,revision:0}
}

export function validateChange(project:Project,constraints:Constraint[], change:OperationChange):DomainResult{
  const node=project.nodes[change.componentId]
  if(!node) return {ok:false,error:'NOT_FOUND',message:`Component ${change.componentId} was not found`}
  if(change.breakpoint==='desktop' && constraints.find(c=>c.type==='desktop-readonly'&&c.enabled)) return {ok:false,error:'PERMISSION_DENIED',message:'Desktop is protected in this session'}
  if(change.patch.fontSize !== undefined && ['body'].includes(change.componentId)){
    const min=Number(constraints.find(c=>c.type==='min-font-size'&&c.enabled)?.config?.min ?? 16)
    if(change.patch.fontSize<min) return {ok:false,error:'CONSTRAINT_VIOLATION',message:`Body text must be at least ${min}px`,details:{constraint:'min-font-size',min}}
  }
  if(change.componentId==='primary' && change.patch.visible===false && constraints.find(c=>c.type==='required-visible'&&c.enabled)) return {ok:false,error:'CONSTRAINT_VIOLATION',message:'Primary CTA must remain visible'}
  if(change.patch.gridColumns!==undefined && (change.patch.gridColumns<1||change.patch.gridColumns>4)) return {ok:false,error:'CONSTRAINT_VIOLATION',message:'Grid columns must be between 1 and 4'}
  if(change.patch.padding!==undefined && (change.patch.padding<0||change.patch.padding>120)) return {ok:false,error:'CONSTRAINT_VIOLATION',message:'Padding is outside the safe range'}
  return {ok:true,revision:0}
}

export function applyChange(project:Project,change:OperationChange):Project{
  const node=project.nodes[change.componentId]
  const previous=node.responsive[change.breakpoint]??{}
  const nextNode:ComponentNode={...node,responsive:{...node.responsive,[change.breakpoint]:{...previous,...change.patch}}}
  return {...project,nodes:{...project.nodes,[node.id]:nextNode}}
}

export function conflictsForProposal(projectAtBase:Project,current:Project,proposal:Proposal){
  const conflicts:{componentId:string;key:string;human:unknown;agent:unknown}[]=[]
  for(const op of proposal.operations){
    const base=projectAtBase.nodes[op.componentId]?.responsive[op.breakpoint]??{}
    const now=current.nodes[op.componentId]?.responsive[op.breakpoint]??{}
    for(const [key,agent] of Object.entries(op.patch)){
      const k=key as keyof typeof now
      if(now[k]!==base[k] && now[k]!==agent) conflicts.push({componentId:op.componentId,key,human:now[k],agent})
    }
  }
  return conflicts
}

export function participantById(participants:Participant[],id:string){return participants.find(p=>p.id===id)}
