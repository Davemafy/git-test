import { motion } from 'framer-motion'
import type { Breakpoint, ComponentNode, Project, Proposal } from '../domain/types'
import { usePresenceStore } from '../domain/store'

const size:Record<Breakpoint,string>={desktop:'min-w-[390px]',tablet:'min-w-[300px]',mobile:'min-w-[220px]'}
const label:Record<Breakpoint,string>={desktop:'DESKTOP · 1200',tablet:'TABLET · 768',mobile:'MOBILE · 375'}

function mergedNode(node:ComponentNode,bp:Breakpoint,proposal?:Proposal){
  const patch=proposal?.operations.filter(o=>o.componentId===node.id&&o.breakpoint===bp).reduce((a,o)=>({...a,...o.patch}),{})
  return {...(node.responsive[bp]??{}),...(patch??{})}
}

export function AuroraCanvas({breakpoint,project}:{breakpoint:Breakpoint;project:Project}){
  const {selection,setSelection,proposals,connection}=usePresenceStore()
  const proposal=proposals.find(p=>p.breakpoint===breakpoint&&['working','ready','conflicted'].includes(p.status))
  const selected=selection.breakpoint===breakpoint?selection.componentId:undefined
  const p=(id:string)=>mergedNode(project.nodes[id],breakpoint,proposal)
  const choose=(id:string)=>setSelection({componentId:id,breakpoint,actorId:'human'})
  const isAgent=breakpoint==='tablet'&&connection.agent==='working'
  const isYou=breakpoint==='mobile'
  const hero=p('hero'); const headline=p('headline'); const actions=p('actions'); const primary=p('primary'); const media=p('heroMedia')
  const heroRow=hero.display==='grid'&&hero.gridColumns===2
  return <section className={`relative ${size[breakpoint]} flex-1 rounded-xl border ${proposal?'border-sky-500/55':'border-white/10'} bg-[#111218] overflow-hidden shadow-2xl shadow-black/30`}>
    <div className="h-9 border-b border-white/10 px-3 flex items-center justify-between text-[10px] tracking-[.13em] text-white/50"><span>{label[breakpoint]}</span><span>{proposal?`AGENT CHANGES · ${proposal.operations.length}`:'LIVE'}</span></div>
    <div className="relative bg-[#f2f0e9] text-[#111] h-[600px] overflow-hidden select-none">
      <div onClick={()=>choose('header')} className={`px-4 py-3 flex items-center justify-between border-b border-black/10 ${selected==='header'?'ring-2 ring-violet-500 ring-inset':''}`}>
        <div className="font-black tracking-[.18em] text-[11px]">AURORA</div><div className="text-[9px] opacity-60 hidden md:block">Product &nbsp; Solutions &nbsp; Pricing</div><button className="px-3 h-9 rounded-full bg-black text-white text-[10px]">Start free</button>
      </div>
      <div onClick={()=>choose('hero')} style={{padding:hero.padding??24,gap:hero.gap??22}} className={`${heroRow?'grid grid-cols-2':'flex flex-col'} min-h-[285px] items-center ${selected==='hero'?'ring-2 ring-violet-500 ring-inset':''}`}>
        <div className="w-full">
          <div className="text-[9px] uppercase tracking-[.16em] mb-3 opacity-55">A calmer way to build</div>
          <h1 onClick={(e)=>{e.stopPropagation();choose('headline')}} style={{fontSize:Math.max(20,Math.min(52,headline.fontSize??34)),lineHeight:headline.lineHeight??1.05,textAlign:headline.textAlign}} className={`${selected==='headline'?'outline outline-2 outline-violet-500':''} font-semibold tracking-[-.045em] max-w-[480px]`}>Your product team, finally in the same orbit.</h1>
          <p className="mt-3 text-[11px] leading-5 opacity-65 max-w-[430px]">Aurora keeps ideas, decisions and momentum together so your team can ship with less drag.</p>
          <div style={{gap:actions.gap??10}} className={`mt-4 flex ${actions.direction==='column'?'flex-col':'flex-row'}`}><button style={{width:primary.width==='full'?'100%':'auto'}} className="h-10 px-4 rounded-lg bg-[#6d51ff] text-white text-[10px]">Start building</button><button className="h-10 px-4 rounded-lg border border-black/15 text-[10px]">See how it works</button></div>
        </div>
        <motion.div layout onClick={(e)=>{e.stopPropagation();choose('heroMedia')}} className={`${selected==='heroMedia'?'outline outline-2 outline-violet-500':''} w-full rounded-2xl border border-black/10 bg-black p-2`} style={{order:media.order??2}}>
          <div className={`rounded-xl bg-gradient-to-br from-violet-500 via-indigo-400 to-cyan-300 ${media.imageRatio==='16:9'?'aspect-video':media.imageRatio==='1:1'?'aspect-square':'aspect-[4/3]'} p-3`}><div className="h-full rounded-lg bg-black/75 p-3 text-white"><div className="flex gap-1 mb-3"><i className="w-1.5 h-1.5 rounded-full bg-white/30"/><i className="w-1.5 h-1.5 rounded-full bg-white/30"/></div><div className="h-2 w-3/4 bg-white/20 rounded mb-2"/><div className="grid grid-cols-2 gap-2 h-2/3"><div className="rounded bg-white/10"/><div className="rounded bg-white/10"/></div></div></div></div>
        </motion.div>
      </div>
      <div className="px-4 py-3 border-y border-black/10 text-[8px] tracking-[.16em] opacity-50">NORTHSTAR &nbsp; WAVELINE &nbsp; TIDE &nbsp; FOUNDRY</div>
      <div className={`p-4 grid ${breakpoint==='desktop'?'grid-cols-3':breakpoint==='tablet'?'grid-cols-2':'grid-cols-1'} gap-2`}><Feature title="Focus"/><Feature title="Momentum"/><Feature title="Signal"/></div>
      {(isAgent||isYou)&&<motion.div initial={{opacity:0,scale:.95}} animate={{opacity:1,scale:1}} className={`absolute ${isAgent?'right-8 top-48':'left-8 top-60'} pointer-events-none`}><div className={`${isAgent?'bg-sky-500':'bg-violet-500'} text-white text-[9px] font-semibold px-2 py-1 rounded-md shadow-lg`}>{isAgent?'AGENT':'YOU'}</div><div className={`${isAgent?'border-sky-500':'border-violet-500'} ml-2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[12px] rotate-[-38deg] origin-top`}/></motion.div>}
    </div>
  </section>
}
function Feature({title}:{title:string}){return <div className="rounded-xl border border-black/10 p-3 bg-white/40"><div className="text-[10px] font-semibold">{title}</div><div className="mt-6 h-1.5 w-2/3 bg-black/10 rounded"/></div>}
