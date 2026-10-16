#!/usr/bin/env node
/**
 * SEAL 20-reference A/B experiment against ONE deployed Sloppertizer revision.
 * Reads public output only. Does not assert professional design quality or
 * user preference; creates side-by-side reproducible artifacts for review.
 */
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const api=(process.env.SMOKE_API_URL||'https://sloppertizer-production.up.railway.app').replace(/\/$/,'');
const target='https://seal-live.netlify.app/';
const out=process.env.BENCHMARK_OUT||'pilot20-output';
const expected=process.env.SMOKE_EXPECTED_REVISION||'';
const experimentalMarker=process.env.BENCHMARK_MARKER||'[[sloppertizer-pilot20]]';
if(!['[[sloppertizer-pilot20]]','[[sloppertizer-measured3]]','[[sloppertizer-quality]]'].includes(experimentalMarker))
 throw Error('Unknown reference experiment marker');
const experiments=[
 {name:'native-candidate',marker:' [[sloppertizer-native]]'}
];
const now=()=>new Date().toISOString();
const sleep=t=>new Promise(r=>setTimeout(r,t));
const result={schemaVersion:1,startedAt:now(),target,expectedRevision:expected,
 conditions:[],interpretation:'Outputs are technically measurable; visual preference requires independent blind review.'};
async function request(path,options={}){
 const res=await fetch(api+path,{...options,signal:AbortSignal.timeout(25000)});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw Error('HTTP '+res.status+' '+path+' '+JSON.stringify(data).slice(0,300));
 return data;
}
async function save(){await fs.mkdir(out,{recursive:true});await fs.writeFile(out+'/results.json',JSON.stringify(result,null,2)+'\n')}
async function waitRevision(){
 if(!expected)throw Error('A pinned production revision is required for a controlled experiment');
 for(let n=0;n<80;n++){
  try{const h=await request('/api/health');if(h.apiOnly&&h.revision===expected){console.log('Pinned deploy ready',expected);return}}
  catch(e){console.log('Health read error',e.message)}
  if(n%6===0)console.log('Waiting for pinned Railway deployment',expected,n);
  await sleep(6000);
 }
 throw Error('Pinned Railway revision not deployed within 8 minutes');
}
const metricScript=()=>({
 title:document.title,
 headings:[...document.querySelectorAll('h1,h2,h3')].map(x=>({tag:x.tagName,text:x.textContent?.trim().slice(0,140),fontPx:+parseFloat(getComputedStyle(x).fontSize).toFixed(1)})),
 links:document.querySelectorAll('a[href]').length,
 controls:document.querySelectorAll('form,input,textarea,select').length,
 viewportWidth:innerWidth,scrollWidth:document.documentElement.scrollWidth,
 height:document.documentElement.scrollHeight,
 smallTextElements:[...document.querySelectorAll('p,small,li,a,span')].filter(x=>{
  const r=x.getBoundingClientRect(),s=getComputedStyle(x);
  return r.width>10&&r.height>2&&s.display!=='none'&&parseFloat(s.fontSize)<13&&x.textContent?.trim();
 }).length,
 bodyCharacters:document.body?.innerText?.length||0,
 bodyBackground:getComputedStyle(document.body).backgroundColor,
 mainExists:!!document.querySelector('main'),
 heroCount:document.querySelectorAll('[data-composition=opening]').length
});
async function render(browser,condition,id){
 const summary={};
 for(const [name,width,height] of [['desktop',1440,900],['tablet',768,960],['mobile',390,844]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  try{
   const page=await context.newPage();
   await page.goto(api+'/preview/'+id+'/',{waitUntil:'domcontentloaded',timeout:45000});
   await page.evaluate(()=>document.fonts?.ready).catch(()=>{});
   await page.screenshot({path:out+'/'+condition+'-'+name+'.png',fullPage:true,animations:'disabled'});
   summary[name]=await page.evaluate(metricScript);
  }finally{await context.close()}
 }
 return summary;
}
await save();
try{
 await waitRevision();
 const browser=await chromium.launch({headless:true});
 try{
 for(let idx=0;idx<experiments.length;idx++){
  const sample=experiments[idx],condition={name:sample.name,startedAt:now(),phase:'not-started'};
  result.conditions.push(condition);await save();
  const direction='Improve visual hierarchy, typographic character, source-brand composition and mobile clarity without inventing evidence or omitting copy.'+sample.marker;
  try{
   let job=await request('/api/redesign/jobs',{method:'POST',headers:{'content-type':'application/json',origin:'https://sloppertizer.davemafy.xyz'},
    body:JSON.stringify({url:target,direction,requestKey:'pilot20-'+(process.env.GITHUB_RUN_ID||Date.now())+'-'+sample.name})});
   condition.jobId=job.id;condition.phase=job.phase;await save();
   const deadline=Date.now()+12*60_000;
   let last='';
   while(Date.now()<deadline){
    if(job.phase!==last){console.log(sample.name,job.phase,job.message,job.errorCode||'');last=job.phase;}
    if(['ready','failed'].includes(job.phase))break;
    await sleep(6500);
    job=await request('/api/jobs/'+job.id);
   }
   condition.phase=job.phase;condition.message=job.message;condition.errorCode=job.errorCode||null;
   condition.diagnostics=job.diagnostics||null;
   condition.preview=job.links?.preview?api+job.links.preview:null;
   condition.reportStatus=job.report?.verification||null;
   condition.fallbackUsed=job.report?.redesign?.fallbackUsed??null;
   condition.templateOrigin=job.report?.redesign?.templateOrigin??null;
   condition.references=job.report?.redesign?.designResearch?.pilotReferences||null;
   if(job.phase==='ready'){
    condition.measurements=await render(browser,sample.name,job.id);
    condition.productionStatus='browser-verified';
   } else condition.productionStatus='failed-not-evaluable';
  }catch(e){condition.phase='harness-error';condition.message=String(e.message).slice(0,400);console.error(sample.name,e);}
  condition.finishedAt=now();await save();
  // Avoid overlapping Groq per-minute quotas.
  if(idx===0&&experiments.length>1)await sleep(32000);
 }
 }finally{await browser.close()}
}finally{
 result.finishedAt=now();
 result.completedConditions=result.conditions.filter(x=>x.phase==='ready').length;
 result.visualPreferenceVerified=false;await save();
}
console.log('Pilot A/B output:',JSON.stringify(result.conditions.map(x=>({name:x.name,id:x.jobId,phase:x.phase,fallback:x.fallbackUsed,refs:x.references?.selected?.map(y=>y.id),preview:x.preview}))));
if(result.completedConditions!==1)process.exitCode=2;
