import { useEffect, useRef } from 'react'
import { Check, Circle, Pause, Play, Radar, ShieldCheck, UserPlus, X } from 'lucide-react'
import { usePresenceStore } from '../domain/store'

export function PresencePanel(){
 const s=usePresenceStore()
 const active=s.proposals.find(p=>p.breakpoint==='tablet'&&['working','ready','conflicted'].includes(p.status))
 const admission=s.admissions.at(-1)
 const timers=useRef<number[]>([])
 useEffect(()=>()=>timers.current.forEach(clearTimeout),[])

 const simulateRequest=()=>s.requestAdmission({agentIdentity:{id:'browser-agent',displayName:'Your agent',provider:'development-simulator'},roleId:'responsive-collaborator',requestedScopes:[{resource:'breakpoint',id:'tablet',mode:'propose'}],reason:'I can handle Tablet while you finish Mobile.'})

 const simulateAgentWork=()=>{
  if(!admission||admission.status!=='admitted'||s.connection.webmcp==='connected')return
  timers.current.forEach(clearTimeout);timers.current=[]
  const r0=usePresenceStore.getState().canonicalRevision
  const queue=[
   [450,'header',{padding:16,gap:12},'condensed navigation'],
   [1000,'headline',{fontSize:44,lineHeight:1.04},'adjusted typography scale'],
   [1550,'hero',{display:'grid',gridColumns:2,gap:22,padding:26},'reflowed hero'],
   [2100,'heroMedia',{imageRatio:'1:1'},'balanced product media'],
   [2650,'features',{gridColumns:2,gap:12,padding:24},'optimized feature grid'],
  ] as const
  queue.forEach(([delay,id,patch,label],i)=>timers.current.push(window.setTimeout(()=>{
   const current=usePresenceStore.getState()
   const res=current.mutate({actorId:'agent',actorType:'agent',admissionId:admission.id,label:`Agent ${label} · tablet`,change:{componentId:id,breakpoint:'tablet',patch},expectedRevision:r0,provisional:true,explanation:'Adapted Tablet to preserve hierarchy while using the available horizontal space.'})
   if(!res.ok&&res.error==='STALE_STATE')window.setTimeout(()=>{const fresh=usePresenceStore.getState();fresh.mutate({actorId:'agent',actorType:'agent',admissionId:admission.id,label:`Agent adapted ${fresh.project.nodes[id]?.name} after your change`,change:{componentId:id,breakpoint:'tablet',patch},expectedRevision:fresh.canonicalRevision,provisional:true,explanation:'Re-read the latest project and adapted to your newest layout.'})},500)
   if(i===queue.length-1)window.setTimeout(()=>{const st=usePresenceStore.getState();const p=st.proposals.find(x=>x.breakpoint==='tablet'&&x.status==='working');if(p)st.setProposalStatus(p.id,'ready')},600)
  },delay)))
 }

 const detected=admission?.status==='discovered'
 const pending=admission?.status==='pending_user_approval'
 const admitted=admission?.status==='admitted'
 const paused=admission?.status==='paused'
 const revoked=admission?.status==='revoked'
 const realWebMcp=s.connection.webmcp==='connected'

 return <aside className="w-[320px] border-l border-white/10 bg-[#0b0c10] p-4 flex flex-col gap-4">
  <div className="flex items-center justify-between"><div><div className="text-sm font-medium">Presence</div><div className="text-[10px] text-white/35">Agent admission</div></div><span className={`w-2 h-2 rounded-full ${admitted?'bg-emerald-400':pending?'bg-amber-300':detected?'bg-sky-300':paused?'bg-sky-300':'bg-white/20'}`}/></div>

  {(!admission||revoked)&&<div className="rounded-xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-center gap-2 text-sm font-medium"><UserPlus size={14} className="text-sky-300"/> No agent in this workspace</div><p className="mt-2 text-[11px] leading-5 text-white/50">{revoked?'Agent removed. Tablet is unassigned again and no further agent operations are authorized.':'Your browser agent can request a scoped role through WebMCP. Tablet stays unassigned until you approve.'}</p>{!realWebMcp&&<div className="mt-3 border-t border-white/10 pt-3"><div className="mb-2 text-[9px] font-medium tracking-[.12em] text-amber-200/70">DEVELOPMENT FALLBACK</div><button onClick={simulateRequest} className="secondary w-full"><Play size={13}/> Simulate admission request</button></div>}</div>}

  {detected&&<div className="rounded-xl border border-sky-400/20 bg-sky-400/[.05] p-4"><div className="flex items-center gap-2 text-sm font-medium"><Radar size={14} className="text-sky-300"/> Agent detected</div><p className="mt-2 text-[11px] leading-5 text-white/50">Your browser agent called <span className="font-mono text-sky-200">inspect_presence</span> and is viewing the roles this workspace exposes.</p><div className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] text-white/40">No permissions granted · Tablet remains unassigned</div></div>}

  {pending&&<div className="rounded-xl border border-sky-400/30 bg-sky-400/[.07] p-4"><div className="flex items-center gap-2 text-sm font-medium"><ShieldCheck size={14} className="text-sky-300"/> Your agent wants to join</div><div className="mt-3 space-y-2 text-[11px] text-white/65"><div><span className="text-white/35">Role</span><br/>Responsive collaborator</div><div><span className="text-white/35">Requested access</span><br/>{admission.requestedScopes.map(scope=>`${scope.id??scope.resource} · ${scope.mode}`).join(', ')}</div><div className="border-t border-white/10 pt-2"><span className="text-emerald-300">✓</span> Inspect Desktop, Tablet, Mobile<br/><span className="text-emerald-300">✓</span> Propose Tablet changes<br/><span className="text-rose-300">×</span> Modify Desktop or Mobile<br/><span className="text-rose-300">×</span> Publish or change canonical copy</div><p className="italic text-white/50">“{admission.reason}”</p></div><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={()=>s.denyAdmission(admission.id)} className="secondary"><X size={13}/> Not now</button><button onClick={()=>s.approveAdmission(admission.id)} className="primary"><Check size={13}/> Admit agent</button></div></div>}

  {(admitted||paused)&&<><div className="rounded-xl border border-sky-400/20 bg-sky-400/[.05] p-4"><div className="flex items-center justify-between"><div><div className="text-xs font-semibold text-sky-200">YOUR AGENT</div><div className="mt-1 text-[10px] text-white/40">Responsive collaborator</div></div><span className={`text-[9px] rounded-full px-2 py-1 ${paused?'bg-white/10 text-white/45':'bg-emerald-400/10 text-emerald-300'}`}>{paused?'PAUSED':'ADMITTED'}</span></div><div className="mt-3 text-[11px] leading-5 text-white/55">Working on: <span className="text-white/80">Tablet</span><br/>Access: Read all · Propose Tablet</div>{admitted&&!active&&realWebMcp&&<div className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] leading-4 text-white/45">Waiting for your browser agent to propose Tablet changes through WebMCP…</div>}{admitted&&!active&&!realWebMcp&&<div className="mt-3 border-t border-white/10 pt-3"><div className="mb-2 text-[9px] font-medium tracking-[.12em] text-amber-200/70">DEVELOPMENT FALLBACK</div><button onClick={simulateAgentWork} className="secondary w-full"><Play size={13}/> Simulate Tablet tool calls</button></div>}</div>
   <div><div className="panel-title">CURRENT TASK</div><div className="space-y-2 text-xs"><Row done={!!active} text="Navigation condensed"/><Row done={(active?.operations.length??0)>=2} text="Typography adapted"/><Row active={admitted&&(active?.operations.length??0)<5} text={realWebMcp?'Browser agent working':'Simulated agent working'}/><Row done={active?.status==='ready'} text="Ready for review"/></div></div>
   {s.staleBanner&&<div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs text-amber-100">Project changed. Agent is catching up…</div>}
   <div className="space-y-2">{active&&active.status==='ready'&&<button onClick={()=>s.setReviewOpen(true)} className="primary w-full"><Check size={13}/> Review {active.operations.length} changes</button>}{admitted?<button onClick={()=>s.pauseAdmission(admission.id)} className="secondary w-full"><Pause size={13}/> Pause agent</button>:<button onClick={()=>s.resumeAdmission(admission.id)} className="secondary w-full"><Play size={13}/> Resume agent</button>}<button onClick={()=>s.revokeAdmission(admission.id)} className="secondary w-full"><X size={13}/> Remove agent</button></div></>}

  <div className="min-h-0 flex-1"><div className="panel-title">LIVE ACTIVITY</div><div className="space-y-3 max-h-[220px] overflow-auto pr-1">{s.activities.slice(-8).reverse().map(a=><div key={a.id} className="flex gap-2"><span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${a.actorType==='agent'?'bg-sky-400':a.actorType==='human'?'bg-violet-400':'bg-white/30'}`}/><div><div className="text-[11px] leading-4 text-white/65">{a.message}</div><div className="text-[9px] text-white/25">r{a.revision}</div></div></div>)}</div></div>
 </aside>
}
function Row({done,active,text}:{done?:boolean;active?:boolean;text:string}){return <div className="flex items-center gap-2 text-white/55">{done?<Check size={12} className="text-emerald-400"/>:active?<Circle size={10} className="text-sky-400 fill-sky-400 animate-pulse"/>:<Circle size={10} className="text-white/20"/>}<span>{text}</span></div>}
