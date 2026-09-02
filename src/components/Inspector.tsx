import { usePresenceStore } from '../domain/store'
import type { ResponsiveProps } from '../domain/types'

export function Inspector(){
 const s=usePresenceStore(); const bp=s.selection.breakpoint??'mobile'; const id=s.selection.componentId; const node=id?s.project.nodes[id]:undefined; const r=node?.responsive[bp]??{}
 const patch=(changes:ResponsiveProps)=>{if(!id)return;s.mutate({actorId:'human',actorType:'human',label:`You updated ${node?.name} · ${bp}`,change:{componentId:id,breakpoint:bp,patch:changes}})}
 if(!node)return null
 return <aside className="absolute bottom-12 left-8 z-40 hidden w-[236px] overflow-hidden rounded-xl border border-white/10 bg-[#0d0f13]/95 p-3 shadow-2xl backdrop-blur-xl 2xl:block">
  <div className="mb-3 flex items-center justify-between"><div><div className="text-[11px] font-medium text-white/80">{node.name}</div><div className="mt-0.5 text-[9px] capitalize text-white/30">{bp}</div></div><span className="rounded-md bg-violet-500/12 px-2 py-1 text-[8px] tracking-[.12em] text-violet-300">YOU</span></div>
  <Field label="Padding" value={r.padding??0} on={(v)=>patch({padding:v})}/><Field label="Gap" value={r.gap??0} on={(v)=>patch({gap:v})}/>{node.type==='text'&&<Field label="Font size" value={r.fontSize??16} on={(v)=>patch({fontSize:v})}/>} 
  {id==='hero'&&<div className="mt-3"><Label>Layout</Label><div className="grid grid-cols-2 gap-2"><button onClick={()=>patch({display:'flex',direction:'column',gridColumns:1})} className="control">Stack</button><button onClick={()=>patch({display:'grid',gridColumns:2})} className="control">Split</button></div></div>}
  {id==='heroMedia'&&<div className="mt-3"><Label>Media order</Label><div className="grid grid-cols-2 gap-2"><button onClick={()=>patch({order:1})} className="control">First</button><button onClick={()=>patch({order:2})} className="control">Second</button></div></div>}
 </aside>
}
function Label({children}:{children:React.ReactNode}){return <div className="mb-1.5 text-[9px] text-white/30">{children}</div>}
function Field({label,value,on}:{label:string;value:number;on:(v:number)=>void}){return <div className="mb-3"><Label>{label}</Label><div className="flex items-center gap-2"><button className="control" onClick={()=>on(Math.max(0,value-2))}>−</button><div className="grid h-8 flex-1 place-items-center rounded-md border border-white/10 text-[10px] text-white/55">{value}</div><button className="control" onClick={()=>on(value+2)}>+</button></div></div>}
