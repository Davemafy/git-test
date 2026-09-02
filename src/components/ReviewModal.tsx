import { AnimatePresence, motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { usePresenceStore } from '../domain/store'
import type { ResponsiveProps } from '../domain/types'

export function ReviewModal() {
  const s = usePresenceStore()
  const proposal = s.proposals.find(
    (item) => item.breakpoint === 'tablet' && ['working', 'ready', 'conflicted'].includes(item.status),
  )

  return (
    <AnimatePresence>
      {s.reviewOpen && proposal && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 18, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 18, opacity: 0 }}
            className="w-full max-w-[820px] overflow-hidden rounded-2xl border border-white/10 bg-[#111218] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <div className="text-sm font-medium">Review Agent Changes</div>
                <div className="mt-1 text-xs text-white/35">
                  Tablet · {proposal.operations.length} provisional changes · based on r{proposal.baseRevision}
                </div>
              </div>
              <button aria-label="Close review" onClick={() => s.setReviewOpen(false)} className="icon">
                <X size={16} />
              </button>
            </div>

            <div className="grid min-h-[430px] grid-cols-[1fr_300px]">
              <div className="bg-[#0d0e13] p-5">
                <div className="relative h-full overflow-hidden rounded-xl border border-sky-500/30 bg-[#f2f0e9] p-8 text-black">
                  <div className="absolute right-4 top-4 rounded-md bg-sky-500 px-2 py-1 text-[10px] text-white">AGENT · TABLET</div>
                  <div className="grid h-full grid-cols-2 items-center gap-5">
                    <div>
                      <div className="mb-3 text-[10px] uppercase tracking-widest opacity-50">A calmer way to build</div>
                      <div className="text-[38px] font-semibold leading-[1.02] tracking-[-.045em]">Your product team, finally in the same orbit.</div>
                      <div className="mt-4 text-xs leading-5 opacity-60">Aurora keeps ideas, decisions and momentum together.</div>
                      <button className="mt-5 h-10 rounded-lg bg-[#6d51ff] px-4 text-[10px] text-white">Start building</button>
                    </div>
                    <div className="aspect-square rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-400 to-cyan-300 p-3">
                      <div className="h-full w-full rounded-xl bg-black/75" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-l border-white/10 p-4">
                <div className="panel-title">CHANGES</div>
                <div className="space-y-2">
                  {proposal.operations.map((operation, index) => (
                    <Change
                      key={`${operation.componentId}-${index}`}
                      name={s.project.nodes[operation.componentId]?.name ?? operation.componentId}
                      patch={operation.patch}
                    />
                  ))}
                </div>
                <div className="mt-5 rounded-xl border border-white/10 p-3">
                  <div className="mb-2 text-[10px] text-white/40">WHY</div>
                  <div className="text-[11px] leading-4 text-white/60">{proposal.explanation}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-between border-t border-white/10 px-5 py-4">
              <button onClick={() => s.rejectProposal(proposal.id)} className="secondary">
                <X size={13} /> Discard all
              </button>
              <button onClick={() => s.acceptProposal(proposal.id)} className="primary">
                <Check size={13} /> Accept Tablet Changes
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Change({ name, patch }: { name: string; patch: ResponsiveProps }) {
  const entries = Object.entries(patch)
  return (
    <div className="rounded-lg border border-white/10 p-3">
      <div className="text-xs text-white/75">{name}</div>
      <div className="mt-1 text-[10px] text-white/35">{entries.map(([key, value]) => `${key}: ${String(value)}`).join(' · ')}</div>
    </div>
  )
}
