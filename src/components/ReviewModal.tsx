import { AnimatePresence, motion } from 'framer-motion'
import { Check, GitCompare, RefreshCw, X } from 'lucide-react'
import { usePresenceStore } from '../domain/store'
import type { ResponsiveProps } from '../domain/types'

export function ReviewModal(){
 const s=usePresenceStore()
 const proposal=s.proposals.find(item=>item.breakpoint==='tablet'&&['working','ready','conflicted'].includes(item.status))
 if(!proposal)return null
 const accept=()=>s.acceptProposal(proposal.id)
 const revise=()=>{s.setProposalStatus(proposal.id,'working');s.setReviewOpen(false)}

 return <AnimatePresence>{s.reviewOpen&&<motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-6 backdrop-blur-sm" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
  <motion.div initial={{y:18,opacity:0,scale:.98}} animate={{y:0,opacity:1,scale:1}} exit={{y:18,opacity:0}} className="w-full max-w-[900px] overflow-hidden rounded-2xl border border-white/10 bg-[#111218] shadow-2xl">
   <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><div className="text-sm font-medium">Changes from your browser agent</div><div className="mt-1 text-xs text-white/35">Tablet · {proposal.operations.length} provisional changes · based on r{proposal.baseRevision}</div></div><button aria-label="Close review" onClick={()=>s.setReviewOpen(false)} className="icon"><X size={16}/></button></div>

   {proposal.status==='conflicted'&&s.conflicts.length>0&&<div className="border-b border-red-400/15 bg-red-400/[.06] px-5 py-4"><div className="mb-3 text-sm font-medium text-red-100">We changed the same thing</div><div className="space-y-2">{s.conflicts.map((conflict,index)=><div key={`${conflict.componentId}-${String(conflict.key)}`} className="rounded-xl border border-red-400/15 bg-black/20 p-3"><div className="mb-2 flex items-center gap-2 text-xs text-white/70"><GitCompare size={13}/>{s.project.nodes[conflict.componentId]?.name} · {String(conflict.key)}</div><div className="grid grid-cols-2 gap-2 text-[11px]"><button className="secondary justify-start" onClick={()=>s.resolveConflict(proposal.id,index,'human')}>YOU · {String(conflict.human)} · Keep mine</button><button className="secondary justify-start" onClick={()=>s.resolveConflict(proposal.id,index,'agent')}>YOUR AGENT · {String(conflict.agent)} · Use agent's</button></div></div>)}</div></div>}

   <div className="grid min-h-[430px] grid-cols-[1fr_330px]"><div className="bg-[#0d0e13] p-5"><div className="relative h-full overflow-hidden rounded-xl border border-sky-500/30 bg-[#f2f0e9] p-8 text-black"><div className="absolute right-4 top-4 rounded-md bg-sky-500 px-2 py-1 text-[10px] text-white">YOUR AGENT · TABLET</div><div className="grid h-full grid-cols-2 items-center gap-5"><div><div className="mb-3 text-[10px] uppercase tracking-widest opacity-50">A calmer way to build</div><div className="text-[38px] font-semibold leading-[1.02] tracking-[-.045em]">Your product team, finally in the same orbit.</div><div className="mt-4 text-xs leading-5 opacity-60">Aurora keeps ideas, decisions and momentum together.</div><button className="mt-5 h-10 rounded-lg bg-[#6d51ff] px-4 text-[10px] text-white">Start building</button></div><div className="aspect-square rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-400 to-cyan-300 p-3"><div className="h-full w-full rounded-xl bg-black/75"/></div></div></div></div><div className="border-l border-white/10 p-4"><div className="panel-title">PROPOSED CHANGES</div><div className="space-y-2">{proposal.operations.map((operation,index)=><Change key={`${operation.componentId}-${index}`} name={s.project.nodes[operation.componentId]?.name??operation.componentId} patch={operation.patch} onReject={()=>s.rejectProposalOperation(proposal.id,index)}/>)}</div><div className="mt-5 rounded-xl border border-white/10 p-3"><div className="mb-2 text-[10px] text-white/40">WHY</div><div className="text-[11px] leading-4 text-white/60">{proposal.explanation||'Adapted Tablet while preserving Aurora’s hierarchy and responsive constraints.'}</div></div></div></div>

   <div className="flex items-center justify-between border-t border-white/10 px-5 py-4"><button onClick={()=>s.rejectProposal(proposal.id)} className="secondary"><X size={13}/> Reject all</button><div className="flex gap-2"><button onClick={revise} className="secondary"><RefreshCw size={13}/> Ask agent to revise</button><button disabled={proposal.status==='conflicted'||proposal.operations.length===0} onClick={accept} className="primary disabled:cursor-not-allowed disabled:opacity-40"><Check size={13}/> Accept selected</button></div></div>
  </motion.div>
 </motion.div>}</AnimatePresence>
}

function Change({name,patch,onReject}:{name:string;patch:ResponsiveProps;onReject:()=>void}){
 const entries=Object.entries(patch)
 return <div className="rounded-lg border border-white/10 p-3"><div className="flex items-center justify-between gap-2"><div className="text-xs text-white/75">{name}</div><button aria-label={`Reject ${name} change`} onClick={onReject} className="text-[10px] text-white/35 hover:text-white">Reject</button></div><div className="mt-1 text-[10px] text-white/35">{entries.map(([key,value])=>`${key}: ${String(value)}`).join(' · ')}</div></div>
}
