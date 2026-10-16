import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadRedesignEvidence} from './redesign-evidence.mjs';
import {researchDirectedRedesign} from './redesign-intelligence.mjs';
import {layoutContentPlan,sourceContentSections,compileContentTemplate,normalizeContentTemplate,restoreMissingRenderedSource,completeObservedSourceSlots,reconcileAuthoredSourceCoverage,buildCompleteObservedLayout} from './redesign-content.mjs';
import {redesignProvider,requestRedesignJson} from './redesign-model.mjs';
import {validateRedesignSite,normalizeRedesignCss,appendRedesignRepairCss,assembleRedesignDocument,inspectRedesign,redesignViews} from './redesign-browser.mjs';
import {measuredContrastPatch} from './redesign-contrast-repair.mjs';
import {measuredOverflowPatch} from './redesign-overflow-repair.mjs';
import {bundleObservedAssets} from './site-asset-bundle.mjs';
import {judgeRedesignVisual,redesignVisualReviewConfig} from './redesign-visual-review.mjs';
import {referenceFallbackStyles} from './redesign-visual-grammars.mjs';

export function urlRedesignConfigured(env=process.env){try{return Boolean(redesignProvider(env))}catch{return false}}
export function codeModelForStage(env,provider){return env.SLOPPERTIZER_REDESIGN_CODE_MODEL||provider.model;}
export function cssModelForStage(env,provider){
 // Groq account quotas are model-specific. Keep source-slot composition on Qwen
 // while sending CSS synthesis to a separately tracked, officially supported
 // text model instead of draining Qwen's small rolling TPM allowance.
 if(env.SLOPPERTIZER_REDESIGN_CSS_MODEL)return env.SLOPPERTIZER_REDESIGN_CSS_MODEL;
 return provider.base==='https://api.groq.com/openai/v1'&&/^qwen\//i.test(provider.model)
  ?'openai/gpt-oss-20b':provider.model;
}


export function fallbackRedesignModel({error,provider,env,initialModel,fallbackUsed=false}){
 if(fallbackUsed||!['RATE_LIMIT','INCOMPATIBLE_MODEL'].includes(error.code))return null;
 const configured=env.SLOPPERTIZER_REDESIGN_FALLBACK_MODEL;
 if(configured&&configured!==provider.model)return configured;
 // A model that rejected JSON requests is not an automatic substitute for a
 // throttled model. Wait for its quota, or report RATE_LIMIT honestly.
 if(error.code==='INCOMPATIBLE_MODEL'&&initialModel!==provider.model)return initialModel;
 return null;
}

