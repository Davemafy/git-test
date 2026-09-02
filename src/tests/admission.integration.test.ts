import { beforeEach, describe, expect, it } from 'vitest'
import { usePresenceStore } from '../domain/store'

const requestAndAdmit=()=>{
 const store=usePresenceStore.getState()
 const request=store.requestAdmission({agentIdentity:{id:'browser-agent',displayName:'Your agent'},roleId:'responsive-collaborator',requestedScopes:[{resource:'breakpoint',id:'tablet',mode:'propose'}],reason:'I can handle Tablet while you finish Mobile.'})
 if(!request.ok)throw new Error('request failed')
 const id=request.data!.admissionId
 const approved=usePresenceStore.getState().approveAdmission(id)
 if(!approved.ok)throw new Error('approval failed')
 return id
}

const propose=(id:string,componentId:string,patch:Record<string,unknown>,revision:number)=>usePresenceStore.getState().mutate({actorId:'agent',actorType:'agent',admissionId:id,label:`Agent proposed ${componentId}`,change:{componentId,breakpoint:'tablet',patch},expectedRevision:revision,provisional:true,explanation:'Responsive adaptation'} as never)

describe('Presence flagship admission journey',()=>{
 beforeEach(()=>{localStorage.clear();usePresenceStore.getState().resetDemo()})

 it('runs request → admit → collaborate → stale → recover → review → revoke',()=>{
  let s=usePresenceStore.getState()
  expect(s.assignments.some(a=>a.breakpoint==='tablet')).toBe(false)

  const admissionId=requestAndAdmit()
  s=usePresenceStore.getState()
  expect(s.assignments.some(a=>a.breakpoint==='tablet'&&a.participantId==='agent'&&a.mode==='propose')).toBe(true)

  const staleBase=s.canonicalRevision
  const human=s.mutate({actorId:'human',actorType:'human',label:'You adjusted Mobile Hero',change:{componentId:'hero',breakpoint:'mobile',patch:{padding:30}}})
  expect(human.ok).toBe(true)

  const stale=propose(admissionId,'hero',{gap:18},staleBase)
  expect(stale.ok).toBe(false)
  if(!stale.ok)expect(stale.error).toBe('STALE_STATE')
  expect(usePresenceStore.getState().project.nodes.hero.responsive.tablet?.gap).toBe(28)

  s=usePresenceStore.getState()
  expect(propose(admissionId,'hero',{gap:18},s.canonicalRevision).ok).toBe(true)
  s=usePresenceStore.getState()
  const proposal=s.proposals.at(-1)!
  s.setProposalStatus(proposal.id,'ready')
  expect(usePresenceStore.getState().project.nodes.hero.responsive.tablet?.gap).toBe(28)

  expect(usePresenceStore.getState().acceptProposal(proposal.id).ok).toBe(true)
  expect(usePresenceStore.getState().project.nodes.hero.responsive.tablet?.gap).toBe(18)

  expect(usePresenceStore.getState().revokeAdmission(admissionId).ok).toBe(true)
  s=usePresenceStore.getState()
  expect(s.assignments.some(a=>a.participantId==='agent')).toBe(false)
  const afterRevoke=propose(admissionId,'headline',{fontSize:44},s.canonicalRevision)
  expect(afterRevoke.ok).toBe(false)
  if(!afterRevoke.ok)expect(afterRevoke.error).toBe('ADMISSION_REVOKED')
 })

 it('detects and resolves semantic conflict without last-write-wins',()=>{
  const admissionId=requestAndAdmit()
  let s=usePresenceStore.getState()
  expect(propose(admissionId,'hero',{align:'start',gap:20},s.canonicalRevision).ok).toBe(true)
  const proposalId=usePresenceStore.getState().proposals[0].id

  usePresenceStore.getState().claimSurface('tablet','human','edit')
  s=usePresenceStore.getState()
  const humanTablet=s.mutate({actorId:'human',actorType:'human',label:'You centered Tablet Hero',change:{componentId:'hero',breakpoint:'tablet',patch:{align:'center'}}})
  expect(humanTablet.ok).toBe(true)

  const accept=usePresenceStore.getState().acceptProposal(proposalId)
  expect(accept.ok).toBe(false)
  expect(usePresenceStore.getState().proposals.find(p=>p.id===proposalId)?.status).toBe('conflicted')
  expect(usePresenceStore.getState().conflicts[0]?.human).toBe('center')

  expect(usePresenceStore.getState().resolveConflict(proposalId,0,'human').ok).toBe(true)
  expect(usePresenceStore.getState().acceptProposal(proposalId).ok).toBe(true)
  s=usePresenceStore.getState()
  expect(s.project.nodes.hero.responsive.tablet?.align).toBe('center')
  expect(s.project.nodes.hero.responsive.tablet?.gap).toBe(20)
 })
})
