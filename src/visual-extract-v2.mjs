/**
 * Research-only visual structural extract. No LLM, site assets, copy or
 * implicit human quality ratings are stored in the transferable record.
 */
export function captureStructuralViewport({maxHeight=3000,maxElements=620}={}) {
 const W=document.documentElement.clientWidth,H=Math.min(maxHeight,document.documentElement.scrollHeight);
 const hash=value=>{let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)};
 const round=n=>Math.round(n*10)/10;
 const frame=r=>({x:round(r.left+scrollX),y:round(r.top+scrollY),w:round(r.width),h:round(r.height)});
 const visible=b=>b.w>4&&b.h>3&&b.x<W&&b.y<H&&b.x+b.w>0&&b.y+b.h>0;
 const overlay=el=>{
  for(let p=el;p&&p!==document.body;p=p.parentElement){
   const s=getComputedStyle(p),r=p.getBoundingClientRect();
   if((s.position==='fixed'||s.position==='sticky')&&r.width>=W*.7&&r.height>110&&
    (p.matches('[role="dialog"],[aria-modal="true"],[class*="cookie" i],[id*="cookie" i],[class*="consent" i],[id*="consent" i]')||s.position==='fixed'))return true;
  }return false;
 };
 const context=el=>{const parts=[];let n=el.parentElement;
  for(let i=0;i<5&&n&&n!==document.documentElement;i++,n=n.parentElement)
   if(n.matches('main,header,footer,section,article,nav,aside,form'))
    parts.push(n.tagName.toLowerCase()+':'+(n.getAttribute('role')||''));
  return parts.reverse().join('/');
 };
 const type=el=>{
  if(el.matches('h1,h2,h3,h4,h5,h6,[role="heading"]'))return 'heading';
  if(el.matches('p,blockquote,li,dd,dt,figcaption'))return 'text';
  if(el.matches('img,video,canvas,picture,[role="img"]')||el.tagName.toLowerCase()==='svg')return 'media';
  if(el.matches('button,input,select,textarea,[role="button"],[role="searchbox"]'))return 'control';
  if(el.matches('a'))return 'link';
  return null;
 };
 const lines=el=>{
  const out=[],walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
  for(let n=walk.nextNode();n&&out.length<100;n=walk.nextNode()){
   if(!n.textContent.trim())continue;
   const r=document.createRange();r.selectNodeContents(n);
   for(const b of r.getClientRects()){const f=frame(b);if(visible(f)&&f.w>2)out.push(f)}
   r.detach?.();
  }
  const merged=[];
  for(const r of out.sort((a,b)=>a.y-b.y||a.x-b.x)){
   const l=merged.at(-1);
   if(l&&Math.abs(l.y-r.y)<3&&Math.abs(l.h-r.h)<5&&r.x-l.x-l.w<10){
    const right=Math.max(l.x+l.w,r.x+r.w);l.w=round(right-l.x);l.h=Math.max(l.h,r.h);
   }else merged.push({...r});
  }
  return merged.slice(0,35);
 };
 const nodes=[],overlayExclusions=[];
 for(const [i,el] of [...document.querySelectorAll('body *')].slice(0,18000).entries()){
  if(nodes.length>=maxElements)break;
  if(el.matches('script,style,noscript,template,path,g,defs,symbol,title,meta,link'))continue;
  const s=getComputedStyle(el);
  if(s.visibility==='hidden'||s.display==='none'||parseFloat(s.opacity||1)<.05)continue;
  const box=frame(el.getBoundingClientRect());if(!visible(box))continue;
  const kind=type(el);
  if(overlay(el)){if(overlayExclusions.length<12&&(kind==='heading'||kind==='control'))
   overlayExclusions.push({type:kind,box});continue}
  const region=el.matches('header,footer,main,main > section,main > article,main > aside,main > div,article > section')&&box.h>65;
  const cssArt=s.backgroundImage!=='none'||s.maskImage!=='none'||s.clipPath!=='none';
  const parentBg=el.parentElement?getComputedStyle(el.parentElement).backgroundColor:'';
  const art=!kind&&!region&&el.matches('div,section,figure,aside')&&box.w>130&&box.h>90&&
   (cssArt||(s.backgroundColor!==parentBg&&s.backgroundColor!=='transparent'&&s.backgroundColor!=='rgba(0, 0, 0, 0)'))&&
   (el.children.length<4||cssArt);
  if(!kind&&!region&&!art)continue;
  if(kind==='link'&&(box.w<38||box.h<14||el.closest('h1,h2,h3,h4,h5,h6')))continue;
  if(kind==='text'&&box.w<25)continue;
  if(kind==='media'&&(box.w<55||box.h<45||el.matches('picture')&&el.querySelector('img')))continue;
  const role=kind||(region?'region':'art'),tag=el.tagName.toLowerCase();
  const label=kind&&['heading','text','control','link'].includes(kind)?
   String(el.textContent||el.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,350):'';
  const media=kind==='media'?String(el.currentSrc||el.getAttribute('src')||el.getAttribute('poster')||el.getAttribute('aria-label')||tag):'';
  const key=hash(role+'|'+tag+'|'+(label||media)+'|'+context(el));
  nodes.push({key,type:role,tag,box,paintOrder:i,context:hash(context(el)),
   lineRects:['heading','text','link'].includes(kind)?lines(el):[],
   fontSize:Math.round(parseFloat(s.fontSize)||0),fontWeight:s.fontWeight,
   hasCssArt:cssArt,position:s.position,zIndex:s.zIndex==='auto'?null:parseInt(s.zIndex,10)||0,
   objectFit:s.objectFit,borderRadius:s.borderRadius});
 }
 const counts=new Map();for(const n of nodes)counts.set(n.key,(counts.get(n.key)||0)+1);
 for(const n of nodes)n.pairable=counts.get(n.key)===1&&['heading','text','media','control','link'].includes(n.type);
 return {version:2,sourceQuality:'unreviewed-browser-measurement',
   viewport:{width:W,height:H,documentHeight:document.documentElement.scrollHeight},
   overlayExclusions,nodes};
}
const r=n=>Math.round(n*1000)/1000;
export function pairStructuralViewports(desktop,mobile){
 if(desktop?.version!==2||mobile?.version!==2)throw Error('Expected two V2 structural observations');
 const unique=record=>{const map=new Map(),bad=new Set();
  for(const n of record.nodes){if(!n.pairable)continue;if(map.has(n.key))bad.add(n.key);else map.set(n.key,n)}
  for(const k of bad)map.delete(k);return map;
 };
 const D=unique(desktop),M=unique(mobile),pairs=[];
 for(const [key,a] of D){const b=M.get(key);if(!b||a.type!==b.type)continue;
  pairs.push({key,type:a.type,desktop:a.box,mobile:b.box,desktopOrder:a.paintOrder,mobileOrder:b.paintOrder,
   change:{widthRatio:r(b.box.w/a.box.w),heightRatio:r(b.box.h/a.box.h),
    horizontalShift:r(b.box.x/mobile.viewport.width-a.box.x/desktop.viewport.width)},
   confidence:'exact-unique-semantic-key'});
 }
 return {version:1,pairs,coverage:{desktop:r(pairs.length/(D.size||1)),mobile:r(pairs.length/(M.size||1)),
  paired:pairs.length,desktopPairable:D.size,mobilePairable:M.size,
  unmatchedDesktop:D.size-pairs.length,unmatchedMobile:M.size-pairs.length},
  note:'Ambiguous or responsive-only elements intentionally remain unpaired'};
}
export function wireframeSvg(extract,{maxHeight=3000}={}){
 if(extract?.version!==2)throw Error('Expected V2 structural extract');
 const W=extract.viewport.width,H=Math.min(maxHeight,extract.viewport.height);
 const html=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'"><rect width="'+W+'" height="'+H+'" fill="#fff"/>'];
 const rect=(b,attrs)=>{const x=Math.max(0,r(b.x)),y=Math.max(0,r(b.y));
  if(x>=W||y>=H||b.w<=0||b.h<=0)return;
  const width=Math.min(r(b.w)-(x-r(b.x)),W-x),height=Math.min(r(b.h)-(y-r(b.y)),H-y);
  if(width<=1||height<=1)return;
  html.push('<rect x="'+x+'" y="'+y+'" width="'+width+'" height="'+height+'" '+attrs+'/>');
 };
 const weights={region:0,art:1,media:2,text:3,heading:4,link:5,control:6};
 for(const n of [...extract.nodes].sort((a,b)=>(weights[a.type]??9)-(weights[b.type]??9)||a.paintOrder-b.paintOrder)){
  const b=n.box;if(b.y>=H||b.y+b.h<=0)continue;
  if(n.type==='region'){rect(b,'fill="none" stroke="#dedede" stroke-width="1"');continue}
  if(n.type==='art'){rect(b,'fill="#e0e0e0" stroke="#bcbcbc" stroke-width="1"');continue}
  if(n.type==='media'){
   rect(b,'fill="#bdbdbd" stroke="#777" stroke-width="1"');
   const x=Math.max(0,b.x),y=Math.max(0,b.y),right=Math.min(W,b.x+b.w),bottom=Math.min(H,b.y+b.h);
   if(right>x+5&&bottom>y+5)html.push('<path d="M'+r(x)+' '+r(y)+'L'+r(right)+' '+r(bottom)+'M'+r(right)+' '+r(y)+'L'+r(x)+' '+r(bottom)+'" stroke="#999" stroke-width="1"/>');
   continue;
  }
  if(n.type==='control'){rect(b,'fill="#4f4f4f" rx="3"');continue}
  const shade=n.type==='heading'?'#202020':n.type==='link'?'#555':'#999';
  if(n.lineRects?.length)for(const l of n.lineRects)rect({x:l.x,y:l.y+l.h*.25,w:l.w,h:Math.max(2,l.h*.52)},'fill="'+shade+'" rx="1"');
  else if(b.w>8){const hh=Math.min(n.type==='heading'?17:7,b.h*.5);
   rect({x:b.x,y:b.y+(b.h-hh)/2,w:b.w,h:hh},'fill="'+shade+'"')}
 }
 html.push('</svg>');return html.join('');
}
export function relationshipsFor(extract,{maxNodes=180}={}){
 if(extract?.version!==2)throw Error('Expected V2 structural extract');
 const all=extract.nodes.filter(n=>n.type!=='region'&&n.box.w>=20&&n.box.h>=7).slice(0,maxNodes),edges=[];
 const center=b=>[b.x+b.w/2,b.y+b.h/2];
 for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
  const a=all[i],b=all[j],ix=Math.min(a.box.x+a.box.w,b.box.x+b.box.w)-Math.max(a.box.x,b.box.x),
   iy=Math.min(a.box.y+a.box.h,b.box.y+b.box.h)-Math.max(a.box.y,b.box.y);
  if(ix>4&&iy>4&&Math.min(ix/a.box.w,ix/b.box.w)>.2&&Math.min(iy/a.box.h,iy/b.box.h)>.2){
   if(['art','media'].includes(a.type)||['art','media'].includes(b.type))edges.push({a:a.key,b:b.key,type:'overlap'});
  }else if(Math.abs(a.box.x-b.box.x)<6&&Math.abs(center(a.box)[1]-center(b.box)[1])<400)
   edges.push({a:a.key,b:b.key,type:'left-aligned'});
  else if(Math.abs(center(a.box)[0]-center(b.box)[0])<6&&Math.abs(center(a.box)[1]-center(b.box)[1])<400)
   edges.push({a:a.key,b:b.key,type:'center-aligned'});
 }
 return edges.slice(0,600);
}
