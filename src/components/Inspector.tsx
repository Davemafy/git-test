import { usePresenceStore } from '../domain/store'
import type { ResponsiveProps } from '../domain/types'

export function Inspector(){
 const s=usePresenceStore(); const bp=s.selection.breakpoint??'mobile'; const id=s.selection.componentId; const node=id?s.project.nodes[id]:undefined; const r=node?.responsive[bp]??{}
 const patch=(changes:ResponsiveProps)=>{if(!id)return;s.mutate({actorId:'human',actorType:'human',label:`You updated ${node?.name} · ${bp}`,change:{componentId:id,breakpoint:bp,patch:changes}})}
 return <div className="w-[250px] border-l border-white/10 bg-[#0e0f14] p-4 overflow-auto hidden 2xl:block">
  <div className="text-[10px] tracking-[.15em] text-white/40 mb-4">PROPERTIES</div>
  {!node?<div className="text-sm text-white/45">Select something on Mobile to edit it.</div>:<>
   <div className="flex items-center justify-between mb-5"><div><div className="text-sm font-medium">{node.name}</div><div className="text-[11px] text-white/35 mt-1">{bp}</div></div><span className="text-[10px] px-2 py-1 rounded-md bg-violet-500/15 text-violet-300">YOU</span></div>
   <Field label="Padding" value={r.padding??0} on={(v)=>patch({padding:v})}/><Field label="Gap" value={r.gap??0} on={(v)=>patch({gap:v})}/>{node.type==='text'&&<Field label="Font size" value={r.fontSize??16} on={(v)=>patch({fontSize:v})}/>} 
   {id==='hero'&&<div className="mt-4"><Label>Layout</Label><div className="grid grid-cols-2 gap-2"><button onClick={()=>patch({display:'flex',direction:'column',gridColumns:1})} className="control">Stack</button><button onClick={()=>patch({display:'grid',gridColumns:2})} className="control">Split</button></div></div>}
   {id==='heroMedia'&&<div className="mt-4"><Label>Media order</Label><div className="grid grid-cols-2 gap-2"><button onClick={()=>patch({order:1})} className="control">First</button><button onClick={()=>patch({order:2})} className="control">Second</button></div></div>}
  </>}
 </div>
}
function Label({children}:{children:React.ReactNode}){return <div className="text-[10px] text-white/40 mb-2">{children}</div>}
function Field({label,value,on}:{label:string;value:number;on:(v:number)=>void}){return <div className="mb-4"><Label>{label}</Label><div className="flex items-center gap-2"><button className="control" onClick={()=>on(Math.max(0,value-2))}>−</button><div className="flex-1 h-8 rounded-md border border-white/10 grid place-items-center text-xs">{value}</div><button className="control" onClick={()=>on(value+2)}>+</button></div></div>}
