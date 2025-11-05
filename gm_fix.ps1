$ErrorActionPreference = "Stop"

function Section($t){ Write-Host "`n=== $t ===" -ForegroundColor Cyan }

# 0) Ubicaciones
$root = if (Test-Path "C:\Users\liord\OneDrive\Documentos\GMTrainer(1)\GMTrainer") {
  "C:\Users\liord\OneDrive\Documentos\GMTrainer(1)\GMTrainer"
} else { (Get-Location).Path }
$client = Join-Path $root "client"

Section "Kill de procesos Node (si hubiera)"
try { taskkill /F /IM node.exe >$null 2>&1 } catch {}

if (!(Test-Path $root)) { throw "No encuentro la carpeta raíz: $root" }
if (!(Test-Path $client)) { throw "No encuentro la carpeta client: $client" }

Section "Instalando dependencias (root)"
Push-Location $root
if (Test-Path (Join-Path $root "package-lock.json")) { npm ci } else { npm install }
$rootExit = $LASTEXITCODE
Pop-Location
if ($rootExit -ne 0) { throw "npm install en root falló (exit $rootExit)" }

Section "Instalando dependencias (client) + devDeps Tailwind"
Push-Location $client
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install en client falló" }
npm install -D @tailwindcss/postcss tailwindcss postcss autoprefixer
if ($LASTEXITCODE -ne 0) { throw "Instalación devDeps Tailwind falló" }

Section "Asegurando postcss.config.cjs"
$postcssPath = Join-Path $client "postcss.config.cjs"
$postcss = "module.exports = { plugins: { '@tailwindcss/postcss': {}, autoprefixer: {} } }"
Set-Content -Path $postcssPath -Value $postcss -Encoding utf8

Section "Asegurando src/index.css y utilidades Tailwind"
$cssPath = Join-Path $client "src\index.css"
if (!(Test-Path $cssPath)) {
  New-Item -ItemType File -Path $cssPath | Out-Null
}
$css = Get-Content $cssPath -Raw
if ($css -notmatch "@tailwind\s+base") { $css = "@tailwind base;`n$css" }
if ($css -notmatch "@tailwind\s+components") { $css = $css + "`n@tailwind components;" }
if ($css -notmatch "@tailwind\s+utilities") { $css = $css + "`n@tailwind utilities;" }

# Clase requerida por shadcn: .border-border
if ($css -notmatch "\.border-border") {
  $css += @"

`n@layer components {
  .border-border { border-color: hsl(var(--border)); }
}

"@
}
Set-Content -Path $cssPath -Value $css -Encoding utf8

Section "Limpiando caché de Vite"
Remove-Item -Recurse -Force (Join-Path $client "node_modules\.vite") -ErrorAction SilentlyContinue

Section "Arrancando Vite (puerto 5173) con rebuild forzado"
# Nota: usa el script existente; --force obliga a reoptimizar deps
$env:PORT="5173"
npm run dev -- --force
Pop-Location

