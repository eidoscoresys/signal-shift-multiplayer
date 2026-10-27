param([string]$PublicUrl='https://signal-shift.signal-shift.workers.dev',[Parameter(Mandatory=$true)][string]$DeploymentVersion)
$ErrorActionPreference='Stop'
$projectRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$report=Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'docs/public-test-results.json')|ConvertFrom-Json
if($report.stats.expected -ne 23 -or $report.stats.unexpected -ne 0 -or $report.stats.skipped -ne 0 -or $report.stats.flaky -ne 0){throw 'The complete 23-test published acceptance report must pass before packaging.'}
$unitReport=Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'docs/unit-test-results.json')|ConvertFrom-Json
if($unitReport.numPassedTests -ne 35 -or $unitReport.numFailedTests -ne 0 -or $unitReport.numPendingTests -ne 0){throw 'The complete 35-test unit report must pass before packaging.'}
$localReport=Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'docs/local-test-results.json')|ConvertFrom-Json
if($localReport.stats.expected -ne 27 -or $localReport.stats.unexpected -ne 0 -or $localReport.stats.skipped -ne 0 -or $localReport.stats.flaky -ne 0){throw 'The complete 27-test local acceptance report must pass before packaging.'}
$pkg=Get-Content -Raw -LiteralPath (Join-Path $projectRoot 'package.json')|ConvertFrom-Json
$health=Invoke-RestMethod -Uri ($PublicUrl.TrimEnd('/')+'/api/health')
if($health.version -ne $pkg.version){throw 'The deployed version must match package.json before packaging a verified public release.'}
$releaseRoot=Join-Path $projectRoot 'release'
New-Item -ItemType Directory -Force -Path $releaseRoot|Out-Null
$folders=@('src','server','shared','tests','scripts','assets','public')
$roots=@('.gitattributes','CITATION.cff','.gitignore','index.html','README.md','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.json','vite.config.ts','vitest.config.ts','playwright.config.ts','wrangler.jsonc')
$sourceFiles=@(foreach($folder in $folders){Get-ChildItem -LiteralPath (Join-Path $projectRoot $folder) -Recurse -File})
$sourceFiles+=@(foreach($name in $roots){Get-Item -LiteralPath (Join-Path $projectRoot $name)})
$sourceFiles+=@(Get-ChildItem -LiteralPath (Join-Path $projectRoot 'docs') -Filter '*.md' -File)
$sourceFiles+=@(Get-ChildItem -LiteralPath (Join-Path $projectRoot 'docs/screenshots') -File)
$sourceFiles+=@(Get-ChildItem -LiteralPath (Join-Path $projectRoot 'docs/verification') -File)
$sourceFiles=@($sourceFiles|Sort-Object FullName -Unique)
$records=@(foreach($file in $sourceFiles){$full=[IO.Path]::GetFullPath($file.FullName);if(-not $full.StartsWith($projectRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'A source file resolved outside the workspace.'};[pscustomobject]@{path=[IO.Path]::GetRelativePath($projectRoot,$full).Replace([char]92,[char]47);bytes=$file.Length;sha256=(Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash.ToLowerInvariant()}})
try{$gitHead=& git -C $projectRoot rev-parse --verify HEAD 2>$null}catch{$gitHead=$null}
if($LASTEXITCODE -ne 0){$gitHead=$null}
$remotes=@(& git -C $projectRoot remote -v)
$manifest=[ordered]@{release=$pkg.version;publicUrl=$PublicUrl;deploymentVersion=$DeploymentVersion;createdUtc=[DateTime]::UtcNow.ToString('o');verification=@{unitPassed=35;localIntegrationPassed=27;publicIntegrationPassed=$report.stats.expected;publicSkipped=$report.stats.skipped;physicalDevices='unverified'};git=@{head=$gitHead;remotes=$remotes};files=$records}
$manifestPath=Join-Path $releaseRoot 'source-manifest.json'
$manifest|ConvertTo-Json -Depth 10|Set-Content -LiteralPath $manifestPath -Encoding utf8
$archivePath=Join-Path $releaseRoot ('signal-shift-'+$pkg.version+'-source.zip')
$stream=[IO.File]::Open($archivePath,[IO.FileMode]::Create,[IO.FileAccess]::Write)
$archive=[IO.Compression.ZipArchive]::new($stream,[IO.Compression.ZipArchiveMode]::Create,$false)
try{for($i=0;$i -lt $sourceFiles.Count;$i++){[IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$sourceFiles[$i].FullName,$records[$i].path,[IO.Compression.CompressionLevel]::Optimal)|Out-Null};[IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive,$manifestPath,'source-manifest.json',[IO.Compression.CompressionLevel]::Optimal)|Out-Null}finally{$archive.Dispose();$stream.Dispose()}
$delivery=[ordered]@{release=$pkg.version;publicUrl=$PublicUrl;deploymentVersion=$DeploymentVersion;sourceArchive=[IO.Path]::GetFileName($archivePath);sourceArchiveSha256=(Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant();sourceManifestSha256=(Get-FileHash -LiteralPath $manifestPath -Algorithm SHA256).Hash.ToLowerInvariant();coverSha256=(Get-FileHash -LiteralPath (Join-Path $projectRoot 'assets/signal-shift-cover.png')).Hash.ToLowerInvariant();thumbnailSha256=(Get-FileHash -LiteralPath (Join-Path $projectRoot 'assets/signal-shift-thumbnail.png')).Hash.ToLowerInvariant()}
$delivery|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $releaseRoot 'delivery-manifest.json') -Encoding utf8
Write-Output ('Created '+$archivePath)
Write-Output ('Source files: '+$sourceFiles.Count+'; archive SHA-256: '+$delivery.sourceArchiveSha256)
