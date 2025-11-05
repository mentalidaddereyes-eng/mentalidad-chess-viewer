Set-Location -LiteralPath 'C:\Users\liord\OneDrive\Documentos\GMTrainer(1)\GMTrainer'

Write-Output 'Local URL: http://localhost:5173'
Write-Output '=== git remote -v ==='
git remote -v

Write-Output '=== git branch ==='
git rev-parse --abbrev-ref HEAD

Write-Output '=== git status (porcelain) ==='
git status --porcelain

Write-Output '=== Check Replit paths existence ==='
$paths = @('.replit', 'replit-agent', 'replit.md', '.local', '.vite', 'node_modules', 'package-lock.json')
foreach ($p in $paths) {
    Write-Output ("{0} -> {1}" -f $p, (Test-Path -LiteralPath $p))
}

Write-Output '=== Check port 5173 listening ==='
netstat -ano | Select-String ':5173'
