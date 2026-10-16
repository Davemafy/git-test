import test from 'node:test';
import assert from 'node:assert/strict';
import {structuralCssBlueprint} from './redesign-css-blueprint.mjs';

test('CSS sees full nested hero and source scene, not only a deduplicated class inventory',()=>{
 const html='<header class="topbar"><nav><a data-link="l0"></a></nav></header>'+
 '<main><section data-composition="opening" class="hero split">'+
 '<div class="hero-copy"><h1 data-content="c0"></h1><p data-content="c1"></p></div>'+
 '<figure data-assetset="hero" class="source-media"></figure></section>'+
 '<section class="sources"><article class="proof"><h2 data-content="c2"></h2></article></section></main>';
 const {blueprint,mode}=structuralCssBlueprint(html);
 assert.equal(mode,'nested-dom');
 assert.match(blueprint,/<section class="hero split" data-composition="opening"><div class="hero-copy"><h1 data-content="slot"><\/h1><p data-content="slot"><\/p><\/div><figure class="source-media" data-assetset="hero"><\/figure><\/section>/);
 assert.match(blueprint,/<section class="sources"><article class="proof">/);
 assert.ok(!blueprint.includes('>body >'));
});

test('class condensation retains nesting and media/action roles without truncating',()=>{
 const body=Array.from({length:40},(_,i)=>'<section class="long-distinctive-class-'+i+' secondary unique"><div class="hero-content-important"><a data-link="l'+i+'"></a></div></section>').join('');
 const r=structuralCssBlueprint('<main>'+body+'</main>',{maxBytes:3900});
 assert.ok(r.blueprint.startsWith('<main><section'));
 assert.equal(r.truncated,false);
 assert.equal((r.blueprint.match(/<section/g)||[]).length,40);
});
test('too-large structural source is explicitly rejected rather than silently flattened',()=>{
 const body=Array.from({length:200},(_,i)=>'<div class="hero-proof">'+i+'</div>').join('');
 assert.throws(()=>structuralCssBlueprint(body,{maxBytes:100}),{code:'CONTENT_BUDGET'});
});