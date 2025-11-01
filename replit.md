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

### External Dependencies
- **OpenAI API**: For GPT-5 AI analysis and coaching.
- **ElevenLabs API**: For text-to-speech synthesis and voice cloning.
- **Lichess API**: For importing chess games and daily puzzles.
- **PostgreSQL**: Relational database for data storage.
- **Stockfish**: Open-source chess engine for position evaluation.