Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

param(
    [switch]$RemoveVolumes
)

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$baseCompose = Join-Path $repoRoot 'docker-compose.yml'
$devCompose = Join-Path $repoRoot 'docker-compose.dev.yml'

$arguments = @(
    'compose',
    '-f', $baseCompose,
    '-f', $devCompose,
    'down',
    '--remove-orphans'
)

if ($RemoveVolumes) {
    $arguments += '--volumes'
}

Push-Location $repoRoot

try {
    & docker @arguments
}
finally {
    Pop-Location
}
