// The model authors the composition; the compiler supplies immutable observed
// copy, destinations and assets. Models must never retype or summarize source
// paragraphs in order for a customer's content to survive generation reliably.
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=x=>String(x||'').replace(/\s+/g,' ').trim().toLowerCase();
export function sourceContentSections(e){
 const sections=[];let current=null;
 for(const block of e.preservedContent){
  if(/^h[1-6]$/.test(block.tag)){current={headingId:block.id,tag:block.tag,contentIds:[],linkIds:[]};sections.push(current)}
  if(!current)continue;
  if(block.tag!=='a'&&!(block.text.length>35&&e.preservedContent.some(x=>x!==block&&/^h\d$/.test(x.tag)&&x.text.includes(block.text))))current.contentIds.push(block.id);
  const observed=[...(block.href?[{href:block.href,text:block.text}]:[]),...(block.inlineLinks||[])];
  for(const item of observed){const link=e.links.find(x=>x.href===item.href&&x.text===item.text);if(link&&!current.linkIds.includes(link.id))current.linkIds.push(link.id)}
 }
 for(const section of sections){
  const prose=e.preservedContent.filter(x=>section.contentIds.includes(x.id)&&x.id!==section.headingId);
  section.kind=section.tag==='h1'?'opening':section.linkIds.length&&prose.every(x=>x.inlineLinks?.length||/^©/.test(x.text))?'links-and-meta':'reading';
 }
 return sections;
}
export function layoutContentPlan(e,{forStyles=false,maxBytes=Infinity}={}){
 const base={title:e.title,brand:{dominantSurface:e.brand.dominantSurface,fonts:e.brand.fontFamilies?.slice(0,2).map(x=>x.value),
  colors:e.brand.colors?.slice(0,6).map(x=>x.value),backgrounds:e.brand.backgrounds?.slice(0,5).map(x=>x.value)},
  primaryHeadings:e.preservedContent.filter(x=>x.tag==='h1').map(x=>x.id),
  sourceSections:sourceContentSections(e),
  content:e.preservedContent.filter(x=>x.tag!=='a').map(x=>({id:x.id,tag:x.tag,text:forStyles&&!/^h\d$/.test(x.tag)?undefined:x.text.slice(0,/^h\d$/.test(x.tag)?200:150),characters:x.text.length,region:x.region,
   ...(x.text.length>35&&e.preservedContent.some(y=>y!==x&&/^h\d$/.test(y.tag)&&y.text.includes(x.text))?{alreadyCoveredBy:e.preservedContent.find(y=>y!==x&&/^h\d$/.test(y.tag)&&y.text.includes(x.text)).id}:{})})),
  links:e.links.map(x=>({id:x.id,label:x.text,role:x.role})),assets:e.assets.filter(x=>x.important).map(x=>({id:x.id,alt:x.alt,width:x.width,height:x.height})),
  unknowns:e.unknownFunctionality};
 const full=JSON.stringify(base);
 if(!Number.isFinite(maxBytes)||Buffer.byteLength(full)<=maxBytes)return full;
 // A layout model needs source IDs, section membership and meaningful headings,
 // NOT full customer copy. The compiler injects every original byte after the
 // model returns its empty content slots; no required content is truncated here.
 // Successive plans sacrifice descriptive hints before ever omitting source IDs.
 for(const cue of [100,72,48,24,0]){
  const compact={title:String(e.title||'').slice(0,100),
   brand:{surface:e.brand.dominantSurface,fonts:e.brand.fontFamilies?.slice(0,2).map(x=>x.value),
    colors:e.brand.colors?.slice(0,4).map(x=>x.value)},
   primaryHeadings:base.primaryHeadings,sourceSections:base.sourceSections.map(s=>({
    headingId:s.headingId,kind:s.kind,contentIds:s.contentIds,linkIds:s.linkIds})),
   content:base.content.map(x=>({id:x.id,tag:x.tag,characters:x.characters,
    ...(x.alreadyCoveredBy?{alreadyCoveredBy:x.alreadyCoveredBy}:{}),
    ...(/^h\d$/.test(x.tag)?{text:e.preservedContent.find(b=>b.id===x.id)?.text.slice(0,150)}:
      cue?{text:e.preservedContent.find(b=>b.id===x.id)?.text.slice(0,cue)}:{})})),
   links:e.links.map(x=>({id:x.id,role:x.role,
    ...(cue?{label:x.text.slice(0,Math.min(50,cue))}:{})})),
   assets:base.assets.map(x=>({id:x.id,alt:x.alt?.slice(0,35)})),
   unknowns:(e.unknownFunctionality||[]).slice(0,cue?8:0).map(x=>({id:x.id,label:x.label?.slice(0,40)}))};
  const result=JSON.stringify(compact);
  if(Buffer.byteLength(result)<=maxBytes)return result;
 }
 // Dense pages can still exceed a small model context even after dropping
 // all prose previews. Pack section memberships in documented tuple form, but
 // retain every content/link/asset ID so the immutable compiler remains lossless.
 const minimal={format:'sourceSections=[headingId,kind,contentIds,linkIds]; content=[{id,tag,text?}]; full source copy is injected after HTML composition',
  title:String(e.title||'').slice(0,85),
  brand:{surface:e.brand.dominantSurface,fonts:e.brand.fontFamilies?.slice(0,1).map(x=>x.value),
   colors:e.brand.colors?.slice(0,3).map(x=>x.value)},
  primaryHeadings:base.primaryHeadings,
  sourceSections:base.sourceSections.map(s=>[s.headingId,s.kind,s.contentIds,s.linkIds]),
  content:base.content.map(x=>({id:x.id,tag:x.tag,
   ...(/^h\d$/.test(x.tag)?{text:e.preservedContent.find(b=>b.id===x.id)?.text.slice(0,110)}:{})})),
  links:e.links.map(x=>({id:x.id,role:x.role})),
  assets:base.assets.map(x=>({id:x.id})),unknowns:[]};
 const packed=JSON.stringify(minimal);
 if(Buffer.byteLength(packed)<=maxBytes)return packed;
 // Compact contiguous immutable source IDs as reversible ranges. This loses
 // no identifiers: the compiler expands the actual captured copy from its own
 // trusted evidence; the model sees only section-to-slot relationships.
 const compactIds=ids=>{
  const parts=[],values=[...ids].filter(x=>/^[cla]\d+$/.test(x));
  for(let i=0;i<values.length;){
   const start=values[i],prefix=start[0];let j=i;
   while(j+1<values.length&&values[j+1][0]===prefix&&
     Number(values[j+1].slice(1))===Number(values[j].slice(1))+1)j++;
   parts.push(i===j?start:start+'-'+values[j]);
   i=j+1;
  }
  return parts.join(',');
 };
 const ranged={format:'ranged-observed-source-v1',instruction:'Ranges denote ALL immutable source IDs in inclusive order. Never fabricate IDs. Copy is rehydrated from capture, not model output.',
  title:String(e.title||'').slice(0,55),
  primary:compactIds(base.primaryHeadings),
  sections:base.sourceSections.map(s=>[s.headingId,compactIds(s.contentIds),compactIds(s.linkIds)]),
  ungrouped:compactIds(base.content.map(x=>x.id).filter(id=>!base.sourceSections.some(s=>s.contentIds.includes(id)))),
  links:compactIds(e.links.map(x=>x.id)),assets:compactIds(e.assets.filter(x=>x.important).map(x=>x.id))};
 const dense=JSON.stringify(ranged);
 if(Buffer.byteLength(dense)<=maxBytes)return dense;
 // Extremely dense pages may still outrun the model context. Signal this
 // explicitly rather than silently truncate any source ID.
 throw Object.assign(Error('The source composition IDs exceed the available model planning budget. Use a larger context model.'),{code:'CONTENT_BUDGET'});
}


