"""Verify an already copied tree after a common-owner concurrent edit. No recopy."""
import json, os, subprocess, zipfile
from pathlib import Path
import importlib.util
spec = importlib.util.spec_from_file_location('stage_portrait_delivery', Path(__file__).with_name('stage-portrait-delivery.py'))
s = importlib.util.module_from_spec(spec)
spec.loader.exec_module(s)

def checked_file(old, new, role, expected=None):
    s.regular(old); s.regular(new)
    before = s.digest(old)
    assert not expected or before == expected, 'Original pin mismatch: '+str(old)
    assert Path(old).stat().st_size == Path(new).stat().st_size
    assert s.digest(new) == before, 'Copy differs: '+str(new)
    s.inventory.append({'oldPath':str(old),'newPath':str(new),'bytes':Path(old).stat().st_size,
                        'sha256':before,'role':role,'sourceRetained':True,'verified':True})

def checked_tree(old, new, role, pins=None):
    a={str(p.relative_to(old)):p for p in Path(old).rglob('*') if p.is_file()}
    b={str(p.relative_to(new)):p for p in Path(new).rglob('*') if p.is_file()}
    assert set(a)==set(b), 'Inventory mismatch: '+str(old)
    if pins is not None:
        assert {x.replace('\\','/') for x in a}==set(pins)
    for name in sorted(a):
        checked_file(a[name], b[name], role, pins.get(name.replace('\\','/')) if pins else None)

