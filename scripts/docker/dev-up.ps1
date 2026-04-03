Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

param(
    [switch]$Detached
)

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$baseCompose = Join-Path $repoRoot 'docker-compose.yml'
$devCompose = Join-Path $repoRoot 'docker-compose.dev.yml'

$arguments = @(
    'compose',
    '-f', $baseCompose,
    '-f', $devCompose,
    'up',
    '--build',
    '--remove-orphans'
)

if ($Detached) {
    $arguments += '-d'
}

Push-Location $repoRoot

try {
    & docker @arguments
}
finally {
    Pop-Location
}
