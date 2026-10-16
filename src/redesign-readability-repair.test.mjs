import test from 'node:test';
import assert from 'node:assert/strict';
import {measuredReadabilityPatch} from './redesign-readability-repair.mjs';
test('fixes only observed prose width and mobile narrow reading',()=>{
 const result=measuredReadabilityPatch({viewports:{desktop:{issues:['excessive-line-length']},mobile:{issues:['unreadable-typography'],narrowColumns:['Source quote']}}});
 assert.match(result.css,/max-inline-size:min\(100%,67ch\)/);
 assert.match(result.css,/@media\(max-width:600px\)/);
 assert.equal(result.changes.length,2);
});
test('does not rewrite already valid layouts',()=>{
 assert.deepEqual(measuredReadabilityPatch({viewports:{desktop:{issues:[]},mobile:{issues:[]}}}),{css:'',changes:[]});
});