/**
 * Bounded-provider fallback: compose ALL observed content IDs into meaningful
 * heading-led sections without asking a small LLM to enumerate every slot.
 * Source copy and link destinations are still compiled from immutable evidence.
 * This is a deterministic structural fallback, not a model-approved design.
 */
export function buildCompleteObservedLayout(e,design={}){
 const blocks=e.preservedContent||[],lead=design?.composition?.leadContentId||
  blocks.find(x=>x.tag==='h1')?.id;
 if(!blocks.some(x=>x.id===lead&&x.tag==='h1'))
  throw Object.assign(Error('A verified source H1 is required for complete layout.'),{code:'TEMPLATE_COVERAGE'});
 const groups=[],prelude=[];let current=null;
 for(const block of blocks){
  if(/^h[1-6]$/.test(block.tag)){
   current={heading:block,content:[]};groups.push(current);
  }else if(current)current.content.push(block);
  else prelude.push(block);
 }
 const seen=new Set();
 const slot=block=>{
  if(!block||seen.has(block.id))return '';
  // Text already inside an original heading need not be duplicated as a
  // second paragraph, but the source remains accounted for by coverage.
  if(!/^h[1-6]$/.test(block.tag)&&block.text.length>35&&
     blocks.some(other=>other!==block&&/^h[1-6]$/.test(other.tag)&&other.text.includes(block.text)))
   return '';
  seen.add(block.id);
  const tag=/^h[1-6]$/.test(block.tag)?block.tag:
   block.tag==='a'&&block.href?'a':
   ['p','span','blockquote','small','strong','em'].includes(block.tag)?block.tag:'p';
  return '<'+tag+' class="source-copy source-'+tag+'" data-content="'+block.id+'"></'+tag+'>';
 };
 const links=e.links||[],primary=links.find(x=>x.id===design?.composition?.primaryLinkId);
 const linkSlot=x=>'<a class="observed-action" data-link="'+x.id+'"></a>';
 const observedHeaderLinks=prelude.filter(x=>x.tag==='a'&&x.href);
 const navigation=links.filter(x=>x.role==='navigation'&&!observedHeaderLinks.some(b=>b.href===x.href&&b.text===x.text)).slice(0,4);
 const headingGroup=groups.find(x=>x.heading.id===lead);
 const proofIds=new Set(design?.composition?.proofContentIds||[]);
 const proofGroups=groups.filter(g=>g.heading.id!==lead&&
  (proofIds.has(g.heading.id)||g.content.some(x=>proofIds.has(x.id))));
 const proofGroupIds=new Set(proofGroups.map(x=>x.heading.id));
 const brand=String(e.title||'Original').split(/\s+[—–|]\s+/)[0].slice(0,40);
 const brandLink=observedHeaderLinks[0]?slot(observedHeaderLinks[0]):'<a href="'+e.sourceUrl+'">'+escape(brand)+'</a>';
 const navLinks=observedHeaderLinks.slice(1,5).map(slot).join('')+navigation.map(linkSlot).join('');
 const introPrelude=prelude.filter(x=>!observedHeaderLinks.includes(x));
 const header='<header class="site-header"><div class="brand-name">'+brandLink+'</div><nav class="primary-nav">'+navLinks+'</nav></header>';
 const leadCopy=headingGroup.content.filter(x=>!proofIds.has(x.id));
 const relationshipFamily=design?.measuredRelationship?.family||null;
 const allowedFamily=new Set(['task-first-information','product-artifact','expressive-artwork']);
 const relationshipClass=relationshipFamily&&allowedFamily.has(relationshipFamily)?' relation-'+relationshipFamily:'';
 const opening='<section class="opening-section'+relationshipClass+'" data-composition="opening">'+
  '<div class="hero-content">'+(introPrelude.length?'<div class="hero-eyebrow">'+introPrelude.map(slot).join('')+'</div>':'')+slot(headingGroup.heading)+
  '<div class="hero-description">'+leadCopy.slice(0,2).map(slot).join('')+'</div>'+
  (primary?'<div class="hero-actions">'+linkSlot(primary)+'</div>':'')+'</div>'+
  (proofGroups.length||proofIds.size?
   '<aside class="hero-proof">'+
   proofGroups.map(g=>'<div class="proof-group">'+slot(g.heading)+g.content.slice(0,2).map(slot).join('')+'</div>').join('')+
   blocks.filter(x=>proofIds.has(x.id)&&!seen.has(x.id)).map(slot).join('')+'</aside>':'')+
  (e.assets?.some(x=>x.important)?'<figure class="source-media" data-assetset="all"></figure>':'')+
  '</section>'+
  (leadCopy.length>2?'<section class="opening-continuation">'+leadCopy.slice(2).map(slot).join('')+'</section>':'');
 const body=groups.filter(g=>g.heading.id!==lead).map((g,i)=>{
  const heading=slot(g.heading);
  const rest=g.content.map(slot).join('');
  if(!heading&&!rest)return '';
  return '<section class="content-section section-'+(i%3)+'">'+
   '<div class="section-container">'+heading+
   '<div class="section-body">'+rest+'</div></div></section>';
 }).join('');
 const rest=blocks.filter(x=>!seen.has(x.id)&&!/^h[1-6]$/.test(x.tag));
 // Only the original source IDs are allowed here. Late ungrouped content is
 // kept in a labelled reading region, not lost to model truncation.
 const tail=rest.length?'<section class="source-remaining"><div class="section-container">'+
  rest.map(slot).join('')+'</div></section>':'';
 return header+'<main>'+opening+body+tail+'</main>'+
  '<footer class="site-footer"><nav class="source-remainder" data-linkset="unplaced"></nav></footer>';
}

