import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { assignments as seedAssignments, constraints as seedConstraints, defaultGoal, makeAuroraProject, participants as seedParticipants } from './fixture'
import { applyChange, validateChange, validateScope } from './engine'
import { conflictsForProposal, removeOperationAt, type ProposalConflict } from './conflict'
import type { ActivityEvent, Breakpoint, DomainResult, OperationChange, OperationRecord, Participant, Project, Proposal, ProposalStatus, ResponsiveProps, SelectionState, SurfaceAssignment } from './types'

const now=()=>Date.now()
const uid=(p:string)=>`${p}-${Math.random().toString(36).slice(2,8)}-${Date.now().toString(36)}`
const activity=(actorId:string,actorType:'human'|'agent'|'system',message:string,kind:ActivityEvent['kind'],revision:number):ActivityEvent=>({id:uid('evt'),actorId,actorType,message,kind,timestamp:now(),revision})

interface StoreState {
  project:Project
  canonicalRevision:number
  sharedGoal:typeof defaultGoal
  participants:Participant[]
  assignments:SurfaceAssignment[]
  proposals:Proposal[]
  conflicts:ProposalConflict[]
  activities:ActivityEvent[]
  selection:SelectionState
  history:OperationRecord[]
  redoStack:OperationRecord[]
  constraints:typeof seedConstraints
  connection:{webmcp:'connected'|'unavailable'|'error';agent:'idle'|'working'|'paused'}
  snapshots:Record<number,Project>
  devOpen:boolean
  reviewOpen:boolean
  staleBanner:boolean
  setWebMcp:(s:'connected'|'unavailable'|'error')=>void
  setSelection:(s:SelectionState)=>void
  setDevOpen:(v:boolean)=>void
  setReviewOpen:(v:boolean)=>void
  mutate:(args:{actorId:string;actorType:'human'|'agent'|'system';label:string;change:OperationChange;expectedRevision?:number;provisional?:boolean;explanation?:string})=>DomainResult<{proposalId?:string}>
  startAgent:()=>void
  pauseAgent:()=>void
  claimSurface:(breakpoint:Breakpoint,participantId:string,mode:'read'|'edit'|'propose')=>DomainResult
  acceptProposal:(id:string)=>DomainResult
  rejectProposal:(id:string)=>DomainResult
  rejectProposalOperation:(id:string,index:number)=>DomainResult
  resolveConflict:(id:string,conflictIndex:number,choice:'human'|'agent')=>DomainResult
  setProposalStatus:(id:string,status:ProposalStatus)=>void
  undo:()=>DomainResult
  redo:()=>DomainResult
  resetDemo:()=>void
  clearStaleBanner:()=>void
}

const initial=()=>({
  project:makeAuroraProject(),canonicalRevision:1,sharedGoal:{...defaultGoal},participants:seedParticipants.map(x=>({...x})),assignments:seedAssignments.map(x=>({...x})),proposals:[] as Proposal[],conflicts:[] as ProposalConflict[],activities:[activity('system','system','Aurora demo loaded','system',1)],selection:{} as SelectionState,history:[] as OperationRecord[],redoStack:[] as OperationRecord[],constraints:seedConstraints.map(x=>({...x})),connection:{webmcp:'unavailable' as const,agent:'idle' as const},snapshots:{1:makeAuroraProject()} as Record<number,Project>,devOpen:false,reviewOpen:false,staleBanner:false
})

