# Sistema de Suscripciones - FREE / PRO / ELITE

## Descripción General

El sistema de suscripciones permite tres niveles de acceso con diferentes características y límites:

- **FREE**: Plan gratuito con funcionalidades básicas y trial diario
- **PRO**: Plan premium con análisis avanzado y voz clonada
- **ELITE**: Plan máximo con todas las características y prioridad alta

## Planes y Límites

### FREE (Costo Ultra-Bajo)
- **Modelo LLM**: `gemini-2.5-flash-lite` (configurable via `MODEL_FREE`)
  - Modelo ultra-ligero para minimizar costos
- **Depth del motor**: 14 (configurable via `ENGINE_DEPTH_FREE`)
  - Profundidad reducida para velocidad y bajo costo
- **Análisis simultáneos**: 1 (configurable via `MAX_CONCURRENT_ANALYSIS_FREE`)
- **TTS**: gTTS/Piper (gratuito, sin API key)
  - **NUNCA** usa ElevenLabs en FREE (solo PRO/ELITE)
- **Trial**: 1 sesión PRO de 3 minutos por día

### PRO
- **Modelo LLM**: `gemini-2.5-flash` (configurable via `MODEL_PRO`)
- **Depth del motor**: 20 (configurable via `ENGINE_DEPTH_PRO`)
- **Análisis simultáneos**: 2 (configurable via `MAX_CONCURRENT_ANALYSIS_PRO`)
- **TTS**: ElevenLabs (si API key disponible, fallback a gTTS)
  - Voz clonada del GM Leo

### ELITE
- **Modelo LLM**: `gemini-2.5-pro` (configurable via `MODEL_ELITE`)
- **Depth del motor**: 24 (configurable via `ENGINE_DEPTH_ELITE`)
- **Análisis simultáneos**: 3 (configurable via `MAX_CONCURRENT_ANALYSIS_ELITE`)
- **TTS**: ElevenLabs sin límites estrictos
- **Streaming**: Habilitado para análisis en tiempo real

## Sistema de Trial

Los usuarios FREE obtienen 1 sesión PRO por día:

- **Duración**: 3 minutos o 1 análisis profundo (lo que ocurra primero)
- **Reset**: Automático a medianoche (zona horaria configurable via `TZ`)
- **Persistencia**: Almacenada en `trial-data.json` (por IP/usuario)
- **Al agotarse**: Se muestra modal de upgrade y se bloquea acceso a funciones PRO

## Variables de Entorno

Ver `.env.example` para todas las variables disponibles. Las principales son:

```env
DEFAULT_PLAN=FREE
TRIAL_ENABLED=true
TRIAL_DURATION_MIN=3
TRIAL_ENGINE_DEPTH=22
TRIAL_MODEL=gemini-2.5-flash

MODEL_FREE=gemini-2.5-flash-lite
MODEL_PRO=gemini-2.5-flash
MODEL_ELITE=gemini-2.5-pro

ENGINE_DEPTH_FREE=14
ENGINE_DEPTH_PRO=20
ENGINE_DEPTH_ELITE=24

MAX_CONCURRENT_ANALYSIS_FREE=1
MAX_CONCURRENT_ANALYSIS_PRO=2
MAX_CONCURRENT_ANALYSIS_ELITE=3

GEMINI_API_KEY=<<TU_CLAVE>>
ELEVENLABS_API_KEY=<<OPCIONAL>>
USE_PIPER_TTS=true

TZ=America/Chicago
PORT=5001
```

## Endpoints API

### GET /api/plan
Retorna información del plan actual y estado del trial:

```json
{
  "plan": "free",
  "trial": {
    "eligible": true,
    "usedToday": false,
    "remainingMs": 180000,
    "startTime": 1234567890
  },
  "config": {
    "mode": "free",
    "engineDepth": 14,
    "maxConcurrentAnalysis": 1,
    "model": "gemini-2.5-flash-lite"
  }
}
```

### POST /api/analysis/move
Análisis de movimiento con selección automática de modelo y depth según plan.

**Si plan=FREE y trial disponible**: Se usa configuración PRO durante el trial.

**Si trial agotado**: Retorna 402 con:
```json
{
  "error": "TRIAL_ENDED",
  "reason": "TRIAL_ENDED",
  "message": "Your trial session has ended...",
  "currentPlan": "free",
  "requiredPlan": "pro"
}
```

