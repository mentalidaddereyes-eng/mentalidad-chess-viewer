# Bootstrap local dev for GMTrainer (clean caches, install deps, git branch, start dev)
Param(
    [int]$Port = 5173
)

$ErrorActionPreference = "Continue"

function Remove-IfExists([string]$p) {
    if (Test-Path -LiteralPath $p) {
        Write-Host "Removing $p"
        try { Remove-Item -LiteralPath $p -Recurse -Force -ErrorAction Stop } catch { Write-Host "Warn: $($_.Exception.Message)" }
    }
    else {
        Write-Host "Skip (not found): $p"
    }
}

# 1) Normalize working directory (root of repo)
try {
    $root = "C:\Users\liord\OneDrive\Documentos\GMTrainer(1)\GMTrainer"
    if ((Get-Location).Path -ne $root) {
        Set-Location -LiteralPath $root
    }
    Write-Host "Root: $(Get-Location)"
}
catch {
    Write-Host "Error setting root: $($_.Exception.Message)"
}

# 2) Optional: clean replit artifacts if script exists
if (Test-Path -LiteralPath ".\scripts\clean_replit.ps1") {
    Write-Host "--- Cleaning replit artifacts (if any) ---"
    try { & ".\scripts\clean_replit.ps1" } catch { Write-Host "Warn: $($_.Exception.Message)" }
}

# 3) Clean caches
Write-Host "--- Cleaning caches ---"
Remove-IfExists "node_modules"
Remove-IfExists "client\node_modules"
Remove-IfExists "client\.vite"
Remove-IfExists "node_modules\.vite"
Remove-IfExists "client\dist"

# 4) Install root deps
Write-Host "--- Installing root dependencies ---"
if (Test-Path -LiteralPath ".\package-lock.json") {
    npm ci
}
else {
    npm install
}

# 5) Install client deps
Write-Host "--- Installing client dependencies ---"
Push-Location "client"
try {
    if (Test-Path -LiteralPath ".\package-lock.json") {
        npm ci
    }
    else {
        npm install
    }
}
finally {
    Pop-Location
}

# 6) Free dev port
Write-Host ("--- Freeing port {0} ---" -f $Port)
if (Test-Path -LiteralPath ".\scripts\kill_port5173.ps1") {
    try { & ".\scripts\kill_port5173.ps1" } catch { Write-Host "Warn: $($_.Exception.Message)" }
}
else {
    Write-Host "kill_port5173.ps1 not found (continuing)"
}

# 7) Git branch and commit (single commit)
Write-Host "--- Git branch and commit ---"
try {
    git checkout -B fix/autorefactor-ui-worker
    git add -A
    git commit -m "refactor(ui): unify entry, center board, worker stockfish, lichess import, tailwind fix, vite cache clean" | Out-Null
}
catch {
    Write-Host "Commit skipped or not needed: $($_.Exception.Message)"
}

# 8) Start dev (server + client concurrently from root)
Write-Host "--- Starting dev (server + client) ---"
$env:PORT = "$Port"
npm run dev
