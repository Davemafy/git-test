import { motion, AnimatePresence } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { usePresenceStore } from '../domain/store'

export function ReviewModal(){
 const s=usePresenceStore(); const p=s.proposals.find(x=>x.breakpoint==='tablet'&&['working','ready','conflicted'].includes(x.status));
 return <AnimatePresence>{s.reviewOpen&&p&&<motion.div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-6" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
  <motion.div initial={{y:18,opacity:0,scale:.98}} animate={{y:0,opacity:1,scale:1}} exit={{y:18,opacity:0}} className="w-full max-w-[820px] rounded-2xl border border-white/12 bg-[#111218] shadow-2xl overflow-hidden">
   <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between"><div><div className="text-sm font-medium">Review Agent Changes</div><div className="text-xs text-white/35 mt-1">Tablet · {p.operations.length} provisional changes · based on r{p.baseRevision}</div></div><button aria-label="Close review" onClick={()=>s.setReviewOpen(false)} className="icon"><X size={16}/></button></div>
   <div className="grid grid-cols-[1fr_300px] min-h-[430px]"><div className="p-5 bg-[#0d0e13]"><div className="rounded-xl border border-sky-500/30 bg-[#f2f0e9] h-full text-black p-8 relative overflow-hidden"><div className="absolute right-4 top-4 text-[10px] bg-sky-500 text-white px-2 py-1 rounded-md">AGENT · TABLET</div><div className="grid grid-cols-2 gap-5 items-center h-full"><div><div className="text-[10px] uppercase tracking-widest opacity-50 mb-3">A calmer way to build</div><div className="text-[38px] leading-[1.02] tracking-[-.045em] font-semibold">Your product team, finally in the same orbit.</div><div className="mt-4 text-xs opacity-60 leading-5">Aurora keeps ideas, decisions and momentum together.</div><button className="mt-5 h-10 px-4 rounded-lg bg-[#6d51ff] text-white text-[10px]">Start building</button></div><div className="aspect-square rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-400 to-cyan-300 p-3"><div className="w-full h-full bg-black/75 rounded-xl"/></div></div></div></div>
    <div className="p-4 border-l border-white/10"><div className="panel-title">CHANGES</div><div className="space-y-2">{p.operations.map((o,i)=><Change key={`${o.componentId}-${i}`} name={s.project.nodes[o.componentId]?.name??o.componentId} patch={o.patch}/>)}</div><div className="mt-5 rounded-xl border border-white/10 p-3"><div className="text-[10px] text-white/40 mb-2">WHY</div><div className="text-[11px] leading-4 text-white/60">{p.explanation}</div></div></div>
   </div>
   <div className="px-5 py-4 border-t border-white/10 flex justify-between"><button onClick={()=>s.rejectProposal(p.id)} className="secondary"><X size={13}/> Discard all</button><button onClick={()=>s.acceptProposal(p.id)} className="primary"><Check size={13}/> Accept Tablet Changes</button></div>
  </motion.div>
 </motion.div>}</AnimatePresence>
}
function Change({name,patch}:{name:string;patch:Record<string,unknown>}){const entries=Object.entries(patch);return <div className="rounded-lg border border-white/10 p-3"><div className="text-xs text-white/75">{name}</div><div className="mt-1 text-[10px] text-white/35">{entries.map(([k,v])=>`${k}: ${String(v)}`).join(' · ')}</div></div>}
