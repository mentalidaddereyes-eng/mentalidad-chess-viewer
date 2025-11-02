# GM Trainer - Interactive Chess Training Application

## Overview
GM Trainer is a web application for chess enthusiasts, offering game analysis and AI-powered voice coaching. It allows users to import chess games, receive real-time AI commentary, and interact with an AI coach using voice commands. The project aims to provide an immersive and interactive learning experience through personalized AI training, PGN viewing, Lichess integration, AI move analysis, voice coaching, and tactics puzzle training with progress tracking. The application focuses on pedagogical, motivational coaching commentary, emphasizing ideas, plans, and concepts rather than numeric evaluations, with configurable voice personalities and multi-language support. It also features cost-optimized AI interactions through caching and templating.

## User Preferences
- I want iterative development.
- Ask before making major changes.
- I prefer detailed explanations.
- Do not make changes to the folder `Z`.
- Do not make changes to the file `Y`.

## System Architecture

### UI/UX Decisions
The application features a modern dark mode design using Tailwind CSS and Shadcn UI. It employs a responsive grid system (1.5fr:1fr on desktop, stacked on mobile) for the board and controls, ensuring a consistent 1:1 aspect ratio for the chess board. Readability is enhanced with Inter and JetBrains Mono fonts, consistent spacing, and card-based content grouping. Interactive elements use a primary blue color, and chess boards utilize classic Lichess colors. Mobile optimization includes tap-to-move, robust touch drag & drop, large promotion dialogs, confined scroll areas (max-height: 40vh), sticky controls, and an accessible viewport. Emojis are explicitly excluded from the interface.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Tailwind CSS, Shadcn UI, featuring a custom PGN Chess Viewer and persistent theme.
- **Backend**: Express.js, Node.js, providing API endpoints for game management, analysis, and voice interactions.
- **Chess Engine**: `chess.js` for core game logic, move validation, and FEN parsing.
- **Database**: PostgreSQL with Drizzle ORM for persistent storage of games, analyses, user data, and training progress.
- **AI Services**: OpenAI GPT-5 for real-time move analysis and contextual coaching; ElevenLabs for high-quality text-to-speech with selectable personalities (Professional "Leo" and Kids "Augusto") and voice cloning; Web Speech API for user voice input. Stockfish is integrated for real-time position evaluation and best move suggestions.
- **Voice System**: Dual voice personality system, single-channel audio enforcement, mute-by-default with quick-access controls and persistent mute state. Includes a multilingual voice system with environment variable support for various languages (Spanish, Portuguese, Hindi, English, French, German, Russian).
- **Puzzle Training**: Interactive drag-and-drop board, move validation, visual feedback, reset functionality, and automatic attempt tracking.
- **Progress Tracking**: Records puzzle attempts, time spent, and provides statistics via a dedicated page.
- **Lichess Integration**: Allows importing games by URL or username (up to 10 games) and one-click daily puzzle import.
- **Multi-Game Support**: Automatic detection and parsing of multi-game PGN files with a dropdown selector and metadata parsing.
- **Service Worker**: User-controlled version updates with a notification banner and cache-busting.
- **Coaching Settings**: User personalization for coaching style, difficulty, verbosity, and multi-language support, with settings persisting via local storage.
- **Low-Cost Optimization**: Implemented LRU cache for TTS (200MB) and GPT responses (10MB), and a local template system for common positions to reduce API calls and improve response times.
- **Unified Import**: A single "Import" button automatically detects PGN or FEN input.
- **Puzzles Auto-Features**: Auto-seeds sample puzzles, auto-advances to the next puzzle, and persists difficulty filters.
- **AI Coach Intelligence**: `getGPTComment()` function provides pedagogical, motivational commentary focusing on ideas and concepts, integrated with Stockfish, GPT-5, and ElevenLabs.
- **Cost Saver Pack v6.0 (November 2025)**: Dual-tier pricing system with Pro/Free plans, plan detection via query param → cookie → localStorage, visual PlanBanner component, multi-provider TTS (ElevenLabs for Pro, gTTS for Free), GPT hash-based memoization with TTL 180-300s, rate-limiting (max 2 GPT calls/min, burst 1/3s), trivial position detection, 200-char response truncation, and TTS cache with automatic fallback.
- **HOTFIX v6.1 (Partial - November 2025)**: DB Resilience with LocalStore fallback (JSON persistence to /tmp with Date serialization fix), ENV-based voice provider selection with intelligent fallback to gTTS when ElevenLabs API keys missing, Spanish language defaults across LocalStore/routes/elevenlabs. Play vs Coach already functional with auto-flip and engine-first-move for Black.
- **HOTFIX v6.2 "back-to-pro" (November 2025)**: Import from .pgn file with FileReader, multi-game parsing with metadata (White-Black, Result, ECO, Date), Games navigator panel in RightPanel (4th tab), click-to-load game functionality jumping to last move. Voice system with 600ms debounce and single-channel audio cancellation already functional from v5. DB fallback (LocalStore) operational without 500 errors. Spanish language defaults active. Cost optimization (GPT memo, rate limiting) from v6.0 preserved.
- **HOTFIX v6.2.2 "stable-resilient" (November 2025)**: Flip board funcional (toggle orientation desktop/mobile), Puzzles fallback local (auto-load from attached_assets/puzzles.sample.json con 10 puzzles 800-1800 rating cuando DB falla), UI polish RightPanel (padding reducido mx-2 mt-2 p-2 gap-2), Provider logging completo en /api/settings y /api/puzzles endpoints. Resilient system: todas las rutas usan getStore() con 2s timeout y LocalStore fallback sin 500 errors.
- **FEATURE MINI-PACK v7.0 (November 2025)**: Zero-cost feature pack without external API calls. Position Editor modal with drag & drop pieces, FEN controls (turn/castling/en-passant), load/copy/save functionality. Opening Explorer tab with offline ECO database (eco.min.json with 500+ openings), auto-detection from current position, popular continuations display, Lichess integration link. Export PGN with local heuristic-based comments (center control, piece development, tactical elements - no GPT). Compact Games panel with fixed height 260px and dense 2-line cards. All features purely client-side with zero new API costs.

### External Dependencies
- **OpenAI API**: For GPT-5 AI analysis and coaching.
- **ElevenLabs API**: For text-to-speech synthesis and voice cloning.
- **Lichess API**: For importing chess games and daily puzzles.
- **PostgreSQL**: Relational database for data storage.
- **Stockfish**: Open-source chess engine for position evaluation.