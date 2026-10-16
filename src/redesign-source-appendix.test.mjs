import test from 'node:test';
import assert from 'node:assert/strict';
import {compileContentTemplate,reconcileAuthoredSourceCoverage,focalObservedAsset} from './redesign-content.mjs';

const evidence={
 title:'Sample',sourceUrl:'https://example.org/',lang:'en',
 preservedContent:[
  {id:'c0',tag:'h1',text:'The essential headline'},
  {id:'c1',tag:'p',text:'The meaningful introductory sentence.'},
  {id:'c2',tag:'h2',text:'Secondary research details'},
  {id:'c3',tag:'p',text:'This section has longer original source content that should remain accessible.'},
  {id:'c4',tag:'blockquote',text:'A source quote with real text'},
  {id:'c5',tag:'p',text:'Independent third source annotation.'}
 ],
 links:[{id:'l0',text:'Check this',href:'https://example.org/check',role:'prominent-action'}],
 assets:[]
};
const authored='<header class="masthead"></header><main><section data-composition="opening" class="own-stage"><h1 data-content="c0"></h1><p data-content="c1"></p><a data-link="l0"></a></section></main><footer></footer>';
test('an authored composition stays intact while source evidence is grouped in accessible disclosure',()=>{
 let error;try{compileContentTemplate(authored,evidence)}catch(e){error=e}
 assert.equal(error.code,'TEMPLATE_COVERAGE');
 const revised=reconcileAuthoredSourceCoverage(authored,evidence,error,{protectedIds:['c0','c1']});
 assert.ok(revised.includes('class="own-stage"'));
 assert.ok(revised.includes('<details class="source-appendix">'));
 assert.ok(!revised.includes('This section has longer original source content'));
 const rendered=compileContentTemplate(revised,evidence);
 assert.ok(rendered.includes('The essential headline'));
 assert.ok(rendered.includes('Secondary research details'));
 assert.ok(rendered.includes('A source quote with real text'));
 assert.ok(rendered.includes('https://example.org/check'));
 assert.equal((rendered.match(/<h1\b/g)||[]).length,1);
 assert.equal((rendered.match(/class="own-stage"/g)||[]).length,1);
});
test('a missing lead or selected opening proof cannot be hidden in supplementary details',()=>{
 const error={code:'TEMPLATE_COVERAGE',missingContent:['c2'],missingAssets:[],missingLinks:[]};
 assert.equal(reconcileAuthoredSourceCoverage(authored,evidence,error,{protectedIds:['c2']}),null);
 assert.equal(reconcileAuthoredSourceCoverage(authored,evidence,{...error,missingContent:['c0']}),null);
 assert.equal(reconcileAuthoredSourceCoverage(authored,evidence,{...error,missingAssets:['a0']}),null);
});
test('a page exceeding the recovered-source budget fails without generating a waterfall',()=>{
 const error={code:'TEMPLATE_COVERAGE',missingContent:['c2','c3','c4'],missingAssets:[],missingLinks:[]};
 assert.equal(reconcileAuthoredSourceCoverage(authored,evidence,error,{limit:2}),null);
});

test('observed large focal imagery is separated from logos and secondary screenshots',()=>{
 const e={...evidence,preservedContent:evidence.preservedContent.slice(0,2),assets:[
  {id:'a0',src:'https://example.org/logo.png',alt:'Logo',important:true,observedBox:{x:20,y:20,width:150,height:50}},
  {id:'a1',src:'https://example.org/scene.png',alt:'Original product scene',important:true,observedBox:{x:620,y:160,width:720,height:560}},
  {id:'a2',src:'https://example.org/detail.png',alt:'Original detail',important:true,observedBox:{x:100,y:1550,width:550,height:400}}
 ]};
 assert.equal(focalObservedAsset(e)?.id,'a1');
 const authoredWithMedia=authored.replace('</section></main>',
  '<figure data-assetset="hero" class="source-media"></figure></section>'+
  '<section><figure data-assetset="remaining" class="supporting-media"></figure></section></main>');
 const html=compileContentTemplate(authoredWithMedia,e);
 assert.equal((html.match(/data-asset-id="a1"/g)||[]).length,1);
 assert.equal((html.match(/data-asset-id="a0"/g)||[]).length,1);
 assert.equal((html.match(/data-asset-id="a2"/g)||[]).length,1);
 assert.match(html,/<figure data-assetset="hero" class="source-media"><img class="observed-asset" data-asset-id="a1"/);
 const heroMarkup=html.match(/<figure data-assetset="hero"[^>]*>([\s\S]*?)<\/figure>/)?.[1]||'';
 assert.ok(!heroMarkup.includes('data-asset-id="a0"'));
});

test('a page without an observed hero-sized asset cannot invent a hero screenshot',()=>{
 const e={...evidence,assets:[
  {id:'a0',src:'https://example.org/icon.png',alt:'Icon',important:true,observedBox:{x:0,y:0,width:48,height:48}},
  {id:'a1',src:'https://example.org/icon2.png',alt:'Icon',important:true,observedBox:{x:60,y:0,width:48,height:48}}
 ]};
 assert.equal(focalObservedAsset(e),null);
});
