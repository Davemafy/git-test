import { useEffect, useLayoutEffect } from 'react'
import { Bug, CheckCircle2, RotateCcw, RotateCw, Share2, Sparkles } from 'lucide-react'
import { AuroraCanvas } from './components/AuroraCanvas'
import { DevInspector } from './components/DevInspector'
import { Inspector } from './components/Inspector'
import { PresencePanel } from './components/PresencePanel'
import { ReviewModal } from './components/ReviewModal'
import { usePresenceStore } from './domain/store'
import { registerWebMcp } from './webmcp/register'

export default function App(){
 const s=usePresenceStore()
 useLayoutEffect(()=>{
  if(new URLSearchParams(location.search).get('demo')==='1'){usePresenceStore.getState().resetDemo();return}
  usePresenceStore.setState(state=>({admissions:[],participants:state.participants.filter(p=>p.type!=='agent'),assignments:state.assignments.filter(a=>a.participantId!=='agent'),connection:{...state.connection,agent:'absent'}}))
 },[])
 useEffect(()=>{queueMicrotask(registerWebMcp)},[])
 const completed=s.proposals.some(p=>p.status==='accepted')
 const admission=s.admissions.at(-1)
 const agentLabel=admission?.status==='discovered'?'Agent exploring roles':s.connection.agent==='working'?'Your agent is on Tablet':s.connection.agent==='pending'?'Agent requesting access':s.connection.agent==='paused'?'Agent paused':s.connection.agent==='revoked'?'Agent removed':'No agent admitted'
 const statusDot=admission?.status==='discovered'?'bg-sky-300':s.connection.agent==='working'?'bg-emerald-400':s.connection.agent==='pending'?'bg-amber-300':'bg-white/25'
 return <main className="h-screen min-h-[720px] bg-[#090a0d] text-white flex flex-col overflow-hidden">
  <header className="h-14 border-b border-white/10 px-4 flex items-center justify-between shrink-0 bg-[#0c0d11]">
   <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-white text-black grid place-items-center"><Sparkles size={15}/></div><div><div className="text-sm font-semibold tracking-tight">Presence</div><div className="text-[9px] text-white/30">RESPONSIVE STUDIO</div></div><div className="h-5 w-px bg-white/10 mx-1"/><div><div className="text-xs text-white/75">Aurora Landing Page</div><div className="text-[9px] text-white/30">Shared goal · Responsive adaptation</div></div></div>
   <div className="flex items-center gap-2"><div className="hidden lg:flex items-center gap-2 mr-2 rounded-full px-3 h-8 border border-white/10 text-[10px] text-white/55"><span className={`w-1.5 h-1.5 rounded-full ${statusDot}`}/>{agentLabel}</div><button className="icon" aria-label="Undo" onClick={()=>s.undo()}><RotateCcw size={15}/></button><button className="icon" aria-label="Redo" onClick={()=>s.redo()}><RotateCw size={15}/></button><button className="icon" aria-label="Developer inspector" onClick={()=>s.setDevOpen(!s.devOpen)}><Bug size={15}/></button><button className="secondary hidden sm:flex"><Share2 size={13}/> Share</button><button className="primary">Publish</button></div>
  </header>
  <div className="h-9 border-b border-white/10 px-4 flex items-center gap-5 text-[10px] text-white/38 bg-[#0b0c10] shrink-0"><span>SELECT</span><span>LAYOUT</span><span>TYPE</span><span>MEDIA</span><span className="ml-auto">Revision {s.canonicalRevision}</span><span className={s.connection.webmcp==='connected'?'text-emerald-400/80':'text-white/25'}>● {s.connection.webmcp==='connected'?'Connected via WebMCP':'WebMCP unavailable'}</span></div>
  <div className="min-h-0 flex-1 flex"><section className="min-w-0 flex-1 flex flex-col bg-[#0d0e12]">{s.staleBanner&&<div className="h-10 px-4 flex items-center justify-between bg-amber-400/10 border-b border-amber-400/20 text-[11px] text-amber-100"><span>Your project changed while your agent was working. Agent is catching up…</span><button onClick={s.clearStaleBanner}>Dismiss</button></div>}<div className="min-h-0 flex-1 overflow-auto p-4"><div className="flex gap-4 min-w-[970px] h-full"><AuroraCanvas breakpoint="desktop" project={s.project}/><AuroraCanvas breakpoint="tablet" project={s.project}/><AuroraCanvas breakpoint="mobile" project={s.project}/></div></div><div className="h-11 border-t border-white/10 px-4 flex items-center gap-4 bg-[#0b0c10] text-[10px] text-white/35 shrink-0"><span>Desktop · Reference</span><span>Tablet · {s.assignments.some(a=>a.breakpoint==='tablet'&&a.participantId==='agent')?'Your agent':'Unassigned'}</span><span>Mobile · You</span><span className="ml-auto flex items-center gap-2">{completed&&<><CheckCircle2 size={12} className="text-emerald-400"/> Tablet changes accepted</>}<span>Autosaved</span><span>·</span><span>r{s.canonicalRevision}</span><button onClick={s.resetDemo} className="ml-2 text-white/55 hover:text-white">Reset Aurora Demo</button></span></div></section><Inspector/><PresencePanel/></div>
  <ReviewModal/><DevInspector/>
 </main>
}
