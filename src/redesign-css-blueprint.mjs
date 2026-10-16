/**
 * Compact HTML-CSS handoff. Preserve the *nested markup* and classes rather
 * than degrading a complete layout into a flat selector inventory.
 * Text is provided to the renderer via immutable data-content slots.
 */
export function structuralCssBlueprint(html,{maxBytes=6700}={}){
 if(typeof html!=='string')throw Error('Expected HTML composition.');
 const tags=[...html.matchAll(/<\/?([a-z][a-z0-9-]*)\b([^>]*)>/gi)],kept=[];
 const voidTags=new Set(['img','input','br','hr','meta','link','source','area']);
 for(const match of tags){
  const tag=match[1].toLowerCase(),attrs=match[2]||'';
  if(match[0].startsWith('</')){kept.push('</'+tag+'>');continue}
  const cls=attrs.match(/\bclass\s*=\s*(["'])(.*?)\1/i)?.[2]||'';
  const role=attrs.match(/\bdata-composition\s*=\s*(["'])(.*?)\1/i)?.[2]||'';
  const asset=attrs.match(/\bdata-assetset\s*=\s*(["'])(.*?)\1/i)?.[2]||'';
  const id=attrs.match(/\bid\s*=\s*(["'])(.*?)\1/i)?.[2]||'';
  const marker=attrs.match(/\bdata-(content|link|linkset)\s*=\s*(["'])(.*?)\2/i);
  const a=[cls?'class="'+cls.slice(0,180)+'"':'',role?'data-composition="'+role+'"':'',asset?'data-assetset="'+asset+'"':'',id?'id="'+id.slice(0,60)+'"':'',
   marker?'data-'+marker[1]+'="'+(marker[1]==='linkset'?marker[3]:'slot')+'"':''].filter(Boolean).join(' ');
  kept.push('<'+tag+(a?' '+a:'')+(voidTags.has(tag)?'/>':'>'));
 }
 const shape=kept.join('');
 if(Buffer.byteLength(shape)<=maxBytes)return {blueprint:shape,mode:'nested-dom',bytes:Buffer.byteLength(shape),truncated:false};
 // Reduce by class detail but retain nesting, tag sequence, landmark IDs and
 // proof/action/media roles. We never silently revert to a flat selector list.
 const simplify=kept.map(t=>t.replace(/class="([^"]+)"/,(_,classes)=>{
  const core=classes.split(/\s+/).filter(x=>/hero|proof|source|stage|media|primary|header|footer|nav|section|content|feature|gallery|action/i.test(x)).slice(0,3);
  return core.length?'class="'+core.join(' ')+'"':'';
 }).replace(/\s+>/g,'>'));
 const result=simplify.join('');
 if(Buffer.byteLength(result)>maxBytes)throw Object.assign(Error('Nested markup is too large for reliable CSS planning.'),{code:'CONTENT_BUDGET'});
 return {blueprint:result,mode:'nested-dom-condensed',bytes:Buffer.byteLength(result),truncated:false};
}
