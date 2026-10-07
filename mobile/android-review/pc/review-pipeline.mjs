// Explicit one-shot callable wiring only: no CLI, timer, scheduler or live binding.
import {runReleaseFeed} from './release-feed.mjs';
import {createPcGithubTransport,readPinnedReviewState} from './github-transport.mjs';
import {requestHash} from './exchange.mjs';
export function createPcReviewPipeline(options={}){
 const active=options.enabled===true&&options.dataTransferApproved===true;
 const merge=active&&options.canonicalMergeApproved===true;
 const api=options.api||createPcGithubTransport({enabled:active,repository:options.repository,getAccessToken:options.getAccessToken,fetchImpl:options.fetchImpl});
 return Object.freeze({
  async supplyOnce({outputDirectory}={}){
   if(!active)return {status:'disabled'};
   if(typeof options.withSupplyLock!=='function'||options.supplyLockContract?.allFeedWriters!==true)throw Error('Declared shared feed-journal writer lock required');
   if(typeof options.readJournal!=='function')throw Error('Caller-preserved durable feed journal required');
   return options.withSupplyLock(async()=>runReleaseFeed({enabled:true,repository:options.repository,api,readRemoteSnapshot:readPinnedReviewState,readSnapshots:options.readSnapshots,store:options.store,criteria:options.criteria,allowedOutputRoot:options.allowedOutputRoot,outputDirectory,journal:await options.readJournal(),persistJournal:options.persistJournal}));
  },
  async importOnce(){
   if(!merge)return {status:'disabled'};
   if(typeof options.feedbackTransaction?.importFeedback!=='function')throw Error('Separately approved canonical transaction binding required');
   const remote=await readPinnedReviewState({enabled:true,repository:options.repository,api});
   const result=await options.feedbackTransaction.importFeedback({state:remote.state,sourceCommit:remote.head,pinnedStateHash:requestHash(remote.state)});
   // Transaction status describes file activity; pipeline exposes blocked review
   // outcomes explicitly instead of presenting an unchanged conflict as success.
   if(result.status==='unchanged'&&result.proposal?.conflicts?.length)return {...result,status:'conflict'};
   if(result.status==='unchanged'&&result.proposal?.blockers?.length)return {...result,status:'blocked'};
   return result;
  }
 });
}
