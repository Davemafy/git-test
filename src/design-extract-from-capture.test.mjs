import test from 'node:test';
import assert from 'node:assert/strict';
import {fromExistingBrowserCapture} from './design-extract-from-capture.mjs';

const sample=(w,leadingY)=>({
 page:{viewport:{width:w,height:800},document:{width:w,height:1800}},
 dom:[
  {index:0,parentIndex:null,domPath:'0',tag:'main',box:{x:0,y:0,width:w,height:1600},style:{
    display:'grid',gridTemplateColumns:w>500?'1fr 1fr':'1fr',backgroundColor:'rgb(250, 250, 250)'},
   visual:{surface:true,leaf:false}},
  {index:1,parentIndex:0,domPath:'0.0',tag:'h1',ownText:'Real website design',
   box:{x:20,y:leadingY,width:w-40,height:96},
   textRuns:[{text:'Real website',box:{x:20,y:leadingY,width:200,height:40}},
     {text:'design',box:{x:20,y:leadingY+45,width:135,height:40}}],
   style:{fontSize:w>500?'64px':'38px',fontWeight:'700',lineHeight:'1.05'},
   visual:{surface:false,leaf:true}},
  {index:2,parentIndex:0,domPath:'0.1',tag:'svg',box:{x:20,y:300,width:w-40,height:350},
   svgMarkup:'<svg><!--source visual--></svg>',style:{transform:'none',objectFit:'cover'},
   visual:{surface:false,replaced:true,leaf:true}}
 ]
});
const layout={nodes:[{sourceIndex:0,paintOrder:1,bounds:[0,0,1440,1600]},
 {sourceIndex:1,paintOrder:3,bounds:[20,90,1000,96]},
 {sourceIndex:2,paintOrder:4,bounds:[20,300,1200,350]}]};

test('existing CDP capture turns into a nested, paint-ordered composition with measured glyph lines',()=>{
 const doc=fromExistingBrowserCapture({sourceUrl:'https://example.com',captureId:'capture-abc',
  desktop:sample(1440,90),mobile:sample(390,100),desktopLayout:layout,mobileLayout:layout,
  screenshotDigests:{desktop:'d'.repeat(64),mobile:'m'.repeat(64)}});
 assert.equal(doc.views.desktop.nodes.length,3);
 assert.equal(doc.views.desktop.nodes[0].children.length,2);
 assert.equal(doc.views.desktop.nodes[1].textLineRects.length,2);
 assert.equal(doc.views.desktop.nodes[1].computed.fontSize,'64px');
 assert.equal(doc.views.mobile.nodes[1].computed.fontSize,'38px');
 assert.equal(doc.views.desktop.nodes[2].kind,'media');
 assert.equal(doc.views.desktop.nodes[2].paintOrder,4);
 assert.equal(doc.views.desktop.screenshotSha256,'d'.repeat(64));
 assert.equal(doc.responsive.pairs.length,3);
 assert.equal(doc.rights.metadataRetrieval,false);
 assert.equal(JSON.stringify(doc).includes('Real website design'),false);
 assert.equal(JSON.stringify(doc).includes('source visual'),false);
});

test('source native content and its semantic geometry stay separate from screenshot proof',()=>{
 const desktop=sample(1440,90),mobile=sample(390,100);
 mobile.dom.pop();
 const doc=fromExistingBrowserCapture({sourceUrl:'https://example.com/',captureId:'different',
  desktop,mobile,desktopLayout:{nodes:[]},mobileLayout:{nodes:[]}});
 assert.equal(doc.responsive.pairs.length,2);
 assert.equal(doc.views.desktop.measurements.paintedNodes,0);
 assert.equal(doc.views.mobile.measurements.media,0);
 assert.equal(doc.renderBasis,'original-browser-screenshot-not-recreated-layout');
});

test('invalid or missing browser captures cannot masquerade as accurate extracts',()=>{
 assert.throws(()=>fromExistingBrowserCapture({sourceUrl:'https://example.com',captureId:'abc',
  desktop:sample(1440,90),mobile:{page:{viewport:{width:390,height:844}},dom:[]}}),/missing real browser element geometry/);
 assert.throws(()=>fromExistingBrowserCapture({sourceUrl:'file:///etc/passwd',captureId:'abc',
  desktop:sample(1440,90),mobile:sample(390,100)}),/Public HTTP/);
});