export const usePresenceStore=create<StoreState>()(persist((set,get)=>({
  ...initial(),
  setWebMcp:(webmcp)=>set(s=>({connection:{...s.connection,webmcp}})),
  setSelection:(selection)=>set({selection}),setDevOpen:(devOpen)=>set({devOpen}),setReviewOpen:(reviewOpen)=>set({reviewOpen}),clearStaleBanner:()=>set({staleBanner:false}),
  mutate:({actorId,actorType,label,change,expectedRevision,provisional=false,explanation=''})=>{
    const s=get()
    if(expectedRevision!==undefined&&expectedRevision!==s.canonicalRevision){
      set(st=>({staleBanner:true,activities:[...st.activities,activity(actorId,actorType,'Operation rejected · stale state','system',st.canonicalRevision)]}))
      return {ok:false,error:'STALE_STATE',message:'Project changed while this operation was being prepared.',expectedRevision,currentRevision:s.canonicalRevision}
    }
    const scope=validateScope(s.assignments,actorId,actorType,change.breakpoint); if(!scope.ok) return scope
    const valid=validateChange(s.project,s.constraints,change); if(!valid.ok) return valid
    if(provisional||actorType==='agent'){
      const existing=s.proposals.find(p=>p.participantId===actorId&&p.breakpoint===change.breakpoint&&['working','ready','conflicted'].includes(p.status))
      if(existing){
        const updated={...existing,operations:[...existing.operations,change],affectedComponentIds:Array.from(new Set([...existing.affectedComponentIds,change.componentId])),explanation:explanation||existing.explanation,status:'working' as const}
        set(st=>({proposals:st.proposals.map(p=>p.id===existing.id?updated:p),conflicts:[],activities:[...st.activities,activity(actorId,actorType,label,'proposal',st.canonicalRevision)]}))
        return {ok:true,revision:s.canonicalRevision,data:{proposalId:existing.id}}
      }
      const p:Proposal={id:uid('proposal'),participantId:actorId,breakpoint:change.breakpoint,baseRevision:s.canonicalRevision,operations:[change],status:'working',createdAt:now(),explanation,affectedComponentIds:[change.componentId]}
      set(st=>({proposals:[...st.proposals,p],conflicts:[],activities:[...st.activities,activity(actorId,actorType,label,'proposal',st.canonicalRevision)]}))
      return {ok:true,revision:s.canonicalRevision,data:{proposalId:p.id}}
    }
    const previous=s.project.nodes[change.componentId]?.responsive[change.breakpoint]??{}
    const revision=s.canonicalRevision+1
    const next=applyChange(s.project,{...change,previous})
    const record:OperationRecord={id:uid('op'),actorId,actorType,label,revisionBefore:s.canonicalRevision,revisionAfter:revision,changes:[{...change,previous}],timestamp:now()}
    set(st=>({project:next,canonicalRevision:revision,snapshots:{...st.snapshots,[revision]:next},history:[...st.history,record],redoStack:[],activities:[...st.activities,activity(actorId,actorType,label,'mutation',revision)]}))
    return {ok:true,revision}
  },
  startAgent:()=>set(s=>({connection:{...s.connection,agent:'working'},participants:s.participants.map(p=>p.id==='agent'?{...p,status:'working'}:p),activities:[...s.activities,activity('agent','agent','Joined Tablet as collaborator','system',s.canonicalRevision)]})),
  pauseAgent:()=>set(s=>({connection:{...s.connection,agent:'paused'},participants:s.participants.map(p=>p.id==='agent'?{...p,status:'paused'}:p),activities:[...s.activities,activity('agent','agent','Paused work on Tablet','system',s.canonicalRevision)]})),
  claimSurface:(breakpoint,participantId,mode)=>{const s=get(); const next=s.assignments.filter(a=>a.breakpoint!==breakpoint||a.participantId===participantId).map(a=>a.breakpoint===breakpoint&&a.participantId===participantId?{...a,mode}:a); if(!next.some(a=>a.breakpoint===breakpoint&&a.participantId===participantId)) next.push({breakpoint,participantId,mode}); set({assignments:next,activities:[...s.activities,activity(participantId,participantId==='agent'?'agent':'human',`${participantId==='agent'?'Agent':'You'} ${mode==='read'?'released':'claimed'} ${breakpoint}`,'system',s.canonicalRevision)]}); return {ok:true,revision:s.canonicalRevision}},
  acceptProposal:(id)=>{
    const s=get(); const p=s.proposals.find(x=>x.id===id); if(!p)return{ok:false,error:'NOT_FOUND',message:'Proposal not found'}
    const base=s.snapshots[p.baseRevision]; if(!base)return{ok:false,error:'INVALID_OPERATION',message:'Proposal base snapshot unavailable'}
    const conflicts=conflictsForProposal(base,s.project,p)
    if(conflicts.length){set(st=>({conflicts,proposals:st.proposals.map(x=>x.id===id?{...x,status:'conflicted'}:x),activities:[...st.activities,activity('system','system','We changed the same thing','conflict',st.canonicalRevision)]}));return{ok:false,error:'INVALID_OPERATION',message:'Proposal has conflicts',details:{conflicts:conflicts.length}}}
    let project=s.project; for(const op of p.operations){const valid=validateChange(project,s.constraints,op); if(!valid.ok)return valid; project=applyChange(project,op)}
    const revision=s.canonicalRevision+1; set(st=>({project,canonicalRevision:revision,snapshots:{...st.snapshots,[revision]:project},proposals:st.proposals.map(x=>x.id===id?{...x,status:'accepted'}:x),conflicts:[],history:[...st.history,{id:uid('op'),actorId:'agent',actorType:'agent',label:`Accepted ${p.operations.length} Agent changes`,revisionBefore:s.canonicalRevision,revisionAfter:revision,changes:p.operations,timestamp:now()}],activities:[...st.activities,activity('human','human',`Accepted ${p.operations.length} Agent changes`,'proposal',revision)],reviewOpen:false})); return{ok:true,revision}
  },
  rejectProposal:(id)=>{const s=get(); if(!s.proposals.some(x=>x.id===id))return{ok:false,error:'NOT_FOUND',message:'Proposal not found'}; set(st=>({proposals:st.proposals.map(x=>x.id===id?{...x,status:'rejected'}:x),conflicts:[],activities:[...st.activities,activity('human','human','Discarded Agent changes','proposal',st.canonicalRevision)],reviewOpen:false})); return{ok:true,revision:s.canonicalRevision}},
  rejectProposalOperation:(id,index)=>{const s=get(); const p=s.proposals.find(x=>x.id===id); if(!p)return{ok:false,error:'NOT_FOUND',message:'Proposal not found'}; if(!p.operations[index])return{ok:false,error:'NOT_FOUND',message:'Proposal operation not found'}; const operations=removeOperationAt(p.operations,index); set(st=>({proposals:st.proposals.map(x=>x.id===id?{...x,operations,affectedComponentIds:Array.from(new Set(operations.map(op=>op.componentId))),status:operations.length?'ready':'rejected'}:x),activities:[...st.activities,activity('human','human','Rejected one Agent change','proposal',st.canonicalRevision)]})); return{ok:true,revision:s.canonicalRevision}},
  resolveConflict:(id,conflictIndex,choice)=>{const s=get(); const p=s.proposals.find(x=>x.id===id); const conflict=s.conflicts[conflictIndex]; if(!p||!conflict)return{ok:false,error:'NOT_FOUND',message:'Conflict not found'}; const operations=p.operations.map(op=>{if(op.componentId!==conflict.componentId||op.breakpoint!==conflict.breakpoint)return op; const patch={...op.patch}; if(choice==='human') delete patch[conflict.key]; else (patch as Record<string,unknown>)[conflict.key]=conflict.agent; return {...op,patch}}).filter(op=>Object.keys(op.patch).length>0); const remaining=s.conflicts.filter((_,i)=>i!==conflictIndex); set(st=>({conflicts:remaining,proposals:st.proposals.map(x=>x.id===id?{...x,operations,status:remaining.length?'conflicted':'ready'}:x),activities:[...st.activities,activity('human','human',choice==='human'?'Kept your value':'Used Agent value','conflict',st.canonicalRevision)]})); return{ok:true,revision:s.canonicalRevision}},
  setProposalStatus:(id,status)=>set(s=>({proposals:s.proposals.map(p=>p.id===id?{...p,status}:p)})),
  undo:()=>{const s=get(); const last=s.history.at(-1); if(!last)return{ok:false,error:'INVALID_OPERATION',message:'Nothing to undo'}; const prev=s.snapshots[last.revisionBefore]; if(!prev)return{ok:false,error:'INVALID_OPERATION',message:'Previous snapshot unavailable'}; set(st=>({project:prev,canonicalRevision:last.revisionBefore,history:st.history.slice(0,-1),redoStack:[last,...st.redoStack],activities:[...st.activities,activity('human','human',`Undid ${last.label}`,'system',last.revisionBefore)]})); return{ok:true,revision:last.revisionBefore}},
  redo:()=>{const s=get(); const next=s.redoStack[0]; if(!next)return{ok:false,error:'INVALID_OPERATION',message:'Nothing to redo'}; let project=s.project; for(const ch of next.changes) project=applyChange(project,ch); const rev=s.canonicalRevision+1; set(st=>({project,canonicalRevision:rev,snapshots:{...st.snapshots,[rev]:project},history:[...st.history,{...next,revisionBefore:s.canonicalRevision,revisionAfter:rev}],redoStack:st.redoStack.slice(1),activities:[...st.activities,activity('human','human',`Redid ${next.label}`,'system',rev)]})); return{ok:true,revision:rev}},
  resetDemo:()=>set(initial()),
}),{name:'presence:v2',version:2,partialize:(s)=>({project:s.project,canonicalRevision:s.canonicalRevision,sharedGoal:s.sharedGoal,assignments:s.assignments,proposals:s.proposals,activities:s.activities,history:s.history,constraints:s.constraints,snapshots:s.snapshots})}))

export const getPresenceState=()=>usePresenceStore.getState()
