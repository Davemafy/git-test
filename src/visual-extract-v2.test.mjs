import test from 'node:test';
import assert from 'node:assert/strict';
import {pairStructuralViewports,wireframeSvg,relationshipsFor} from './visual-extract-v2.mjs';

const n=(key,type,box,extra={})=>({key,type,box,pairable:true,paintOrder:0,lineRects:[],...extra});
const sample=(w,nodes)=>({version:2,viewport:{width:w,height:1000,documentHeight:2500},nodes});

test('responsive pairing uses unique semantic identities and does not guess duplicated elements',()=>{
 const d=sample(1440,[n('hero','heading',{x:200,y:200,w:790,h:90}),n('cta','control',{x:210,y:450,w:155,h:50}),n('dupe','text',{x:20,y:600,w:300,h:35}),n('dupe','text',{x:20,y:800,w:300,h:35})]);
 const m=sample(390,[n('cta','control',{x:24,y:640,w:340,h:54}),n('hero','heading',{x:24,y:150,w:340,h:150}),n('dupe','text',{x:16,y:550,w:320,h:35}),n('dupe','text',{x:16,y:600,w:320,h:35})]);
 const paired=pairStructuralViewports(d,m);
 assert.equal(paired.coverage.paired,2);
 assert.equal(paired.pairs.find(x=>x.key==='hero').mobile.w,340);
 assert.equal(paired.pairs.find(x=>x.key==='cta').desktop.w,155);
 assert.ok(!paired.pairs.some(x=>x.key==='dupe'));
});

test('wireframe uses exact observed text-line, action and media rectangles',()=>{
 const source=sample(390,[n('heading','heading',{x:20,y:130,w:300,h:80},{lineRects:[{x:20,y:136,w:270,h:35},{x:20,y:174,w:200,h:35}]}),n('art','media',{x:0,y:340,w:390,h:250}),n('cta','control',{x:24,y:280,w:180,h:44})]);
 const svg=wireframeSvg(source,{maxHeight:650});
 assert.match(svg,/x="20" y="144.75" width="270"/);
 assert.match(svg,/x="0" y="340" width="390" height="250"/);
 assert.match(svg,/x="24" y="280" width="180" height="44"/);
 assert.ok(!svg.includes('product development system'));
});

test('measured graph represents actual alignment and occlusion, not artificial design scores',()=>{
 const source=sample(1440,[n('heading','heading',{x:150,y:160,w:600,h:100}),n('copy','text',{x:150,y:300,w:520,h:110}),n('art','media',{x:470,y:200,w:700,h:400})]);
 const edges=relationshipsFor(source);
 assert.ok(edges.some(e=>e.type==='left-aligned'&&e.a==='heading'&&e.b==='copy'));
 assert.ok(edges.some(e=>e.type==='overlap'&&(e.a==='art'||e.b==='art')));
});


test('large clickable product cards are outlined, not filled giant action blocks',()=>{
 const src=sample(1440,[n('product-tile','card',{x:120,y:450,w:700,h:600}),
  n('checkout','control',{x:160,y:1080,w:140,h:48})]);
 const svg=wireframeSvg(src,{maxHeight:1400});
 assert.match(svg,/x="120" y="450" width="700" height="600" fill="none" stroke="#aaa"/);
 assert.match(svg,/x="160" y="1080" width="140" height="48" fill="#4f4f4f"/);
});
