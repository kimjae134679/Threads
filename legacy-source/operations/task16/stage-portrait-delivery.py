"""One-time authorized copy. Raw bytes stay raw; relocated contracts are separate."""
import hashlib, json, os, shutil, sys, time, zipfile
from pathlib import Path

BASE = Path(__file__).resolve().parent
PACKAGE = BASE / 'portrait-package-20261009-ec0cd89'
DATA = Path('D:/A_KJ/AI/Projects/Threads/자료')
DEST = DATA / '06_자동 제작 결과/세로 결과 보존_20261010'
COMMON = Path('D:/A_KJ/AI/Workspace/ControlTower/threads-studio-controls-20261010')
SOURCE_COMMIT = 'ec0cd894fa110c1c722bc24ca882ee90bf850c45'
common_files = ['project.catalog.json', '01_CONTROL/PROJECT_PRESENTATION_RULES.md', 'tools/project-controller/validate.mjs']

def digest(file):
    h = hashlib.sha256()
    with open(file, 'rb') as stream:
        for chunk in iter(lambda: stream.read(1024*1024), b''):
            h.update(chunk)
    return h.hexdigest()

def read(file):
    return json.loads(Path(file).read_text(encoding='utf-8-sig'))

def stamp():
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())

def regular(file):
    file = Path(file)
    for current in [file, *file.parents]:
        if current.exists() and (current.is_symlink() or current.is_junction()):
            raise ValueError('Link path prohibited: ' + str(current))
    if not file.is_file() or file.stat().st_nlink != 1:
        raise ValueError('Not an independent regular file: ' + str(file))

def child(root, relative):
    root, relative = Path(root).resolve(), Path(relative)
    if relative.is_absolute():
        raise ValueError('Absolute relative path')
    result = (root / relative).resolve()
    if not result.is_relative_to(root) or result == root:
        raise ValueError('Path escape')
    return result

def write(file, value):
    file = Path(file)
    assert file.resolve().is_relative_to(DEST.resolve())
    file.parent.mkdir(parents=True, exist_ok=True)
    with open(file, 'x', encoding='utf-8', newline='\n') as f:
        json.dump(value, f, ensure_ascii=False, indent=2)
        f.write('\n')

inventory, references, translations = [], [], []

def copy_file(source, target, role, expected=None):
    source, target = Path(source), Path(target)
    regular(source)
    assert target.resolve().is_relative_to(DEST.resolve())
    assert not target.exists(), 'Destination collision: ' + str(target)
    before_size = source.stat().st_size
    sha = digest(source)
    if expected:
        assert sha == expected, 'Source pin mismatch: ' + str(source)
    target.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive destination creation; no overwrite, move or deletion.
    with open(source, 'rb') as src, open(target, 'xb') as dst:
        shutil.copyfileobj(src, dst, length=1024*1024)
    assert target.stat().st_size == before_size and digest(target) == sha
    assert source.stat().st_size == before_size and digest(source) == sha, 'Source changed while copying'
    entry = {'oldPath': str(source), 'newPath': str(target), 'bytes': before_size,
             'sha256': sha, 'role': role, 'sourceRetained': True, 'verified': True}
    inventory.append(entry)
    return entry

def copy_tree(source, target, role, pins=None):
    source = Path(source)
    for folder, dirs, names in os.walk(source, followlinks=False):
        assert not Path(folder).is_junction() and not Path(folder).is_symlink()
        for name in dirs:
            assert not (Path(folder)/name).is_symlink() and not (Path(folder)/name).is_junction()
        for name in sorted(names):
            file = Path(folder)/name
            rel = file.relative_to(source)
            pin = pins.get(rel.as_posix()) if pins else None
            copy_file(file, child(target, rel), role, pin)

def translate(value):
    if isinstance(value, str):
        normalized = value.replace('\\', '/').rstrip('/')
        for old, new in sorted(translations, key=lambda t: len(t[0]), reverse=True):
            key = old.replace('\\', '/').rstrip('/')
            if normalized.lower() == key.lower() or normalized.lower().startswith(key.lower()+'/'):
                return str(Path(new) / normalized[len(key):].lstrip('/'))
        return value
    if isinstance(value, list):
        return [translate(x) for x in value]
    if isinstance(value, dict):
        return {k: translate(v) for k, v in value.items()}
    return value

def audit_json(value, artifact, trail=''):
    if isinstance(value, dict):
        for key, v in value.items():
            audit_json(v, artifact, trail+'/'+str(key))
    elif isinstance(value, list):
        for i, v in enumerate(value):
            audit_json(v, artifact, trail+'/'+str(i))
    elif isinstance(value, str) and Path(value).is_absolute():
        new = translate(value)
        present = Path(new).exists()
        references.append({'artifact': artifact, 'jsonPointer': trail, 'oldPath': value,
                           'resolvedPath': new, 'relocated': new != value,
                           'exists': present, 'kind': 'historical-runtime' if trail.endswith('/executable') else 'file-reference'})

