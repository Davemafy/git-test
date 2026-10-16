import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeDesignSelectorInventory,nativePolishPrompt,applyNativePolishHtml} from './native-css-redesign.mjs';
const html='<!DOCTYPE html><html><head><style>.hero{display:grid}.notice-card{transform:rotate(-3deg)}</style></head>'+
'<body><main><section class="hero"><div class="hero-copy"><h1>The original headline</h1></div>'+
'<div class="hero-visual"><div class="notice-card">Real source object</div><div class="source-card">Official reference</div></div>'+
'</section></main></body></html>';
const evidence={title:'Verification',preservedContent:[{tag:'h1',text:'The original headline'}],
 brand:{dominantSurface:'rgb(245,244,240)',colors:[{value:'rgb(30,55,180)'}]}};
test('source-native polish preserves source-built objects and author CSS rather than regenerating HTML',()=>{
 const css='.hero{grid-template-columns:40% 60%;padding:40px;min-height:700px}.notice-card{transform:rotate(-6deg);box-shadow:10px 10px 0 #ddd}.source-card{background:#142735;color:white;border:1px solid #444;padding:18px}';
 const next=applyNativePolishHtml(html,css);
 assert.match(next,/<div class="notice-card">Real source object<\/div>/);
 assert.match(next,/<div class="source-card">Official reference<\/div>/);
 assert.match(next,/<style>\.hero\{display:grid\}/);
 assert.ok(next.indexOf('.notice-card{transform:rotate(-3deg)}')<next.indexOf('.notice-card{transform:rotate(-6deg)}'));
 assert.equal((next.match(/<h1>/g)||[]).length,1);
});
test('model receives only actual source selectors rather than text fragments',()=>{
 const names=nativeDesignSelectorInventory(html).map(x=>x.name);
 assert.ok(names.includes('hero-visual'));assert.ok(names.includes('notice-card'));
 const prompt=nativePolishPrompt({html,evidence,direction:'Improve layout'});
 assert.ok(prompt.includes('notice-card'));
 assert.ok(prompt.includes('source-card'));
 assert.ok(prompt.includes('The original headline'));
});
test('unsafe resource injection and unstripped scripts are refused',()=>{
 assert.throws(()=>applyNativePolishHtml(html,'.hero{background:url(https://somewhere.invalid/malicious)}'),/invalid or unsafe/);
 assert.throws(()=>applyNativePolishHtml(html.replace('</body>','<script>alert(1)</script></body>'),'.hero{display:grid;min-height:100vh;grid-template-columns:1fr 1fr}'),/sanitized/);
});
