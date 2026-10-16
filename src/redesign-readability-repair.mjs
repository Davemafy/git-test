/** Browser-measured prose repair; every patch needs a fresh browser QA pass. */
export function measuredReadabilityPatch(qa){
 const view=qa?.viewports||{};
 const wide=Object.values(view).some(x=>x.issues?.includes('excessive-line-length'));
 const narrow=Object.entries(view).some(([name,x])=>name==='mobile'&&x.issues?.includes('unreadable-typography')&&x.narrowColumns?.length);
 if(!wide&&!narrow)return {css:'',changes:[]};
 const changes=[],rules=[];
 if(wide){
  rules.push('main p,main li,main blockquote,main figcaption{max-inline-size:min(100%,67ch)!important}');
  changes.push('constrain actual prose measure');
 }
 if(narrow){
  rules.push('@media(max-width:600px){main section,main article,main aside{grid-template-columns:minmax(0,1fr)!important}main [class*="split"],main [class*="columns"],main [class*="grid"]{grid-template-columns:minmax(0,1fr)!important}main p,main li,main blockquote{min-inline-size:0!important;max-inline-size:100%!important;width:auto;overflow-wrap:break-word}}');
  changes.push('single-column mobile reading for measured narrow text');
 }
 return {css:rules.join('\n'),changes};
}
