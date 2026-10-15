import test from "node:test";
import assert from "node:assert/strict";
import {fixture,compose,markup,html} from "./app.mjs";
test("all immutable content/link IDs appear exactly once",()=>{
 const output=markup(fixture);
 for(const x of fixture.blocks)assert.equal((output.match(new RegExp('data-content="'+x.id+'"',"g"))||[]).length,1,x.id);
 for(const x of fixture.links)assert.equal((output.match(new RegExp('data-link="'+x.id+'"',"g"))||[]).length,1,x.id);
 assert.equal((output.match(/<h1\b/g)||[]).length,1);
});
test("proof section moves whole or not at all",()=>{
 const e=structuredClone(fixture);e.blocks.splice(e.blocks.findIndex(x=>x.id==="c5"),1);
 assert.equal(compose(e).proof.heading.id,"c3");
 assert.equal((markup(e).match(/data-content="c3"/g)||[]).length,1);
});
test("nested headings stay under parent h2",()=>{
 const s=compose(fixture).sections.find(x=>x.heading.id==="c6");
 assert.equal(s.entries.filter(x=>x.tag==="h3").length,2);
});
test("no blank hero panel when proof absent",()=>{
 const e=structuredClone(fixture);e.blocks=e.blocks.filter(x=>["c0","c1"].includes(x.id));
 assert.match(markup(e),/opening copy-only/);
 assert.doesNotMatch(markup(e),/class="proof"/);
});
test("source HTML injection escaped and unsafe URLs rejected",()=>{
 const e=structuredClone(fixture);e.blocks[0].text="<script>alert(1)</script>";
 assert.match(markup(e),/&lt;script&gt;/);
 e.links[0].href="javascript:alert(1)";
 assert.throws(()=>compose(e),/HTTPS/);
});
test("duplicate IDs rejected",()=>{
 const e=structuredClone(fixture);e.blocks[1].id="c0";
 assert.throws(()=>compose(e),/Duplicate/);
});
test("120 variable sized layouts preserve exact source slots",()=>{
 for(let seed=0;seed<120;seed++){
  const e=structuredClone(fixture);
  e.blocks.push(...Array.from({length:seed%10},(_,i)=>({id:"c"+(100+i),tag:"p",text:"Observed evidence paragraph ".repeat(1+((seed+i)*7)%20)})));
  const page=markup(e);
  for(const x of e.blocks)assert.equal((page.match(new RegExp('data-content="'+x.id+'"',"g"))||[]).length,1,x.id);
  for(const x of e.links)assert.equal((page.match(new RegExp('data-link="'+x.id+'"',"g"))||[]).length,1,x.id);
 }
});
test("the independent sample includes mobile layout rules",()=>assert.match(html(fixture),/@media\(max-width:800px\)/));