const json=(file,value)=>fs.writeFile(file,JSON.stringify(value,null,2)+'\n');
const hash=x=>createHash('sha256').update(x).digest('hex');
const limits='No invented copy, statistics, badges or functionality. Avoid reflexive gradients, orbs, bento grids and repeated feature cards; do not reject a distinctive source-brand decision merely for resembling a trend. Preserve observed brand accents. Compose for the purpose of THIS site. Body text >=16px, secondary labels >=14px; text contrast >=4.5 (large headings >=3). Desktop max content width, considered hierarchy, deliberate spacing and a responsive 390px composition; no fixed-width overflow. Use native details/summary for a mobile menu when needed. Preserve every required content string and every observed link destination, including mailto. Preserve important observed assets. Never hide content to pass tests. Unknown backend actions must link to the original site.';
export function validateDirection(raw,evidence,{requireComposition=false}={}){
 const allowed=new Set(['page','responsive',...evidence.preservedContent.map(x=>x.id),...evidence.layout.headings.map(x=>x.id),...evidence.links.map(x=>x.id),...evidence.assets.map(x=>x.id),...evidence.weaknesses.map(x=>x.id)]);
 if(typeof raw?.direction!=='string'||raw.direction.length<30||raw.direction.length>1400||!Array.isArray(raw.changes)||raw.changes.length<3||raw.changes.length>7)
  throw Object.assign(Error('The model omitted a specific design direction and grounded changes.'),{code:'INVALID_MODEL_OUTPUT'});
 const changes=raw.changes.map(x=>{
  if(typeof x.change!=='string'||!Array.isArray(x.evidenceIds)||!x.evidenceIds.length||x.evidenceIds.some(id=>!allowed.has(id)))
   throw Object.assign(Error('The model proposed an unsupported design change.'),{code:'INVALID_MODEL_OUTPUT'});
  return {change:x.change.slice(0,350),evidenceIds:x.evidenceIds.slice(0,4)};
 });
 let composition;
 if(requireComposition||raw.composition){
  const fail=field=>{throw Object.assign(Error('Composition '+field+' must use observed source IDs and the requested JSON type.'),{code:'INVALID_MODEL_OUTPUT'})};
  const c=raw.composition,content=new Set(evidence.preservedContent.filter(x=>x.tag!=='a').map(x=>x.id)),links=new Set(evidence.links.map(x=>x.id));
  if(!c)fail('object');
  // The evidence also names measured headings and source anchor blocks. These
  // are real references, so canonicalize them to the immutable content slots.
  const headingAliases=new Map(evidence.layout.headings.map(h=>[h.id,evidence.preservedContent.find(x=>x.text===h.text&&x.tag!=='a')?.id]).filter(([,id])=>id));
  const linkAliases=new Map(evidence.preservedContent.filter(x=>x.href).map(x=>[x.id,evidence.links.find(l=>l.href===x.href&&l.text===x.text)?.id]).filter(([,id])=>id));
  const contentId=id=>headingAliases.get(id)||id,leadContentId=contentId(c.leadContentId),primaryLinkId=linkAliases.get(c.primaryLinkId)||c.primaryLinkId;
  if(leadContentId!==null&&!content.has(leadContentId))fail('leadContentId');
  if(primaryLinkId!==null&&!links.has(primaryLinkId))fail('primaryLinkId');
  const proofId=id=>linkAliases.get(contentId(id))||contentId(id),proofAllowed=new Set([...content,...links,...evidence.assets.map(x=>x.id)]);
  if(!Array.isArray(c.proofContentIds)||c.proofContentIds.length>5||c.proofContentIds.some(id=>!proofAllowed.has(proofId(id))))fail('proofContentIds');
  const sourceIds=new Set(evidence.preservedContent.map(x=>x.id));
  if(!Array.isArray(c.sectionOrder)||c.sectionOrder.length>250||c.sectionOrder.some(id=>!sourceIds.has(contentId(id))))fail('sectionOrder');
  if(typeof c.layoutIntent!=='string'||c.layoutIntent.length<20||c.layoutIntent.length>400)fail('layoutIntent');
  if(typeof c.typeDirection!=='string'||c.typeDirection.length<15||c.typeDirection.length>250)fail('typeDirection');
  // A planner may list every real source block. Keep its section order by
  // retaining actual heading boundaries; do not invent or discard source copy.
  const ordered=[...new Set(c.sectionOrder.map(contentId))],sectionIds=new Set(evidence.preservedContent.filter(x=>/^h[1-6]$/.test(x.tag)).map(x=>x.id));
  const proofRefs=[...new Set(c.proofContentIds.map(proofId))],proofGroups=sourceContentSections(evidence).filter(x=>x.headingId!==leadContentId&&(x.contentIds.some(id=>proofRefs.includes(id))||x.linkIds.some(id=>proofRefs.includes(id))));
  const openingHeadings=new Set([leadContentId,...proofGroups.map(x=>x.headingId)]);
  const sectionOrder=sectionIds.size?ordered.filter(id=>sectionIds.has(id)&&!openingHeadings.has(id)):ordered.filter(id=>content.has(id)).slice(0,12);
  composition={leadContentId,primaryLinkId,proofContentIds:[...new Set([...proofGroups.map(x=>x.headingId),...proofRefs])],sectionOrder,layoutIntent:c.layoutIntent,typeDirection:c.typeDirection};
  const primary=evidence.preservedContent.filter(x=>x.tag==='h1');
  if(primary.length===1&&leadContentId!==primary[0].id)throw Object.assign(Error('The composition must lead with the observed primary headline, not the SEO title.'),{code:'INVALID_MODEL_OUTPUT'});
 }
 return {direction:raw.direction,changes,...(composition?{composition}:{}),weaknesses:(raw.weaknesses||[]).slice(0,7).filter(x=>Array.isArray(x.evidenceIds)&&x.evidenceIds.length&&x.evidenceIds.every(id=>allowed.has(id))),
  unknowns:evidence.unknownFunctionality};
}
export async function validatedRedesignStage({request,validate,onRetry=()=>{}}){
 let failure=null;
 for(let attempt=0;attempt<2;attempt++){
  let response;
  try{response=await request({attempt,feedback:failure?String(failure.message).slice(0,180):''})}
  catch(error){
   if(error.code!=='INVALID_MODEL_OUTPUT'||attempt===1)throw error;
   failure=error;await onRetry();continue;
  }
  try{return {response,value:validate(response.data),attempts:attempt+1}}
  catch(error){
   if(attempt===1)throw error;
   failure=error;await onRetry();
  }
 }
}
// Keep the EXACT generated HTML, but do not send the entire research report
// again to the CSS model. Groq has a small request/context allowance.
export function buildRedesignCssPrompt({template,evidence,design,brief,maxBytes=10500}){
 const rules='Implement a complete CSS stylesheet for the supplied exact HTML. Return JSON {css:COMPLETE_STYLESHEET}, no HTML. Style only real classes, preserve every text/link/image, and never hide content. Use original observed brand surface, fonts and accent. Product-specific hierarchy and intentional composition must outweigh trendy decoration. Content grid about 1120px with considered desktop gutters and 20px mobile gutters. Intentional type scale, readable 60-68ch prose and 16px minimum body copy; buttons intrinsic width, not stretched. Use 390/768/1440 responsive layouts with no overflow, high-contrast readable text, focus-visible and reduced-motion. Reset nav bullets; keep details/summary usable on mobile. Prefer few clear sections over repetitive boxed prose. Treat .source-appendix as secondary progressive-disclosure material: make its native summary an elegant, visible invitation; style nested content as a restrained readable reference document, never as a huge hero or card wall. No @import, @font-face, url(), HTML, active content, external fonts, fabricated UI or invented resources. CSS under 6500 characters.';
 const brand={surface:evidence.brand?.dominantSurface,
  fonts:evidence.brand?.fontFamilies?.slice(0,2).map(x=>x.value),
  colors:evidence.brand?.colors?.slice(0,4).map(x=>x.value)};
 const plan={purpose:brief.purpose,grammar:brief.grammar,
  direction:design.direction.slice(0,260),
  typeDirection:design.composition.typeDirection,
  layoutIntent:design.composition.layoutIntent,
  cautions:brief.cautions.slice(0,4).map(x=>x.id),
  ...(brief.pilotReferences?{pilotReferences:brief.pilotReferences.selected.slice(0,3)
   .map(x=>({id:x.id,principle:x.principle.slice(0,75)}))}:{}),
  ...(brief.measuredRelationship?{compositionRelationship:{
   id:brief.measuredRelationship.id,family:brief.measuredRelationship.family,
   focal:brief.measuredRelationship.focalObject,
   mobile:brief.measuredRelationship.mobileTransition.slice(0,120)}}:{})};
 const hints=evidence.preservedContent.filter(x=>/^h[1-6]$/.test(x.tag))
  .slice(0,12).map(x=>({id:x.id,text:x.text.slice(0,80),size:x.text.length}));
 const assemble=(withHints=true,markup=template,label='EXACT HTML')=>rules+'\nDESIGN:'+JSON.stringify(plan)+
  '\nBRAND:'+JSON.stringify(brand)+
  (withHints?'\nHEADING LENGTHS:'+JSON.stringify(hints):'')+
  '\n'+label+':\n'+markup;
 let prompt=assemble();
 if(Buffer.byteLength(prompt)>maxBytes)prompt=assemble(false);

// CSS generation needs existing selectors, not thousands of repeated source slots.
// Fall back to a deduplicated hierarchy inventory when exact HTML is too large.
 if(Buffer.byteLength(prompt)>maxBytes){
  const seen=new Set(),stack=[],entries=[];
  for(const token of String(template).matchAll(/<(\/)?([a-z][a-z0-9-]*)\b([^>]*)>/gi)){
   const tag=token[2].toLowerCase();
   if(token[1]){const i=stack.lastIndexOf(tag);if(i>=0)stack.splice(i);continue;}
   const attrs=token[3],classes=(attrs.match(/\bclass\s*=\s*(["'])(.*?)\1/i)?.[2]||'')
    .split(/\s+/).filter(x=>/^[a-zA-Z_][\w-]*$/.test(x)).slice(0,9);
   const selector=tag+classes.map(x=>'.'+x).join('');
   const entry=(stack.at(-1)||'body')+' > '+selector;
   if(!seen.has(entry)){seen.add(entry);entries.push(entry);}
   if(!['img','br','hr'].includes(tag)&&!attrs.trimEnd().endsWith('/'))stack.push(tag);
  }
  for(const maxLines of [180,140,100,65,40]){
   const outline=entries.slice(0,maxLines).join('\n');
   prompt=assemble(maxLines>100,outline,'CLASS AND ELEMENT OUTLINE (existing tags/classes only; source text is injected later)');
   if(Buffer.byteLength(prompt)<=maxBytes)break;
  }
 }
 if(Buffer.byteLength(prompt)>maxBytes)
  throw Object.assign(Error('The generated HTML is too large for the configured CSS model context. Use a provider with a larger budget.'),
   {code:'CONTENT_BUDGET'});
 return prompt;
}

export async function redesignReconstruction({captureDir,siteDir,report=null,direction='',onProgress=()=>{},env=process.env,fetchImpl=fetch,maxRepairs=2}){
 let cfg=redesignProvider(env);if(!cfg)throw Error('URL redesign requires a configured model.');
 const root=path.resolve(siteDir),work=path.join(path.dirname(root),'redesign-evidence');
 await fs.mkdir(root,{recursive:true});await fs.mkdir(work,{recursive:true});
 const {evidence,manifest,entry,screenshots}=await loadRedesignEvidence(captureDir);
 evidence.strictBrandCanvas=!/dark|light|invert|color scheme/i.test(direction);
 let modelPhase='reasoning',modelEnv=env,fallbackUsed=false;
 const initialModel=cfg.model;
 const availableFallback=error=>fallbackRedesignModel({error,provider:cfg,env,initialModel,fallbackUsed});
 const onAttempt=attempt=>onProgress({phase:modelPhase,message:'Waiting for the model',log:'Model request: '+JSON.stringify(attempt)});
 const onModelResponse=response=>response.failure?onProgress({phase:modelPhase,
  message:'The model provider returned '+response.failure.code,
  log:'Model response: '+JSON.stringify({model:response.model,...response.failure})}):Promise.resolve();
 const ask=async options=>{
  try{return await requestRedesignJson({...options,env:modelEnv,fetchImpl,onAttempt,onResponse:async response=>{await onModelResponse(response);await options.onResponse?.(response)},reasoningEffort:modelPhase==='generating'&&/gpt-oss/.test(cfg.model)?'low':modelPhase==='generating'?'medium':undefined})}
  catch(error){
   const fallback=availableFallback(error);
   if(!['RATE_LIMIT','INCOMPATIBLE_MODEL'].includes(error.code)||fallbackUsed||!fallback||fallback===cfg.model)throw error;
   fallbackUsed=true;modelEnv={...env,SLOPPERTIZER_REDESIGN_MODEL:fallback,SLOPPERTIZER_REDESIGN_VISION:'false'};
   cfg=redesignProvider(modelEnv);
   await onProgress({phase:modelPhase,
    message:error.code==='INCOMPATIBLE_MODEL'?'The code model rejected this request; retrying with the working model':'The primary model is throttled; retrying with a fallback',
    log:'Model fallback ('+error.code+'): '+cfg.model});
   return requestRedesignJson({...options,images:cfg.vision?options.images:[],env:modelEnv,fetchImpl,onAttempt,onResponse:async response=>{await onModelResponse(response);await options.onResponse?.(response)},reasoningEffort:modelPhase==='generating'&&/gpt-oss/.test(cfg.model)?'low':modelPhase==='generating'?'medium':undefined});
  }
 };
 await json(path.join(work,'source-evidence.json'),evidence);
 // The composition is now decided by measured source evidence and curated
 // research; the LLM implements that specification rather than setting taste.
 await onProgress({phase:'reasoning',message:'Mapping source hierarchy and research-backed design constraints'});
 // Research-only marker enables same-engine comparison; ordinary jobs unchanged.
 const marker='[[sloppertizer-pilot20]]',measuredMarker='[[sloppertizer-measured3]]';
 const measuredPilot=String(direction||'').includes(measuredMarker);
 const referencePilot=!measuredPilot&&String(direction||'').includes(marker);
 const cleanDirection=String(direction||'').replaceAll(marker,'').replaceAll(measuredMarker,'').trim();
 const {design:researchDesign,brief:designBrief}=await researchDirectedRedesign(evidence,{direction:cleanDirection,referencePilot,measuredPilot});
 const design=validateDirection(researchDesign,evidence,{requireComposition:true});
 await json(path.join(work,'design-direction.json'),{...design,
  method:'deterministic-source-and-research',research:designBrief,
  visualInput:'observed DOM, geometry, typography and responsive evidence (not a vision critique)'});
 await onProgress({phase:'generating',message:'Building a new layout with the original content and links'});
 // Keep the model already proven during reasoning unless an operator explicitly selects another.
 const codeModel=codeModelForStage(env,cfg);
 modelEnv={...modelEnv,SLOPPERTIZER_REDESIGN_MODEL:codeModel,SLOPPERTIZER_REDESIGN_VISION:'false'};
 cfg=redesignProvider(modelEnv);modelPhase='generating';
 let sourceCap=Math.min(6900,Math.max(1900,Math.floor(cfg.budget.textBytes*.6)));
 let codeSource=layoutContentPlan(evidence,{maxBytes:sourceCap});
 // Compact the research dossier into actionable, source-specific constraints.
 // Preserve full provenance in design/evidence; Groq's context is limited.
 const art=JSON.stringify({direction:design.direction,composition:design.composition,
  research:{purpose:designBrief.purpose,grammar:designBrief.grammar,
   intent:designBrief.visualIntent.slice(0,205),
   typography:designBrief.typography.slice(0,145),
   cues:designBrief.cues.slice(0,2).map(x=>x.slice(0,120)),
   avoidReflex:designBrief.cautions.slice(0,4).map(x=>x.id),
   lessons:designBrief.lessons.slice(0,3).map(x=>({id:x.id,application:x.application.slice(0,95)})),
   sourceBrand:designBrief.sourceBrand,
   ...(designBrief.pilotReferences?{pilotReferences:designBrief.pilotReferences.selected.slice(0,4)
     .map(x=>({id:x.id,principle:x.principle.slice(0,135),limit:x.contraindication.slice(0,85)}))}:{}),
   ...(designBrief.measuredRelationship?{measuredRelationship:{
     id:designBrief.measuredRelationship.id,family:designBrief.measuredRelationship.family,
     focal:designBrief.measuredRelationship.focalObject,
     readingOrder:designBrief.measuredRelationship.readingOrder,
     mobile:designBrief.measuredRelationship.mobileTransition,
     transferLimit:designBrief.measuredRelationship.transferLimit.slice(0,3),
     assetPolicy:designBrief.measuredRelationship.assetPolicy}}:{})}});

 let htmlPrompt='You are a senior frontend implementation engineer. Implement the evidence-grounded art direction and source content plan exactly; do not invent a competing visual concept. Author a complete semantic HTML composition for this observed website. Return JSON {html:BODY_FRAGMENT}. Do not return CSS. '+limits+
  '\nSOURCE SLOTS: <h1 data-content="cN"></h1>, <h2 data-content="cN"></h2>, <p data-content="cN"></p> or suitable semantic tags insert FULL original copy and inline links. Preserve actual heading roles. Use the source H1, not its long SEO title; data-title="page" is only a fallback if there is no source heading. Mark the outer opening/hero container data-composition="opening"; it must contain the lead H1, primary action and ALL selected proof references. Do not put the entire mission/about copy in the hero. Keep each sourceSections heading with its paragraphs; a proof group belongs in the opening ONCE, not again as a later feature section. Links-and-meta groups belong together in the footer. Every factual slot must be EMPTY and have a descriptive class; do not retype excerpts or write inline styles. Place known links using <a data-link="lN"></a>; never combine data-link and data-content. Author the actual header, primary actions, resource groups and social links individually. Include exactly one <nav data-linkset="unplaced" class="source-remainder"></nav> at the footer for ONLY links not already placed. NEVER use data-linkset="all"; it repeats the whole site directory. The compiler inserts remaining links as observed-link anchors. Source items marked alreadyCoveredBy need no duplicate. For important images use <figure data-assetset="all" class="source-media"></figure> inside main or individual <img src="asset:aN" alt="...">. No important asset may be omitted.\nExecute the content-specific composition below: meaningful hero and proof object together, clear section headings, considered reading regions. A product/feature can be a single strong typographic showcase using its real title, description and action. Never invent code or illustrations. Keep a restrained header with selected navigation; combine secondary links, contact and legal text into a compact, grouped footer instead of isolated full-width sections. Use a desktop nav OUTSIDE closed details plus a mobile-only details/summary containing the same SMALL selected link set. Never put the entire directory in a header. Keep the brand link outside desktop and mobile nav lists so it remains visible at every width. Quote attributes. Descriptive classes only; no utility classes, inline styles, scripts, forms, SVG, style/link/meta tags. Literal copy is limited to source title and functional labels like Menu; the compiler inserts factual content. One main and H1.\nCOMPOSITION:\n'+art+'\nSOURCE PLAN (excerpts; full copy is inserted):\n'+codeSource;
 // Keep all original source copy in immutable evidence, but reduce model-visible
 // previews until the selected provider's true byte AND context budgets fit.
 const prefix=htmlPrompt.slice(0,htmlPrompt.length-codeSource.length);
 for(let pass=0;pass<8&&(
  Buffer.byteLength(htmlPrompt)>cfg.budget.textBytes||
  Math.ceil(htmlPrompt.length/3.5)+Math.min(2800,cfg.budget.outputTokens)>cfg.budget.contextTokens
 );pass++){
  sourceCap=Math.floor(sourceCap*.79);
  codeSource=layoutContentPlan(evidence,{maxBytes:sourceCap});
  htmlPrompt=prefix+codeSource;
 }
 if(Buffer.byteLength(htmlPrompt)>cfg.budget.textBytes||
    Math.ceil(htmlPrompt.length/3.5)+Math.min(2800,cfg.budget.outputTokens)>cfg.budget.contextTokens)
  throw Object.assign(Error('The source composition exceeds the code-model context.'),{code:'CONTENT_BUDGET'});
 let generatedHtml=await ask({prompt:htmlPrompt,maxTokens:Math.min(2800,cfg.budget.outputTokens),onResponse:r=>json(path.join(work,'html-response.json'),r)});
 let template=normalizeContentTemplate(generatedHtml.data.html,evidence),compiledHtml,templateOrigin='model-authored';
 try{compiledHtml=compileContentTemplate(template,evidence)}catch(error){
  if(error.code!=='TEMPLATE_COVERAGE')throw error;
  const completed=completeObservedSourceSlots(template,evidence,error,{maxSlots:4});
  if(completed){
   try{
    compiledHtml=compileContentTemplate(completed,evidence);
    template=completed;
    await onProgress({phase:'generating',message:'Restored immutable observed source slots'});
   }catch(completionError){
    if(completionError.code!=='TEMPLATE_COVERAGE')throw completionError;
    error=completionError;
   }
  }
  if(!compiledHtml){
   // Keep the model's authored hero, visual objects and chosen hierarchy;
   // store supplementary original content in an accessible disclosure rather
   // than flatten the entire site into equally weighted source sections.
   const protectedIds=[design.composition.leadContentId,...design.composition.proofContentIds].filter(Boolean);
   const reconciled=reconcileAuthoredSourceCoverage(template,evidence,error,{protectedIds});
   if(reconciled){
    try{
     compiledHtml=compileContentTemplate(reconciled,evidence);
     template=reconciled;templateOrigin='model-authored-with-source-disclosure';
     await onProgress({phase:'generating',message:'Preserved art-directed composition while retaining full original details'});
    }catch(reconciliationError){
     if(reconciliationError.code!=='TEMPLATE_COVERAGE')throw reconciliationError;
     error=reconciliationError;
    }
   }
  }
  if(!compiledHtml && /^(1|true)$/i.test(env.SLOPPERTIZER_ALLOW_SOURCE_WATERFALL||'') ){
   // A small-context model may omit dozens of otherwise immutable source IDs.
   // Do NOT make it rewrite the entire page with yet another expensive prompt.
   // Instead create a complete, heading-led source composition and let the CSS
   // model art-direct it. All source text and URLs stay bound to their IDs.
   const full=buildCompleteObservedLayout(evidence,{...design,measuredRelationship:designBrief.measuredRelationship});
   try{
    compiledHtml=compileContentTemplate(full,evidence);
    template=full;templateOrigin='deterministic-complete-source-fallback';
    await onProgress({phase:'generating',message:'Recovered complete source hierarchy before CSS design',
     log:'Source-layout fallback: '+JSON.stringify({omittedContent:error.missingContent?.length,
      omittedLinks:error.missingLinks?.length,omittedAssets:error.missingAssets?.length})});
   }catch(fallbackError){
    if(fallbackError.code!=='TEMPLATE_COVERAGE')throw fallbackError;
    error=fallbackError;
   }
  }
  if(!compiledHtml){
   await onProgress({phase:'generating',message:'Completing a structurally incomplete source composition without flattening the design'});
   const corrected=await ask({prompt:'Complete only missing source slots in this HTML without changing its composition, classes or existing elements. Return JSON {html:ENTIRE_CORRECTED_BODY_FRAGMENT}. Add missing content with semantic data-content slots, missing links individually or in ONE visible footer data-linkset="unplaced", and missing assets via <figure data-assetset="all" class="source-media"></figure> INSIDE main. Never use data-linkset="all" or repeat existing copy/directories. Returning unchanged HTML fails.\nMISSING:'+JSON.stringify({content:error.missingContent,links:error.missingLinks,assets:error.missingAssets})+'\nCONTENT PLAN:'+codeSource+'\nCURRENT TEMPLATE:'+template,
    maxTokens:Math.min(2800,cfg.budget.outputTokens),onResponse:r=>json(path.join(work,'template-completion-response.json'),r)});
   template=normalizeContentTemplate(corrected.data.html,evidence);compiledHtml=compileContentTemplate(template,evidence);
  }
  if(templateOrigin==='deterministic-complete-source-fallback' && !/^(1|true)$/i.test(env.SLOPPERTIZER_ALLOW_SOURCE_WATERFALL||''))
   throw Object.assign(Error('Source waterfall fallback is disabled; no visually unreviewed generic layout is delivered.'),{code:'VISUAL_COMPOSITION_FAILED'});
 }
 const cssModel=cssModelForStage(env,cfg);
 if(cssModel!==cfg.model){
  modelEnv={...modelEnv,SLOPPERTIZER_REDESIGN_MODEL:cssModel,SLOPPERTIZER_REDESIGN_VISION:'false'};
  cfg=redesignProvider(modelEnv);
  await onProgress({phase:'generating',message:'Implementing stylesheet with separate CSS model',
   log:'CSS model selected: '+cfg.model});
 }
 const cssPrompt=buildRedesignCssPrompt({template,evidence,design,brief:designBrief,maxBytes:cfg.budget.textBytes});
 const cssOutputTokens=Math.min(3200,cfg.budget.outputTokens,
  cfg.budget.contextTokens-Math.ceil((cssPrompt.length+550)/3.5)-120);
 if(cssOutputTokens<1200)
  throw Object.assign(Error('CSS model context cannot hold the preserved source template; select a larger context model.'),
   {code:'CONTENT_BUDGET'});
 const styled=await validatedRedesignStage({
  onRetry:()=>onProgress({phase:'generating',message:'Correcting the stylesheet’s unsupported resources'}),
  request:({attempt,feedback})=>ask({prompt:cssPrompt+(attempt?'\nCORRECTION: '+feedback+' Return a complete replacement CSS string only. No HTML, style tags, @import, @font-face, data URLs, expression(), behavior, or url() resources. Use system/observed font family names without loading fonts; observed images already exist in HTML. Keep all text visible.':''),
   maxTokens:cssOutputTokens,onResponse:r=>json(path.join(work,attempt?'css-correction-response.json':'css-response.json'),r)}),
  validate:data=>{
   if(typeof data?.css!=='string')throw Object.assign(Error('Model output must include a CSS string.'),{code:'INVALID_MODEL_OUTPUT'});
   const normalized=normalizeRedesignCss(data.css,evidence);
   return {site:validateRedesignSite({html:compiledHtml,css:normalized.css},evidence),normalization:normalized};
  }
 });
 const generatedCss=styled.response,cssNormalization=styled.value.normalization;
 const generated={data:styled.value.site,model:generatedCss.model};
 let site=styled.value.site,visualGrammarOrigin='model-authored-css';
 if(templateOrigin==='model-authored-with-source-disclosure'){
  // Restrained, brand-inheriting presentation for original supporting facts.
  // No fixed layout template or wholesale replacement of model-authored CSS.
  const appendixCss=String.raw`
.source-appendix{max-width:76rem;margin:clamp(3rem,7vw,8rem) auto;padding:0 clamp(1rem,3vw,2.5rem);border-top:1px solid currentColor}
.source-appendix>summary{cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:2rem;padding:1.4rem 0;font-size:1rem;font-weight:650;line-height:1.45;list-style:none}
.source-appendix>summary::-webkit-details-marker{display:none}
.source-appendix>summary:after{content:"+";font-size:1.6rem;font-weight:400}
.source-appendix[open]>summary:after{content:"−"}
.source-appendix-body{max-width:72ch;padding:1rem 0 3rem}
.source-appendix-body>*{max-width:100%;overflow-wrap:anywhere;margin:0 0 1.4rem;line-height:1.65}
.source-appendix-body>h2,.source-appendix-body>h3{margin-top:2rem;line-height:1.2}
.source-appendix-body>a{display:inline-block;margin-inline-end:1.2rem;text-decoration:underline;text-underline-offset:3px}
@media(max-width:600px){.source-appendix{padding:0 1.25rem}.source-appendix-body>*{font-size:max(1rem,1em)}}
`;
  site=validateRedesignSite({...site,css:site.css+'\n'+appendixCss},evidence);
  visualGrammarOrigin='model-authored-with-native-evidence-disclosure';
 }
 // In this bounded experiment, a complete-source fallback must still have a
 // deliberate composition. Use only source palette and independently framed
 // design relationships; do not let a weak CSS model reduce it to a text dump.
 if((referencePilot||measuredPilot)&&templateOrigin==='deterministic-complete-source-fallback'){
  const grammarCss=referenceFallbackStyles(evidence,designBrief);
  if(grammarCss){
   site=validateRedesignSite({...site,css:grammarCss},evidence);
   visualGrammarOrigin=measuredPilot?'paired-viewport-measured-relationship':'source-brand-evidence-first-grammar';
   await onProgress({phase:'generating',message:'Applying source-grounded evidence-first composition to complete observed copy'});
  }
 }
 const write=async(dir,candidate)=>{await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'index.html'),assembleRedesignDocument(candidate,evidence));await fs.writeFile(path.join(dir,'styles.css'),candidate.css)};
 await write(root,site);await write(path.join(work,'initial'),site);
 await onProgress({phase:'verifying',message:'Checking desktop, tablet and mobile in Chromium'});
 let qa=await inspectRedesign(root,evidence,{composition:design.composition}),initialQA=qa;
 await json(path.join(work,'initial-qa.json'),qa);
 const repairs=[];
 // Missing source copy and links are integrity failures, not model design choices.
 // Restore a small measured set directly from trusted capture evidence before
 // asking the model to redesign structurally correct content again.
 const recoverObservedSource=async()=>{
  if(qa.status==='passed')return;
  const corrected=restoreMissingRenderedSource(site,evidence,qa,{maxItems:6});
  if(!corrected.restoredContentIds.length&&!corrected.restoredLinkIds.length)return;
  const next=validateRedesignSite(corrected,evidence);
  const trial=path.join(work,'source-integrity-'+repairs.filter(x=>x.origin==='immutable-source').length);
  await onProgress({phase:'repairing',message:'Restoring observed content and links in affected layouts'});
  await write(trial,next);
  const checked=await inspectRedesign(trial,evidence,{composition:design.composition});
  const n=x=>Object.values(x.viewports).reduce((sum,v)=>sum+v.issues.length+
   v.missingContent.length+v.missingLinks.length+v.duplicateContent.length,0);
  const accepted=n(checked)<n(qa)&&Object.entries(checked.viewports).every(([name,row])=>
   !row.issues.some(issue=>!qa.viewports[name].issues.includes(issue)));
  repairs.push({attempt:'deterministic-source-integrity',origin:'immutable-source',accepted,
   restoredContentIds:corrected.restoredContentIds,restoredLinkIds:corrected.restoredLinkIds,
   before:n(qa),after:n(checked),sourceHash:hash(next.html+next.css)});
  await json(path.join(trial,'qa.json'),checked);
  if(accepted){site=next;await write(root,site);
   qa=await inspectRedesign(root,evidence,{composition:design.composition})}
 };
 await recoverObservedSource();
 let contrastCorrectionAttempted=false;
 const repairMeasuredContrast=async()=>{
 if(!contrastCorrectionAttempted&&qa.status!=='passed'&&Object.values(qa.viewports).some(x=>x.contrast.length)){
  contrastCorrectionAttempted=true;
  const patch=measuredContrastPatch(qa);
  if(patch.changes.length){
   await onProgress({phase:'repairing',message:'Correcting measured text contrast without changing the layout'});
   const next=validateRedesignSite({...site,css:site.css+patch.css},evidence),trial=path.join(work,'measured-contrast');
   await write(trial,next);const checked=await inspectRedesign(trial,evidence,{composition:design.composition});
   const accepted=Object.values(checked.viewports).every(x=>!x.contrast.length)&&Object.entries(checked.viewports).every(([name,row])=>!row.issues.some(issue=>!qa.viewports[name].issues.includes(issue)));
   repairs.push({attempt:'measured-contrast',origin:'browser-measurements',accepted,reason:'Adjusted only failing foreground text colors on measured solid surfaces.',changes:patch.changes,sourceHash:hash(next.html+next.css)});
   await json(path.join(trial,'qa.json'),checked);
   if(accepted){site=next;await write(root,site);qa=await inspectRedesign(root,evidence,{composition:design.composition})}
  }
 }
 };
 // Only apply measured width constraints to actually overflowing elements,
 // then re-run the full integrity/visual QA. Never hide overflow to pass.
 const repairMeasuredOverflow=async()=>{
  if(qa.status==='passed'||!Object.values(qa.viewports).some(x=>x.issues.includes('horizontal-overflow')))return;
  const fix=measuredOverflowPatch(qa);if(!fix.changes.length)return;
  const proposed=validateRedesignSite({...site,css:site.css+'\n/* Measured non-clipping overflow correction */\n'+fix.css},evidence);
  const trial=path.join(work,'measured-overflow-'+repairs.filter(x=>x.origin==='measured-overflow').length);
  await onProgress({phase:'repairing',message:'Correcting measured viewport overflow'});
  await write(trial,proposed);
  const checked=await inspectRedesign(trial,evidence,{composition:design.composition});
  const before=Object.values(qa.viewports).filter(x=>x.issues.includes('horizontal-overflow')).length;
  const after=Object.values(checked.viewports).filter(x=>x.issues.includes('horizontal-overflow')).length;
  const noNewIssues=Object.entries(checked.viewports).every(([name,row])=>
   row.issues.every(issue=>qa.viewports[name].issues.includes(issue)));
  const accepted=after<before&&noNewIssues;
  repairs.push({attempt:'deterministic-measured-overflow',origin:'measured-overflow',
   accepted,before,after,changes:fix.changes,sourceHash:hash(proposed.html+proposed.css)});
  await json(path.join(trial,'qa.json'),checked);
  if(accepted){site=proposed;await write(root,site);
   qa=await inspectRedesign(root,evidence,{composition:design.composition})}
 };
 await repairMeasuredOverflow();
 // Aesthetics cannot be accepted when supporting prose is genuinely too small.
 // Normalize only measured short text, then require Chromium to demonstrate
 // improvement with no new browser defects. This is a repair, not score bypass.
 if(Object.values(qa.viewports).some(v=>v.tinyText?.length)){
  const css='\n/* Measured legibility repair; no content suppression. */\n'+
   'main p,main li,main figcaption{font-size:max(16px,1em)!important;line-height:1.5}'+
   'footer p,footer li,nav li{font-size:max(14px,1em)!important;line-height:1.5}';
  const candidate=validateRedesignSite({...site,css:site.css+css},evidence);
  const trial=path.join(work,'measured-type');
  await write(trial,candidate);
  const checked=await inspectRedesign(trial,evidence,{composition:design.composition});
  const before=Object.values(qa.viewports).reduce((n,v)=>n+(v.tinyText?.length||0),0);
  const after=Object.values(checked.viewports).reduce((n,v)=>n+(v.tinyText?.length||0),0);
  const noNew=Object.entries(checked.viewports).every(([name,row])=>
   row.issues.every(issue=>qa.viewports[name].issues.includes(issue)));
  const accepted=after<before&&noNew;
  repairs.push({attempt:'measured-text-legibility',origin:'browser-measurements',
   accepted,before,after,sourceHash:hash(candidate.html+candidate.css)});
  await json(path.join(trial,'qa.json'),checked);
  if(accepted){site=candidate;await write(root,site);
   qa=await inspectRedesign(root,evidence,{composition:design.composition})}
 }
 // Color-only defects need exact measured edits, not a replacement design.
 if(Object.values(qa.viewports).some(x=>x.contrast.length)&&Object.values(qa.viewports).every(x=>x.issues.every(issue=>issue==='low-text-contrast')))await repairMeasuredContrast();

 for(let attempt=1;qa.status!=='passed'&&attempt<=Math.min(2,maxRepairs);attempt++){
  modelPhase='repairing';
  await onProgress({phase:'repairing',message:'Repairing measured browser failures (pass '+attempt+' of '+Math.min(2,maxRepairs)+')'});
  const failures=Object.fromEntries(Object.entries(qa.viewports).map(([name,x])=>[name,{issues:x.issues,width:x.width,documentWidth:x.documentWidth,
   overflowElements:x.overflowElements.slice(0,2),canvas:x.canvas,cardifiedProse:x.cardifiedProse,contrast:x.contrast.slice(0,3),missingContent:x.missingContent,duplicateContent:x.duplicateContent,missingLinks:x.missingLinks,removedAssets:x.removedAssets,tinyText:x.tinyText,narrowColumns:x.narrowColumns,wideProse:x.wideProse,oversizedActions:x.oversizedActions,flattenedHeadings:x.flattenedHeadings,openingFailures:x.openingFailures,interactions:x.interactions}]));
  const needsMarkup=Object.values(qa.viewports).some(x=>x.missingContent.length||x.duplicateContent.length||x.removedAssets.length||x.issues.some(i=>['invalid-or-hidden-headings','broken-navigation','missing-images','flattened-section-hierarchy','broken-opening-composition'].includes(i)));
  const repairFailures=needsMarkup?Object.fromEntries(Object.entries(failures).map(([name,x])=>[name,{issues:x.issues,missingContent:x.missingContent,duplicateContent:x.duplicateContent,missingLinks:x.missingLinks,removedAssets:x.removedAssets,flattenedHeadings:x.flattenedHeadings,openingFailures:x.openingFailures}])):failures;
  const inventory=(qa.viewports.desktop.selectors||[]).slice(0,30);
  const repairPrompt='Repair ONLY the measured failures of this model-authored website. Return JSON '+
   (needsMarkup?'{html:ENTIRE_CORRECTED_SLOT_TEMPLATE,reason:short_string}. Do not return CSS. Keep classes and source slots; match the COMPOSITION with data-composition="opening" containing the lead, nearby primary action and every selected proof. Keep sourceSections headings with their paragraphs. Remove repeated slots and empty heading-only sections. ONE footer data-linkset="unplaced"; never all-link directories. Never retype source copy.':'{css:MINIMAL_TARGETED_OVERRIDE_RULES,reason:short_string}. Do not return HTML or replace the stylesheet. Your overrides are appended to the original CSS. Target failing elements only. For wide prose constrain measure; for stretched actions use width:fit-content and justify-self:start. For broken disclosure interactions, keep the summary visible and clickable when details is open so the user can close it. Preserve all other styling. Overrides under 1600 characters.')+
   ' Preserve the established art direction and all existing correct content and links. '+limits+
   '\nFAILURES:'+JSON.stringify(repairFailures)+'\nOBSERVED BRAND:'+JSON.stringify({dominantSurface:evidence.brand.dominantSurface,colors:evidence.brand.colors?.slice(0,3)})+'\nCOMPOSITION:'+JSON.stringify(design.composition)+'\nART DIRECTION:'+design.direction+
   (needsMarkup?'\nCONTENT PLAN:'+codeSource+'\nCURRENT HTML TEMPLATE:'+template:
    '\nEXISTING ELEMENT SELECTORS:'+JSON.stringify(inventory)+'\nCURRENT CSS:'+site.css);
  try{
   const response=await ask({prompt:repairPrompt,maxTokens:needsMarkup?2800:1000,onResponse:r=>json(path.join(work,'repair-response-'+attempt+'.json'),r)});
   const nextTemplate=needsMarkup?normalizeContentTemplate(response.data.html,evidence):template;
   const patch=needsMarkup?{html:compileContentTemplate(nextTemplate,evidence)}:{css:appendRedesignRepairCss(site.css,response.data.css,evidence)};
   const next=validateRedesignSite({...site,...patch},evidence),trial=path.join(work,'repair-'+attempt);
   await write(trial,next);const checked=await inspectRedesign(trial,evidence,{composition:design.composition});
   const count=x=>Object.values(x.viewports).reduce((n,v)=>n+v.issues.length+v.missingContent.length+v.missingLinks.length+v.contrast.length,0);
   const accepted=count(checked)<count(qa)&&Object.entries(checked.viewports).every(([name,row])=>
    !row.issues.some(issue=>!qa.viewports[name].issues.includes(issue)));
   repairs.push({attempt,accepted,reason:String(response.data.reason||'').slice(0,400),before:count(qa),after:count(checked),sourceHash:hash(next.html+next.css)});
   await json(path.join(trial,'qa.json'),checked);
   if(accepted){site=next;template=nextTemplate;await write(root,site);qa=await inspectRedesign(root,evidence,{composition:design.composition})}
  }catch(error){repairs.push({attempt,accepted:false,code:error.code||'REPAIR_FAILED',error:error.message});if(['RATE_LIMIT','CREDITS_EXHAUSTED','CONTENT_BUDGET'].includes(error.code))break}
 }
 await repairMeasuredContrast();
 await repairMeasuredOverflow();
 await recoverObservedSource();
 await json(path.join(work,'repairs.json'),repairs);await json(path.join(work,'final-qa.json'),qa);
 if(qa.status!=='passed')throw Object.assign(Error('The redesign still has browser defects after bounded repair: '+
  [...new Set(Object.values(qa.viewports).flatMap(x=>x.issues))].join(', ')+'. No result was accepted.'),{code:'BROWSER_VERIFICATION_FAILED',diagnostics:{viewports:Object.fromEntries(Object.entries(qa.viewports).map(([name,row])=>[name,{width:row.width,issues:row.issues,headings:row.headings,tinyText:row.tinyText.slice(0,10),openingFailures:row.openingFailures.slice(0,10),contrast:row.contrast.slice(0,8),missingContent:row.missingContent,missingLinks:row.missingLinks,documentWidth:row.documentWidth}]))}});
 await onProgress({phase:'packaging',message:'Bundling source, observed assets and verification evidence'});
 // Reuse the guarded image/font bundler. Rendering after bundling verifies export resources.
 const document=await fs.readFile(path.join(root,'index.html'),'utf8');
 const inlined=document.replace('<link rel="stylesheet" href="./styles.css">','<style>'+site.css+'</style>');
 const bundled=await bundleObservedAssets({html:inlined,outputDir:root});
 let portable=bundled.html;
 const bundledCss=portable.match(/<style>([\s\S]*?)<\/style>/)?.[1]||site.css;
 portable=portable.replace(/<style>[\s\S]*?<\/style>/,'<link rel="stylesheet" href="./styles.css">');
 await fs.writeFile(path.join(root,'index.html'),portable);await fs.writeFile(path.join(root,'styles.css'),bundledCss);
 qa=await inspectRedesign(root,evidence,{assetMappings:bundled.report.mappings||[],composition:design.composition});
 if(qa.status!=='passed')throw Object.assign(Error('Exported assets failed final browser verification. No result was accepted.'),{code:'EXPORT_VERIFICATION_FAILED'});
 // A separate evaluator can compare actual pixels when a vision provider is
 // explicitly configured. Do not let a text-only model proclaim visual gain.
 let visualReview;
 try{
  if(redesignVisualReviewConfig(env)){
   await onProgress({phase:'verifying',message:'Comparing original and redesigned desktop/mobile screenshots'});
  }
  visualReview=await judgeRedesignVisual({sourceScreenshots:screenshots,
   generatedScreenshots:Object.fromEntries(redesignViews.filter(x=>x.name!=='tablet')
    .map(x=>[x.name,path.join(root,'generated','redesign-'+x.name+'.png')])),
   designBrief,env,fetchImpl});
 }catch(error){
  visualReview={status:'review-unavailable',visualImprovementVerified:false,
   reason:'Independent visual review could not complete: '+String(error.message).slice(0,140)};
 }
 if(visualReview.status==='visual-regression'){
  throw Object.assign(Error('The independent visual review found a high-confidence design regression. No result was accepted.'),
   {code:'VISUAL_REGRESSION',diagnostics:{visualReview}});
 }
 await json(path.join(work,'visual-review.json'),visualReview);

 await fs.mkdir(path.join(root,'source'),{recursive:true});
 for(const [name,file] of Object.entries(screenshots))await fs.copyFile(file,path.join(root,'source','home-'+name+'.png'));
 const generatedScreenshots=Object.fromEntries(redesignViews.map(x=>[x.name,'/generated/redesign-'+x.name+'.png']));
 const redesign={status:'accepted',model:generated.model,templateOrigin,visualGrammarOrigin,artDirectionOrigin:'deterministic-source-and-research',designResearch:designBrief,rationale:design.direction,composition:design.composition,changes:design.changes,weaknesses:design.weaknesses,fallbackUsed,
  normalization:cssNormalization,
  evidenceProfile:cfg.vision?'compressed-tiles':'structured-browser-evidence',visualReview,
  repairs,sourceHash:hash(portable+bundledCss),method:'observed content and brand → grounded art direction → generated semantic HTML/CSS → three-viewport browser QA → bounded targeted repair → verified asset bundle'};
 report={schemaVersion:'2.0',product:'Sloppertizer URL Redesign',sourceUrl:manifest.sourceUrl,generatedAt:new Date().toISOString(),pageCount:1,
  pages:[{sourceUrl:evidence.sourceUrl,title:evidence.title,localRoute:'/',screenshots:{desktop:'/source/home-desktop.png',mobile:'/source/home-mobile.png'},
   visualVerification:{status:'redesigned',generatedScreenshots},redesign,creationQA:qa}],redesign,
  boundaries:evidence.boundaries,unknownFunctionality:evidence.unknownFunctionality,
  portableAssets:bundled.report,verification:{browserStatus:qa.status,viewports:redesignViews.map(x=>x.width),contentPreserved:true,linksPreserved:true,
   redesignAccepted:true,visualImprovementVerified:visualReview.visualImprovementVerified,fullyFunctional:false,method:'Static observed interactions verified; original backend services remain on original destinations.'}};
 await json(path.join(root,'bundle-manifest.json'),report);
 await fs.mkdir(path.join(root,'design'),{recursive:true});await json(path.join(root,'design/evidence.json'),evidence);await json(path.join(root,'design/direction.json'),design);
 await json(path.join(root,'design/verification.json'),{initialQA,finalQA:qa,repairs});
 await fs.writeFile(path.join(root,'README.md'),'# '+evidence.title+' — Sloppertizer redesign\n\nOpen index.html directly, or serve this folder with any static HTTP server. Source: index.html and styles.css. Observed image assets are in assets/. Before/after screenshots and measured browser checks are included.\n\n'+evidence.boundaries.join('\n')+'\n\nExternal destinations and unavailable/unbundled resources require internet access. This export does not recover original backend code or authentication.\n');
 return report;
}
