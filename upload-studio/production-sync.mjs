import {syncProductionBundle} from './domain.mjs';
const fail=code=>{throw Object.assign(new Error(code),{code,status:400});};
export class ProductionSync{
 constructor(input,store){this.input=input;this.store=store;this.tail=Promise.resolve();this.progress={running:false,total:0,completed:0,code:null};}
 run(selection=null){const operation=this.tail.then(()=>this.perform(selection));this.tail=operation.catch(()=>{});return operation;}
 async perform(selection){
  const catalog=await this.input.catalog();if(!catalog.available)fail(catalog.code);
  const selected=selection===null?catalog.entries.map(p=>({id:p.id,output_version:p.output_version})):selection;
  if(!Array.isArray(selected)||selected.length>1000||new Set(selected.map(p=>p.id)).size!==selected.length)fail('production_selection_invalid');
  for(const p of selected)if(!catalog.entries.some(c=>c.id===p.id&&c.output_version===p.output_version))fail('production_version_changed');
  this.progress={running:true,total:selected.length,completed:0,code:null};
  try{
   for(let start=0;start<selected.length;start+=20){
    const chunk=selected.slice(start,start+20),state=await this.store.read();
    const fresh=chunk.filter(p=>!state.posts.some(x=>x.post_id===p.id&&x.output_version===p.output_version));
    // Only changed images enter the local vault; unchanged batches refresh titles/ratings.
    if(fresh.length){const bundle=await this.input.bundle(fresh);await this.store.mutate(s=>syncProductionBundle(s,bundle));}
    const metadata=await this.input.metadata(chunk);
    // Metadata-only updates require an existing matching version inside the mutation.
    await this.store.mutate(s=>syncProductionBundle(s,{...metadata,posts:metadata.posts.filter(p=>s.posts.some(x=>x.post_id===p.post_id&&x.output_version===p.output_version))}));
    this.progress.completed+=chunk.length;
   }
   return {state:await this.store.read(),synced:selected.length,externalCalls:0};
  }catch(e){this.progress.code=e.code||'production_sync_failed';throw e;}
  finally{this.progress.running=false;}
 }
}
