import { motion } from 'framer-motion'
import { usePresenceStore } from '../domain/store'
import type { Breakpoint, ComponentNode, Project, Proposal } from '../domain/types'

const size: Record<Breakpoint, string> = { desktop: 'min-w-[390px]', tablet: 'min-w-[300px]', mobile: 'min-w-[220px]' }
const labels: Record<Breakpoint, string> = { desktop: 'DESKTOP · 1200', tablet: 'TABLET · 768', mobile: 'MOBILE · 375' }

function merged(node: ComponentNode, breakpoint: Breakpoint, proposal?: Proposal) {
  const patch = proposal?.operations.filter((operation) => operation.componentId === node.id && operation.breakpoint === breakpoint).reduce((acc, operation) => ({ ...acc, ...operation.patch }), {})
  return { ...(node.responsive[breakpoint] ?? {}), ...(patch ?? {}) }
}

export function AuroraCanvas({ breakpoint, project }: { breakpoint: Breakpoint; project: Project }) {
  const { selection, setSelection, proposals, connection, assignments } = usePresenceStore()
  const proposal = proposals.find((item) => item.breakpoint === breakpoint && ['working', 'ready', 'conflicted'].includes(item.status))
  const selected = selection.breakpoint === breakpoint ? selection.componentId : undefined
  const props = (id: string) => merged(project.nodes[id], breakpoint, proposal)
  const choose = (id: string) => setSelection({ componentId: id, breakpoint, actorId: 'human' })
  const hero = props('hero'), headline = props('headline'), actions = props('actions'), primary = props('primary'), media = props('heroMedia')
  const splitHero = hero.display === 'grid' && hero.gridColumns === 2
  const agentAssigned = assignments.some(a=>a.breakpoint==='tablet'&&a.participantId==='agent'&&a.mode==='propose')
  const showAgent = breakpoint === 'tablet' && connection.agent === 'working' && agentAssigned
  const showHuman = breakpoint === 'mobile'
  const ownerLabel = breakpoint==='desktop'?'REFERENCE':breakpoint==='mobile'?'YOU':agentAssigned?'YOUR AGENT':'UNASSIGNED'

  return <section className={`relative ${size[breakpoint]} flex-1 overflow-hidden rounded-xl border bg-[#111218] shadow-2xl shadow-black/30 ${proposal ? 'border-sky-500/55' : 'border-white/10'}`}>
    <div className="flex h-9 items-center justify-between border-b border-white/10 px-3 text-[10px] tracking-[.13em] text-white/50"><span>{labels[breakpoint]}</span><span className={ownerLabel==='YOUR AGENT'?'text-sky-300':ownerLabel==='YOU'?'text-violet-300':''}>{ownerLabel}</span></div>
    <div className="relative h-[600px] select-none overflow-hidden bg-[#f2f0e9] text-[#111]">
      <div onClick={() => choose('header')} className={`flex items-center justify-between border-b border-black/10 px-4 py-3 ${selected === 'header' ? 'ring-2 ring-inset ring-violet-500' : ''}`}><div className="text-[11px] font-black tracking-[.18em]">AURORA</div><div className="hidden text-[9px] opacity-60 md:block">Product &nbsp; Solutions &nbsp; Pricing</div><button className="h-9 rounded-full bg-black px-3 text-[10px] text-white">Start free</button></div>
      <div onClick={() => choose('hero')} style={{ padding: hero.padding ?? 24, gap: hero.gap ?? 22 }} className={`${splitHero ? 'grid grid-cols-2' : 'flex flex-col'} min-h-[285px] items-center ${selected === 'hero' ? 'ring-2 ring-inset ring-violet-500' : ''}`}>
        <div className="w-full"><div className="mb-3 text-[9px] uppercase tracking-[.16em] opacity-55">A calmer way to build</div><h1 onClick={(event) => { event.stopPropagation(); choose('headline') }} style={{fontSize: Math.max(20, Math.min(52, headline.fontSize ?? 34)),lineHeight: headline.lineHeight ?? 1.05,textAlign: headline.textAlign}} className={`max-w-[480px] font-semibold tracking-[-.045em] ${selected === 'headline' ? 'outline outline-2 outline-violet-500' : ''}`}>Your product team, finally in the same orbit.</h1><p className="mt-3 max-w-[430px] text-[11px] leading-5 opacity-65">Aurora keeps ideas, decisions and momentum together so your team can ship with less drag.</p><div style={{ gap: actions.gap ?? 10 }} className={`mt-4 flex ${actions.direction === 'column' ? 'flex-col' : 'flex-row'}`}><button style={{ width: primary.width === 'full' ? '100%' : 'auto' }} className="h-10 rounded-lg bg-[#6d51ff] px-4 text-[10px] text-white">Start building</button><button className="h-10 rounded-lg border border-black/15 px-4 text-[10px]">See how it works</button></div></div>
        <motion.div layout onClick={(event) => { event.stopPropagation(); choose('heroMedia') }} style={{ order: media.order ?? 2 }} className={`w-full rounded-2xl border border-black/10 bg-black p-2 ${selected === 'heroMedia' ? 'outline outline-2 outline-violet-500' : ''}`}><div className={`rounded-xl bg-gradient-to-br from-violet-500 via-indigo-400 to-cyan-300 p-3 ${media.imageRatio === '16:9' ? 'aspect-video' : media.imageRatio === '1:1' ? 'aspect-square' : 'aspect-[4/3]'}`}><div className="h-full rounded-lg bg-black/75 p-3 text-white"><div className="mb-3 flex gap-1"><span className="h-1.5 w-1.5 rounded-full bg-white/30"/><span className="h-1.5 w-1.5 rounded-full bg-white/30"/></div><div className="mb-2 h-2 w-3/4 rounded bg-white/20"/><div className="grid h-2/3 grid-cols-2 gap-2"><div className="rounded bg-white/10"/><div className="rounded bg-white/10"/></div></div></div></motion.div>
      </div>
      <div className="border-y border-black/10 px-4 py-3 text-[8px] tracking-[.16em] opacity-50">NORTHSTAR &nbsp; WAVELINE &nbsp; TIDE &nbsp; FOUNDRY</div><div className={`grid gap-2 p-4 ${breakpoint === 'desktop' ? 'grid-cols-3' : breakpoint === 'tablet' ? 'grid-cols-2' : 'grid-cols-1'}`}><Feature title="Focus"/><Feature title="Momentum"/><Feature title="Signal"/></div>
      {(showAgent || showHuman) && <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={`pointer-events-none absolute ${showAgent ? 'right-8 top-48' : 'left-8 top-60'}`}><div className={`${showAgent ? 'bg-sky-500' : 'bg-violet-500'} rounded-md px-2 py-1 text-[9px] font-semibold text-white shadow-lg`}>{showAgent ? 'YOUR AGENT' : 'YOU'}</div></motion.div>}
    </div>
  </section>
}

function Feature({ title }: { title: string }) { return <div className="rounded-xl border border-black/10 bg-white/40 p-3"><div className="text-[10px] font-semibold">{title}</div><div className="mt-6 h-1.5 w-2/3 rounded bg-black/10"/></div> }
