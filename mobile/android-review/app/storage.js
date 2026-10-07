export function openStore(){
 return new Promise((resolve,reject)=>{const r=indexedDB.open('threads-mobile-review-v1',1);r.onupgradeneeded=()=>{r.result.createObjectStore('state');r.result.createObjectStore('assets');};r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result);});
}
export function readStore(db,store,k){return new Promise((resolve,reject)=>{const tx=db.transaction(store),r=tx.objectStore(store).get(k);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export function writeStore(db,store,k,value){return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value,k);tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(tx.error||Error('로컬 저장 실패'));});}
