import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {exportBrowserHtmlCss} from '../src/source-html-css.mjs';
const out='research/seal-native-source';
const browser=await chromium.launch({headless:true});
try{
 for(const v of [{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844}]){
  const ctx=await browser.newContext({viewport:{width:v.width,height:v.height},
   deviceScaleFactor:1,reducedMotion:'reduce',serviceWorkers:'block'});
  try{
   const page=await ctx.newPage();
   const res=await page.goto('https://seal-live.netlify.app/',{waitUntil:'domcontentloaded',timeout:45000});
   if(!res||res.status()>=400)throw Error('Source capture failed '+res?.status());
   await page.waitForTimeout(2400);
   await page.evaluate(()=>document.fonts.ready);
   await fs.mkdir(out,{recursive:true});
   await page.screenshot({path:path.join(out,v.name+'-original.png'),fullPage:true,animations:'disabled'});
   const d=await exportBrowserHtmlCss(page,path.join(out,v.name));
   console.log(v.name,JSON.stringify({styles:d.stylesheetCoverage,viewport:d.viewport}));
  }finally{await ctx.close()}
 }
}finally{await browser.close()}
