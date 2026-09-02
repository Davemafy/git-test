import type { AgentRole, Capability, Constraint, Participant, Project, SharedGoal, SurfaceAssignment } from './types'

export const makeAuroraProject = ():Project => ({
  id:'aurora', name:'Aurora Landing Page', rootId:'page', nodes:{
    page:{id:'page',type:'page',name:'Page',props:{},responsive:{desktop:{display:'block'},tablet:{display:'block'},mobile:{display:'block'}},children:['header','hero','trust','features','secondary','footer']},
    header:{id:'header',type:'nav',name:'Header',props:{},responsive:{desktop:{display:'flex',direction:'row',align:'center',gap:24,padding:24},tablet:{display:'flex',direction:'row',align:'center',gap:16,padding:18},mobile:{display:'flex',direction:'row',align:'center',gap:12,padding:16}},children:['logo','navlinks','navcta']},
    logo:{id:'logo',type:'text',name:'Aurora',props:{text:'AURORA'},responsive:{desktop:{fontSize:16},tablet:{fontSize:15},mobile:{fontSize:14}},children:[]},
    navlinks:{id:'navlinks',type:'text',name:'Navigation',props:{text:'Product   Solutions   Pricing'},responsive:{desktop:{fontSize:14,visible:true},tablet:{fontSize:13,visible:true},mobile:{fontSize:13,visible:false}},children:[]},
    navcta:{id:'navcta',type:'button',name:'Start free',props:{label:'Start free',minTouchTarget:44},responsive:{desktop:{width:'auto'},tablet:{width:'auto'},mobile:{width:'auto'}},children:[]},
    hero:{id:'hero',type:'section',name:'Hero',props:{},responsive:{desktop:{display:'grid',gridColumns:2,gap:56,padding:56,align:'center'},tablet:{display:'grid',gridColumns:1,gap:28,padding:34,align:'center'},mobile:{display:'flex',direction:'column',gap:20,padding:22,align:'stretch'}},children:['heroCopy','heroMedia']},
    heroCopy:{id:'heroCopy',type:'container',name:'Hero Copy',props:{},responsive:{desktop:{display:'flex',direction:'column',gap:20},tablet:{display:'flex',direction:'column',gap:16},mobile:{display:'flex',direction:'column',gap:14}},children:['eyebrow','headline','body','actions']},
    eyebrow:{id:'eyebrow',type:'text',name:'Eyebrow',props:{text:'A calmer way to build'},responsive:{desktop:{fontSize:13},tablet:{fontSize:13},mobile:{fontSize:12}},children:[]},
    headline:{id:'headline',type:'text',name:'Headline',props:{text:'Your product team, finally in the same orbit.'},responsive:{desktop:{fontSize:54,lineHeight:1.02},tablet:{fontSize:38,lineHeight:1.05},mobile:{fontSize:34,lineHeight:1.06}},children:[]},
    body:{id:'body',type:'text',name:'Body',props:{text:'Aurora keeps ideas, decisions and momentum together so your team can ship with less drag.'},responsive:{desktop:{fontSize:18,lineHeight:1.55},tablet:{fontSize:16,lineHeight:1.5},mobile:{fontSize:16,lineHeight:1.5}},children:[]},
    actions:{id:'actions',type:'container',name:'Hero Actions',props:{},responsive:{desktop:{display:'flex',direction:'row',gap:12},tablet:{display:'flex',direction:'row',gap:10},mobile:{display:'flex',direction:'column',gap:10}},children:['primary','secondaryBtn']},
    primary:{id:'primary',type:'button',name:'Start building',props:{label:'Start building',minTouchTarget:44},responsive:{desktop:{width:'auto'},tablet:{width:'auto'},mobile:{width:'auto'}},children:[]},
    secondaryBtn:{id:'secondaryBtn',type:'button',name:'See how it works',props:{label:'See how it works',minTouchTarget:44},responsive:{desktop:{width:'auto'},tablet:{width:'auto'},mobile:{width:'full'}},children:[]},
    heroMedia:{id:'heroMedia',type:'image',name:'Product Preview',props:{src:'gradient'},responsive:{desktop:{imageRatio:'4:3',order:2},tablet:{imageRatio:'16:9',order:2},mobile:{imageRatio:'4:3',order:2}},children:[]},
    trust:{id:'trust',type:'section',name:'Trust Strip',props:{text:'NORTHSTAR   WAVELINE   TIDE   FOUNDRY'},responsive:{desktop:{padding:24},tablet:{padding:20},mobile:{padding:18}},children:[]},
    features:{id:'features',type:'grid',name:'Features',props:{},responsive:{desktop:{display:'grid',gridColumns:3,gap:18,padding:42},tablet:{display:'grid',gridColumns:2,gap:16,padding:28},mobile:{display:'grid',gridColumns:1,gap:14,padding:20}},children:['f1','f2','f3']},
    f1:{id:'f1',type:'container',name:'Focus',props:{text:'One place for product work.'},responsive:{desktop:{padding:22},tablet:{padding:20},mobile:{padding:18}},children:[]},
    f2:{id:'f2',type:'container',name:'Momentum',props:{text:'Turn decisions into motion.'},responsive:{desktop:{padding:22},tablet:{padding:20},mobile:{padding:18}},children:[]},
    f3:{id:'f3',type:'container',name:'Signal',props:{text:'See what changed and why.'},responsive:{desktop:{padding:22},tablet:{padding:20},mobile:{padding:18}},children:[]},
    secondary:{id:'secondary',type:'section',name:'Secondary',props:{text:'Less status chasing. More building.'},responsive:{desktop:{padding:56},tablet:{padding:36},mobile:{padding:24}},children:[]},
    footer:{id:'footer',type:'footer',name:'Footer',props:{text:'Aurora  © 2026'},responsive:{desktop:{padding:32},tablet:{padding:26},mobile:{padding:20}},children:[]}
  }
})

