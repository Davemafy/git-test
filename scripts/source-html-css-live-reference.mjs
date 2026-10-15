#!/usr/bin/env node
/** Research-only: measure HTML/CSS replay fidelity on real positive examples. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {chromium} from 'playwright';
import {exportBrowserHtmlCss} from '../src/source-html-css.mjs';

const sites=[{id:'linear',url:'https://linear.app/'},{id:'stripe',url:'https://stripe.com/'}];
const views=[{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844}];
const out=path.resolve('research/html-css-live-evidence'),tmp=await fs.mkdtemp(path.join(os.tmpdir(),'slp-real-html-css-'));
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];
try{
 for(const site of sites){
  for(const view of views){
   const label=site.id+'-'+view.name;
   const ctx=await browser.newContext({viewport:{width:view.width,height:view.height},deviceScaleFactor:1,
    reducedMotion:'reduce',serviceWorkers:'block'});
   try{
    const page=await ctx.newPage();
    const response=await page.goto(site.url,{waitUntil:'domcontentloaded',timeout:50000});
    if(!response||response.status()>=400)throw Error('HTTP '+(response?.status()||'unknown'));
    await page.waitForTimeout(2200);
    await page.evaluate(()=>document.fonts.ready).catch(()=>{});
    const original=await page.screenshot({type:'png',animations:'disabled',caret:'hide'});
    const destination=path.join(tmp,label);
    const manifest=await exportBrowserHtmlCss(page,destination);
    const html=await fs.readFile(path.join(destination,'replay.html'),'utf8');
    const replayUrl=site.url.replace(/\/$/,'')+'/__slp_html_css_static_replay__';
    const replay=await ctx.newPage();
    await replay.route(replayUrl,route=>route.fulfill({status:200,contentType:'text/html',body:html}));
    await replay.goto(replayUrl,{waitUntil:'domcontentloaded',timeout:50000});
    await replay.waitForTimeout(2200);
    await replay.evaluate(()=>document.fonts.ready).catch(()=>{});
    const reconstructed=await replay.screenshot({type:'png',animations:'disabled',caret:'hide'});
    const a=await sharp(original).removeAlpha().raw().toBuffer({resolveWithObject:true});
    const b=await sharp(reconstructed).removeAlpha().raw().toBuffer({resolveWithObject:true});
    let diff=null;
    if(a.info.width===b.info.width&&a.info.height===b.info.height){
     let sum=0;for(let i=0;i<a.data.length;i++)sum+=Math.abs(a.data[i]-b.data[i]);
     diff=Number((sum/a.data.length/255).toFixed(5));
    }
    const pair=await sharp({create:{width:view.width*2,height:view.height,channels:3,background:'#fff'}})
     .composite([{input:original,left:0,top:0},{input:reconstructed,left:view.width,top:0}])
     .png().toBuffer();
    await fs.writeFile(path.join(out,label+'-comparison.png'),pair);
    const item={id:site.id,viewport:view.name,http:response.status(),sourceUrl:page.url(),
     cssDiscovered:manifest.stylesheetCoverage.cssDiscovered,
     cssCaptured:manifest.stylesheetCoverage.cssCaptured,
     missing:manifest.stylesheetCoverage.cssMissing,
     htmlBytes:manifest.stylesheetCoverage.htmlBytes,
     normalizedPixelDifference:diff,renderedWithoutJavascript:true,
     caveat:'Hero viewport comparison, not full-page or functional fidelity'};
    results.push(item);console.log('REAL HTML CSS REPLAY',JSON.stringify(item));
   }catch(error){const item={id:site.id,viewport:view.name,error:String(error.message).slice(0,260)};
    results.push(item);console.error('REAL REPLAY FAILED',JSON.stringify(item));}
   finally{await ctx.close()}
  }
 }
}finally{await browser.close();await fs.rm(tmp,{recursive:true,force:true})}
await fs.writeFile(path.join(out,'summary.json'),JSON.stringify({results},null,2)+'\n');
if(results.filter(x=>!x.error).length!==4)process.exitCode=1;
