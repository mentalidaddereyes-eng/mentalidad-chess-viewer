$baseUrl = "http://localhost:5001"
Write-Host "=== PRUEBAS API ===" -ForegroundColor Cyan

# PRUEBA 1
Write-Host "1. GET /api/plan" -ForegroundColor Yellow
try {
    $r1 = Invoke-RestMethod -Uri "$baseUrl/api/plan" -TimeoutSec 5
    Write-Host "  Plan: $($r1.plan) | Trial eligible: $($r1.trial.eligible)" -ForegroundColor Green
} catch { Write-Host "  Error: $_" -ForegroundColor Red }

# PRUEBA 2
Write-Host "2. POST /api/analyze (FREE)" -ForegroundColor Yellow
try {
    $body2 = @{ fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1" } | ConvertTo-Json
    $r2 = Invoke-RestMethod -Uri "$baseUrl/api/analyze?plan=free" -Method Post -Body $body2 -ContentType "application/json" -TimeoutSec 10
    Write-Host "  Plan: $($r2.plan) | Depth: $($r2.depth) | Model: $($r2.model)" -ForegroundColor Green
} catch { Write-Host "  Error: $_" -ForegroundColor Red }

# PRUEBA 3
Write-Host "3. POST /api/analyze (FREE trial - depth 22)" -ForegroundColor Yellow
try {
    $body3 = @{ fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"; depth = 22 } | ConvertTo-Json
    $r3 = Invoke-RestMethod -Uri "$baseUrl/api/analyze?plan=free" -Method Post -Body $body3 -ContentType "application/json" -TimeoutSec 10
    Write-Host "  Plan: $($r3.plan) | Depth: $($r3.depth) | Trial usado: $($r3.trialUsed)" -ForegroundColor Green
} catch { Write-Host "  Error: $_" -ForegroundColor Red }

# PRUEBA 4
Write-Host "4. POST /api/analyze (2do análisis PRO - debe bloquear)" -ForegroundColor Yellow
try {
    $body4 = @{ fen = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2"; depth = 22 } | ConvertTo-Json
    $r4 = Invoke-RestMethod -Uri "$baseUrl/api/analyze?plan=free" -Method Post -Body $body4 -ContentType "application/json" -TimeoutSec 10
    Write-Host "  FALLO: Deberia retornar 402" -ForegroundColor Red
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 402) {
        Write-Host "  OK: Bloqueado con 402" -ForegroundColor Green
    } else {
        Write-Host "  Error: Status $code" -ForegroundColor Red
    }
}