### GET /api/usage/today
Telemetría básica de uso (implementar tracking detallado según necesidades).

## Cambiar Límites sin Tocar Código

**Todos los límites son configurables via variables de entorno en `.env`**. No necesitas modificar código fuente.

### Pasos para Cambiar Límites:

1. **Editar `.env`** (o crear desde `.env.example`)
2. **Modificar las variables deseadas** (ver lista abajo)
3. **Reiniciar el servidor** (`npm run dev`)

### Variables Disponibles:

#### Modelos LLM:
- `MODEL_FREE=gemini-2.5-flash-lite` → Modelo para plan FREE (ultra-bajo costo)
- `MODEL_PRO=gemini-2.5-flash` → Modelo para plan PRO
- `MODEL_ELITE=gemini-2.5-pro` → Modelo para plan ELITE

#### Profundidad del Motor Stockfish:
- `ENGINE_DEPTH_FREE=14` → Profundidad para FREE (14 = rápido, bajo costo)
- `ENGINE_DEPTH_PRO=20` → Profundidad para PRO
- `ENGINE_DEPTH_ELITE=24` → Profundidad para ELITE (máxima precisión)

#### Límites de Concurrencia:
- `MAX_CONCURRENT_ANALYSIS_FREE=1` → Máximo 1 análisis simultáneo en FREE
- `MAX_CONCURRENT_ANALYSIS_PRO=2` → Máximo 2 análisis simultáneos en PRO
- `MAX_CONCURRENT_ANALYSIS_ELITE=3` → Máximo 3 análisis simultáneos en ELITE

#### Configuración de Trial:
- `TRIAL_ENABLED=true` → Habilitar/deshabilitar trial (true/false)
- `TRIAL_DURATION_MIN=3` → Duración del trial en minutos
- `TRIAL_ENGINE_DEPTH=22` → Profundidad del motor durante el trial
- `TRIAL_MODEL=gemini-2.5-flash` → Modelo LLM durante el trial

#### Otros:
- `DEFAULT_PLAN=FREE` → Plan por defecto para nuevos usuarios
- `TZ=America/Chicago` → Zona horaria para reset de trial (medianoche)

### Ejemplos:

**Reducir costo de FREE aún más:**
```env
MODEL_FREE=gemini-2.5-flash-lite
ENGINE_DEPTH_FREE=10  # Menor profundidad = más rápido + más barato
```

**Aumentar límite de PRO:**
```env
MAX_CONCURRENT_ANALYSIS_PRO=5  # Más análisis simultáneos
ENGINE_DEPTH_PRO=22  # Mayor profundidad
```

**Deshabilitar trial:**
```env
TRIAL_ENABLED=false
```

## Frontend

### Componentes Principales

- **PlanBanner**: Banner superior con información del plan actual
- **TrialBanner**: Banner verde que muestra trial disponible para FREE
- **UpgradeModal**: Modal que aparece cuando se agota el trial o se requiere upgrade

### Flujo de Usuario

1. Usuario FREE entra → Ve banner de trial disponible
2. Usuario hace análisis → Se activa trial automáticamente (1er análisis PRO)
3. Trial activo → Análisis usa configuración PRO
4. Trial agotado → Se muestra modal de upgrade
5. Usuario puede continuar en FREE o activar PRO

## Pruebas

Ejecutar pruebas E2E:

```bash
npm run e2e:trial
```

O manualmente:

```bash
node scripts/e2e-trial.js
```

## Seguridad y Fallbacks

- **Sin GEMINI_API_KEY**: Modo demo con respuestas fijas
- **TTS falla**: Fallback automático a Piper/gTTS
- **Motor tarda**: Timeout configurado, no bloquea UI
- **DB no disponible**: Sistema funciona con fallbacks en memoria

## Archivos Clave

- `server/lib/llm.ts`: Fachada LLM con selección por plan
- `server/lib/trial-manager.ts`: Gestión de trial diario
- `server/lib/plan-middleware.ts`: Middleware para gating de rutas
- `server/routes.ts`: Endpoints `/api/plan` y `/api/analysis/move`
- `shared/types.ts`: Definiciones de tipos y configuraciones de planes
- `client/src/components/TrialBanner.tsx`: Banner de trial
- `client/src/components/UpgradeModal.tsx`: Modal de upgrade
- `client/src/lib/plan-manager.ts`: Gestión de plan en frontend

