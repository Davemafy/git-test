import { useEffect, useLayoutEffect } from 'react'
import { Bug, RotateCcw, RotateCw, Share2 } from 'lucide-react'
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

 const admission=s.admissions.at(-1)
 const agentAssigned=s.assignments.some(a=>a.breakpoint==='tablet'&&a.participantId==='agent')
 const agentState=admission?.status==='pending_user_approval'?'REQUEST':admission?.status==='admitted'?'ACTIVE':admission?.status==='paused'?'PAUSED':admission?.status==='revoked'?'REMOVED':admission?.status==='discovered'?'DISCOVERED':'SOLO'

 return <main className="presence-app">
  <header className="app-header">
   <div className="flex min-w-0 items-center gap-3">
    <div className="brand-mark" aria-hidden="true">P</div>
    <div className="min-w-0">
     <div className="text-[12px] font-semibold tracking-[-.01em] text-white/92">Presence</div>
     <div className="truncate text-[10px] text-white/34">Aurora / Responsive Studio</div>
    </div>
   </div>
   <div className="flex items-center gap-2 text-[10px] text-white/38">
    <span className="hidden sm:inline">Rev {s.canonicalRevision}</span>
    <span className="hidden md:inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${s.connection.webmcp==='connected'?'bg-emerald-400':'bg-white/20'}`}/>{s.connection.webmcp==='connected'?'WebMCP ready':'WebMCP unavailable'}</span>
    <div className="mx-1 hidden h-4 w-px bg-white/10 sm:block"/>
    <button className="ghost-icon" aria-label="Undo" onClick={()=>s.undo()}><RotateCcw size={14}/></button>
    <button className="ghost-icon" aria-label="Redo" onClick={()=>s.redo()}><RotateCw size={14}/></button>
    <button className="ghost-icon" aria-label="Developer inspector" onClick={()=>s.setDevOpen(!s.devOpen)}><Bug size={14}/></button>
    <button className="quiet-button hidden sm:inline-flex"><Share2 size={13}/> Share</button>
    <button className="primary-action">Publish</button>
   </div>
  </header>

  <section className="workspace-stage" aria-label="Responsive collaboration workspace">
   <div className="workspace-topline">
    <div>
     <p className="eyebrow">AURORA</p>
     <h1 className="workspace-title">Responsive workspace</h1>
    </div>
    <div className="workspace-presence-summary" aria-live="polite">
     <span className={`presence-dot ${agentAssigned?'is-agent':''}`}/>
     <span>{agentAssigned?'You + your agent':'You are the only one here'}</span>
    </div>
   </div>

   {s.staleBanner&&<div className="stale-notice"><div><strong>Project changed</strong><span>Your agent was working from an older revision. Catching up…</span></div><button onClick={s.clearStaleBanner}>Dismiss</button></div>}

   <div className="canvas-stage" data-agent-state={agentState}>
    <AuroraCanvas breakpoint="desktop" project={s.project}/>
    <AuroraCanvas breakpoint="tablet" project={s.project}/>
    <AuroraCanvas breakpoint="mobile" project={s.project}/>
   </div>

   <div className="workspace-footer">
    <span>Desktop · Reference</span>
    <span>Tablet · {agentAssigned?'Your agent':'Unassigned'}</span>
    <span>Mobile · You</span>
    <span className="ml-auto hidden sm:inline">Autosaved · r{s.canonicalRevision}</span>
   </div>

   <Inspector/>
   <PresencePanel/>
  </section>

  <ReviewModal/>
  <DevInspector/>
 </main>
}
