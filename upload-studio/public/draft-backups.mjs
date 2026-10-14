export const BACKUP_PREFIX='threads_upload_studio_unsaved_v2:';
const LEGACY_KEY='threads_upload_studio_unsaved_v1';
// A fresh owner per page load prevents new work from overwriting unresolved recovery snapshots.
export class DraftBackups {
 constructor(storage,writerId){if(!/^[a-z0-9-]+$/i.test(writerId))throw Error('invalid_backup_owner');this.storage=storage;this.key=BACKUP_PREFIX+writerId;}
 persist(records){if(Object.keys(records).length)this.storage.setItem(this.key,JSON.stringify(records));else {this.storage.removeItem(this.key);this.storage.removeItem(this.key+':ack');}}
 list(){const keys=[];for(let i=0;i<this.storage.length;i++){const key=this.storage.key(i);if(key!==this.key&&!key?.endsWith(':ack')&&(key===LEGACY_KEY||key?.startsWith(BACKUP_PREFIX)))keys.push(key);}const entries=[];for(const key of keys){const raw=this.storage.getItem(key);if(this.storage.getItem(key+':ack')===raw)continue;try{const records=JSON.parse(raw);if(records&&typeof records==='object'&&!Array.isArray(records)&&Object.keys(records).length&&Object.values(records).every(x=>Number.isInteger(x.expected_revision)&&x.patch&&typeof x.patch==='object'&&!Array.isArray(x.patch)))entries.push({key,raw,records});}catch{}}return entries;}
 acknowledge(entry){this.storage.setItem(entry.key+':ack',entry.raw);}
}