function inlineCopy(block,e){
 const candidates=(block.inlineLinks||[]).map(x=>({text:x.text,href:x.href})).filter(x=>x.text&&x.href);
 if(!candidates.length)return escape(block.text);
 let cursor=0,out='';
 for(const link of candidates){
  const at=block.text.indexOf(link.text,cursor);if(at<cursor)continue;
  out+=escape(block.text.slice(cursor,at))+'<a href="'+escape(link.href)+'">'+escape(link.text)+'</a>';
  cursor=at+link.text.length;
 }
 return out+escape(block.text.slice(cursor));
}
export function normalizeContentTemplate(template,evidence=null){
 if(typeof template!=='string')throw Error('The model omitted its HTML composition.');
 let html=template.replace(/\sstyle\s*=\s*(["'])[\s\S]*?\1/gi,'')
  .replace(/<a\b([^>]*\bdata-link\s*=\s*["']l\d+["'][^>]*)>/gi,(match,attrs)=>'<a'+attrs.replace(/\sdata-content\s*=\s*["']c\d+["']/gi,'')+'>');
 // A model can put a real content ID on a layout wrapper (<div>, <section>,
 // etc.). Canonicalize the wrapper against the OBSERVED element type. Never
 // rewrite source copy or create a source slot for an unknown ID.
 if(evidence?.preservedContent){
  const content=new Map(evidence.preservedContent.map(x=>[x.id,x]));
  html=html.replace(/<([a-z][a-z0-9-]*)\b([^>]*\bdata-content\s*=\s*(["'])(c\d+)\3[^>]*)>([\s\S]*?)<\/\1>/gi,
   (whole,tag,attrs,quote,id,inner)=>{
    const block=content.get(id);
    if(!block){
     if(!inner.trim())return ''; // Empty invented slot: omit; coverage check still enforces real content.
     throw Object.assign(Error('The model referenced an unknown nonempty source slot.'),{code:'INVALID_MODEL_OUTPUT'});
    }
    const observedHeading=/^h[1-6]$/.test(block.tag);
    const canonical=observedHeading?block.tag:
     (tag.toLowerCase()==='a'&&block.href?'a':
      ['p','span','li','figcaption','dt','dd','blockquote','small','strong','em'].includes(tag.toLowerCase())?tag.toLowerCase():'p');
    return '<'+canonical+attrs+'>'+inner+'</'+canonical+'>';
   });
 }
 // A model may render the same immutable slot in both a hero proof and a
 // later source section. That is not preservation; it is visible duplication.
 // Keep the first placement (normally the opening) and remove repeated slots.
 // Also dedupe genuinely identical long source records; one visible instance
 // preserves their content while avoiding a copy repeated across sections.
 if(evidence?.preservedContent){
  const contents=new Map(evidence.preservedContent.map(x=>[x.id,x]));
  const seenIds=new Set(),seenLongText=new Set();
  html=html.replace(/<([a-z][a-z0-9-]*)\b([^>]*\bdata-content\s*=\s*(["'])(c\d+)\3[^>]*)>([\s\S]*?)<\/\1>/gi,
   (whole,tag,attrs,quote,id)=>{
    const block=contents.get(id);
    if(!block)return whole;
    const key=block.text.length>120?normalize(block.text):null;
    if(seenIds.has(id)||(key&&seenLongText.has(key)))return '';
    seenIds.add(id);if(key)seenLongText.add(key);
    return whole;
   });
 }
 const headings=[...html.matchAll(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi)];
 if(headings.length>1){
  const main=html.search(/<main\b/i),end=html.search(/<\/main>/i),chosen=headings.find(x=>main>=0&&x.index>main&&(end<0||x.index<end))||headings[0];
  html=html.replace(/<h1\b([^>]*)>([\s\S]*?)<\/h1>/gi,(match,attrs,text,offset)=>offset===chosen.index?match:'<h2'+attrs+'>'+text+'</h2>');
 }
 const primary=html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i),main=html.match(/<main\b[^>]*>/i),end=html.search(/<\/main>/i);
 if(primary&&main&&(primary.index<main.index||(end>=0&&primary.index>end))){
  const heading=primary[0];html=html.replace(heading,'');
  html=html.replace(/<main\b[^>]*>/i,match=>match+'\n'+heading);
 }
 return html;
}

/**
 * Place the actual observed primary link beside the lead headline. The model
 * frequently leaves it in the footer's unplaced-link collection, producing
 * a technically complete but unusable hero. Never invent the link.
 */
export function ensureOpeningPrimaryAction(template,evidence,composition){
 const id=composition?.primaryLinkId;
 if(!/^l\d+$/.test(id||'')||!(evidence.links||[]).some(x=>x.id===id))return template;
 const opening=String(template).match(/<([a-z][a-z0-9-]*)\b(?=[^>]*\bdata-composition\s*=\s*["']opening["'])[^>]*>/i);
 if(!opening)return template;
 const reg=new RegExp('<a\\b(?=[^>]*\\bdata-link\\s*=\\s*["\\x27]'+id+'["\\x27])[^>]*>[\\s\\S]*?<\\/a>','gi');
 let html=String(template).replace(reg,'');
 const match=html.match(/<([a-z][a-z0-9-]*)\b(?=[^>]*\bdata-composition\s*=\s*["']opening["'])[^>]*>/i);
 if(!match)return template;
 const start=match.index+match[0].length,leadEnd=html.indexOf('</h1>',start);
 const containerEnd=html.indexOf('</'+match[1]+'>',start);
 const insertion=leadEnd!==-1&&(containerEnd===-1||leadEnd<containerEnd)?leadEnd+5:start;
 return html.slice(0,insertion)+'<div class="hero-actions source-primary-action"><a class="observed-action" data-link="'+id+'"></a></div>'+html.slice(insertion);
}

export function focalObservedAsset(e){
 const items=(e.assets||[]).filter(x=>x.important);
 const eligible=items.filter(x=>(x.observedBox?.width||0)>=280&&(x.observedBox?.height||0)>=140);
 if(!eligible.length)return items.length===1?items[0]:null;
 const score=a=>{
  const b=a.observedBox,area=Math.min(b.width*b.height,1100*850);
  const distance=Math.max(0,b.y-900);
  return area/(1+distance/1400);
 };
 return [...eligible].sort((a,b)=>score(b)-score(a))[0]||null;
}

export function compileContentTemplate(template,e){
 if(typeof template!=='string')throw Error('The model omitted its HTML composition.');
 const content=new Map(e.preservedContent.map(x=>[x.id,x])),links=new Map(e.links.map(x=>[x.id,x])),assets=new Map(e.assets.map(x=>[x.id,x]));
 let html=normalizeContentTemplate(template,e);
 const focal=focalObservedAsset(e);
 html=html.replace(/<(figure|div|section)\b([^>]*\bdata-assetset\s*=\s*["'](all|hero|remaining)["'][^>]*)>[\s\S]*?<\/\1>/gi,(match,tag,attrs,kind)=>{
  const items=(e.assets||[]).filter(x=>x.important).filter(x=>
   kind==='all'||(kind==='hero'&&x.id===focal?.id)||(kind==='remaining'&&x.id!==focal?.id));
  return '<'+tag+attrs+'>'+items.map(x=>'<img class="observed-asset" data-asset-id="'+x.id+
   '" src="'+escape(x.src)+'" alt="'+escape(x.alt)+'">').join('')+'</'+tag+'>';
 });
 html=html.replace(/<(h1|h2|span)\b([^>]*\bdata-title\s*=\s*["']page["'][^>]*)>[\s\S]*?<\/\1>/gi,(match,tag,attrs)=>'<'+tag+attrs+'>'+escape(e.title)+'</'+tag+'>');
 html=html.replace(/\b(href|src)\s*=\s*(["'])(link|asset):([la]\d+)\2/gi,(match,attr,quote,kind,id)=>{
  const item=(kind==='link'?links:assets).get(id);if(!item)throw Error('The layout referenced an unknown source item.');
  return attr+'='+quote+escape(kind==='link'?item.href:item.src)+quote;
 });
 html=html.replace(/<([a-z][a-z0-9]*)\b([^>]*\bdata-link\s*=\s*["'](l\d+)["'][^>]*)>([\s\S]*?)<\/\1>/gi,(match,tag,attrs,id)=>{
  const link=links.get(id);if(!link||tag.toLowerCase()!=='a')throw Error('Invalid observed-link slot.');
  attrs=attrs.replace(/\bhref\s*=\s*(["'])[^"']*\1/gi,'');
  return '<a'+attrs+' href="'+escape(link.href)+'">'+escape(link.text)+'</a>';
 });
 html=html.replace(/<([a-z][a-z0-9]*)\b([^>]*\bdata-content\s*=\s*["'](c\d+)["'][^>]*)>([\s\S]*?)<\/\1>/gi,(match,tag,attrs,id)=>{
  const block=content.get(id);if(!block||!['h1','h2','h3','h4','h5','h6','p','span','a','li','figcaption','dt','dd','blockquote','small','strong','em'].includes(tag.toLowerCase()))throw Error('Invalid observed-content slot.');
  if(tag.toLowerCase()==='a'&&block.href){attrs=attrs.replace(/\bhref\s*=\s*(["'])[^"']*\1/gi,'');attrs+=' href="'+escape(block.href)+'"'}
  return '<'+tag+attrs+'>'+inlineCopy(block,e)+'</'+tag+'>';
 });
 // Populate fallback navigation after authored links and inline prose links.
 // Preserve each real label/destination without repeating a full directory in
 // the header, resources, socials and footer. Legacy all collections still work.
 const decode=x=>String(x).replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&#39;',"'");
 const linkKey=(href,label)=>decode(href)+'\n'+normalize(decode(label));
 const placed=new Set([...html.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)].map(x=>linkKey(x[2],x[3].replace(/<[^>]*>/g,''))));
 html=html.replace(/<(nav|ul|div)\b([^>]*\bdata-linkset\s*=\s*["'](all|unplaced)["'][^>]*)>([\s\S]*?)<\/\1>/gi,(match,tag,attrs,kind,authored)=>{
  const items=e.links.filter(link=>kind==='all'||!placed.has(linkKey(link.href,link.text))).map(link=>{
   placed.add(linkKey(link.href,link.text));
   return '<a class="observed-link" data-link="'+link.id+'" href="'+escape(link.href)+'">'+escape(link.text)+'</a>';
  });
  if(kind==='unplaced'&&!items.length&&!authored.trim())return '';
  return '<'+tag+attrs+'>'+(kind==='unplaced'?authored:'')+(tag==='ul'?items.map(x=>'<li>'+x+'</li>').join(''):items.join(''))+'</'+tag+'>';
 });
 // Coverage is checked on materialized source before spending another model call.
 // Browser QA subsequently verifies actual visible content and reachable links.
 const text=normalize(html.replace(/<\/(?:p|h[1-6]|li|section|header|footer|article|div|nav|dt|dd)>/gi,' ').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'"));
 const missingContent=e.preservedContent.filter(x=>!text.includes(normalize(x.text))).map(x=>x.id);
 const destinations=new Set([...html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)].map(x=>x[1].replaceAll('&amp;','&')));
 const missingLinks=e.links.filter(x=>!destinations.has(x.href)).map(x=>x.id);
 const usedAssets=new Set([...html.matchAll(/\bsrc\s*=\s*["']([^"']+)["']/gi)].map(x=>x[1].replaceAll('&amp;','&')));
 const missingAssets=e.assets.filter(x=>x.important&&!usedAssets.has(x.src)).map(x=>x.id);
 if(missingContent.length||missingLinks.length||missingAssets.length)throw Object.assign(Error('The generated layout omitted required source items.'),{
  code:'TEMPLATE_COVERAGE',missingContent,missingLinks,missingAssets});
 return html;
}


// Materialized HTML can contain links that generated CSS hides in a collapsed
// or invisible navigation region. Restore ONLY observed links missing at every
// tested viewport. Browser QA must still prove that the result is reachable.
export function restoreVisibleSourceLinks(site,evidence,qa){
 const views=Object.values(qa.viewports||{});
 if(!views.length)return {...site,restoredLinkIds:[]};
 const missing=evidence.links.filter(link=>/^l\d+$/.test(link.id)&&
  views.every(view=>(view.missingLinks||[]).some(item=>item.id===link.id)));
 if(!missing.length)return {...site,restoredLinkIds:[]};
 const missingIds=new Set(missing.map(link=>link.id));
 const htmlWithoutHiddenLinks=site.html.replace(/<a\b(?=[^>]*\bdata-link\s*=\s*["'](l\d+)["'])[^>]*>[\s\S]*?<\/a>/gi,
  (anchor,id)=>missingIds.has(id)?'':anchor);
 let html=htmlWithoutHiddenLinks;
 const credits=missing.map(link=>'<a class="source-attribution-link" data-link="'+link.id+
  '" href="'+escape(link.href)+'">'+escape(link.text)+'</a>').join('');
 html+='\n<section class="source-attributions" aria-label="Original site attribution">'+credits+'</section>';
 const css=site.css+'\n/* Render observed credits outside model-collapsed navigation. */\n'+
  '.source-attributions{display:flex;flex-wrap:wrap;align-items:center;gap:12px;max-width:1200px;'+
  'margin:0 auto;padding:18px 20px;color:inherit;background:transparent;line-height:1.5}'+
  '.source-attributions .source-attribution-link{display:inline-flex;align-items:center;min-height:28px;'+
  'font-size:14px;color:inherit;text-decoration:underline;text-underline-offset:3px}';
 return {html,css,restoredLinkIds:missing.map(x=>x.id)};
}


/**
 * A generated stylesheet can hide a source slot even though the HTML compiler
 * accounted for it. Restore a small, measured set from immutable capture data,
 * per viewport. Never replace the user's copy with an LLM paraphrase and never
 * duplicate text on widths where the original slot is already reachable.
 *
 * This is deliberately bounded; a severely incomplete composition still
 * fails QA and requires a real structural correction.
 */
export function restoreMissingRenderedSource(site,evidence,qa,{maxItems=6}={}){
 const views=Object.entries(qa.viewports||{});
 const empty={...site,restoredContentIds:[],restoredLinkIds:[]};
 if(!views.length)return empty;
 const missingContent=(evidence.preservedContent||[]).filter(block=>
  block.tag!=='h1'&&/^c\d+$/.test(block.id)&&
  views.some(([,view])=>(view.missingContent||[]).some(item=>item.id===block.id)));
 const missingLinks=(evidence.links||[]).filter(link=>/^l\d+$/.test(link.id)&&
  views.some(([,view])=>(view.missingLinks||[]).some(item=>item.id===link.id)));
 if(!missingContent.length&&!missingLinks.length)return empty;
 if(missingContent.length+missingLinks.length>maxItems)return {...empty,tooManyToRestore:true};

 const viewportMedia={
  mobile:'(max-width: 579px)',
  tablet:'(min-width: 580px) and (max-width: 1104px)',
  desktop:'(min-width: 1105px)'
 };
 const scopedClass=id=>'source-restore-'+id;
 const cssRules=[];
 const entries=[];
 const makeVisibility=(id,field)=>{
  const present=views.filter(([,view])=>(view[field]||[]).some(item=>item.id===id)).map(([name])=>name);
  const cls=scopedClass(id);
  cssRules.push('.'+cls+'{display:none!important}');
  for(const name of present)if(viewportMedia[name])
   cssRules.push('@media '+viewportMedia[name]+'{.'+cls+'{display:block!important}}');
  return cls;
 };
 for(const block of missingContent){
  const tag=/^h[2-6]$/.test(block.tag)?block.tag:'p';
  const cls=makeVisibility(block.id,'missingContent');
  entries.push('<'+tag+' class="'+cls+'" data-content="'+block.id+'">'+inlineCopy(block,evidence)+'</'+tag+'>');
 }
 for(const link of missingLinks){
  const cls=makeVisibility(link.id,'missingLinks');
  entries.push('<a class="'+cls+'" data-link="'+link.id+'" href="'+escape(link.href)+'">'+escape(link.text)+'</a>');
 }
 const html=site.html+'\n<section class="source-integrity-repair" aria-label="Preserved source information">'+entries.join('')+'</section>';
 const css=site.css+'\n/* Bounded original-content recovery, never generated copy. */\n'+
  '.source-integrity-repair{box-sizing:border-box;max-width:1120px;margin-inline:auto;'+
  'padding:20px max(20px,4vw);display:flex;flex-direction:column;gap:10px;'+
  'color:inherit;background:transparent;line-height:1.6}'+
  '.source-integrity-repair p{max-width:68ch;margin:0;font-size:16px}'+
  '.source-integrity-repair a{color:inherit;text-decoration:underline;text-underline-offset:3px;'+
  'font-size:14px;overflow-wrap:anywhere;align-self:flex-start}'+
  '.source-integrity-repair h2,.source-integrity-repair h3{margin:0;font-size:20px}'+
  cssRules.join('\n');
 return {html,css,restoredContentIds:missingContent.map(x=>x.id),restoredLinkIds:missingLinks.map(x=>x.id)};
}


/**
 * Repair small source-slot omissions before generating CSS. This works on the
 * uncompiled LLM template, never invents customer copy, and keeps the original
 * model composition intact. Larger gaps remain explicit generation failures.
 */
export function completeObservedSourceSlots(template,evidence,coverageError,{maxSlots=4}={}){
 if(coverageError?.code!=='TEMPLATE_COVERAGE')return null;
 const missingContent=(coverageError.missingContent||[]).filter(x=>/^c\d+$/.test(x));
 const missingLinks=(coverageError.missingLinks||[]).filter(x=>/^l\d+$/.test(x));
 const missingAssets=(coverageError.missingAssets||[]).filter(x=>/^a\d+$/.test(x));
 if(!missingContent.length&&!missingLinks.length&&!missingAssets.length)return null;
 if(missingContent.length+missingLinks.length+missingAssets.length>maxSlots)return null;
 const content=new Map(evidence.preservedContent.map(x=>[x.id,x]));
 const links=new Map(evidence.links.map(x=>[x.id,x]));
 const assets=new Map(evidence.assets.map(x=>[x.id,x]));
 const nodes=[];
 for(const id of missingContent){
  const block=content.get(id);if(!block)return null;
  const tag=/^h[1-6]$/.test(block.tag)?block.tag:'p';
  // A missing H1 is a composition failure, not something to bury in an appendix.
  if(tag==='h1')return null;
  nodes.push('<'+tag+' class="preserved-source-slot" data-content="'+id+'"></'+tag+'>');
 }
 for(const id of missingLinks){
  if(!links.has(id))return null;
  nodes.push('<a class="preserved-source-link" data-link="'+id+'"></a>');
 }
 for(const id of missingAssets){
  if(!assets.has(id))return null;
  nodes.push('<figure class="preserved-source-image"><img src="asset:'+id+'" alt="'+
   escape(assets.get(id).alt||'')+'"></figure>');
 }
 const insert='<section class="preserved-source-details" aria-label="Observed site information">'+nodes.join('')+'</section>';
 if(!/<\/main>/i.test(template))return null;
 return template.replace(/<\/main>/i,insert+'</main>');
}

/**
 * Large missing source blocks must not force the page into an endless
 * auto-generated section waterfall. Keep the model's selected hierarchy and
 * group supplementary original copy under one accessible native disclosure.
 * Do NOT bury the leading claim, proof selected for the hero, or source media.
 */
export function reconcileAuthoredSourceCoverage(template,evidence,error,{protectedIds=[],limit=180}={}){
 if(error?.code!=='TEMPLATE_COVERAGE'||typeof template!=='string'||!/<\/main>/i.test(template))return null;
 const contentIds=[...new Set((error.missingContent||[]).filter(x=>/^c\d+$/.test(x)))];
 const linkIds=[...new Set((error.missingLinks||[]).filter(x=>/^l\d+$/.test(x)))];
 const assetIds=[...new Set((error.missingAssets||[]).filter(x=>/^a\d+$/.test(x)))];
 if(!contentIds.length||assetIds.length||contentIds.length+linkIds.length>limit)return null;
 if(contentIds.some(id=>protectedIds.includes(id)))return null;
 const blocks=new Map((evidence.preservedContent||[]).map(x=>[x.id,x]));
 const links=new Map((evidence.links||[]).map(x=>[x.id,x]));
 const nodes=[];
 for(const id of contentIds){
  const block=blocks.get(id);
  if(!block||block.tag==='h1'||!block.text)return null;
  const tag=/^h[2-6]$/.test(block.tag)?block.tag:
   block.tag==='blockquote'?'blockquote':block.tag==='a'&&block.href?'a':'p';
  nodes.push('<'+tag+' class="source-appendix-content" data-content="'+id+'"></'+tag+'>');
 }
 for(const id of linkIds){
  if(!links.has(id))return null;
  nodes.push('<a class="source-appendix-link" data-link="'+id+'"></a>');
 }
 if(!nodes.length)return null;
 // The disclosure is interactive and fully accessible without JavaScript.
 // Original headings/paragraphs are injected later by the immutable compiler.
 const appendix='<details class="source-appendix"><summary>Additional information from this page</summary>'+
  '<div class="source-appendix-body">'+nodes.join('')+'</div></details>';
 return template.replace(/<\/main>/i,appendix+'</main>');
}
