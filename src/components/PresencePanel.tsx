import { useEffect, useRef } from 'react'
import { Check, Circle, Pause, Play, Sparkles } from 'lucide-react'
import { usePresenceStore } from '../domain/store'

export function PresencePanel(){
 const s=usePresenceStore(); const active=s.proposals.find(p=>p.breakpoint==='tablet'&&['working','ready','conflicted'].includes(p.status)); const timers=useRef<number[]>([])
 useEffect(()=>()=>timers.current.forEach(clearTimeout),[])
 const runAgent=()=>{
   timers.current.forEach(clearTimeout); timers.current=[]
   s.claimSurface('tablet','agent','propose')
   s.startAgent(); const r0=usePresenceStore.getState().canonicalRevision
   const queue=[
    [500,'header',{padding:16,gap:12},'Condensed navigation'],
    [1100,'headline',{fontSize:44,lineHeight:1.04},'Adjusted typography scale'],
    [1700,'hero',{display:'grid',gridColumns:2,gap:22,padding:26},'Reflowed hero for Tablet'],
    [2300,'heroMedia',{imageRatio:'1:1'},'Balanced product media'],
    [2900,'features',{gridColumns:2,gap:12,padding:24},'Optimized feature grid'],
   ] as const
   queue.forEach(([delay,id,patch,label],i)=>timers.current.push(window.setTimeout(()=>{
     const current=usePresenceStore.getState(); const expected=r0
     const res=current.mutate({actorId:'agent',actorType:'agent',label:`Agent ${label.toLowerCase()} · tablet`,change:{componentId:id,breakpoint:'tablet',patch},expectedRevision:expected,provisional:true,explanation:'Adapted Tablet to preserve hierarchy while using the available horizontal space.'})
     if(!res.ok&&res.error==='STALE_STATE') window.setTimeout(()=>{const fresh=usePresenceStore.getState();fresh.mutate({actorId:'agent',actorType:'agent',label:`Agent adapted ${fresh.project.nodes[id]?.name} after your change`,change:{componentId:id,breakpoint:'tablet',patch},expectedRevision:fresh.canonicalRevision,provisional:true,explanation:'Re-read the latest project and adapted to your newest layout.'})},550)
     if(i===queue.length-1) window.setTimeout(()=>{const st=usePresenceStore.getState();const p=st.proposals.find(x=>x.breakpoint==='tablet'&&x.status==='working'); if(p)st.setProposalStatus(p.id,'ready')},650)
   },delay)))
 }
 const takeOver=()=>{timers.current.forEach(clearTimeout);timers.current=[];s.claimSurface('tablet','human','edit');s.pauseAgent()}
 return <aside className="w-[300px] border-l border-white/10 bg-[#0b0c10] p-4 flex flex-col gap-4">
   <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-sky-500/15 grid place-items-center text-sky-300"><Sparkles size={14}/></div><div><div className="text-sm font-medium">Presence</div><div className="text-[10px] text-white/35">{s.connection.agent==='working'?'Working on Tablet':s.connection.agent==='paused'?'Paused':'Ready to join'}</div></div></div><span className={`w-2 h-2 rounded-full ${s.connection.agent==='working'?'bg-emerald-400':'bg-white/20'}`}/></div>
   <div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="text-xs leading-5 text-white/70">{s.connection.agent==='idle'?'Looks like you’re adapting the hero for smaller screens. I can handle Tablet while you finish Mobile.':'I’ll handle Tablet while you finish Mobile. I’ll preserve the hierarchy and adapt the layout.'}</p>{s.connection.agent==='idle'&&<button onClick={runAgent} className="primary mt-3 w-full"><Play size={13}/> Work together</button>}</div>
   <div><div className="panel-title">CURRENT TASK</div><div className="space-y-2 text-xs"><Row done={!!active} text="Navigation condensed"/><Row done={(active?.operations.length??0)>=2} text="Typography adapted"/><Row active={s.connection.agent==='working'&&(active?.operations.length??0)<5} text="Adjusting hero spacing"/><Row text="Verify content hierarchy"/></div></div>
   {s.staleBanner&&<div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs text-amber-100">Your layout changed while I was working. Adapting…</div>}
   <div className="min-h-0 flex-1"><div className="panel-title">LIVE ACTIVITY</div><div className="space-y-3 max-h-[220px] overflow-auto pr-1">{s.activities.slice(-7).reverse().map(a=><div key={a.id} className="flex gap-2"><span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${a.actorType==='agent'?'bg-sky-400':a.actorType==='human'?'bg-violet-400':'bg-white/30'}`}/><div><div className="text-[11px] leading-4 text-white/65">{a.message}</div><div className="text-[9px] text-white/25">r{a.revision}</div></div></div>)}</div></div>
   <div className="rounded-xl border border-white/10 p-3"><div className="panel-title mb-2">SHARED GOAL</div><p className="text-[11px] leading-4 text-white/55">{s.sharedGoal.description}</p></div>
   <div className="space-y-2">{active&&active.status==='ready'&&<button onClick={()=>s.setReviewOpen(true)} className="primary w-full"><Check size={13}/> Review {active.operations.length} changes</button>}<button onClick={takeOver} className="secondary w-full">Take over Tablet</button><button onClick={()=>s.connection.agent==='working'?s.pauseAgent():runAgent()} className="secondary w-full">{s.connection.agent==='working'?<><Pause size={13}/> Pause agent</>:<><Play size={13}/> Give Tablet back to Agent</>}</button></div>
 </aside>
}
function Row({done,active,text}:{done?:boolean;active?:boolean;text:string}){return <div className="flex items-center gap-2 text-white/55">{done?<Check size={12} className="text-emerald-400"/>:active?<Circle size={10} className="text-sky-400 fill-sky-400 animate-pulse"/>:<Circle size={10} className="text-white/20"/>}<span>{text}</span></div>}