def main():
    assert not DEST.exists(), 'Existing delivery must be inspected, never overwritten'
    assert DEST.resolve().is_relative_to(DATA.resolve())
    original = PACKAGE / 'incremental-current-199/current-199-mapping.json'
    mapping = read(original)
    assert len(mapping['rows']) == 199
    assert len({r['id'] for r in mapping['rows']}) == 199
    assert sum(len(r['images']) for r in mapping['rows']) == 1918
    common_before = {f: digest(COMMON/f) for f in common_files}
    checkpoints = []
    roots = []
    for group, count in [('representative-run',4), ('incremental-current-199',195)]:
        old = PACKAGE/group/'work/checkpoints'
        assert len(list(old.glob('*.json'))) == count
        new = DEST/group/'checkpoints/relocated'
        roots.append({'group':group, 'count':count, 'oldCheckpointRoot':str(old),
                      'rawCheckpointRoot':str(DEST/group/'checkpoints/raw'), 'newCheckpointRoot':str(new),
                      'oldOutputRoot':str(PACKAGE/group/'outputs'), 'newOutputRoot':str(DEST/group/'outputs')})
        translations.append((str(old), str(new)))
        translations.append((str(PACKAGE/group/'outputs'), str(DEST/group/'outputs')))
    for row in mapping['rows']:
        checkpoint = read(row['checkpoint'])
        assert checkpoint['state'] == 'complete' and checkpoint['id'] == row['id']
        assert Path(checkpoint['target']) == Path(row['output'])
        assert checkpoint['versionLinks']['newOutputVersion'] == row['newOutputVersion']
        new_input = DEST/'inputs'/row['id']
        translations.append((checkpoint['selectedInput'], str(new_input)))
        checkpoints.append((row, checkpoint))
    initial = {'schema':'threads-portrait-delivery-v1', 'state':'copying', 'readyForReviewPathTransition':False,
               'createdAt':stamp(), 'deliveryRoot':str(DEST), 'roots':roots, 'mappingFile':str(DEST/'delivery-mapping.json'),
               'inventoryFile':str(DEST/'file-inventory.json'), 'sourceCommit':SOURCE_COMMIT,
               'productionCodeChanged':False, 'rendered':False, 'activationAllowed':False, 'publicationAllowed':False,
               'commonContractObserved': {'expectedCommit':'ef70d28bde8d76cd874bc94e13699f04000c30be', 'rawFileHashes':common_before,
                                          'filesUncommitted':True, 'observationOnly':True},
               'reviewTransition': {'owner':'threads-review', 'completed':False, 'oldPathsRetained':True,
                                    'evaluationReuseAuthorized':False}}
    write(DEST/'delivery-pending.json', initial)
    print(json.dumps({'phase':'arrival-path-created','mappingFile':str(DEST/'delivery-mapping.json'), 'roots':roots}, ensure_ascii=False), flush=True)
    new_rows = []
    for i, (row, checkpoint) in enumerate(checkpoints, 1):
        group = 'representative-run' if Path(row['checkpoint']).is_relative_to(PACKAGE/'representative-run') else 'incremental-current-199'
        new_target = Path(translate(row['output']))
        pins = {x['name'].replace('\\','/'): x['sha256'] for x in checkpoint['files']}
        actual_names = {str(x.relative_to(Path(row['output']))).replace('\\','/') for x in Path(row['output']).rglob('*') if x.is_file()}
        assert actual_names == set(pins), 'Checkpoint inventory does not cover output folder'
        copy_tree(row['output'], new_target, 'completed-output', pins)
        for image in row['images']:
            file = new_target/image['name']
            assert digest(file) == image['sha256'] and file.stat().st_size == image['bytes']
            with open(file, 'rb') as f:
                header = f.read(24)
            assert header[:8] == b'\x89PNG\r\n\x1a\n'
            assert int.from_bytes(header[16:20],'big') == 1080 and int.from_bytes(header[20:24],'big') == 1440
        assert digest(new_target/'source-bundle.zip') == row['sourceBundleSha256']
        assert digest(new_target/'review-preview.zip') == row['outputZipSha256']
        new_input = DEST/'inputs'/row['id']
        copy_tree(checkpoint['selectedInput'], new_input, 'selected-input')
        raw = DEST/group/'checkpoints/raw'/Path(row['checkpoint']).name
        raw_entry = copy_file(row['checkpoint'], raw, 'original-checkpoint')
        relocated = Path(translate(row['checkpoint']))
        contract = translate(checkpoint)
        assert contract['target'] == str(new_target)
        assert contract['fingerprint'] == checkpoint['fingerprint'] and contract['versionLinks'] == checkpoint['versionLinks']
        write(relocated, contract)
        # Preserve historical flags in raw/relocated checkpoints; the delivery policy does NOT grant reuse.
        write(DEST/group/'checkpoints/relocation-proofs'/Path(row['checkpoint']).name,
              {'rawCheckpoint':str(raw), 'rawSha256':raw_entry['sha256'], 'originalCheckpoint':row['checkpoint'],
               'relocatedCheckpoint':str(relocated), 'relocatedSha256':digest(relocated),
               'oldTarget':row['output'], 'newTarget':str(new_target),
               'oldSourceBundle':str(Path(row['output'])/'source-bundle.zip'),
               'newSourceBundle':str(new_target/'source-bundle.zip'), 'sourceBundleSha256':row['sourceBundleSha256'],
               'oldSelectedInput':checkpoint['selectedInput'], 'newSelectedInput':str(new_input),
               'fingerprintUnchanged':True, 'versionsUnchanged':True, 'evaluationReuseAuthorized':False})
        new_row = translate(row)
        new_row['source_bundle'] = str(new_target/'source-bundle.zip')
        new_row['rawCheckpoint'] = str(raw)
        new_rows.append(new_row)
        audit_json(checkpoint, row['checkpoint'])
        for file in new_target.rglob('*.json'):
            audit_json(read(file), str(file))
        for zfile in [new_target/'source-bundle.zip', new_target/'review-preview.zip']:
            with zipfile.ZipFile(zfile) as zip:
                assert zip.testzip() is None
                for name in zip.namelist():
                    if name.lower().endswith('.json'):
                        try:
                            parsed = json.loads(zip.read(name).decode('utf-8-sig'))
                        except (ValueError,UnicodeError):
                            continue
                        audit_json(parsed, str(zfile)+'!'+name)
        if i % 10 == 0 or i == 199:
            print(json.dumps({'phase':'copied-and-hash-verified', 'posts':i, 'total':199, 'files':len(inventory), 'bytes':sum(f['bytes'] for f in inventory)}), flush=True)
    copy_file(original, DEST/'contracts/original-current-199-mapping.json', 'original-contract')
    # Preserve input requests, audit proofs and evaluation snapshots as records, never apply them to live state.
    for group in ['representative-run','incremental-current-199']:
        source = PACKAGE/group
        for file in source.iterdir():
            if file.is_file() and file.suffix.lower() == '.json':
                target = DEST/'contracts'/group/file.name
                copy_file(file, target, 'production-record')
                audit_json(read(file), str(target))
        ev = source/'preserved-evaluation'
        if ev.exists():
            copy_tree(ev, DEST/'preserved-evaluation'/group, 'historical-evaluation-snapshot')
    for snapshot in mapping['evaluationSnapshots']:
        old = Path(snapshot['file'])
        new = DEST/'preserved-evaluation/incremental-current-199'/old.name
        assert digest(new) == snapshot['sha256']
        translations.append((str(old), str(new)))
    result = translate(mapping)
    result['rows'] = new_rows
    result['delivery'] = {**initial, 'state':'complete', 'readyForReviewPathTransition':True,
                          'completedAt':stamp(), 'posts':199, 'activePngs':1918,
                          'copiedFiles':len(inventory), 'copiedBytes':sum(x['bytes'] for x in inventory)}
    assert {f:digest(COMMON/f) for f in common_files} == common_before, 'Common contract changed during copy; reread required'
    write(DEST/'file-inventory.json', {'schema':'sha256-raw-copy-inventory-v1','files':inventory,
                                     'fileCount':len(inventory),'bytes':sum(x['bytes'] for x in inventory)})
    write(DEST/'absolute-reference-audit.json', {'schema':'raw-artifact-reference-resolution-v1','references':references,
                                               'rawJsonAndZipBytesUnchanged':True,
                                               'historicalReferenceMissingCount':sum(not x['exists'] for x in references)})
    write(DEST/'recovery-map.json', {'schema':'retained-original-recovery-v1', 'operation':'copy-only',
                                   'oldPathsRetained':True,'reviewTransitionVerified':False,
                                   'instructions':'Review owner can revert config to oldPath. Do not delete either tree until transition is verified.',
                                   'roots':roots,'pathPrefixes': [{'oldPath':a,'newPath':b} for a,b in translations],
                                   'fileInventory':str(DEST/'file-inventory.json')})
    write(DEST/'delivery-mapping.json', result)
    manifest_files = ['delivery-mapping.json','file-inventory.json','absolute-reference-audit.json','recovery-map.json']
    write(DEST/'delivery-complete.json', {**result['delivery'], 'artifacts':{
        f:{'file':str(DEST/f),'sha256':digest(DEST/f),'bytes':(DEST/f).stat().st_size} for f in manifest_files},
        'oldAndNewSourceHashesVerified':True,'pngHashesAndDimensionsVerified':True,
        'checkpoints': {'representative':4,'incremental':195},'zipCrcVerified':True,
        'controllerValidationComplete':False, 'reviewConfigTransitionComplete':False})
    print(json.dumps({'phase':'complete','mappingFile':str(DEST/'delivery-mapping.json'),
                      'mappingSha256':digest(DEST/'delivery-mapping.json'), 'files':len(inventory),
                      'bytes':sum(x['bytes'] for x in inventory)},ensure_ascii=False), flush=True)

if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        if DEST.exists():
            path = DEST / ('delivery-failure-'+str(int(time.time()))+'.json')
            write(path, {'state':'held','time':stamp(),'error':str(exc),'copiedFiles':len(inventory),
                         'originalsRetained':True,'automaticResumeAllowed':False})
        raise
