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

Get-ChildItem -Path $projectRoot -Filter *.html | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $docsDir $_.Name)
}

Get-ChildItem -Path $staticDir -File | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $docsStaticDir $_.Name)
}

$indexContent = @'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=login.html">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LOAN EXPRESS LTD</title>
  <script>
    window.location.replace('login.html');
  </script>
</head>
<body>
  <p>Redirecting to <a href="login.html">login</a>...</p>
</body>
</html>
'@

Set-Content -Path (Join-Path $docsDir 'index.html') -Value $indexContent -Encoding UTF8
Set-Content -Path (Join-Path $docsDir '.nojekyll') -Value '' -Encoding UTF8

Write-Host "GitHub frontend build complete: $docsDir"
