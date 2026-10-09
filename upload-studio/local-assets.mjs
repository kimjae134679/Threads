import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const fail=code=>{throw Object.assign(new Error(code),{code,status:400});};
export class LocalAssets {
  constructor(root){this.root=path.join(path.resolve(root),'assets');}
  async add({name,mime,base64}) {
    if(typeof base64!=='string'||base64.length>15000000||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))fail('asset_invalid');
    const bytes=Buffer.from(base64,'base64');if(!bytes.length||bytes.length>25*1024*1024)fail('asset_size_limit');
    const valid=mime==='image/jpeg'?bytes.subarray(0,3).equals(Buffer.from([255,216,255])):mime==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):mime==='image/webp'?bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP':false;
    if(!valid)fail('asset_format_invalid');
    const asset_id=createHash('sha256').update(bytes).digest('hex'),asset={asset_id,mime,bytes:bytes.length,name:String(name||'image').replace(/[\\/\0]/g,'_').slice(0,200)};
    await fs.mkdir(this.root,{recursive:true,mode:0o700});try{await fs.writeFile(path.join(this.root,asset_id),bytes,{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}try{await fs.writeFile(path.join(this.root,asset_id+'.json'),JSON.stringify(asset),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}return asset;
  }
  async read(assetId){if(!/^[a-f0-9]{64}$/.test(assetId))fail('asset_not_found');try{const asset=JSON.parse(await fs.readFile(path.join(this.root,assetId+'.json'),'utf8'));const bytes=await fs.readFile(path.join(this.root,assetId));return {asset,bytes};}catch{fail('asset_not_found');}}
  async verifyPosts(posts){for(const post of posts)for(const image of post.images||[]){const {asset}=await this.read(image.asset_id);if(asset.mime!==image.mime)fail('asset_mime_mismatch');}}
}
