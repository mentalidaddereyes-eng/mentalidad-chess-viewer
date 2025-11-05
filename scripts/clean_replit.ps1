Set-Location -LiteralPath 'C:\Users\liord\OneDrive\Documentos\GMTrainer(1)\GMTrainer'
Write-Output '=== Removing .local from index and disk if exists ==='
if (Test-Path '.local') {
    try { & git rm -r --cached .local -q } catch {}
    Remove-Item -LiteralPath '.local' -Recurse -Force -ErrorAction SilentlyContinue
    Write-Output 'Removed .local from index and disk'
}
else {
    Write-Output '.local not found'
}

Write-Output '=== Ensure .gitignore exists ==='
if (-not (Test-Path '.gitignore')) {
    '' | Out-File -FilePath .gitignore -Encoding utf8
    Write-Output 'Created .gitignore'
}
else {
    Write-Output '.gitignore exists'
}

Write-Output '=== Updating .gitignore entries ==='
$ignoreEntries = @('.replit', 'replit.md', 'replit-agent', '.local/state/replit', '.vite', 'node_modules', 'package-lock.json')
foreach ($e in $ignoreEntries) {
    $found = $false
    try {
        $found = Select-String -Path .gitignore -Pattern ([regex]::Escape($e)) -SimpleMatch -Quiet -ErrorAction SilentlyContinue
    }
    catch {}
    if (-not $found) {
        Add-Content -Path .gitignore -Value $e
        Write-Output "Added to .gitignore: $e"
    }
    else {
        Write-Output "Already in .gitignore: $e"
    }
}

Write-Output '=== Staging and committing removal/ignore ==='
& git add .gitignore
& git add -A
$commit = & git commit -m 'Remove Replit artifacts and ignore them' 2>&1
Write-Output $commit
if ($LASTEXITCODE -ne 0) {
    Write-Output 'Commit may have failed or nothing to commit'
}
else {
    Write-Output 'Commit succeeded'
}

Write-Output '=== Pull --rebase origin main ==='
$pull = & git pull --rebase origin main 2>&1
Write-Output $pull
if ($LASTEXITCODE -ne 0) {
    Write-Output 'git pull --rebase returned non-zero exit code'
}
else {
    Write-Output 'git pull --rebase succeeded'
}

Write-Output '=== Pushing to origin main ==='
$push = & git push origin main 2>&1
Write-Output $push
if ($LASTEXITCODE -ne 0) {
    Write-Output 'git push returned non-zero exit code'
}
else {
    Write-Output 'git push succeeded'
}
