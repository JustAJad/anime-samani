$ErrorActionPreference = 'Stop'
$installer = Join-Path $PWD 'dist/Anime-Samani-Setup-x64.exe'
$installDir = Join-Path $env:RUNNER_TEMP 'samani-registration-check'
$process = Start-Process -FilePath $installer -ArgumentList "/S /D=$installDir" -Wait -PassThru
if ($process.ExitCode -ne 0) { throw "Installer exited with $($process.ExitCode)" }
try {
  $entry = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' |
    Where-Object { $_.InstallLocation -and $_.InstallLocation.TrimEnd('\') -eq $installDir.TrimEnd('\') }
  if (@($entry).Count -ne 1) { throw 'Expected one uninstall registration for the test install' }
  if ($entry.DisplayName -ne 'Anime Samani') { throw "Unexpected appwiz name: $($entry.DisplayName)" }
  if ($entry.Publisher -ne 'Just A Jad') { throw "Unexpected publisher: $($entry.Publisher)" }
  if ($entry.DisplayVersion -ne '1.1.0') { throw "Unexpected internal version: $($entry.DisplayVersion)" }
  $info = [System.Diagnostics.FileVersionInfo]::GetVersionInfo((Join-Path $installDir 'ANIME_SAMANI.exe'))
  if ($info.CompanyName -ne 'Just A Jad') { throw "Unexpected EXE company: $($info.CompanyName)" }
  Write-Host 'PASS installed appwiz name Anime Samani, publisher Just A Jad and internal version 1.1.0'
} finally {
  Get-Process ANIME_SAMANI -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq (Join-Path $installDir 'ANIME_SAMANI.exe') } | Stop-Process -Force
  $uninstaller = Join-Path $installDir 'Uninstall Anime Samani.exe'
  if (Test-Path $uninstaller) {
    Start-Process -FilePath $uninstaller -ArgumentList '/S' -Wait | Out-Null
  }
}
