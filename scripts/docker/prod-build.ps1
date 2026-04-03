Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

param(
    [switch]$Pull,
    [switch]$NoCache
)

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$baseCompose = Join-Path $repoRoot 'docker-compose.yml'
$prodCompose = Join-Path $repoRoot 'docker-compose.prod.yml'

$arguments = @(
    'compose',
    '-f', $baseCompose,
    '-f', $prodCompose,
    'build'
)

if ($Pull) {
    $arguments += '--pull'
}

if ($NoCache) {
    $arguments += '--no-cache'
}

Push-Location $repoRoot

try {
    & docker @arguments
}
finally {
    Pop-Location
}
