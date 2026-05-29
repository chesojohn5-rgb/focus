<#
Build a GitHub Pages-ready frontend bundle into ./docs.

Usage:
  powershell -ExecutionPolicy Bypass -File .\build_github_frontend.ps1
#>

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$templatesDir = Join-Path $projectRoot 'templates'
$staticDir = Join-Path $projectRoot 'static'
$docsDir = Join-Path $projectRoot 'docs'
$docsStaticDir = Join-Path $docsDir 'static'

if (Test-Path $docsDir) {
  Remove-Item -LiteralPath $docsDir -Recurse -Force
}

New-Item -ItemType Directory -Path $docsDir | Out-Null
New-Item -ItemType Directory -Path $docsStaticDir | Out-Null

Get-ChildItem -Path $projectRoot -File | Where-Object {
  $_.Extension -in '.html', '.css', '.js' -or $_.Name -eq 'CNAME'
} | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $docsDir $_.Name)
}

Get-ChildItem -Path $staticDir -Recurse -File | Where-Object {
  $_.FullName.Substring($staticDir.Length).TrimStart('\', '/') -notlike 'uploads*'
} | ForEach-Object {
  $relativePath = $_.FullName.Substring($staticDir.Length).TrimStart('\', '/')
  $destination = Join-Path $docsStaticDir $relativePath
  $destinationDir = Split-Path -Parent $destination
  if (-not (Test-Path $destinationDir)) {
    New-Item -ItemType Directory -Path $destinationDir | Out-Null
  }
  Copy-Item -LiteralPath $_.FullName -Destination $destination
}

Set-Content -Path (Join-Path $docsDir '.nojekyll') -Value '' -Encoding UTF8

Write-Host "GitHub frontend build complete: $docsDir"
