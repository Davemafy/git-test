/**
 * Bridge Sloppertizer's EXISTING high-fidelity browser capture to a usable,
 * provenance-aware design composition record. Research only.
 *
 * No model, invented wireframes or asset/copy redistribution. The original
 * browser-rendered screenshots remain the faithful visual reference.
 */
import {createHash} from 'node:crypto';

const digest=value=>createHash('sha256').update(String(value??'')).digest('hex').slice(0,20);
const round=n=>Math.round(n*100)/100;
const number=n=>Number.isFinite(Number(n))?round(Number(n)):null;
const frame=(box,kind='box')=>{
 const raw=box||{};
 const x=number(raw.x),y=number(raw.y),
  width=number(raw.width??raw.w),height=number(raw.height??raw.h);
 if([x,y,width,height].some(v=>v===null)||width<0||height<0)return null;
 return {x,y,width,height};
};
const styles=[
 'display','position','zIndex','transform','transformOrigin','overflow','overflowX','overflowY',
 'clipPath','clip','opacity','width','height','minWidth','maxWidth','minHeight','maxHeight',
 'flexDirection','flexWrap','justifyContent','alignItems','gap','columnGap','rowGap',
 'gridTemplateColumns','gridTemplateRows','gridArea',
 'margin','padding','border','borderRadius','boxShadow','backgroundColor','backgroundImage',
 'backgroundSize','backgroundPosition','objectFit','objectPosition','mixBlendMode',
 'fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','textAlign',
 'textTransform','color'
];
const copyStyles=src=>Object.fromEntries(styles.filter(k=>src?.[k]!==undefined&&src[k]!==null).map(k=>{
 let value=String(src[k]);
 // Keep actual layout/paint parameters but do not export raw asset URLs.
 if(k==='backgroundImage')value=value.replace(/url\(\s*(?:"[^"]*"|'[^']*'|[^)]*)\s*\)/gi,'url([captured-asset])');
 return [k,value.slice(0,360)];
}));
function descriptionKind(node){
 const t=String(node.tag||'').toLowerCase(),role=node.role;
 if(/^h[1-6]$/.test(t)||role==='heading')return 'heading';
 if(['p','blockquote','li','dt','dd','figcaption','small'].includes(t))return 'text';
 if(['img','picture','video','svg','canvas'].includes(t)||role==='img')return 'media';
 if(['button','input','textarea','select'].includes(t)||role==='button')return 'control';
 if(t==='a')return 'link';
 if(['header','main','section','article','nav','aside','footer','figure','form'].includes(t))return 'region';
 return node.visual?.surface?'visual-surface':'group';
}
function rects(list,max=40){
 return (list||[]).slice(0,max).map(item=>frame(item.box||item)).filter(Boolean);
}
function nodeList(record,layout){
 if(!record?.page?.viewport||!Array.isArray(record?.dom))throw Error('Expected existing Sloppertizer DOM/styles/geometry capture');
 const lookup=new Map((layout?.nodes||[]).map(item=>[item.sourceIndex,item]));
 const seen=new Set();
 const nodes=[];
 for(const node of record.dom){
  if(!Number.isInteger(node.index)||seen.has(node.index))continue;
  seen.add(node.index);
  const box=frame(node.box);if(!box||box.width<=0||box.height<=0)continue;
  const paint=lookup.get(node.index),kind=descriptionKind(node);
  const lines=rects(node.textRuns?.flatMap(x=>x.box?[x.box]:x.lines||[])||[],80);
  const pseudo=Object.fromEntries(['before','after'].filter(key=>node.pseudo?.[key]).map(key=>[
   key,{box:frame(node.pseudo[key].box),style:copyStyles(node.pseudo[key].style),
    contentFingerprint:digest(node.pseudo[key].content||'')}
  ]));
  nodes.push({
   id:'node-'+node.index,sourceIndex:node.index,parentIndex:Number.isInteger(node.parentIndex)?node.parentIndex:null,
   domPath:String(node.domPath||''),tag:node.tag,kind,
   box,clipRect:frame(node.clipRect),fragments:rects(node.fragments),textLineRects:lines,
   computed:copyStyles(node.style),pseudo,paintOrder:Number.isFinite(paint?.paintOrder)?paint.paintOrder:null,
   paintBounds:Array.isArray(paint?.bounds)?paint.bounds.slice(0,4).map(number):null,
   childVisible:Number.isInteger(node.childVisible)?node.childVisible:0,
   features:{surface:!!node.visual?.surface,leaf:!!node.visual?.leaf,
    originalAsset:!!(node.asset||node.svgMarkup),cssArtwork:!!(node.style?.backgroundImage&&node.style.backgroundImage!=='none')},
   // Hash only for stable matching; no original text, CSS selectors, SVG
   // markup, image URLs or source code enters the transferable extract.
   fingerprint:digest([node.tag,node.role||'',node.ownText||'',node.attrs?.src||'',node.attrs?.alt||''].join('|'))
  });
 }
 return nodes;
}
function treeFor(nodes){
 const bySource=new Map(nodes.map(n=>[n.sourceIndex,n])),roots=[];
 for(const n of nodes)n.children=[];
 for(const n of nodes){
  const parent=bySource.get(n.parentIndex);
  if(parent&&parent!==n)parent.children.push(n.id);
  else roots.push(n.id);
 }
 return roots;
}
export function fromExistingBrowserCapture({sourceUrl,captureId,desktop,mobile,desktopLayout,mobileLayout,
 screenshotDigests={}}){
 if(!sourceUrl||!captureId)throw Error('Source URL and capture identity required');
 const url=new URL(sourceUrl);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Public HTTP(S) source required');
 const views={};
 for(const [name,record,layout] of [['desktop',desktop,desktopLayout],['mobile',mobile,mobileLayout]]){
  const nodes=nodeList(record,layout),roots=treeFor(nodes);
  const w=number(record.page.viewport.width),h=number(record.page.viewport.height);
  if(!(w>0&&h>0)||nodes.length===0)throw Error(name+' view is missing real browser element geometry');
  views[name]={viewport:{width:w,height:h},
   document:{width:number(record.page.document?.width),height:number(record.page.document?.height)},
   screenshotSha256:screenshotDigests[name]||null,
   nodes,roots,measurements:{elements:nodes.length,paintedNodes:nodes.filter(n=>n.paintOrder!==null).length,
    textLines:nodes.reduce((v,n)=>v+n.textLineRects.length,0),media:nodes.filter(n=>n.kind==='media').length}};
 }
 // A shared DOM path is useful, but is not proof of identical semantics.
 const d=new Map(views.desktop.nodes.filter(x=>x.domPath).map(x=>[x.domPath,x]));
 const pairs=[],used=new Set();
 for(const m of views.mobile.nodes){
  const a=d.get(m.domPath);if(!a||a.tag!==m.tag||used.has(m.domPath))continue;
  used.add(m.domPath);
  pairs.push({desktopId:a.id,mobileId:m.id,domPath:m.domPath,kind:a.kind,
   boxes:{desktop:a.box,mobile:m.box},
   confidence:a.fingerprint===m.fingerprint?'same-dom-path-and-fingerprint':'same-dom-path-only'});
 }
 const counted=new Set(pairs.map(x=>x.desktopId));
 return {
  schemaVersion:2,kind:'browser-native-composition',status:'unreviewed-research-extract',
  source:{domain:url.hostname.toLowerCase(),origin:url.origin,captureId},
  rights:{metadataRetrieval:false,mayTrain:false,mayRedistributeAssets:false},
  renderBasis:'original-browser-screenshot-not-recreated-layout',
  views,responsive:{pairs,desktopPaired:counted.size,mobilePaired:pairs.length,
   caveat:'DOM paths can change with responsive implementations; weak matches remain unverified'},
  note:'Measured browser DOM, computed CSS, pseudo styles, paint order, and original screenshot evidence. Not an aesthetic quality judgment.'
 };
}
