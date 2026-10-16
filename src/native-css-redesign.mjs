/**
 * Browser-native design improvement, not HTML regeneration.
 * Preserve source-owned DOM, CSS artwork and source facts; apply only bounded
 * CSS overrides. This is opt-in until independent visual review certifies it.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
const okName=x=>typeof x==='string'&&/^[\w.-]+$/.test(x);
export function nativeDesignSelectorInventory(html,{max=95}={}){
 const counts=new Map();
 for(const match of String(html).matchAll(/class\s*=\s*(["'])(.*?)\1/gi))
  for(const c of match[2].split(/\s+/)){
   if(!/^[A-Za-z_-][\w-]{0,70}$/.test(c))continue;
   counts.set(c,(counts.get(c)||0)+1);
  }
 return [...counts].sort((a,b)=>b[1]-a[1]).slice(0,max).map(([name,count])=>({name,count}));
}
export function nativePolishPrompt({html,evidence,direction=''}) {
 const inventory=nativeDesignSelectorInventory(html);
 const important=[...inventory].filter(x=>/^(hero|site-header|notice|source|proof|method|checker|visual|stage|gallery|privacy|closing|feature|footer)/i.test(x.name)).slice(0,45);
 const headings=(evidence.preservedContent||[]).filter(x=>/^h[1-3]$/.test(x.tag))
  .slice(0,16).map(x=>({tag:x.tag,text:x.text.slice(0,90)}));
 const brand=evidence.brand||{};
 return 'You are art-directing the REAL rendered HTML/CSS of an existing website. Its actual complex visual objects and content already work as an authored composition. IMPROVE, not recreate or template it. Return JSON {css:COMPLETE_CSS_OVERRIDE,reason:SHORT_STRING}. CSS must target the EXACT existing source selectors listed below. Change purposeful visual relationships: focal scale, negative space, typography, object interplay, section transitions, responsive behavior and image staging. The goal is exceptional visual quality, not just new colors. Preserve every original visual object and text. Do not invent images, badges, court claims or application functions. Use @media responsive rules at 390 and 1440. Never hide entire content, controls or image objects. No url(), @import, @font-face, animation, external resources, script, HTML or SVG. Return under 6200 CSS characters. This is an ADDITIVE OVERRIDE applied after authentic site styles. Source-specific direction: '+String(direction).slice(0,250)+
 '\nPAGE:'+JSON.stringify({title:evidence.title,purpose:evidence.purpose||'',headings,
 brand:{surface:brand.dominantSurface,colors:brand.colors?.slice(0,4).map(x=>x.value)},
 selectors:inventory,visualGroups:important})+
 '\nFOCUS: Give a distinctive visual focal object and an intentional reading path; do not reduce the original interface to a flat text page. Relevant information must remain legible and accessible.';
}
export function applyNativePolishHtml(html,css){
 if(typeof html!=='string'||!/<head\b[^>]*>/i.test(html)||!/<\/head>/i.test(html)||
    /<script\b/i.test(html))throw Error('Expected previously sanitized browser HTML');
 const value=String(css||'').trim();
 if(value.length<150||value.length>10500||/<|@import\b|@font-face\b|url\s*\(|expression\s*\(|javascript:|data:/i.test(value))
  throw Error('Rejected invalid or unsafe CSS override');
 // Browser-native CSS stays attached to the original DOM in its true cascade.
 const injected='<style id="sloppertizer-native-polish">\n'+value.replace(/<\/style/gi,'<\\/style')+'\n</style>\n';
 return html.replace(/<\/head>/i,injected+'</head>');
}
export async function sourceNativeCaptureHtml(captureDir,entry){
 if(!entry?.dir||entry.dir.includes('..')||path.isAbsolute(entry.dir))throw Error('Invalid capture entry');
 const root=path.resolve(captureDir),folder=path.resolve(root,entry.dir);
 if(!folder.startsWith(root+path.sep))throw Error('Capture escaped source folder');
 const bundle=path.join(folder,'browser-source-desktop');
 const [html,manifest]=await Promise.all([
  fs.readFile(path.join(bundle,'replay.html'),'utf8'),
  fs.readFile(path.join(bundle,'manifest.json'),'utf8').then(JSON.parse)
 ]);
 if(manifest.kind!=='live-rendered-html-css'||manifest.stylesheetCoverage?.cssMissing?.length)
  throw Error('Captured source CSS is incomplete. No native redesign is accepted');
 return {html,manifest};
}
