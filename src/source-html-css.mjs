/**
 * SOURCE HTML + CSS capture from the browser's already-rendered DOM and CSSOM.
 * Research only. No LLMs, screenshots-as-layout, image reconstruction or
 * claims of source-code equivalence.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const sha=buf=>createHash('sha256').update(buf).digest('hex');
const safePageUrl=value=>{
 const url=new URL(value);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password)
  throw Error('Only a public HTTP(S) document can be packaged.');
 return url;
};
export function resolveCssAssetUrls(cssText,stylesheetUrl){
 const base=safePageUrl(stylesheetUrl);
 return String(cssText).replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi,(match,double,single,bare)=>{
  const value=String(double??single??bare??'').trim();
  if(!value||/^(data:|blob:|#|about:|javascript:|var\()/i.test(value))return match;
  try{
   const absolute=new URL(value,base);
   if(!['http:','https:'].includes(absolute.protocol))return match;
   return 'url("'+absolute.href.replace(/"/g,'%22')+'")';
  }catch{return match}
 });
}
async function inspectorStyles(page){
 const session=await page.context().newCDPSession(page);
 const headers=[];
 try{
  session.on('CSS.styleSheetAdded',ev=>{if(ev?.header)headers.push(ev.header)});
  await session.send('DOM.enable');
  await session.send('CSS.enable');
  // CSS.enable emits descriptors for existing page stylesheets in Chromium.
  await new Promise(resolve=>setTimeout(resolve,75));
  const out=[];
  for(const header of headers.slice(0,300)){
   try{
    const {text}=await session.send('CSS.getStyleSheetText',{styleSheetId:header.styleSheetId});
    if(typeof text==='string'&&text.length>0){
     out.push({url:header.sourceURL||'',isInline:!!header.isInline,origin:header.origin||null,
      css:text,source:'cdp-css-getStyleSheetText'});
    }
   }catch{}
  }
  return out;
 }catch{return []}
 finally{await session.detach().catch(()=>{})}
}
export async function readBrowserHtmlCss(page,{maxCssBytes=18000000,maxHtmlBytes=14000000}={}){
 const info=await page.evaluate(()=>{
  const live=document,clone=live.documentElement.cloneNode(true);
  const cssNodes=[...live.querySelectorAll('style,link[rel~="stylesheet"]')];
  const cloneCssNodes=[...clone.querySelectorAll('style,link[rel~="stylesheet"]')];
  for(let i=0;i<cloneCssNodes.length;i++)cloneCssNodes[i].setAttribute('data-slp-css-index',String(i));
  const cssSheets=[...live.styleSheets].map((sheet,i)=>{
   let css=null,error=null;
   try{css=[...sheet.cssRules].map(rule=>rule.cssText).join('\n')}catch(e){error=e?.name||'CSSOM inaccessible'}
   const ownerIndex=sheet.ownerNode?cssNodes.indexOf(sheet.ownerNode):-1;
   return {index:i,ownerIndex,href:sheet.href||null,css,error,media:sheet.media?.mediaText||''};
  });
  // Freeze to inert markup: no scripts, event attributes, form submissions,
  // iframe/embedded browser contexts, stored input values or meta redirects.
  for(const el of [clone,...clone.querySelectorAll('*')]){
   if(el.hasAttribute?.('nonce'))el.removeAttribute('nonce');
   for(const attr of [...(el.attributes||[])])
    if(/^on/i.test(attr.name)||['srcdoc','integrity','formaction'].includes(attr.name.toLowerCase()))
     el.removeAttribute(attr.name);
   if(el.matches?.('input,textarea,select')){el.removeAttribute('value');el.removeAttribute('checked');
    if(el.matches('textarea'))el.textContent='';}
   if(el.matches?.('form')){el.removeAttribute('action');el.setAttribute('method','get')}
   if(el.matches?.('a[href^="javascript:" i]'))el.removeAttribute('href');
   if(el.matches?.('meta[http-equiv="refresh" i],meta[http-equiv="content-security-policy" i]'))el.remove();
   if(el.matches?.('script,iframe,object,embed'))el.remove();
  }
  // Static DOM retains the *actual* rendered node tree and original markup.
  const base=live.baseURI||location.href,baseNode=clone.querySelector('head base[href]');
  if(!baseNode){const tag=live.createElement('base');tag.setAttribute('href',base);
   (clone.querySelector('head')||clone).prepend(tag)}
  const adopted=[];
  try{
   for(const sheet of (live.adoptedStyleSheets||[])){
    try{adopted.push([...sheet.cssRules].map(x=>x.cssText).join('\n'))}catch{}
   }
  }catch{}
  return {url:location.href,base,html:'<!DOCTYPE html>\n'+clone.outerHTML,
   cssSheets,adopted,viewport:{width:innerWidth,height:innerHeight},
   textNodes:live.body?.querySelectorAll('*').length||0};
 });
 safePageUrl(info.url);
 const cdp=await inspectorStyles(page);
 const byUrl=new Map(),inlines=[];
 for(const sheet of cdp){
  if(sheet.url){
   if(!byUrl.has(sheet.url))byUrl.set(sheet.url,sheet.css);
  }else if(sheet.isInline)inlines.push(sheet.css);
 }
 const mapped=[];
 let totalCss=0;
 for(const item of info.cssSheets){
  let css=item.css,source='cssom';
  if(css===null&&item.href&&byUrl.has(item.href)){
   css=byUrl.get(item.href);source='cdp';
  }
  const originalUrl=item.href||info.base;
  if(css!==null)css=resolveCssAssetUrls(css,originalUrl);
  if(css!==null){
   const size=Buffer.byteLength(css);
   if(totalCss+size>maxCssBytes){css=null;source='cap-exceeded'}
   else totalCss+=size;
  }
  mapped.push({index:item.index,ownerIndex:item.ownerIndex,href:item.href,
   media:item.media,css,source:css===null?item.error||source:source});
 }
 const htmlBytes=Buffer.byteLength(info.html);
 if(htmlBytes>maxHtmlBytes)throw Error('Rendered HTML exceeds capture size cap');
 return {page:info,stylesheets:mapped,adopted:info.adopted,
  diagnostics:{htmlBytes,cssBytes:totalCss,cssDiscovered:mapped.length,
   cssCaptured:mapped.filter(x=>x.css!==null).length,
   cssMissing:mapped.filter(x=>x.css===null).map(x=>({href:x.href,reason:x.source})),
   cdpStyleSheets:cdp.length}};
}
export function materializeHtmlCss(result){
 const files=[],report=[];
 // The original page's <base> resolves source images; therefore replay
 // stylesheets must be inlined in author order. Separate CSS files are still
 // emitted for machine-readable composition processing.
 let replay=result.page.html;
 const byOwner=new Map(result.stylesheets.filter(s=>s.ownerIndex>=0).map(s=>[s.ownerIndex,s]));
 for(const [ownerIndex,sheet] of byOwner){
  const marker='data-slp-css-index="'+ownerIndex+'"';
  if(sheet.css!==null&&sheet.href){
   const file='styles/sheet-'+String(ownerIndex).padStart(3,'0')+'.css';
   const linkRx=new RegExp('<link\\b(?=[^>]*'+marker+')[^>]*>','i');
   replay=replay.replace(linkRx,match=>{
    files.push({path:file,bytes:Buffer.byteLength(sheet.css),text:sheet.css});
    const mediaAttr=sheet.media?' media="'+sheet.media.replace(/"/g,'&quot;')+'"':'';
    return '<style data-slp-css-source="'+ownerIndex+'"'+mediaAttr+'>'+sheet.css.replace(/<\/style/gi,'<\\/style')+'</style>';
   });
   report.push({ownerIndex,file,source:sheet.source,href:sheet.href});
  }else if(sheet.css!==null&&!sheet.href){
   const styleRx=new RegExp('(<style\\b(?=[^>]*'+marker+')[^>]*>)[\\s\\S]*?(<\\/style>)','i');
   replay=replay.replace(styleRx,(_,start,end)=>start+sheet.css+end);
  }else report.push({ownerIndex,source:sheet.source,href:sheet.href,captured:false});
 }
 const adoptedText=(result.adopted||[]).filter(Boolean).join('\n');
 if(adoptedText)replay=replay.replace(/<\/head>/i,'<style data-slp-adopted="document">'+adoptedText.replace(/<\/style/gi,'<\\/style')+'</style></head>');
 replay=replay.replace(/\sdata-slp-css-index="\d+"/g,'');
 return {html:replay,files,report};
}
export async function exportBrowserHtmlCss(page,destination,options={}){
 const data=await readBrowserHtmlCss(page,options);
 const output=materializeHtmlCss(data);
 const dir=path.resolve(destination);
 await fs.mkdir(dir,{recursive:true});
 const save=async(relative,body)=>{
  const full=path.resolve(dir,relative);
  if(!full.startsWith(dir+path.sep))throw Error('Unsafe output location');
  await fs.mkdir(path.dirname(full),{recursive:true});
  await fs.writeFile(full,body);
 };
 await save('replay.html',output.html);
 for(const file of output.files)await save(file.path,file.text);
 const manifest={schemaVersion:1,kind:'live-rendered-html-css',sourceUrl:data.page.url,
  snapshot:'replay.html',viewport:data.page.viewport,
  htmlSha256:sha(output.html),css:output.report,
  stylesheetCoverage:data.diagnostics,
  limitations:['JavaScript and live behavior removed','Cross-origin CSS not captured without CSSOM/CDP access remains externally linked','Assets/fonts may require network','Canvas and closed shadow DOM not serializable from outerHTML','Source code and original Sass/React components cannot be recovered from a browser'],
  status:'research-only-not-reconstruction-approved'};
 await save('manifest.json',JSON.stringify(manifest,null,2)+'\n');
 return manifest;
}
