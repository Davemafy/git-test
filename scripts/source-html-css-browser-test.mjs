#!/usr/bin/env node
/**
 * Browser-native author HTML/CSS replay smoke, no model and no screenshots
 * interpreted as geometry. Uses deterministic route-backed synthetic source.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {chromium} from 'playwright';
import {exportBrowserHtmlCss} from '../src/source-html-css.mjs';

const origin='https://slp-fixture.example.test';
const markup=[
'<!doctype html><html lang="en"><head>',
'<link rel="stylesheet" href="/css/layout.css">',
'<style>.intro h1{letter-spacing:-.06em}</style>',
'</head><body><main>',
'<div class="intro"><h1>Actual browser composition</h1><p>Real source HTML and CSS, not guessed rectangles.</p><button>Open site</button></div>',
'<div class="visual"><svg viewBox="0 0 300 300" width="100%" height="100%"><circle cx="150" cy="150" r="130" fill="#ddd"/><path fill="#333" d="M0 110L300 150L30 300Z"/></svg></div>',
'</main><script>',
'const s=document.createElement("style");',
's.textContent=".visual:after{content:\\"\\";position:absolute;width:44px;height:44px;background:#f90;right:20px;bottom:20px;border-radius:100%}";',
'document.head.appendChild(s);',
'</script></body></html>'
].join('');
const css=[
'*{box-sizing:border-box}body{margin:0;color:#111;background:#f6f2ed;font:16px Arial,sans-serif}',
'main{min-height:650px;display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:5vw;padding:6vw}',
'h1{font-size:clamp(35px,6vw,85px);line-height:1.02;margin:0}',
'p{max-width:30ch;font-size:20px}button{border:0;padding:18px 25px;border-radius:40px;color:white;background:#222}',
'.visual{height:460px;position:relative;background:#ded9d2;overflow:hidden}',
'@media(max-width:600px){main{grid-template-columns:1fr}.visual{height:280px}}'
].join('');
const browser=await chromium.launch({headless:true}),tmp=await fs.mkdtemp(path.join(os.tmpdir(),'slop-html-css-'));
try{
 for(const v of [{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844}]){
  const ctx=await browser.newContext({viewport:{width:v.width,height:v.height},deviceScaleFactor:1,reducedMotion:'reduce'});
  await ctx.route('**/css/layout.css',route=>route.fulfill({status:200,contentType:'text/css',body:css}));
  await ctx.route('**/*',route=>{
   if(route.request().url()===origin+'/')return route.fulfill({status:200,contentType:'text/html',body:markup});
   return route.fallback();
  });
  try{
   const page=await ctx.newPage();await page.goto(origin+'/',{waitUntil:'networkidle'});
   const original=await page.screenshot({type:'png',animations:'disabled'});
   const out=path.join(tmp,v.name);
   const info=await exportBrowserHtmlCss(page,out);
   console.log('STYLESHEET COVERAGE',v.name,JSON.stringify(info.stylesheetCoverage));
   assert.equal(info.stylesheetCoverage.cssCaptured,info.stylesheetCoverage.cssDiscovered);
   assert.equal(info.stylesheetCoverage.cssDiscovered>=2,true);
   const html=await fs.readFile(path.join(out,'replay.html'),'utf8');
   assert.ok(!/<script\b/i.test(html));
   assert.match(html,/display:\s*grid/);
   assert.ok(!html.includes('data-slp-css-index'));
   const preview=await ctx.newPage();await preview.goto('file://'+path.join(out,'replay.html'),{waitUntil:'load'});
   const replay=await preview.screenshot({type:'png',animations:'disabled'});
   const A=await sharp(original).removeAlpha().raw().toBuffer({resolveWithObject:true});
   const B=await sharp(replay).removeAlpha().raw().toBuffer({resolveWithObject:true});
   assert.equal(A.info.width,B.info.width);assert.equal(A.info.height,B.info.height);
   let sum=0;for(let i=0;i<A.data.length;i++)sum+=Math.abs(A.data[i]-B.data[i]);
   const diff=sum/A.data.length/255;
   if(diff>.025)throw Error(v.name+' replay visual difference '+diff.toFixed(4));
   console.log('PASS HTML/CSS REPLAY',v.name,{css:info.stylesheetCoverage.cssCaptured,
    htmlBytes:info.stylesheetCoverage.htmlBytes,pixelDifference:diff.toFixed(5)});
  }finally{await ctx.close()}
 }
}finally{await browser.close();await fs.rm(tmp,{recursive:true,force:true})}
