import { getPresenceState } from '../domain/store'
import type { Breakpoint, ResponsiveProps } from '../domain/types'

type ToolDef={name:string;description:string;inputSchema:Record<string,unknown>;execute:(input:unknown)=>unknown|Promise<unknown>}

declare global { interface Document { modelContext?: { registerTool:(tool:ToolDef)=>void } } }

const bp={type:'string',enum:['desktop','tablet','mobile']}
const ok=(data:unknown)=>({content:[{type:'text',text:JSON.stringify(data)}]})

export const toolNames=['inspect_project','inspect_breakpoint','inspect_component','inspect_constraints','inspect_recent_changes','update_layout','update_component','update_responsive_rule','compare_breakpoints','explain_change'] as const

export function registerWebMcp(){
  const mc=document.modelContext
  const store=getPresenceState()
  if(!mc){store.setWebMcp('unavailable');return false}
  const register=(tool:ToolDef)=>mc.registerTool(tool)
  register({name:'inspect_project',description:'Inspect the current Presence project, canonical revision, shared goal, participant assignments, and active proposals.',inputSchema:{type:'object',properties:{},additionalProperties:false},execute:()=>{const s=getPresenceState();return ok({project:{id:s.project.id,name:s.project.name},revision:s.canonicalRevision,goal:s.sharedGoal,assignments:s.assignments,proposals:s.proposals.map(p=>({id:p.id,status:p.status,breakpoint:p.breakpoint,count:p.operations.length}))})}})
  register({name:'inspect_breakpoint',description:'Inspect semantic component layout values for one responsive breakpoint. Use this before proposing layout changes.',inputSchema:{type:'object',properties:{breakpoint:bp},required:['breakpoint'],additionalProperties:false},execute:(input)=>{const {breakpoint}=input as {breakpoint:Breakpoint};const s=getPresenceState();return ok({breakpoint,revision:s.canonicalRevision,nodes:Object.values(s.project.nodes).map(n=>({id:n.id,name:n.name,type:n.type,props:n.props,responsive:n.responsive[breakpoint]??{}}))})}})
  register({name:'inspect_component',description:'Inspect a component and its responsive values across all breakpoints.',inputSchema:{type:'object',properties:{componentId:{type:'string'}},required:['componentId'],additionalProperties:false},execute:(input)=>{const {componentId}=input as {componentId:string};const s=getPresenceState();const n=s.project.nodes[componentId];return ok(n??{error:'NOT_FOUND'})}})
  register({name:'inspect_constraints',description:'Inspect deterministic product constraints that all human and agent operations must satisfy.',inputSchema:{type:'object',properties:{},additionalProperties:false},execute:()=>ok(getPresenceState().constraints.filter(c=>c.enabled))})
  register({name:'inspect_recent_changes',description:'Inspect recent human, agent, and system activity with revision numbers. Use this before acting when the human may have changed the project.',inputSchema:{type:'object',properties:{limit:{type:'number',minimum:1,maximum:20}},additionalProperties:false},execute:(input)=>{const {limit=8}=input as {limit?:number};const s=getPresenceState();return ok(s.activities.slice(-limit).reverse())}})
  const mutation=(name:string,description:string)=>register({name,description,inputSchema:{type:'object',properties:{breakpoint:bp,componentId:{type:'string'},changes:{type:'object',properties:{display:{type:'string',enum:['block','flex','grid','none']},direction:{type:'string',enum:['row','column']},gridColumns:{type:'number'},gap:{type:'number'},padding:{type:'number'},width:{type:'string',enum:['auto','full']},align:{type:'string',enum:['start','center','end','stretch']},textAlign:{type:'string',enum:['left','center','right']},fontSize:{type:'number'},lineHeight:{type:'number'},order:{type:'number'},visible:{type:'boolean'},imageRatio:{type:'string',enum:['16:9','4:3','1:1']}},additionalProperties:false},expectedRevision:{type:'number'}},required:['breakpoint','componentId','changes','expectedRevision'],additionalProperties:false},execute:(input)=>{const {breakpoint,componentId,changes,expectedRevision}=input as {breakpoint:Breakpoint;componentId:string;changes:ResponsiveProps;expectedRevision:number};const s=getPresenceState();const result=s.mutate({actorId:'agent',actorType:'agent',label:`Agent updated ${s.project.nodes[componentId]?.name??componentId} · ${breakpoint}`,change:{componentId,breakpoint,patch:changes},expectedRevision,provisional:true,explanation:'Adapted this surface while preserving the shared responsive goal.'});return ok(result)}})
  mutation('update_layout','Propose a semantic layout change for a component on an owned breakpoint. Agent changes remain provisional. Requires the current expectedRevision.')
  mutation('update_component','Propose responsive component property changes on an owned breakpoint. Agent changes remain provisional. Requires the current expectedRevision.')
  mutation('update_responsive_rule','Propose a breakpoint-specific responsive rule using structured product semantics. Requires the current expectedRevision.')
  register({name:'compare_breakpoints',description:'Compare responsive properties for components across two breakpoints.',inputSchema:{type:'object',properties:{from:bp,to:bp},required:['from','to'],additionalProperties:false},execute:(input)=>{const {from,to}=input as {from:Breakpoint;to:Breakpoint};const s=getPresenceState();return ok(Object.values(s.project.nodes).map(n=>({id:n.id,name:n.name,from:n.responsive[from]??{},to:n.responsive[to]??{}})))}})
  register({name:'explain_change',description:'Return the concise product-level rationale attached to an agent proposal.',inputSchema:{type:'object',properties:{proposalId:{type:'string'}},required:['proposalId'],additionalProperties:false},execute:(input)=>{const {proposalId}=input as {proposalId:string};const p=getPresenceState().proposals.find(x=>x.id===proposalId);return ok(p?{proposalId,explanation:p.explanation,status:p.status}:{error:'NOT_FOUND'})}})
  store.setWebMcp('connected')
  return true
}