export const defaultGoal:SharedGoal={id:'goal-responsive',description:'Create a responsive landing page that works beautifully across desktop, tablet and mobile while preserving content hierarchy and visual character.',status:'active',revision:1}
export const participants:Participant[]=[{id:'human',name:'You',type:'human',color:'violet',status:'working',breakpoint:'mobile'}]
export const assignments:SurfaceAssignment[]=[
  {breakpoint:'desktop',participantId:'human',mode:'read'},
  {breakpoint:'mobile',participantId:'human',mode:'edit'}
]
export const roles:AgentRole[]=[{
  id:'responsive-collaborator',name:'Responsive collaborator',description:'Can inspect responsive project state and propose changes on one assigned breakpoint.',
  defaultScopes:[
    {resource:'breakpoint',id:'desktop',mode:'inspect'},
    {resource:'breakpoint',id:'tablet',mode:'inspect'},
    {resource:'breakpoint',id:'mobile',mode:'inspect'},
    {resource:'breakpoint',id:'tablet',mode:'propose'}
  ]
}]
export const capabilities:Capability[]=[
  {id:'inspect_presence',name:'Inspect Presence',description:'Inspect current app and admission state.',mode:'inspect',resource:'project',requiresApproval:false},
  {id:'inspect_project',name:'Inspect project',description:'Inspect project state.',mode:'inspect',resource:'project',requiresApproval:false},
  {id:'inspect_breakpoint',name:'Inspect breakpoint',description:'Inspect a responsive surface.',mode:'inspect',resource:'breakpoint',requiresApproval:false},
  {id:'propose_layout_change',name:'Propose layout change',description:'Propose structured changes on an assigned breakpoint.',mode:'propose',resource:'breakpoint',requiresApproval:true}
]
export const constraints:Constraint[]=[
  {id:'copy',type:'preserve-copy',label:'Preserve canonical copy',enabled:true},
  {id:'hierarchy',type:'preserve-hierarchy',label:'Preserve content hierarchy',enabled:true},
  {id:'overflow',type:'no-overflow',label:'No horizontal overflow',enabled:true},
  {id:'font',type:'min-font-size',label:'Body text ≥ 16px',enabled:true,config:{min:16}},
  {id:'touch',type:'min-touch-target',label:'Touch targets ≥ 44px',enabled:true,config:{min:44}},
  {id:'desktop',type:'desktop-readonly',label:'Desktop remains unchanged',enabled:true},
  {id:'visible',type:'required-visible',label:'Primary CTA remains visible',enabled:true},
]
