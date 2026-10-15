// A deliberately independent, public, fictional Sloppertizer Lite layout experiment.
export const fixture={brand:"ORIGIN",url:"https://example.org/",blocks:[
{id:"c0",tag:"h1",text:"The source matters more than the symbol."},
{id:"c1",tag:"p",text:"A suspicious message can look official. Compare what it asks with an independently accessible record before acting."},
{id:"c2",tag:"span",text:"Fictional composition example — no live checking takes place."},
{id:"c3",tag:"h2",text:"Start with the claim."},
{id:"c4",tag:"p",text:"Identify exactly what the message asks you to do, without changing the original wording."},
{id:"c5",tag:"p",text:"Then compare its request with an independently accessible source record."},
{id:"c6",tag:"h2",text:"Read the original guidance."},
{id:"c7",tag:"p",text:"Find official information independently instead of following links in an unverified message."},
{id:"c8",tag:"h3",text:"Trace the reasoning."},
{id:"c9",tag:"p",text:"Separate what a message claims from what the original source actually says."},
{id:"c10",tag:"h3",text:"Preserve uncertainty."},
{id:"c11",tag:"p",text:"If evidence is insufficient, say so rather than inventing a confident verdict."},
{id:"c12",tag:"h2",text:"An inspectable result."},
{id:"c13",tag:"p",text:"Give the evidence and limitations readable space, not a stack of fabricated badges."}
],links:[
{id:"l0",role:"action",label:"View example",href:"https://example.org/check"},
{id:"l1",role:"navigation",label:"Guidance",href:"https://example.org/guidance"},
{id:"l2",role:"navigation",label:"About",href:"https://example.org/about"}
]};
const tags=new Set(["h1","h2","h3","h4","h5","h6","p","span","blockquote"]);
const escape=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safe=x=>{const u=new URL(x);if(u.protocol!=="https:")throw Error("Only HTTPS links supported");return escape(u.href)};
const slot=b=>"<"+b.tag+' data-content="'+escape(b.id)+'">'+escape(b.text)+"</"+b.tag+">";
const anchor=(l,cls="")=>'<a class="'+cls+'" data-link="'+escape(l.id)+'" href="'+safe(l.href)+'">'+escape(l.label)+"</a>";
export function compose(e){
 if(!e||!Array.isArray(e.blocks)||!Array.isArray(e.links))throw Error("Missing evidence");
 if(e.blocks.filter(x=>x.tag==="h1").length!==1)throw Error("One h1 is required");
 if(new Set([...e.blocks,...e.links].map(x=>x.id)).size!==e.blocks.length+e.links.length)throw Error("Duplicate source IDs");
 for(const b of e.blocks)if(!/^c\d+$/.test(b.id)||!tags.has(b.tag)||typeof b.text!=="string")throw Error("Invalid source block");
 for(const l of e.links){if(!/^l\d+$/.test(l.id))throw Error("Invalid link ID");safe(l.href)}
 safe(e.url);
 const headingAt=e.blocks.findIndex(b=>b.tag==="h1");
 const first=e.blocks.findIndex((b,i)=>i>headingAt&&b.tag==="h2");
 const intro=e.blocks.slice(headingAt+1,first<0?undefined:first);
 const sections=[];
 for(const block of first<0?[]:e.blocks.slice(first)){
  if(block.tag==="h2")sections.push({heading:block,entries:[]});
  else if(sections.length)sections.at(-1).entries.push(block);
 }
 const lead=intro.filter(x=>x.tag==="p").slice(0,2);
 const leadIds=new Set(lead.map(x=>x.id));
 const proof=sections.find(s=>s.entries.length>0&&s.entries.length<=2&&s.entries.every(x=>x.tag==="p")&&
  s.heading.text.length+s.entries.reduce((n,x)=>n+x.text.length,0)<=260)||null;
 return {heading:e.blocks[headingAt],prelude:e.blocks.slice(0,headingAt),lead,remaining:intro.filter(x=>!leadIds.has(x.id)),proof,sections:sections.filter(x=>x!==proof)};
}
export function markup(e){
 const c=compose(e),navigation=e.links.filter(x=>x.role==="navigation"),actions=e.links.filter(x=>x.role==="action");
 const head='<header class="nav"><a class="logo" href="'+safe(e.url)+'">'+escape(e.brand)+' <small>PUBLIC LAB</small></a><nav>'+navigation.map(x=>anchor(x)).join("")+"</nav></header>";
 const proof=c.proof?'<aside class="proof"><span class="eyebrow">SOURCE / 01</span>'+slot(c.proof.heading)+c.proof.entries.map(slot).join("")+"</aside>":"";
 const hero='<section class="opening'+(proof?"":" copy-only")+'" data-composition="opening"><div class="hero"><span class="eyebrow">VERIFY BEFORE YOU ACT</span>'+
  c.prelude.map(slot).join("")+slot(c.heading)+'<div class="description">'+c.lead.map(slot).join("")+'</div><div class="actions">'+actions.map(x=>anchor(x,"primary")).join("")+"</div></div>"+proof+"</section>";
 const remaining=c.remaining.length?'<div class="remaining">'+c.remaining.map(slot).join("")+"</div>":"";
 const sections=c.sections.map((s,i)=>'<section class="reading"><div class="reading-inner"><div class="reading-title"><span class="eyebrow">READ / '+(i+1)+'</span>'+slot(s.heading)+'</div><div class="reading-body">'+
  s.entries.map(x=>/^h[3-6]$/.test(x.tag)?'<div class="subheading">'+slot(x)+"</div>":slot(x)).join("")+"</div></div></section>").join("");
 return head+"<main>"+hero+remaining+sections+'</main><footer class="footer">ORIGIN — fictional content, public tests only.</footer>';
}
const css=String.raw`*{box-sizing:border-box}html,body{margin:0}body{background:#f4f0e7;color:#172032;font:16px/1.55 Arial,Helvetica,sans-serif}a{color:inherit}.nav{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px clamp(20px,5vw,72px);border-bottom:1px solid #c9c6bd;flex-wrap:wrap}.logo{font-weight:900;font-size:23px;text-decoration:none}.logo small{font-size:10px;letter-spacing:.12em;margin-left:8px}.nav nav{display:flex;gap:20px;font-size:14px}.opening{min-height:580px;display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr)}.opening.copy-only{display:block;min-height:0}.copy-only .hero{max-width:1200px;min-height:470px}.hero{padding:clamp(45px,7vw,100px) clamp(24px,5vw,82px);display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:21px;min-width:0}.eyebrow{font-size:11px;font-weight:800;letter-spacing:.12em}.hero h1{font:400 clamp(49px,5.7vw,90px)/1.03 Georgia,serif;letter-spacing:-.05em;max-width:12ch;margin:0;overflow-wrap:break-word}.description p{max-width:47ch;margin:0;font-size:17px}.actions{display:flex;flex-wrap:wrap;gap:14px}.primary{background:#172032;color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:14px 22px}.proof{background:#dae3ed;padding:clamp(32px,5vw,74px);display:flex;flex-direction:column;justify-content:center;gap:17px;min-width:0}.proof h2{font:400 clamp(36px,4vw,63px)/1.09 Georgia,serif;letter-spacing:-.04em;margin:0}.proof p{max-width:46ch}.remaining{padding:24px clamp(24px,5vw,82px);background:#172032;color:#fff}.remaining>*{margin:0;max-width:65ch}.reading{border-top:1px solid #c9c6bd;padding:clamp(48px,5vw,80px) clamp(24px,5vw,82px)}.reading-inner{max-width:1220px;margin:auto;display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:clamp(26px,5vw,90px)}.reading-title h2{font:400 clamp(36px,4.5vw,67px)/1.09 Georgia,serif;letter-spacing:-.035em;margin:15px 0;max-width:15ch}.reading-body{border-top:1px solid #172032;padding-top:17px;display:flex;flex-direction:column;gap:18px}.reading-body>*{max-width:64ch;margin:0}.subheading{width:100%;padding-top:22px;margin-top:8px;border-top:1px solid #c9c6bd}.subheading h3{font-size:26px;font-weight:500;line-height:1.25}.footer{padding:30px clamp(24px,5vw,82px);background:#172032;color:white;font-size:13px}@media(max-width:800px){.opening{display:flex;flex-direction:column;min-height:0}.hero{padding:55px 24px}.copy-only .hero{min-height:0}.hero h1{font-size:clamp(39px,9.5vw,65px)}.proof{padding:35px 24px}.reading-inner{display:flex;flex-direction:column;gap:26px}.nav{padding:15px 22px}}@media(max-width:420px){.logo small{display:none}.nav nav{gap:13px}.hero h1{font-size:clamp(38px,10vw,48px)}.reading-title h2{font-size:39px}}`;
export const html=e=>'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sloppertizer Lite public tests</title><style>'+css+'</style></head><body>'+markup(e)+'</body></html>';
