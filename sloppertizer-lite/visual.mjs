import {chromium} from "playwright";
import assert from "node:assert/strict";
import {mkdir} from "node:fs/promises";
import {fixture,html} from "./app.mjs";
const folder=new URL("./artifacts/",import.meta.url);
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const width of [390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.setContent(html(fixture),{waitUntil:"load"});
  const result=await page.evaluate(()=>({
   width:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,
   h1:document.querySelectorAll("h1").length,
   content:[...document.querySelectorAll("[data-content]")].map(x=>x.dataset.content),
   links:[...document.querySelectorAll("[data-link]")].map(x=>x.dataset.link)
  }));
  assert.equal(result.width,width);
  assert.ok(result.overflow<=1,"Overflow at "+width+": "+result.overflow);
  assert.equal(result.h1,1);
  for(const x of fixture.blocks)assert.equal(result.content.filter(id=>id===x.id).length,1,x.id);
  for(const x of fixture.links)assert.equal(result.links.filter(id=>id===x.id).length,1,x.id);
  await page.screenshot({path:new URL("./artifacts/"+width+".png",import.meta.url).pathname,fullPage:true});
  console.log("PASS rendered",width);
  await page.close();
 }
}finally{await browser.close()}
