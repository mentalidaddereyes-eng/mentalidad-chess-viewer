# GM Trainer - Interactive Chess Training Application

## Overview
GM Trainer is a sophisticated web application for chess enthusiasts, combining game analysis with AI-powered voice coaching. It enables users to import chess games, receive real-time AI commentary, and interact with an AI coach using voice commands. The project aims to provide an immersive and interactive learning experience, leveraging advanced AI for personalized chess training. Key capabilities include PGN viewing, Lichess integration, AI move analysis, voice coaching, and tactics puzzle training with progress tracking.

## User Preferences
- I want iterative development.
- Ask before making major changes.
- I prefer detailed explanations.
- Do not make changes to the folder `Z`.
- Do not make changes to the file `Y`.

## System Architecture

### UI/UX Decisions
The application features a clean, modern design with a dark mode theme using Tailwind CSS and Shadcn UI. The layout prioritizes usability with a responsive grid system (1.5fr:1fr on desktop, stacked on mobile) for the board and controls. The chess board maintains a consistent square aspect ratio (1:1) across all screen sizes. Consistent spacing, card-based content grouping, and clear typography (Inter, JetBrains Mono) enhance readability and user experience. Interactive elements utilize a primary blue color scheme, and chess boards maintain classic Lichess colors. Mobile interactions are optimized with tap-to-move, robust touch drag & drop, large promotion dialogs, confined scroll areas (max-h-[40vh] for move history), and sticky controls at the bottom. The viewport is configured without maximum-scale to support accessibility features.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Tailwind CSS, Shadcn UI. Features a custom-built PGN Chess Viewer, responsive design, and persistent theme preference.
- **Backend**: Express.js, Node.js, providing API endpoints for game management, analysis, and voice interactions.
- **Chess Engine**: `chess.js` for core game logic, move validation, and FEN parsing.
- **Database**: PostgreSQL with Drizzle ORM for persistent storage of games, move analyses, user data, training sessions, puzzle attempts, and progress statistics.
- **AI Services**:
    - **OpenAI GPT-5**: For real-time move analysis and contextual coaching commentary.
    - **ElevenLabs**: For high-quality text-to-speech, enabling voice coaching with selectable personalities (Professional "Leo" and Kids "Augusto") and voice cloning.
    - **Web Speech API**: For user voice input (speech recognition).
    - **Stockfish**: Integrated for real-time position evaluation, displaying centipawn scores, mate scores, and best move suggestions.
- **Voice System**: Features a dual voice personality system, single-channel audio enforcement (prevents overlapping), mute by default, and quick-access controls with persistent mute state.
- **Puzzle Training**: Includes an interactive drag-and-drop chess board for solving puzzles, move validation, visual feedback, reset functionality, and automatic attempt tracking.
- **Progress Tracking**: Records puzzle attempts, time spent, and provides a dedicated statistics page with aggregated data, success rates, and daily activity charts.
- **Lichess Integration**: Allows importing games by URL or username (up to 10 games per username), and one-click daily puzzle import.
- **Multi-Game Support**: Automatic detection and parsing of multi-game PGN files with dropdown selector. Handles both LF and CRLF line endings. Game selector displays "White vs Black · Event · Date" for each game. Switching games updates all metadata and resets board state.
- **Service Worker**: User-controlled version updates with "Update Now" notification banner. Uses cache-busting pattern with APP_VERSION constant. Only reloads page when user explicitly requests update (no automatic reloads). Implements SKIP_WAITING message pattern for controlled activation.
- **Coaching Settings**: Provides user personalization options for coaching style (Aggressive, Positional, Tactical, Balanced, Defensive), difficulty, verbosity, and multi-language support. Settings persist via local storage.

### Feature Specifications
- **PGN Chess Viewer**: Custom board with coordinate labels, move highlighting, and aspect-ratio-based square rendering.
- **Multi-Game PGN**: Automatic detection of multiple games in PGN, dropdown selector (only visible when 2+ games), metadata parsing with CRLF normalization.
- **Lichess Integration**: Game import by URL or username (max 10 games), daily puzzle import from Lichess API with smart data mapping.
- **AI Move Analysis**: Real-time commentary and evaluation badges.
- **Analysis Mode**: Free analysis mode in Trainer page allowing users to explore alternative moves from any position. Features seamless toggle between view-only mode and interactive mode, with proper state restoration when switching. Users can make moves on the board and receive AI analysis for each exploratory move. State management ensures the canonical game position is always restored when exiting analysis mode.
- **Custom Position Analysis**: FEN input field allowing users to load and analyze any chess position. Includes validation, error handling, and automatic AI analysis for custom positions. Users can paste FEN strings and receive immediate GM-level commentary on the position.
- **Voice Coaching**: Text-to-speech responses with selectable voice personalities, persistent mute state, and quick controls.
- **Voice Questions**: Browser-based speech recognition for user queries.
- **Auto-play Mode**: Automated game progression with AI analysis.
- **Dark Mode**: Full theme support with persistent preference.
- **Tactics Puzzle Training**: Interactive board, persistent puzzle data, attempt tracking, filtering by difficulty and themes, and solution explanations.
- **Position Evaluation**: Real-time Stockfish engine evaluation with visual bar, centipawn/mate scores, and best move suggestions.
- **Progress Statistics**: Comprehensive tracking of puzzle attempts, success rates, and performance analytics.
- **Coaching Personalization**: User-configurable coaching style, difficulty, verbosity, and language.
- **Mobile UI**: Responsive grid layout (stacked on mobile, side-by-side on desktop), square chess board (aspect-ratio 1:1), confined scroll for move history (max-h-40vh), sticky controls, optimized touch interactions (tap-to-move, drag & drop), large touch targets (≥44px), and accessible viewport (no maximum-scale).
- **Version Updates**: Service Worker with user-controlled update flow, update notification banner, and cache-busting via version constant.

## External Dependencies
- **OpenAI API**: Used for GPT-5 access for AI move analysis and coaching.
- **ElevenLabs API**: Utilized for text-to-speech synthesis and voice cloning for AI coach voices.
- **Lichess API**: Integrated for importing chess games by URL/username and fetching daily puzzles.
- **PostgreSQL**: The relational database used for persistent data storage.
- **Stockfish**: An open-source chess engine integrated for real-time position evaluation and best move suggestions.