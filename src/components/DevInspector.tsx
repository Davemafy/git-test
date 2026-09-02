import { usePresenceStore } from '../domain/store'
import { toolNames } from '../webmcp/register'

export function DevInspector(){
 const s=usePresenceStore();if(!s.devOpen)return null
 const admission=s.admissions.at(-1)
 const tablet=s.assignments.find(a=>a.breakpoint==='tablet')
 const active=s.proposals.find(p=>['working','ready','conflicted'].includes(p.status))
 const latestAgent=s.activities.filter(a=>a.actorType==='agent').at(-1)
 const latestDomain=s.history.at(-1)
 const permission=admission?.status==='admitted'&&tablet?.participantId==='agent'&&tablet.mode==='propose'?'GRANTED · TABLET PROPOSE':admission?.status==='paused'?'BLOCKED · PAUSED':admission?.status==='revoked'?'BLOCKED · REVOKED':admission?.status==='pending_user_approval'?'BLOCKED · PENDING':'BLOCKED · NO ADMISSION'
 return <div className="fixed bottom-4 left-4 z-40 w-[420px] rounded-xl border border-white/15 bg-black/90 p-4 text-[11px] shadow-2xl backdrop-blur-xl">
  <div className="mb-3 flex justify-between"><div><b>Presence Runtime</b><div className="mt-1 text-[9px] text-white/30">technical evidence · hidden by default</div></div><button onClick={()=>s.setDevOpen(false)} className="text-white/40">close</button></div>
  <div className="grid grid-cols-[140px_1fr] gap-y-2 text-white/55"><span>Revision</span><b className="text-white">r{s.canonicalRevision}</b><span>WebMCP</span><b className="text-white">{s.connection.webmcp}</b><span>Admission</span><b className="text-white">{admission?.status??'none'}</b><span>Role</span><b className="text-white">{admission?.requestedRoleId??'none'}</b><span>Permission decision</span><b className={permission.startsWith('GRANTED')?'text-emerald-300':'text-amber-200'}>{permission}</b><span>Tablet assignment</span><b className="text-white">{tablet?`${tablet.participantId} · ${tablet.mode}`:'UNASSIGNED'}</b><span>Active proposal</span><b className="text-white">{active?`${active.id.slice(0,16)} · ${active.status} · ${active.operations.length} ops`:'none'}</b><span>Latest WebMCP activity</span><b className="truncate text-white">{latestAgent?.message??'none'}</b><span>Latest canonical op</span><b className="truncate text-white">{latestDomain?`${latestDomain.label} · r${latestDomain.revisionAfter}`:'none'}</b><span>Constraints</span><b className="text-white">{s.constraints.filter(c=>c.enabled).length} active</b></div>
  {admission?.grantedScopes.length?<div className="mt-3 rounded-lg bg-white/[.04] p-2 text-[10px] text-white/45"><span className="text-white/25">SCOPES · </span>{admission.grantedScopes.map(x=>`${x.mode}:${x.resource}${x.id?`/${x.id}`:''}`).join(' · ')}</div>:null}
  <div className="mt-3 border-t border-white/10 pt-3 text-[9px] leading-5 text-white/30"><span className="text-white/20">REGISTERED TOOLS · </span>{toolNames.join(' · ')}</div>
 </div>
}
