(function(root){
 'use strict';
 function groups(rows){
  const byId=new Map();
  for(const row of rows){if(!row.hasOutput||!row.imageEligible)continue;const batch=row.productionBatch;if(!batch?.id)continue;let group=byId.get(batch.id);if(!group){group={...batch,rows:[]};byId.set(batch.id,group);}group.rows.push(row);}
  const ascending=[...byId.values()].sort((a,b)=>String(a.startedAt).localeCompare(String(b.startedAt))||a.id.localeCompare(b.id));
  ascending.forEach((g,i)=>{g.number??=i+1;g.label='제작 '+g.number+'차';});return ascending.reverse();
 }
 const api={groups};if(typeof module==='object'&&module.exports)module.exports=api;else root.ThreadsReviewBatches=Object.freeze(api);
})(typeof window==='object'?window:globalThis);
