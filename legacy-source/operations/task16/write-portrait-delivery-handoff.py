import hashlib, json, subprocess, time
from pathlib import Path
base=Path(__file__).resolve().parent
dest=Path('D:/A_KJ/AI/Projects/Threads/자료/06_자동 제작 결과/세로 결과 보존_20261010')
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):
    h=hashlib.sha256()
    with open(p,'rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
    return h.hexdigest()
complete=read(dest/'delivery-complete.json')
mapping=read(dest/'delivery-mapping.json')
repo=base/'cover-integration'
commit=subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip()
remote=subprocess.check_output(['git','-C',str(repo),'ls-remote','origin','refs/heads/codex/cover-only-integration-20261008'],text=True).split()[0]
assert commit==remote=='3e6d1a4a017477738d4d8aab571b0e3f00294126'
asar=base/'portrait-package-20261009-ec0cd89/dist/win-unpacked/resources/app.asar'
assert sha(asar)==mapping['appAsarSha256']
handoff={'schema':'threads-producer-path-handoff-v1','checkedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),
 'status':'producer-copy-complete-review-transition-pending','deliveryRoot':str(dest),
 'mappingFile':str(dest/'delivery-mapping.json'),'mappingSha256':sha(dest/'delivery-mapping.json'),
 'completeFile':str(dest/'delivery-complete.json'),'completeSha256':sha(dest/'delivery-complete.json'),
 'recoveryFile':str(dest/'recovery-map.json'),'recoverySha256':sha(dest/'recovery-map.json'),
 'checkpointRoots':mapping['delivery']['roots'],
 'copiedFiles':complete['copiedFiles'],'copiedBytes':complete['copiedBytes'],'posts':199,'activePngs':1918,
 'versionCalculationsVerified':398,'targetAndSourceBundleRowsVerified':199,
 'rawContractPinsVerified':True,'absoluteRefsResolved':15300,'missingAbsoluteReferences':0,
 'producerSource':{'checkout':str(repo),'actualCommit':commit,'remoteCommit':remote,
                   'repository':'https://github.com/kimjae134679/Threads',
                   'branch':'codex/cover-only-integration-20261008','draftPullRequest':'https://github.com/kimjae134679/Threads/pull/12',
                   'currentChangeFiles':['docs/PORTRAIT_DELIVERY_PATH_CONTRACT_2026-10-10.md'],
                   'uncommittedCanceledVideoFilesRetained':['vertical-video.mjs','test/vertical-video-timing.test.mjs']},
 'productionArtifact':{'sourceCommit':'ec0cd894fa110c1c722bc24ca882ee90bf850c45','asarFile':str(asar),
                      'asarSha256':sha(asar),'version':'0.3.39-portrait.20261009.1','installedToOperatingApp':False},
 'commonContract':{'startObservation':complete['commonContractObserved'],
                   'completionObservation':complete['commonContractCurrentObservation'],
                   'controllerValidationComplete':False,'commonFilesModifiedByProducer':False},
 'reviewTransition':{'owner':'threads-review','completed':False,'oldPathsRetained':True,
                     'evaluationReuseAuthorized':False,'nextSteps':['verify exact delivery artifact pins',
                     'back up review config then CAS and realpath containment switch both relocated checkpoint roots',
                     'verify target/source_bundle and real image/full-content viewer consumption',
                     'owner supplies controller source/pins and fresh idle/receipt validation']},
 'notPerformed':['rendering','old output replacement','source deletion/move','review decisions/evaluation modification',
                 'operating install/restart','shared queue changes','Buffer publication/schedule/API/auth'],
 'accessEvidence':{'GitHubDirectUsed':True,'normalLocalToolsUsed':True,'DesktopCommanderUsed':False,
                   'initialHelperSetupFailure':{'phase':'before execution','cause':'unconfirmed'}}}
with open(dest/'producer-handoff.json','x',encoding='utf-8',newline='\n') as f:
    json.dump(handoff,f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps({'handoffFile':str(dest/'producer-handoff.json'),'sha256':sha(dest/'producer-handoff.json'),
                  'completeSha256':handoff['completeSha256'],'sourceCommit':commit,'asarVerified':True},ensure_ascii=False))
