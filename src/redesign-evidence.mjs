import fs from 'node:fs/promises';
import path from 'node:path';

const clean=x=>String(x||'').replace(/\s+/g,' ').trim();
const read=p=>fs.readFile(p,'utf8').then(JSON.parse);
const safeLink=x=>{try{const u=new URL(x);return ['https:','http:','mailto:','tel:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null}catch{return null}};

// Reuses collector DOM, measured Design DNA and responsive relationships. Content
// IDs follow the research world-model convention: interpretations must cite facts.
export function compactRedesignEvidence(desktop,mobile,dna,responsive){
 const nodes=desktop.dom||[],byIndex=new Map(nodes.map(n=>[n.index,n]));
 const textOf=(n,depth=0)=>{
  if(depth>20)return '';
  const text=clean((n.nodes||[]).map(x=>x.text??textOf(byIndex.get(x.child)||{},depth+1)).join(' '))||clean(n.ownText);
  const mail=n.attrs?.href?.match(/^mailto:([^?]+)/i)?.[1];
  return mail&&[...text].reverse().join('')===mail?mail:text;
 };
 const semantic=new Set(['h1','h2','h3','h4','h5','h6','p','li','a','button','figcaption']);
 const ancestor=(n,tags)=>{let p=byIndex.get(n.parentIndex);for(let i=0;p&&i<40;i++,p=byIndex.get(p.parentIndex))if(tags.has(p.tag))return p;return null};
 const blocks=[],seen=new Set();
 for(const n of nodes){
  if(!semantic.has(n.tag)||ancestor(n,new Set(['script','style','svg'])))continue;
  if(ancestor(n,semantic))continue;
  const text=textOf(n)||(n.tag==='a'?n.attrs?.ariaLabel||n.attrs?.alt||n.attrs?.title:'');if(!text||seen.has(n.tag+':'+text))continue;
  seen.add(n.tag+':'+text);
  const section=ancestor(n,new Set(['section','header','footer','nav','article','main']));
  blocks.push({id:'c'+blocks.length,tag:n.tag,text,originPath:n.domPath,region:section?.id||section?.tag||'body',
   href:safeLink(n.attrs?.href),required:true});
 }
 // Direct text in div/span is common in real app sites. Preserve uncaptured copy
 // rather than quietly dropping it because it lacks ideal semantic markup.
 for(const n of nodes){
  if(semantic.has(n.tag)||ancestor(n,semantic)||ancestor(n,new Set(['script','style','svg'])))continue;
  const text=clean(n.ownText);if(text.length<2||blocks.some(x=>x.text.includes(text)))continue;
  const section=ancestor(n,new Set(['section','header','footer','nav','main']));
  blocks.push({id:'c'+blocks.length,tag:'span',text,originPath:n.domPath,region:section?.id||section?.tag||'body',required:true});
 }
 for(const semantic of desktop.semantic?.blocks||[]){
  // Prefer rendered full sentences over disconnected ownText fragments.
  const contained=blocks.filter(x=>semantic.text.includes(x.text)||semantic.originPath&&x.originPath&&
   (x.originPath===semantic.originPath||x.originPath.startsWith(semantic.originPath+'.')));
  if(contained.length||!blocks.some(x=>x.text===semantic.text)){
   for(const x of contained){const i=blocks.indexOf(x);if(i>=0)blocks.splice(i,1)}
   blocks.push({...semantic,required:true});
  }
 }
 // The semantic sentence collector flattens rendered headings into paragraphs.
 // Recover their actual roles from the existing DOM evidence before prompting.
 const headingRoles=new Map(nodes.filter(n=>/^h[1-6]$/.test(n.tag)).map(n=>[textOf(n),n.tag]));
 for(const block of blocks)if(headingRoles.has(block.text))block.tag=headingRoles.get(block.text);
 blocks.sort((a,b)=>{
  if(!a.originPath||!b.originPath)return 0;
  const x=a.originPath.split('.').map(Number),y=b.originPath.split('.').map(Number);
  for(let i=0;i<Math.max(x.length,y.length);i++){if(x[i]!==y[i])return (x[i]??-1)-(y[i]??-1)}return 0;
 });
 blocks.forEach((x,i)=>x.id='c'+i);
 if(!blocks.length)throw Error('The capture contains no meaningful public content.');
 if(blocks.length>200||blocks.reduce((n,x)=>n+x.text.length,0)>22000)
  throw Object.assign(Error('This page has too much content for a reliable single-page redesign. Try a more focused page.'),{code:'CONTENT_BUDGET'});
 for(const n of nodes.filter(x=>x.attrs?.href?.startsWith('mailto:'))){
  const address=n.attrs.href.slice(7).split('?')[0],backwards=[...address].reverse().join('');
  for(const block of blocks){
   if(block.text===backwards)block.text=address;
   for(const link of block.inlineLinks||[])if(link.href===n.attrs.href&&link.text===backwards)link.text=address;
  }
 }
 const links=[];
 for(const n of nodes.filter(n=>n.tag==='a')){
  const href=safeLink(n.attrs?.href),text=textOf(n)||n.attrs?.ariaLabel||n.attrs?.alt||n.attrs?.title||nodes.find(x=>x.parentIndex===n.index&&x.asset)?.asset?.alt;
  if(href&&text&&!links.some(x=>x.href===href&&x.text===text)){
   const colored=n.style?.backgroundColor&&!['transparent','rgba(0, 0, 0, 0)'].includes(n.style.backgroundColor);
   const role=colored&&n.box?.height>=36?'prominent-action':ancestor(n,new Set(['nav','header']))?'navigation':'content-link';
   links.push({id:'l'+links.length,text,href,role,...(role==='prominent-action'?{appearance:{background:n.style.backgroundColor,color:n.style.color,width:n.box.width,height:n.box.height}}:{})});
  }
 }
 for(const link of desktop.semantic?.links||[]){
  const href=safeLink(link.href),text=clean(link.text);
  if(href&&!links.some(x=>x.href===href))links.push({id:'l'+links.length,text:text||new URL(href).pathname.split('/').filter(Boolean).at(-1)||'Original page',href});
 }
 for(const block of blocks)block.inlineLinks=(block.inlineLinks||[]).filter(x=>safeLink(x.href)).map(x=>({...x,href:safeLink(x.href)}));
 const assets=[];
 for(const n of nodes){
  const a=n.asset;if(!a||a.kind!=='image'||!a.naturalWidth||!safeLink(a.src))continue;
  if(assets.some(x=>x.src===a.src))continue;
  assets.push({id:'a'+assets.length,src:a.src,alt:a.alt||'',width:a.naturalWidth,height:a.naturalHeight,
   // Preserve the actual rendered coordinates, not only intrinsic image size.
   // A product logo and a hero image can both have large source dimensions.
   observedBox:n.box?{x:n.box.x,y:n.box.y,width:n.box.width,height:n.box.height}:null,
   originPath:n.domPath,
   important:n.box?.width>=100&&n.box?.height>=60||n.box?.width>=180&&n.box?.height>=24});
 }
 const headings=nodes.filter(n=>/^h[1-4]$/.test(n.tag)).map(n=>({id:'h'+n.index,text:textOf(n),tag:n.tag,
  font:n.style?.fontFamily,size:n.style?.fontSize,weight:n.style?.fontWeight,box:n.box}));
 const weaknesses=[];
 const fullWidthSurfaces=nodes.filter(n=>n.box?.width>=(desktop.page?.viewport?.width||1440)*.7&&n.box?.height>100&&
  /^rgb\(/.test(n.style?.backgroundColor||'')).sort((a,b)=>b.box.width*b.box.height-a.box.width*a.box.height);
 const rootSurface=desktop.page?.rootSurface?.bodyColor;
 const dominantSurface=fullWidthSurfaces[0]?.style.backgroundColor||(/^rgb\(/.test(rootSurface||'')?rootSurface:'rgb(255, 255, 255)');
 if((desktop.page?.document?.width||0)>(desktop.page?.viewport?.width||1440)+2)
  weaknesses.push({id:'w0',fact:'Measured desktop horizontal overflow',evidenceIds:['page']});
 if((mobile.page?.document?.width||0)>(mobile.page?.viewport?.width||390)+2)
  weaknesses.push({id:'w1',fact:'Measured mobile horizontal overflow',evidenceIds:['responsive']});
 for(const h of headings.filter(h=>h.tag==='h1')){
  if(h.box?.y>220)weaknesses.push({id:'w'+weaknesses.length,fact:'Primary heading begins '+Math.round(h.box.y)+'px below the page top',evidenceIds:[h.id]});
 }
 return {schemaVersion:1,sourceUrl:desktop.page.url,title:desktop.page.title,lang:desktop.page.lang||'en',
  preservedContent:blocks,links:links.slice(0,100),assets:assets.slice(0,50),
  brand:{dominantSurface,fontFamilies:dna.tokens?.fontFamilies?.slice(0,5),colors:dna.tokens?.colors?.slice(0,8),
   backgrounds:dna.tokens?.backgroundColors?.filter(x=>!['transparent','rgba(0, 0, 0, 0)'].includes(x.value)).slice(0,5),
   signature:dna.signatureSignals?.counts,fontFaces:dna.css?.fontFaces?.slice(0,4)||[]},
  layout:{headings:headings.slice(0,50),sections:dna.relationships?.sections?.slice(0,25)||[]},
  responsive:{id:'responsive',...responsive},weaknesses,
  unknownFunctionality:(desktop.interactive||[]).filter(x=>x.tag!=='a').slice(0,25).map((x,i)=>({id:'u'+i,label:x.text,
   constraint:'Backend behavior is unverified. Link to the original service instead of inventing a working feature.'})),
  boundaries:['Only the submitted public page is redesigned. External routes retain their observed destinations.',
   'Authentication, purchases, searches and server data cannot be reproduced from public browser evidence.']};
}
export async function loadRedesignEvidence(captureDir){
 const manifest=await read(path.join(captureDir,'manifest.json'));
 const entry=manifest.pages?.find(x=>x.status!=='failed');
 if(!entry)throw Error('No usable captured page.');
 const dir=path.join(captureDir,entry.dir);
 const [desktop,mobile,dna,responsive]=await Promise.all(['dom-styles-geometry.json','mobile-dom-styles-geometry.json',
  'design-dna-desktop.json','responsive-dna.json'].map(x=>read(path.join(dir,x))));
 return {evidence:compactRedesignEvidence(desktop,mobile,dna,responsive),manifest,entry,
  screenshots:{desktop:path.join(dir,'visual/desktop-full-archive.png'),mobile:path.join(dir,'visual/mobile-full-archive.png')}};
}
export function modelEvidence(e,{maxBytes=10000,includeMeasurements=true}={}){
 const compact={source:e.sourceUrl,title:e.title,content:e.preservedContent.map(({id,tag,text,region,href})=>({id,tag,text,region,href})),
  links:e.links,assets:e.assets,brand:{...e.brand,fontFaces:undefined},
  layout:{headings:e.layout.headings.map(h=>({id:h.id,text:h.text,size:h.size,font:h.font})),
   regions:e.layout.sections.map(s=>({tag:s.tag,id:s.id,display:s.display,padding:s.padding,gap:s.gap}))},
  responsive:e.responsive,weaknesses:e.weaknesses,unknowns:e.unknownFunctionality};
 let json=JSON.stringify(compact);
 if(!includeMeasurements||Buffer.byteLength(json)>maxBytes){
  // Reduce redundant measurements first; never truncate required copy or URLs.
  delete compact.layout;delete compact.responsive;compact.brand={dominantSurface:e.brand.dominantSurface,fonts:e.brand.fontFamilies?.slice(0,2),colors:e.brand.colors?.slice(0,5),backgrounds:e.brand.backgrounds};
  compact.assets=compact.assets.filter(a=>a.important).slice(0,12);
  compact.content=compact.content.map(({id,tag,text,href})=>({id,tag,text,...(href?{href}:{})}));
  json=JSON.stringify(compact);
 }
 if(Buffer.byteLength(json)>maxBytes)throw Object.assign(Error('Required content exceeds the configured model context budget. Try a shorter page or a model with a larger budget.'),{code:'CONTENT_BUDGET'});
 return json;
}
