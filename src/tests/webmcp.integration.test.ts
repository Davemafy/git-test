import { beforeEach, describe, expect, it } from 'vitest'
import { usePresenceStore } from '../domain/store'
import { registerWebMcp } from '../webmcp/register'

type Tool={name:string;execute:(input:unknown)=>unknown|Promise<unknown>}
const tools=new Map<string,Tool>()
const read=(value:unknown)=>JSON.parse(((value as {content:{text:string}[]}).content[0].text)) as Record<string,unknown>

const call=async(name:string,input:unknown={})=>{
 const tool=tools.get(name)
 if(!tool)throw new Error(`missing tool ${name}`)
 return read(await tool.execute(input))
}

describe('WebMCP semantic admission path',()=>{
 beforeEach(()=>{
  localStorage.clear()
  usePresenceStore.getState().resetDemo()
  tools.clear()
  ;(document as Document & {modelContext?:unknown}).modelContext={registerTool:(tool:Tool)=>tools.set(tool.name,tool)}
  expect(registerWebMcp()).toBe(true)
 })

 it('registers the complete semantic surface and records real discovery',async()=>{
  expect(tools.has('inspect_presence')).toBe(true)
  expect(tools.has('request_admission')).toBe(true)
  expect(tools.has('propose_layout_change')).toBe(true)
  expect(tools.has('release_role')).toBe(true)

  const presence=await call('inspect_presence')
  expect((presence.application as {name:string}).name).toBe('Presence')
  expect(usePresenceStore.getState().admissions.at(-1)?.status).toBe('discovered')
  expect(usePresenceStore.getState().assignments.some(a=>a.breakpoint==='tablet')).toBe(false)
  expect(usePresenceStore.getState().activities.at(-1)?.message).toBe('Agent discovered Presence capabilities')
 })

 it('cannot propose before approval, then can propose only Tablet after human admission',async()=>{
  await call('inspect_presence')
  const request=await call('request_admission',{
   roleId:'responsive-collaborator',
   requestedScopes:[{resource:'breakpoint',id:'tablet',mode:'propose'}],
   reason:'I can handle Tablet while you finish Mobile.'
  })
  expect(request.ok).toBe(true)

  let s=usePresenceStore.getState()
  const admission=s.admissions.at(-1)!
  expect(admission.status).toBe('pending_user_approval')
  const pending=await call('propose_layout_change',{breakpoint:'tablet',componentId:'hero',changes:{gap:20},expectedRevision:s.canonicalRevision})
  expect(pending.ok).toBe(false)
  expect(pending.error).toBe('ADMISSION_PENDING')

  expect(s.approveAdmission(admission.id).ok).toBe(true)
  s=usePresenceStore.getState()
  const tablet=await call('propose_layout_change',{breakpoint:'tablet',componentId:'hero',changes:{gap:20},expectedRevision:s.canonicalRevision})
  expect(tablet.ok).toBe(true)
  expect(usePresenceStore.getState().project.nodes.hero.responsive.tablet?.gap).toBe(28)
  expect(usePresenceStore.getState().proposals).toHaveLength(1)

  const mobile=await call('propose_layout_change',{breakpoint:'mobile',componentId:'hero',changes:{gap:10},expectedRevision:s.canonicalRevision})
  expect(mobile.ok).toBe(false)
  expect(mobile.error).toBe('CAPABILITY_NOT_GRANTED')
 })

 it('rejects stale WebMCP work, allows fresh retry, and blocks after release',async()=>{
  await call('inspect_presence')
  await call('request_admission',{roleId:'responsive-collaborator',requestedScopes:[{resource:'breakpoint',id:'tablet',mode:'propose'}],reason:'I can handle Tablet while you finish Mobile.'})
  let s=usePresenceStore.getState()
  const admission=s.admissions.at(-1)!
  s.approveAdmission(admission.id)
  s=usePresenceStore.getState()
  const observed=s.canonicalRevision

  s.mutate({actorId:'human',actorType:'human',label:'You adjusted Mobile Hero',change:{componentId:'hero',breakpoint:'mobile',patch:{padding:30}}})
  const stale=await call('propose_layout_change',{breakpoint:'tablet',componentId:'hero',changes:{gap:18},expectedRevision:observed})
  expect(stale.ok).toBe(false)
  expect(stale.error).toBe('STALE_STATE')

  const fresh=await call('inspect_project')
  const revision=fresh.revision as number
  const retry=await call('propose_layout_change',{breakpoint:'tablet',componentId:'hero',changes:{gap:18},expectedRevision:revision})
  expect(retry.ok).toBe(true)

  const released=await call('release_role')
  expect(released.ok).toBe(true)
  const blocked=await call('propose_layout_change',{breakpoint:'tablet',componentId:'headline',changes:{fontSize:44},expectedRevision:revision})
  expect(blocked.ok).toBe(false)
  expect(blocked.error).toBe('ADMISSION_REVOKED')
 })
})
