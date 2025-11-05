# Script de pruebas API - feat(subscriptions)
$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:5001"

Write-Host "=== PRUEBAS API - Sistema de Suscripciones ===" -ForegroundColor Cyan
Write-Host ""

# PRUEBA 1: GET /api/plan
Write-Host "1. GET /api/plan" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/plan" -Method Get -TimeoutSec 5
    Write-Host "  Status: OK" -ForegroundColor Green
    Write-Host "  Plan: $($response.plan)"
    Write-Host "  Trial eligible: $($response.trial.eligible)"
    Write-Host "  Trial usedToday: $($response.trial.usedToday)"
    
    if ($response.plan -eq "free" -and $response.trial.eligible) {
        Write-Host "  ✓ PASADA: Plan FREE con trial disponible" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ ADVERTENCIA: Trial puede estar usado hoy" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ FALLÓ: $_" -ForegroundColor Red
}
Write-Host ""

# PRUEBA 2: POST /api/analyze (FREE)
Write-Host "2. POST /api/analyze (plan=free)" -ForegroundColor Yellow
try {
    $body = @{
        fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/analyze?plan=free" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
    Write-Host "  Status: OK" -ForegroundColor Green
    Write-Host "  Plan usado: $($response.plan)"
    Write-Host "  Depth usado: $($response.depth)"
    Write-Host "  Model usado: $($response.model)"
    
    if ($response.plan -eq "free" -and $response.depth -eq 14) {
        Write-Host "  ✓ PASADA: FREE usa depth 14" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ ADVERTENCIA: Depth o plan no esperado" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ FALLÓ: $_" -ForegroundColor Red
}
Write-Host ""

# PRUEBA 3: POST /api/analyze (FREE con trial - 1er análisis PRO)
Write-Host "3. POST /api/analyze (FREE con depth 22 - debe usar trial)" -ForegroundColor Yellow
try {
    $body = @{
        fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
        depth = 22
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/analyze?plan=free" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
    Write-Host "  Status: OK" -ForegroundColor Green
    Write-Host "  Plan usado: $($response.plan)"
    Write-Host "  Depth usado: $($response.depth)"
    Write-Host "  Trial usado: $($response.trialUsed)"
    
    if ($response.trialUsed -eq $true) {
        Write-Host "  ✓ PASADA: 1er análisis PRO permitido (trial)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ ADVERTENCIA: Trial no detectado" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ FALLÓ: $_" -ForegroundColor Red
}
Write-Host ""

# PRUEBA 4: POST /api/analyze (2do análisis PRO debe bloquear)
Write-Host "4. POST /api/analyze (2do análisis PRO - debe bloquear con 402)" -ForegroundColor Yellow
try {
    $body = @{
        fen = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2"
        depth = 22
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/analyze?plan=free" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
    Write-Host "  ✗ FALLÓ: Debería retornar 402 pero retornó 200" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 402) {
        Write-Host "  ✓ PASADA: 2do análisis bloqueado con 402 TRIAL_ENDED" -ForegroundColor Green
        try {
            $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "  Reason: $($errorBody.reason)"
        } catch {}
    } else {
        Write-Host "  ✗ FALLÓ: Esperaba 402, obtuvo $statusCode" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "=== PRUEBAS COMPLETADAS ===" -ForegroundColor Cyan

