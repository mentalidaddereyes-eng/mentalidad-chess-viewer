Set-Location -LiteralPath 'C:\Users\liord\OneDrive\Documentos\GMTrainer(1)\GMTrainer'
Write-Output 'Local dev URL: http://localhost:5173'
Write-Output '=== git remote -v ==='
git remote -v
Write-Output '=== Check presence of Replit artifacts ==='
$paths = @('.replit', 'replit-agent', 'replit.md', '.local', '.vite', 'node_modules', 'package-lock.json')
foreach ($p in $paths) {
    Write-Output ("{0} -> {1}" -f $p, (Test-Path -LiteralPath $p))
}
Write-Output '=== Starting dev server in client (this will keep running) ==='
Set-Location -LiteralPath '.\client'
npm run dev -- --port 5173
