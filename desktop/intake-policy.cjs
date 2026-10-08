'use strict';
const crypto=require('node:crypto');
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const text=v=>typeof v==='string'&&v.trim();
function canonicalUrl(value){
 if(!value)return '';
 const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error('원출처 URL의 형식·인증 정보를 확인하세요.');
 u.hash='';for(const key of [...u.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(key))u.searchParams.delete(key);
 u.searchParams.sort();return u.href;
}
function inspectRecord(record,{allowTestFixtures=false}={}){
 const i=record?.intake||{},base={id:i.id,title:record?.title||'',publicationAllowed:false,claimsStatus:'source_attributed_unverified'};
 const hold=(reasonCode,reason)=>({...base,disposition:'held',reasonCode,reason});
 if(record?.schema!=='threads-verbatim-source-v1'||record.verbatim!==true||!text(record.title)||!text(record.body))return hold('source_insufficient','원문 JSON·제목·본문·verbatim=true가 필요합니다. 요약으로 대체하지 않습니다.');
 if(i.bodyStatus!=='complete')return hold('source_insufficient','원문 전체 확보(bodyStatus=complete)를 명시하세요. 누락 본문을 채우지 않습니다.');
 if(i.schema!=='threads-offline-intake-v1'||!/^[-a-zA-Z0-9_]{1,52}$/.test(i.id||''))return hold('source_insufficient','intake 규격과 안정적인 글 ID가 필요합니다.');
 let url;try{url=canonicalUrl(record.sourceUrl);}catch(e){return hold('source_insufficient',e.message);}
 if(!['user_provided','public_web','test_fixture'].includes(i.provenance?.kind)||!text(i.provenance?.reference)||i.provenance.kind==='public_web'&&!url)return hold('source_insufficient','원본 제공 유형과 출처 설명 또는 공개 원출처 URL이 필요합니다.');
 if(!['none','provided_subset','complete'].includes(i.commentsStatus)||!Array.isArray(record.comments)||record.comments.some(c=>!text(c?.text)||c.likes!==undefined&&c.likes!==null&&(!Number.isFinite(c.likes)||c.likes<0))||i.commentsStatus==='none'&&record.comments.length)return hold('source_insufficient','댓글은 원문 배열 순서로 제공하고 수집 범위를 명시하세요. 반응 수는 추정하지 않습니다.');
 const imageNames=[...record.body.matchAll(/^\[IMAGE:([^\]\r\n]+)\](?:\r?\n|$)/gm)].map(m=>m[1]);
 if(imageNames.some(n=>!/^[-\w가-힣 .]+\.(png|jpe?g|webp|gif)$/i.test(n)||n.includes('..'))||!Array.isArray(i.media)||i.media.some(m=>!/^[-\w가-힣 .]+\.(png|jpe?g|webp|gif)$/i.test(m.name||'')||m.name.includes('..')||!imageNames.includes(m.name)||!/^[a-f0-9]{64}$/.test(m.sha256||''))||new Set(i.media.map(m=>m.name?.toLowerCase())).size!==i.media.length)return hold('source_insufficient','이미지 위치와 파일명·media 목록을 확인하세요.');
 if(imageNames.some(n=>!i.media.some(m=>m.name===n&&/^[a-f0-9]{64}$/.test(m.sha256||''))))return hold('source_insufficient','본문 위치에 필요한 원문 이미지와 SHA256 기록이 없습니다.');
 const cover=i.cover||{variant:'paper'};
 if(!['paper','photo'].includes(cover.variant)||cover.variant==='photo'&&(!imageNames.includes(cover.mediaName)||!i.media.some(m=>m.name===cover.mediaName)))return hold('source_insufficient','사진형 표지는 본문에 있는 원문 이미지를 명시해야 합니다.');
 const licensed=r=>['user_owned','licensed_commercial'].includes(r?.status)&&text(r.evidence)||allowTestFixtures&&r?.status==='test_fixture'&&String(r.evidence).includes('TEST_ONLY_DO_NOT_PUBLISH');
 if(!licensed(i.rights)||i.media.some(m=>!licensed({status:m.rightsStatus,evidence:m.evidence})))return {...base,canonicalUrl:url,imageNames,disposition:'research',reasonCode:'rights_unknown',reason:'상업 재사용 권리 미확인: 제공된 참고 요약과 원출처 포인터만 연구 후보로 남깁니다.'};
 if(i.safety?.status!=='reviewable'||!text(i.safety.reviewedBy))return hold('safety_hold','권리와 별도로 사람의 소재·개인정보·안전 검토가 필요합니다. '+(i.safety?.reason||''));
 return {...base,canonicalUrl:url,imageNames,cover,disposition:'ready',reasonCode:null,reason:'원문·권리·안전 입력 요건 충족, 제작 후 사용자 품질 검토 대기'};
}
module.exports={canonicalUrl,inspectRecord,sha256};
