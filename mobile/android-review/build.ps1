param([string]$Sdk="$env:LOCALAPPDATA\Android\Sdk",[string]$ExistingKey="$env:USERPROFILE\.android\debug.keystore")
$ErrorActionPreference='Stop'
$root=$PSScriptRoot
if(!(Test-Path -LiteralPath $ExistingKey)){throw 'Existing signing key absent. No new key will be generated.'}
$tools=Join-Path $Sdk 'build-tools\36.0.0';$platform=Join-Path $Sdk 'platforms\android-36\android.jar'
function Run([string]$tool,[string[]]$arguments){& $tool @arguments;if($LASTEXITCODE -ne 0){throw "Build step failed: $tool ($LASTEXITCODE)"}}
Run 'node' @((Join-Path $root 'build-assets.mjs'))
$build=Join-Path $root 'build';$classes=Join-Path $build 'classes';$dex=Join-Path $build 'dex'
New-Item -ItemType Directory -Force -Path $classes,$dex | Out-Null
Run (Join-Path $tools 'aapt.exe') @('package','-f','-M',(Join-Path $root 'AndroidManifest.xml'),'-I',$platform,'-A',(Join-Path $build 'assets'),'-F',(Join-Path $build 'unsigned.apk'))
Run 'javac' @('-encoding','UTF-8','--release','8','-classpath',$platform,'-d',$classes,(Join-Path $root 'java\kr\threads\review\ReviewActivity.java'))
$classFiles=@(Get-ChildItem -LiteralPath $classes -Recurse -Filter '*.class' | ForEach-Object {$_.FullName})
Run (Join-Path $tools 'd8.bat') (@('--lib',$platform,'--min-api','26','--output',$dex)+$classFiles)
Push-Location $dex
try { Run (Join-Path $tools 'aapt.exe') @('add',(Join-Path $build 'unsigned.apk'),'classes.dex') } finally {Pop-Location}
Run (Join-Path $tools 'zipalign.exe') @('-f','-p','4',(Join-Path $build 'unsigned.apk'),(Join-Path $build 'aligned.apk'))
# Reuse the pre-existing Android debug identity, never generate keys.
Run (Join-Path $tools 'apksigner.bat') @('sign','--ks',$ExistingKey,'--ks-key-alias','androiddebugkey','--ks-pass','pass:android','--key-pass','pass:android','--out',(Join-Path $build 'Threads-Review-0.1.1.apk'),(Join-Path $build 'aligned.apk'))
Run (Join-Path $tools 'apksigner.bat') @('verify','--verbose',(Join-Path $build 'Threads-Review-0.1.1.apk'))
Run (Join-Path $tools 'aapt.exe') @('dump','badging',(Join-Path $build 'Threads-Review-0.1.1.apk'))
Get-FileHash -LiteralPath (Join-Path $build 'Threads-Review-0.1.1.apk') -Algorithm SHA256
