import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ProductionInput,productionVersion} from '../production-input.mjs';
import {cleanDisplayTitle,cleanCaptionFirstLine} from '../title-normalization.mjs';
import {createState,importBundle} from '../domain.mjs';
// Pinned current review version function, not the upload branch's older desktop copy.
function canonicalVersion(row){return crypto.createHash('sha256').update(JSON.stringify([row.sourceFingerprint,row.outputSha256,row.ruleVersion,row.images?.map(i=>i.sha256),...(row.reviewRound?[row.reviewRound]:[])])).digest('hex');}
const cases=[
 {sourceFingerprint:'s',outputSha256:'o',ruleVersion:'r',images:[{sha256:'a'}],reviewRound:'review-current'},
 {sourceFingerprint:'s',outputSha256:'o',ruleVersion:'r',images:[{sha256:'a'}],reviewRound:''},
 {images:undefined,reviewRound:null},{images:[],reviewRound:'another-round'}
];
for(const row of cases)assert.equal(productionVersion(row),canonicalVersion(row));
assert.notEqual(productionVersion({...cases[0],reviewRound:'other'}),productionVersion(cases[0]));
const production=new ProductionInput('/unused',{});
const row={id:'p',title:'[판][추가 후기] + [후기] 결혼 안하고 외국간 친구',displayTitle:'결혼 안하고 외국간 친구',captionInputTitle:'결혼 안하고 외국간 친구'};
assert.equal(production.titles(row,{originalTitle:row.title,coverTitle:row.displayTitle,displayTitle:row.displayTitle,captionInputTitle:row.displayTitle}).display,row.displayTitle);
assert.throws(()=>production.titles({...row,displayTitle:'다른 제목'},{coverTitle:row.displayTitle}),/production_title_contract_changed/);
assert.throws(()=>production.titles(row,{coverTitle:row.displayTitle,originalTitle:'다른 원제목'}),/production_title_contract_changed/);
for(const [raw,expected] of [['(장문) 야간 편돌이 이야기','야간 편돌이 이야기'],['[초스압] 퇴사한 이야기','퇴사한 이야기'],['[더쿠] 실제 사건 (블라인드)','실제 사건'],['판을 뒤집은 친구 (설명)','판을 뒤집은 친구 (설명)'],['[ 깨끗한 제목 ]','[ 깨끗한 제목 ]']])assert.equal(cleanDisplayTitle(raw),expected);
assert.equal(cleanCaptionFirstLine('[ [판][추가 후기] + [후기] 실제 결말 ]\r\n\r\n본문 [판] 그대로  '),'[ 실제 결말 ]\r\n\r\n본문 [판] 그대로  ');
const post=importBundle(createState(),{bundle_id:'b',posts:[{post_id:'p',output_version:'v',caption:'',source:{label:row.displayTitle,original_title:row.title,caption_input_title:row.displayTitle},images:[]}]}).posts[0];
assert.equal(post.source.label,row.displayTitle);assert.equal(post.source.original_title,row.title);assert.equal(post.source.caption_input_title,row.displayTitle);assert.equal(post.caption,'');assert.equal(post.approval,null);
console.log('Current producer identity/title contract: pinned reviewRound serialization, prepared title validation, immutable originals and empty captions passed.');
