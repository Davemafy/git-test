import test from 'node:test';
import assert from 'node:assert/strict';
import {materializeHtmlCss,resolveCssAssetUrls} from './source-html-css.mjs';

test('relative CSS asset URLs resolve against actual stylesheet location',()=>{
 const css='section{background:url("../img/hero.png")} @font-face{src:url(../fonts/body.woff2)}';
 const result=resolveCssAssetUrls(css,'https://cdn.example.org/assets/css/app.css');
 assert.match(result,/https:\/\/cdn\.example\.org\/assets\/img\/hero\.png/);
 assert.match(result,/https:\/\/cdn\.example\.org\/assets\/fonts\/body\.woff2/);
 assert.equal(resolveCssAssetUrls('a{background:url("data:image/png;base64,abcd")}', 'https://example.com/app.css').includes('data:image/png;base64,abcd'),true);
});

test('external CSS stays in original cascade position while remaining separately processable',()=>{
 const result=materializeHtmlCss({
  page:{html:'<!DOCTYPE html><html><head><base href="https://example.org/"><link data-slp-css-index="0" rel="stylesheet" href="/app.css"><style data-slp-css-index="1">h1{opacity:0}</style></head><body><main><h1>Hello</h1></main></body></html>'},
  stylesheets:[{ownerIndex:0,href:'https://example.org/app.css',media:'',css:'h1{color:red}',source:'cssom'},
   {ownerIndex:1,href:null,media:'',css:'h1{opacity:1}',source:'cssom'}],
  adopted:[]
 });
 assert.equal(result.files.length,1);
 assert.match(result.html,/<style data-slp-css-source="0">h1\{color:red\}<\/style>/);
 assert.match(result.html,/<style>h1\{opacity:1\}<\/style>/);
 assert.ok(result.html.indexOf('h1{color:red}')<result.html.indexOf('h1{opacity:1}'));
 assert.ok(!result.html.includes('data-slp-css-index'));
 assert.ok(!result.html.includes('href="./styles/'));
});

test('CSS capture failure stays visible without silently replacing a real stylesheet',()=>{
 const original='<html><head><link data-slp-css-index="0" rel="stylesheet" href="https://external.example.org/styles.css"></head><body></body></html>';
 const result=materializeHtmlCss({page:{html:original},stylesheets:[{
  ownerIndex:0,href:'https://external.example.org/styles.css',css:null,source:'SecurityError'}],adopted:[]});
 assert.ok(result.html.includes('https://external.example.org/styles.css'));
 assert.equal(result.report[0].captured,false);
});
