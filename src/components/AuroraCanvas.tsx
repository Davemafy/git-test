import { Check, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { usePresenceStore } from '../domain/store'
import type { Breakpoint, ComponentNode, Project, Proposal } from '../domain/types'

const labels:Record<Breakpoint,string>={desktop:'Desktop',tablet:'Tablet',mobile:'Mobile'}
const agentTargets:Record<string,{x:number;y:number}>={header:{x:216,y:56},headline:{x:72,y:162},hero:{x:116,y:228},heroMedia:{x:218,y:258},features:{x:150,y:458}}

function merged(node:ComponentNode,breakpoint:Breakpoint,proposal?:Proposal){
 const patch=proposal?.operations
  .filter(operation=>operation.componentId===node.id&&operation.breakpoint===breakpoint)
  .reduce((acc,operation)=>({...acc,...operation.patch}),{})
 return {...(node.responsive[breakpoint]??{}),...(patch??{})}
}

export function AuroraCanvas({breakpoint,project}:{breakpoint:Breakpoint;project:Project}){
 const s=usePresenceStore()
 const {selection,setSelection,proposals,connection,assignments}=s
 const proposal=proposals.find(item=>item.breakpoint===breakpoint&&['working','ready','conflicted'].includes(item.status))
 const selected=selection.breakpoint===breakpoint?selection.componentId:undefined
 const props=(id:string)=>merged(project.nodes[id],breakpoint,proposal)
 const choose=(id:string)=>setSelection({componentId:id,breakpoint,actorId:'human'})
 const hero=props('hero')
 const headline=props('headline')
 const actions=props('actions')
 const primary=props('primary')
 const media=props('heroMedia')
 const splitHero=hero.display==='grid'&&hero.gridColumns===2
 const agentAssigned=assignments.some(a=>a.breakpoint==='tablet'&&a.participantId==='agent'&&a.mode==='propose')
 const admission=s.admissions.at(-1)
 const pending=breakpoint==='tablet'&&admission?.status==='pending_user_approval'
 const paused=breakpoint==='tablet'&&admission?.status==='paused'
 const showAgent=breakpoint==='tablet'&&connection.agent==='working'&&agentAssigned
 const showHuman=breakpoint==='mobile'
 const ownerLabel=breakpoint==='desktop'?'REFERENCE':breakpoint==='mobile'?'YOU':agentAssigned?'YOUR AGENT':'UNASSIGNED'
 const latestAgentTarget=proposal?.operations.at(-1)?.componentId??'hero'
 const cursor=agentTargets[latestAgentTarget]??agentTargets.hero

 return (
  <section className={`device-surface device-surface--${breakpoint} ${agentAssigned&&breakpoint==='tablet'?'is-agent-owned':''} ${pending?'is-requested':''}`}>
   <div className="surface-header">
    <div>
     <div className="surface-name">{labels[breakpoint]}</div>
     <motion.div layout className={`surface-owner ${ownerLabel==='YOUR AGENT'?'is-agent':ownerLabel==='YOU'?'is-human':''}`}>{ownerLabel}</motion.div>
    </div>
    <div className="surface-meta">{breakpoint==='desktop'?'1440':breakpoint==='tablet'?'768':'390'} px</div>
   </div>

   <div className="surface-preview">
    <div onClick={()=>choose('header')} className={`flex items-center justify-between border-b border-black/10 px-4 py-3 ${selected==='header'?'ring-2 ring-inset ring-violet-500':''}`}>
     <div className="text-[11px] font-black tracking-[.18em]">AURORA</div>
     <div className="hidden text-[9px] opacity-60 md:block">Product &nbsp; Solutions &nbsp; Pricing</div>
     <button className="h-9 rounded-full bg-black px-3 text-[10px] text-white">Start free</button>
    </div>

    <div onClick={()=>choose('hero')} style={{padding:hero.padding??24,gap:hero.gap??22}} className={`${splitHero?'grid grid-cols-2':'flex flex-col'} min-h-[285px] items-center ${selected==='hero'?'ring-2 ring-inset ring-violet-500':''}`}>
     <div className="w-full">
      <div className="mb-3 text-[9px] uppercase tracking-[.16em] opacity-55">A calmer way to build</div>
      <h2 onClick={event=>{event.stopPropagation();choose('headline')}} style={{fontSize:Math.max(20,Math.min(52,headline.fontSize??34)),lineHeight:headline.lineHeight??1.05,textAlign:headline.textAlign}} className={`max-w-[480px] font-semibold tracking-[-.045em] ${selected==='headline'?'outline outline-2 outline-violet-500':''}`}>Your product team, finally in the same orbit.</h2>
      <p className="mt-3 max-w-[430px] text-[11px] leading-5 opacity-65">Aurora keeps ideas, decisions and momentum together so your team can ship with less drag.</p>
      <div style={{gap:actions.gap??10}} className={`mt-4 flex ${actions.direction==='column'?'flex-col':'flex-row'}`}>
       <button style={{width:primary.width==='full'?'100%':'auto'}} className="h-10 rounded-lg bg-[#6d51ff] px-4 text-[10px] text-white">Start building</button>
       <button className="h-10 rounded-lg border border-black/15 px-4 text-[10px]">See how it works</button>
      </div>
     </div>

     <motion.div layout onClick={event=>{event.stopPropagation();choose('heroMedia')}} style={{order:media.order??2}} className={`w-full rounded-2xl border border-black/10 bg-black p-2 ${selected==='heroMedia'?'outline outline-2 outline-violet-500':''}`}>
      <div className={`rounded-xl bg-gradient-to-br from-violet-500 via-indigo-400 to-cyan-300 p-3 ${media.imageRatio==='16:9'?'aspect-video':media.imageRatio==='1:1'?'aspect-square':'aspect-[4/3]'}`}>
       <div className="h-full rounded-lg bg-black/75 p-3 text-white">
        <div className="mb-3 flex gap-1"><span className="h-1.5 w-1.5 rounded-full bg-white/30"/><span className="h-1.5 w-1.5 rounded-full bg-white/30"/></div>
        <div className="mb-2 h-2 w-3/4 rounded bg-white/20"/>
        <div className="grid h-2/3 grid-cols-2 gap-2"><div className="rounded bg-white/10"/><div className="rounded bg-white/10"/></div>
       </div>
      </div>
     </motion.div>
    </div>

    <div className="border-y border-black/10 px-4 py-3 text-[8px] tracking-[.16em] opacity-50">NORTHSTAR &nbsp; WAVELINE &nbsp; TIDE &nbsp; FOUNDRY</div>
    <div className={`grid gap-2 p-4 ${breakpoint==='desktop'?'grid-cols-3':breakpoint==='tablet'?'grid-cols-2':'grid-cols-1'}`}><Feature title="Focus"/><Feature title="Momentum"/><Feature title="Signal"/></div>

    {pending&&admission&&<motion.div className="admission-seat" initial={{opacity:0,y:16,scale:.98}} animate={{opacity:1,y:0,scale:1}} transition={{duration:.28,ease:[.16,1,.3,1]}}>
     <div className="admission-eyebrow">YOUR BROWSER AGENT</div>
     <div className="admission-title">Wants to join</div>
     <div className="admission-role">Responsive collaborator</div>
     <div className="admission-scope">Tablet · Propose only</div>
     <p>“{admission.reason}”</p>
     <div className="admission-permissions"><span>Can read all breakpoints and propose Tablet changes.</span><span>Cannot change Desktop, Mobile, publish, or commit its own work.</span></div>
     <div className="admission-actions"><button onClick={()=>s.denyAdmission(admission.id)} className="seat-secondary"><X size={13}/> Not now</button><button onClick={()=>s.approveAdmission(admission.id)} className="seat-primary"><Check size={13}/> Admit agent</button></div>
    </motion.div>}

    {showAgent&&(
     <motion.div initial={{opacity:0,scale:.92,x:300,y:38}} animate={{opacity:1,scale:1,x:cursor.x,y:cursor.y}} transition={{duration:.42,ease:[.16,1,.3,1]}} className="agent-cursor">
      <svg width="18" height="22" viewBox="0 0 18 22" fill="none"><path d="M2 1.5L16 12.5L9.3 13.2L6.1 20.1L2 1.5Z" fill="currentColor" stroke="white" strokeWidth="1.2"/></svg>
      <div className="cursor-label">YOUR AGENT · {project.nodes[latestAgentTarget]?.name??'Tablet'}</div>
     </motion.div>
    )}

    {showHuman&&(
     <motion.div initial={{opacity:0}} animate={{opacity:1}} className="human-cursor">
      <svg width="18" height="22" viewBox="0 0 18 22" fill="none"><path d="M2 1.5L16 12.5L9.3 13.2L6.1 20.1L2 1.5Z" fill="currentColor" stroke="white" strokeWidth="1.2"/></svg>
      <div className="cursor-label">YOU</div>
     </motion.div>
    )}

    {breakpoint==='tablet'&&s.staleBanner&&agentAssigned&&<div className="catchup-overlay"><div className="catchup-kicker">PROJECT CHANGED</div><div className="catchup-title">Catching up…</div><div className="catchup-copy">Your agent is re-reading the latest project before it continues.</div></div>}
    {paused&&agentAssigned&&<div className="paused-chip">AGENT PAUSED</div>}
   </div>
  </section>
 )
}

function Feature({title}:{title:string}){
 return <div className="rounded-xl border border-black/10 bg-white/40 p-3"><div className="text-[10px] font-semibold">{title}</div><div className="mt-6 h-1.5 w-2/3 rounded bg-black/10"/></div>
}
