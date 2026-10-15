#!/usr/bin/env node
/**
 * Research-only positive-reference benchmark. Run locally where browser network
 * access exists. No redesign model, no production corpus modifications.
 *
 * Usage: node scripts/visual-extract-fidelity.mjs linear stripe aesop
 * Optional: STRUCTURAL_FIDELITY_OUT=/tmp/reference-fidelity
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import sharp from 'sharp';
import {captureStructuralViewport,pairStructuralViewports,wireframeSvg,relationshipsFor} from '../src/visual-extract-v2.mjs';

const TARGETS={linear:'https://linear.app/',stripe:'https://stripe.com/',aesop:'https://www.aesop.com/'};
const requested=process.argv.slice(2),picks=requested.length?requested:Object.keys(TARGETS);
if(picks.some(k=>!Object.hasOwn(TARGETS,k)))throw Error('Only allowed positive references: linear, stripe, aesop');
const out=path.resolve(process.env.STRUCTURAL_FIDELITY_OUT||'research/structural-fidelity-output');
await fs.mkdir(out,{recursive:true});
const views=[{id:'desktop',width:1440,height:900},{id:'mobile',width:390,height:844}];
const manifest={schemaVersion:2,stage:'research-unreviewed',modelUsed:false,
 note:'Screenshots are for inspection only. No quality certification or asset/copyright reuse is granted.',sites:[]};
const browser=await chromium.launch({headless:true});
try{
 for(const id of picks){
  const site={id,url:TARGETS[id],views:{},pairing:null};
  for(const v of views){
   const ctx=await browser.newContext({viewport:{width:v.width,height:v.height},deviceScaleFactor:1,
    reducedMotion:'reduce',locale:'en-US',serviceWorkers:'block'});
   try{
    const page=await ctx.newPage();
    const response=await page.goto(TARGETS[id],{waitUntil:'domcontentloaded',timeout:50000});
    if(!response||response.status()>=400)throw Error('HTTP '+(response?.status()||'unknown'));
    await page.waitForTimeout(2400);
    await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,3000))]));
    const measurement=await page.evaluate(captureStructuralViewport,{maxHeight:3000,maxElements:620});
    if(measurement.nodes.filter(x=>['heading','text'].includes(x.type)).length<2)
     throw Error('Too few semantic text nodes: suspicious capture');
    const name=id+'-'+v.id,shot=path.join(out,name+'-source.png');
    await page.screenshot({path:shot,clip:{x:0,y:0,width:v.width,height:measurement.viewport.height},
     animations:'disabled',timeout:50000});
    const sourceScreenshotSha256=createHash('sha256').update(await fs.readFile(shot)).digest('hex');
    const full={...measurement,source:id,sourceScreenshotSha256,relationships:relationshipsFor(measurement)};
    await fs.writeFile(path.join(out,name+'-extract.json'),JSON.stringify(full,null,2));
    const wireframe=wireframeSvg(measurement);
    await fs.writeFile(path.join(out,name+'-wireframe.svg'),wireframe);
    await sharp(Buffer.from(wireframe)).png().toFile(path.join(out,name+'-wireframe.png'));
    site.views[v.id]={ok:true,status:response.status(),url:page.url(),sourceScreenshotSha256,
     nodes:full.nodes.length,textLines:full.nodes.reduce((sum,x)=>sum+x.lineRects.length,0),
     media:full.nodes.filter(x=>['media','art'].includes(x.type)).length,
     overlaysExcluded:full.overlayExclusions.length,relationships:full.relationships.length};
    console.log('CAPTURED',id,v.id,JSON.stringify(site.views[v.id]));
   }catch(err){site.views[v.id]={ok:false,error:String(err.message).slice(0,220)};
    console.error('QUARANTINED',id,v.id,site.views[v.id].error)}
   finally{await ctx.close()}
  }
  if(site.views.desktop.ok&&site.views.mobile.ok){
   const read=v=>fs.readFile(path.join(out,id+'-'+v+'-extract.json'),'utf8').then(JSON.parse);
   site.pairing=pairStructuralViewports(await read('desktop'),await read('mobile'));
   await fs.writeFile(path.join(out,id+'-responsive-pairs.json'),JSON.stringify(site.pairing,null,2));
  }
  manifest.sites.push(site);
  await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
 }
}finally{await browser.close()}
const success=manifest.sites.filter(s=>s.pairing).length;
if(success!==picks.length)process.exitCode=2;
console.log('RESEARCH_RESULT',JSON.stringify({success,total:picks.length}));
