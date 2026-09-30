$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$certificate = if ($env:WIN_CSC_LINK) { $env:WIN_CSC_LINK } else { $env:CSC_LINK }
$thumbprint = $env:CLUTCHUB_SIGN_THUMBPRINT -replace '\s', ''
if ($certificate -and $thumbprint) {
  throw 'Choose one signing source: WIN_CSC_LINK (PFX) or CLUTCHUB_SIGN_THUMBPRINT (Windows certificate store).'
}
if (-not $certificate -and -not $thumbprint) {
  throw 'A trusted code-signing certificate is required. Set WIN_CSC_LINK and WIN_CSC_KEY_PASSWORD for PFX, or CLUTCHUB_SIGN_THUMBPRINT for a hardware-backed certificate in the Windows certificate store.'
}
if ($certificate -and -not ($env:WIN_CSC_KEY_PASSWORD -or $env:CSC_KEY_PASSWORD)) {
  throw 'The PFX password is missing. Set WIN_CSC_KEY_PASSWORD.'
}
if ($thumbprint) {
  if ($thumbprint -notmatch '^[0-9a-fA-F]{40}$') { throw 'CLUTCHUB_SIGN_THUMBPRINT must be a 40-character certificate thumbprint.' }
  $candidate = @('Cert:\CurrentUser\My', 'Cert:\LocalMachine\My') |
    ForEach-Object { Get-ChildItem -Path $_ -ErrorAction SilentlyContinue } |
    Where-Object { $_.Thumbprint -eq $thumbprint } |
    Select-Object -First 1
  if (-not $candidate) { throw 'The selected certificate is not installed in CurrentUser\My or LocalMachine\My.' }
  if (-not $candidate.HasPrivateKey) { throw 'The selected certificate has no accessible private key.' }
  if ($candidate.NotAfter -le (Get-Date)) { throw 'The selected certificate has expired.' }
  if (-not (@($candidate.EnhancedKeyUsageList | Where-Object { $_.ObjectId -eq '1.3.6.1.5.5.7.3.3' }).Count)) {
    throw 'The selected certificate is not valid for Code Signing.'
  }
}
Push-Location $root
try {
  if ($thumbprint) {
    npm run package:win -- "--config.win.signtoolOptions.certificateSha1=$thumbprint"
  } else {
    npm run package:win
  }
  if ($LASTEXITCODE -ne 0) { throw "electron-builder failed: $LASTEXITCODE" }
  $version = (Get-Content package.json -Raw | ConvertFrom-Json).version
  $installer = Join-Path $root "dist\ClutchHub-Setup-$version.exe"
  $files = @(
    $installer,
    (Join-Path $root 'dist\win-unpacked\ClutchHub.exe'),
    (Join-Path $root 'dist\win-unpacked\resources\keys\Clutchub.Keys.exe')
  )
  foreach ($file in $files) {
    if (-not (Test-Path -LiteralPath $file)) { throw "Signed output missing: $file" }
    $signature = Get-AuthenticodeSignature -LiteralPath $file
    if ($signature.Status -ne 'Valid') { throw "Signature is $($signature.Status) for $file" }
    Write-Output "Verified: $file ($($signature.SignerCertificate.Subject))"
  }
} finally { Pop-Location }