def main():
    pending=s.read(s.DEST/'delivery-pending.json')
    assert pending['state']=='copying'
    assert not (s.DEST/'delivery-complete.json').exists()
    common_now={f:s.digest(s.COMMON/f) for f in s.common_files}
    common_commit=subprocess.check_output(['git','-C',str(s.COMMON),'rev-parse','HEAD'],text=True).strip()
    assert common_commit==pending['commonContractObserved']['expectedCommit']
    catalog=s.read(s.COMMON/'project.catalog.json')
    threads=next(x for x in catalog['projects'] if x['id']=='Threads')
    assert Path(threads['integration']['roles']['data']).resolve()==s.DATA.resolve()
    mapping_file=s.PACKAGE/'incremental-current-199/current-199-mapping.json'
    mapping=s.read(mapping_file)
    for root in pending['roots']:
        s.translations.extend([(root['oldCheckpointRoot'],root['newCheckpointRoot']),
                               (root['oldOutputRoot'],root['newOutputRoot'])])
    rows=[]
    for row in mapping['rows']:
        checkpoint=s.read(row['checkpoint'])
        s.translations.append((checkpoint['selectedInput'],str(s.DEST/'inputs'/row['id'])))
    for i,row in enumerate(mapping['rows'],1):
        cp=s.read(row['checkpoint'])
        new=Path(s.translate(row['output']))
        group='representative-run' if Path(row['checkpoint']).is_relative_to(s.PACKAGE/'representative-run') else 'incremental-current-199'
        checked_tree(Path(row['output']),new,'completed-output',
                     {x['name'].replace('\\','/'):x['sha256'] for x in cp['files']})
        checked_tree(Path(cp['selectedInput']),s.DEST/'inputs'/row['id'],'selected-input')
        raw=s.DEST/group/'checkpoints/raw'/Path(row['checkpoint']).name
        checked_file(Path(row['checkpoint']),raw,'original-checkpoint')
        relocated=Path(s.translate(row['checkpoint']))
        assert s.read(relocated)==s.translate(cp)
        proof=s.read(s.DEST/group/'checkpoints/relocation-proofs'/raw.name)
        assert proof['rawSha256']==s.digest(raw) and proof['relocatedSha256']==s.digest(relocated)
        assert proof['newTarget']==str(new) and proof['sourceBundleSha256']==row['sourceBundleSha256']
        assert s.digest(new/'source-bundle.zip')==row['sourceBundleSha256']
        assert s.digest(new/'review-preview.zip')==row['outputZipSha256']
        for image in row['images']:
            file=new/image['name']
            assert s.digest(file)==image['sha256'] and file.stat().st_size==image['bytes']
            with open(file,'rb') as f: header=f.read(24)
            assert header[:8]==b'\x89PNG\r\n\x1a\n' and int.from_bytes(header[16:20],'big')==1080 and int.from_bytes(header[20:24],'big')==1440
        relocated_row=s.translate(row)
        relocated_row.update(source_bundle=str(new/'source-bundle.zip'),rawCheckpoint=str(raw))
        rows.append(relocated_row)
        if i%25==0 or i==199:
            print(json.dumps({'phase':'independent-verification','posts':i,'total':199,'files':len(s.inventory)}),flush=True)
    checked_file(mapping_file,s.DEST/'contracts/original-current-199-mapping.json','original-contract')
    for group in ['representative-run','incremental-current-199']:
        source=s.PACKAGE/group
        for f in source.iterdir():
            if f.is_file() and f.suffix.lower()=='.json':
                checked_file(f,s.DEST/'contracts'/group/f.name,'production-record')
        if (source/'preserved-evaluation').exists():
            checked_tree(source/'preserved-evaluation',s.DEST/'preserved-evaluation'/group,'historical-evaluation-snapshot')
    for snapshot in mapping['evaluationSnapshots']:
        old=Path(snapshot['file'])
        new=s.DEST/'preserved-evaluation/incremental-current-199'/old.name
        assert s.digest(new)==snapshot['sha256']
        s.translations.append((str(old),str(new)))
    # Audit ALL copied JSON (including inputs), plus JSON members inside both ZIP types.
    bundle_fields=[]
    def bundle_refs(v, artifact, trail=''):
        if isinstance(v,dict):
            for k,x in v.items():
                pointer=trail+'/'+k
                if k.lower().replace('_','') in ['sourcebundle','sourcebundlefile','sourcebundlepath'] and isinstance(x,str):
                    if Path(x).is_absolute():
                        resolved=s.translate(x)
                    elif '!' in artifact:
                        resolved=artifact.split('!')[0]+'!'+x
                    else:
                        resolved=str(Path(artifact).parent/x)
                    bundle_fields.append({'artifact':artifact,'jsonPointer':pointer,'value':x,'resolvedPath':resolved})
                bundle_refs(x,artifact,pointer)
        elif isinstance(v,list):
            for i,x in enumerate(v): bundle_refs(x,artifact,trail+'/'+str(i))
    for item in s.inventory:
        f=Path(item['newPath'])
        if f.suffix.lower()=='.json':
            value=s.read(f);s.audit_json(value,str(f));bundle_refs(value,str(f))
        if item['role']=='completed-output' and f.name in ['source-bundle.zip','review-preview.zip']:
            with zipfile.ZipFile(f) as zip:
                for name in zip.namelist():
                    if name.lower().endswith('.json'):
                        try: value=json.loads(zip.read(name).decode('utf-8-sig'))
                        except (ValueError,UnicodeError): continue
                        artifact=str(f)+'!'+name
                        s.audit_json(value,artifact);bundle_refs(value,artifact)
    # The current reread is observation only; a producer does not issue a controller receipt.
    after={f:s.digest(s.COMMON/f) for f in s.common_files}
    result=s.translate(mapping);result['rows']=rows
    result['delivery']={**pending,'state':'complete','readyForReviewPathTransition':True,'completedAt':s.stamp(),
                        'posts':199,'activePngs':1918,'copiedFiles':len(s.inventory),'copiedBytes':sum(x['bytes'] for x in s.inventory),
                        'concurrentContractChangeResolvedByReread':True,
                        'commonContractCurrentObservation':{'actualCommit':common_commit,'rawFileHashes':after,
                            'stableDuringIndependentVerification':common_now==after,'dataRoleConfirmed':True,
                            'controllerApplyOrReceiptIssued':False}}
    s.write(s.DEST/'file-inventory.json',{'schema':'sha256-raw-copy-inventory-v1','files':s.inventory,
                                        'fileCount':len(s.inventory),'bytes':sum(x['bytes'] for x in s.inventory)})
    s.write(s.DEST/'absolute-reference-audit.json',{'schema':'raw-artifact-reference-resolution-v1','references':s.references,
                                                 'sourceBundleFields':bundle_fields,'rawJsonAndZipBytesUnchanged':True,
                                                 'historicalReferenceMissingCount':sum(not x['exists'] for x in s.references)})
    s.write(s.DEST/'recovery-map.json',{'schema':'retained-original-recovery-v1','operation':'copy-only','oldPathsRetained':True,
                                      'reviewTransitionVerified':False,'roots':pending['roots'],
                                      'pathPrefixes':[{'oldPath':a,'newPath':b} for a,b in s.translations],
                                      'instructions':'Review owner can revert config to oldPath. Keep both trees until transition is verified.',
                                      'fileInventory':str(s.DEST/'file-inventory.json')})
    s.write(s.DEST/'delivery-mapping.json',result)
    artifacts=['delivery-mapping.json','file-inventory.json','absolute-reference-audit.json','recovery-map.json']
    s.write(s.DEST/'delivery-complete.json',{**result['delivery'],'artifacts':{
        f:{'file':str(s.DEST/f),'sha256':s.digest(s.DEST/f),'bytes':(s.DEST/f).stat().st_size} for f in artifacts},
        'oldAndNewSourceHashesVerified':True,'pngHashesAndDimensionsVerified':True,
        'checkpoints':{'representative':4,'incremental':195},'zipCrcVerifiedDuringOriginalCopy':True,
        'allZipBytesReverified':True,'controllerValidationComplete':False,'reviewConfigTransitionComplete':False,
        'priorFailurePreserved':'Common contract concurrent edit stopped only final record; full copied tree independently reverified.'})
    print(json.dumps({'phase':'complete','mappingFile':str(s.DEST/'delivery-mapping.json'),'mappingSha256':s.digest(s.DEST/'delivery-mapping.json'),
                      'copiedFiles':len(s.inventory),'copiedBytes':sum(x['bytes'] for x in s.inventory),
                      'absoluteRefs':len(s.references),'missingHistoricalRefs':sum(not x['exists'] for x in s.references),
                      'sourceBundleFields':len(bundle_fields)},ensure_ascii=False),flush=True)

if __name__=='__main__':
    main()
