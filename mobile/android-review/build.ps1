param([string]$Sdk="$env:LOCALAPPDATA\Android\Sdk",[string]$ExistingKey="$env:USERPROFILE\.android\debug.keystore",[string]$ApprovedPublicConfig='')
$ErrorActionPreference='Stop'
$root=$PSScriptRoot
if(!(Test-Path -LiteralPath $ExistingKey)){throw 'Existing signing key absent. No new key will be generated.'}
$tools=Join-Path $Sdk 'build-tools\36.0.0';$platform=Join-Path $Sdk 'platforms\android-36\android.jar'
function Run([string]$tool,[string[]]$arguments){& $tool @arguments;if($LASTEXITCODE -ne 0){throw "Build step failed: $tool ($LASTEXITCODE)"}}
Run 'node' @((Join-Path $root 'build-assets.mjs'))
$build=Join-Path $root 'build';$classes=Join-Path $build 'classes';$dex=Join-Path $build 'dex'
New-Item -ItemType Directory -Force -Path $classes,$dex | Out-Null
Run (Join-Path $tools 'aapt.exe') @('package','-f','-M',(Join-Path $root 'AndroidManifest.xml'),'-I',$platform,'-A',(Join-Path $build 'assets'),'-F',(Join-Path $build 'unsigned.apk'))
$javaFiles=@(Get-ChildItem -LiteralPath (Join-Path $root 'java\kr\threads\review') -Filter '*.java' | ForEach-Object {$_.FullName})
if($ApprovedPublicConfig){
 # Future user-approved PUBLIC IDs only; no credentials accepted or created.
 $approvedConfig=Get-Content -LiteralPath $ApprovedPublicConfig -Raw -Encoding UTF8 | ConvertFrom-Json
 $allowedFields=@('clientId','owner','repo','repositoryId','branch','activationApproved','dedicatedRepositoryApproved','excludedRepositories')
 if(@($approvedConfig.PSObject.Properties.Name | Where-Object {$_ -notin $allowedFields}).Count){throw 'Unexpected configuration field; credentials are not allowed.'}
 if($approvedConfig.activationApproved -isnot [bool] -or $approvedConfig.dedicatedRepositoryApproved -isnot [bool] -or $approvedConfig.activationApproved -ne $true -or $approvedConfig.dedicatedRepositoryApproved -ne $true){throw 'Exact separate connection/dedicated repository approval is required.'}
 if($approvedConfig.clientId -notmatch '^[A-Za-z0-9_.-]+$' -or $approvedConfig.owner -notmatch '^[A-Za-z0-9-]+$' -or $approvedConfig.repo -notmatch '^[A-Za-z0-9_.-]+$' -or $approvedConfig.branch -ne 'mobile-review/data' -or $approvedConfig.repositoryId -notmatch '^[1-9][0-9]*$'){throw 'Invalid public configuration.'}
 if($approvedConfig.excludedRepositories -isnot [Array] -or @($approvedConfig.excludedRepositories | Where-Object {$_ -ieq ($approvedConfig.owner+'/'+$approvedConfig.repo)}).Count){throw 'Explicit bridge/command exclusions required; those repositories cannot be used.'}
 $generated=Join-Path $build 'generated';New-Item -ItemType Directory -Force -Path $generated | Out-Null
 $generatedConfig=Join-Path $generated 'ConnectionConfig.java'
 $configText=[System.IO.File]::ReadAllText((Join-Path $root 'java\kr\threads\review\ConnectionConfig.java'))
 $configText=$configText.Replace('ACTIVATION_APPROVED=false,DEDICATED_REPOSITORY_APPROVED=false','ACTIVATION_APPROVED=true,DEDICATED_REPOSITORY_APPROVED=true').Replace('CLIENT_ID="",OWNER="",REPO=""',('CLIENT_ID="'+$approvedConfig.clientId+'",OWNER="'+$approvedConfig.owner+'",REPO="'+$approvedConfig.repo+'"')).Replace('REPOSITORY_ID=0',('REPOSITORY_ID='+$approvedConfig.repositoryId+'L'))
 [System.IO.File]::WriteAllText($generatedConfig,$configText,[System.Text.UTF8Encoding]::new($false))
 $javaFiles=@($javaFiles | Where-Object {[System.IO.Path]::GetFileName($_) -ne 'ConnectionConfig.java'})+$generatedConfig
}
Run 'javac' (@('-encoding','UTF-8','--release','8','-classpath',$platform,'-d',$classes)+$javaFiles)
$classFiles=@(Get-ChildItem -LiteralPath $classes -Recurse -Filter '*.class' | ForEach-Object {$_.FullName})
Run (Join-Path $tools 'd8.bat') (@('--lib',$platform,'--min-api','26','--output',$dex)+$classFiles)
Push-Location $dex
try { Run (Join-Path $tools 'aapt.exe') @('add',(Join-Path $build 'unsigned.apk'),'classes.dex') } finally {Pop-Location}
Run (Join-Path $tools 'zipalign.exe') @('-f','-p','4',(Join-Path $build 'unsigned.apk'),(Join-Path $build 'aligned.apk'))
# Reuse the pre-existing Android debug identity, never generate keys.
Run (Join-Path $tools 'apksigner.bat') @('sign','--ks',$ExistingKey,'--ks-key-alias','androiddebugkey','--ks-pass','pass:android','--key-pass','pass:android','--out',(Join-Path $build 'Threads-Review-0.1.4.apk'),(Join-Path $build 'aligned.apk'))
Run (Join-Path $tools 'apksigner.bat') @('verify','--verbose',(Join-Path $build 'Threads-Review-0.1.4.apk'))
Run (Join-Path $tools 'aapt.exe') @('dump','badging',(Join-Path $build 'Threads-Review-0.1.4.apk'))
Get-FileHash -LiteralPath (Join-Path $build 'Threads-Review-0.1.4.apk') -Algorithm SHA256
