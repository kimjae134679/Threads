// Reusable synthetic input only; no source materials, real ratings or network.
import {createHash} from 'node:crypto';
import {version} from '../../../desktop/post-review-store.cjs';
export const syntheticPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN5sAAAAASUVORK5CYII=','base64');
export function syntheticInputs(){
 const sha256=createHash('sha256').update(syntheticPng).digest('hex');
 const row={id:'synthetic-post',title:'Synthetic fixture',sourceFingerprint:'1'.repeat(64),outputSha256:'2'.repeat(64),ruleVersion:'rules-1',reviewRound:'fixture-round',outputFolder:'synthetic-output',images:[{name:'rendered/slide-001.png',sha256}]};
 const criteria={version:'criteria-1',items:[{id:'readable',label:'Readable'}]};
 const store=Object.freeze({readOnly:true,list:async()=>({reviewRound:row.reviewRound,entries:[{id:row.id,title:row.title,outputVersion:version(row),hasOutput:true,current:null,topic:'life',topicLabel:'Life',category:'all',pageLabels:['Cover']}]}),image:async(id,page,outputVersion)=>{if(id!==row.id||page!==1||outputVersion!==version(row))throw Error('Fixture image identity mismatch');return 'data:image/png;base64,'+syntheticPng.toString('base64');}});
 return {store,rows:[row],criteria,reviewRound:row.reviewRound};
}
