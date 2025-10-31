# GM Trainer - Interactive Chess Training Application

## Overview
GM Trainer is a sophisticated web application that combines chess game analysis with AI-powered voice coaching. It allows users to import games from Lichess, navigate through moves with real-time AI commentary, and interact with an AI coach using voice commands.

## Project Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS + Shadcn UI
- **Backend**: Express.js + Node.js
- **Chess Engine**: chess.js for game logic and move validation
- **AI Services**: 
  - OpenAI GPT-5 for move analysis and coaching
  - ElevenLabs for text-to-speech with voice cloning
  - Web Speech API for voice input
- **Data Storage**: In-memory storage (MemStorage)

### Key Features
1. **PGN Chess Viewer**: Custom-built chess board component with coordinate labels and move highlighting
2. **Lichess Integration**: Import games by URL or username
3. **AI Move Analysis**: Real-time commentary on each move with evaluation badges
4. **Voice Coaching**: Text-to-speech responses using cloned voice via ElevenLabs
5. **Voice Questions**: Browser-based speech recognition for asking questions
6. **Auto-play Mode**: Step through games automatically with AI analysis
7. **Dark Mode**: Full theme support with persistent preference

## File Structure

### Frontend (`client/src/`)
- **pages/Trainer.tsx**: Main application page with game state management
- **components/**:
  - `ChessBoard.tsx`: Custom chess board renderer with FEN parsing
  - `GameLoader.tsx`: Modal dialog for importing games from Lichess
  - `MoveControls.tsx`: Navigation controls (first, previous, next, last, auto-play)
  - `AnalysisPanel.tsx`: Displays AI analysis, move history, and evaluation badges
  - `VoiceControls.tsx`: Microphone interface for voice questions
  - `GameInfo.tsx`: Game metadata display (players, date, event, opening)
  - `ThemeToggle.tsx`: Light/dark mode switcher

### Backend (`server/`)
- **routes.ts**: API endpoints for game import, move analysis, and voice interactions
- **storage.ts**: In-memory data storage interface
- **services/** (to be implemented):
  - OpenAI integration for move analysis
  - ElevenLabs integration for voice synthesis
  - Lichess API client for game fetching

### Shared (`shared/`)
- **schema.ts**: TypeScript types and Zod schemas for Game, MoveAnalysis, VoiceQuestion, etc.

## API Endpoints (Planned)

### Game Management
- `POST /api/games/import` - Import game from Lichess by URL or username
  - Body: `{ type: "url" | "username", value: string }`
  - Returns: Game object with PGN and metadata

### Analysis
- `POST /api/analysis/move` - Get AI analysis for a specific move
  - Body: `{ moveNumber: number, move: string, fen: string }`
  - Returns: MoveAnalysis with text commentary and optional audio URL

### Voice Interaction
- `POST /api/voice/ask` - Ask the AI coach a question
  - Body: `{ question: string, context: { currentMove, fen, moveHistory } }`
  - Returns: `{ answer: string, audioUrl?: string }`

## Environment Variables
- `OPENAI_API_KEY`: OpenAI API key for GPT-5 access
- `ELEVENLABS_API_KEY`: ElevenLabs API key for voice synthesis
- `SESSION_SECRET`: Session management secret

## Design System

### Colors
- Primary: Blue (#215 85% 28%) - Used for interactive elements
- Muted: Neutral grays for secondary information
- Chess board: Classic Lichess colors (#f0d9b5 and #b58863)

### Typography
- Primary: Inter - Clean, modern sans-serif
- Monospace: JetBrains Mono - For move notation and PGN display

### Layout
- Desktop: 60/40 split (board/controls)
- Responsive: Stacked layout on mobile
- Max width: 7xl (1280px)

### Component Patterns
- Cards for grouped content (game info, analysis panel)
- Badges for move evaluations (brilliant, good, inaccuracy, mistake, blunder)
- Consistent spacing: 4, 6, 8 units

## User Flow
1. User clicks "Load Game" button
2. Imports game via Lichess URL or username
3. Chess board displays starting position
4. User navigates through moves using controls
5. AI provides commentary for each move (spoken via ElevenLabs)
6. User can ask questions via microphone
7. AI responds with contextual answers (spoken)

## Development Notes
- Chess.js handles all game logic and move validation
- Custom board component built to avoid React 19 compatibility issues
- Voice recognition uses browser Web Speech API (Chrome/Edge recommended)
- Audio playback for AI responses uses HTML5 Audio API
- Theme preference persists in localStorage

## Implemented Features ✅

### Complete MVP
1. ✅ **Lichess Integration**: Import games by URL or username
2. ✅ **Custom Chess Board**: FEN parsing, move highlighting, coordinate labels
3. ✅ **Move Navigation**: First, previous, next, last, and auto-play modes
4. ✅ **AI Move Analysis**: OpenAI GPT-5 provides move-by-move commentary
5. ✅ **Voice Coaching**: ElevenLabs text-to-speech for spoken feedback
6. ✅ **Voice Questions**: Web Speech API for user questions
7. ✅ **Beautiful UI**: Dark mode, responsive design, clean layout
8. ✅ **Error Handling**: Toast notifications for all error states
9. ✅ **Loading States**: Visual feedback during API calls

### Technical Implementation
- All API endpoints functional and tested
- Frontend-backend integration complete
- Real-time move analysis with audio playback
- Persistent theme preferences
- **Database persistence** with PostgreSQL and Drizzle ORM
- **Game history dashboard** to view all analyzed games
- Games persist across sessions and can be reloaded

## Usage Instructions

1. **Load a Game**:
   - Click "Load Game" button
   - Choose either "Game URL" or "Username" tab
   - For URL: Paste any Lichess game URL
   - For Username: Enter a Lichess username (e.g., "DrNykterstein")
   - Click "Import Game"

2. **Navigate Through Moves**:
   - Use navigation controls: ⏮️ First, ◀️ Previous, ▶️ Next, ⏭️ Last
   - Click ▶️ Play to auto-advance through moves
   - Watch the AI analysis appear for each move

3. **Ask Questions**:
   - Click the microphone button in "Ask Your Coach" section
   - Speak your question when prompted
   - The AI coach will respond with both text and voice

4. **Toggle Theme**:
   - Click the theme toggle (sun/moon icon) in the top right
   - Preference is saved to localStorage

## New Features (October 2025)

### Database Persistence & Game History ✅
- PostgreSQL database with Drizzle ORM
- Games persist across sessions
- Game history dashboard showing all analyzed games
- Click any game card to reload it in the trainer
- Database tables: games, move_analyses, users, training_sessions, progress_stats, puzzles, puzzle_attempts

### Tactics Puzzle Training ✅
- **Full backend persistence with PostgreSQL**
- **Interactive drag-and-drop chess board** for solving puzzles
- Dedicated Puzzles page with chess tactics
- Database storage for puzzles and attempts (full CRUD API)
- 5 sample puzzles with valid FENs: back rank mate, material gain, knight attacks, central control, double attacks
- Difficulty ratings: 800-1200
- **Legal move indicators** - Green dots show where pieces can move
- **Move validation** - Automatically checks if solution is correct
- **Visual feedback** - "¡Correcto!" overlay on successful solve
- **Reset functionality** - Try puzzles multiple times
- **Automatic attempt tracking** - Records success/failure with time spent
- Show/hide solution with detailed explanations
- Navigate between puzzles with wrap-around
- Defensive FEN validation (try-catch error handling)
- Seed endpoint for easy database initialization
- **Lichess API integration** - Import daily puzzle with one click
- **Progress statistics page** - Track performance over time

### Coaching Settings & Personalization ✅
- Dedicated Settings page for user preferences
- Coaching style selection: Aggressive, Positional, Tactical, Balanced, Defensive
- Difficulty level slider (0-100%): Controls analysis depth and hint frequency
- Verbosity slider (0-100%): Concise to detailed explanations
- Multi-language support: English, Spanish, French, German, Russian
- Settings persist in localStorage (database integration ready)

### Position Evaluation with Stockfish ✅
- Real-time engine evaluation for every position
- Visual evaluation bar showing advantage
- Centipawn scores (+1.5, -0.8) and mate scores (+M5, -M3)
- Best move suggestions from engine
- Fixed dark mode rendering for clear visualization

### Progress Tracking & Analytics (NEW - October 31, 2025) ✅
- **Automatic puzzle attempt tracking**
  - Records every puzzle attempt with success/failure status
  - Tracks time spent on each puzzle (in seconds)
  - Timestamps for all attempts
- **Comprehensive statistics page** (`/stats`)
  - Total attempts and puzzles solved
  - Success rate percentage
  - Average time per puzzle
  - Recent performance (last 10 attempts)
  - Daily activity charts (last 7 days)
  - Recent attempts list with details
- **API Endpoints**:
  - `POST /api/puzzles/:id/attempt` - Record puzzle attempt
  - `GET /api/stats/puzzles` - Get aggregated statistics
  - `GET /api/puzzle-attempts` - Get all attempts
- **Smart move validation**
  - Supports multiple notation formats (SAN, LAN, from-to)
  - Improved logging for debugging
  - Delay before undoing incorrect moves (1 second visual feedback)

### Lichess Integration (NEW - October 31, 2025) ✅
- **Daily puzzle import**
  - One-click import from Lichess API
  - Parses PGN to generate correct FEN at puzzle position
  - Extracts solution moves, themes, and difficulty rating
  - Saves to local database for offline solving
- **API Endpoint**: `POST /api/puzzles/import-daily`
- **UI Integration**: "Import from Lichess" button in Puzzles page
- **Smart data mapping**:
  - Lichess themes → local theme categories
  - Lichess rating → difficulty level
  - Puzzle ID tracking to avoid duplicates (externalId field)

### Puzzle Filters (NEW - October 31, 2025) ✅
- **Collapsible filter panel** in Puzzles page
  - Toggle button in header shows active filter count
  - Smooth expand/collapse animation
- **Difficulty range filter**
  - Slider control for rating range (600-1400)
  - Visual labels: Beginner to Advanced
  - Step size: 50 rating points
- **Theme filters**
  - Multi-select checkboxes for 9 tactical themes
  - Available themes: Back rank mate, Material gain, Knight attack, Central control, Double attack, Fork, Pin, Skewer, Discovered attack
  - Clear individual or all theme selections
- **Real-time filtering**
  - React Query automatically refetches on filter change
  - Shows filtered puzzle count
  - "Clear All Filters" button to reset
- **Backend validation**
  - Strict integer validation for ratings (rejects decimals like 750.5)
  - Rejects malformed query parameters (e.g., "800abc")
  - Handles both comma-separated and repeated query params
  - Cross-validation: minRating ≤ maxRating
  - Returns 400 errors with clear messages for invalid inputs
- **API Endpoint**: `GET /api/puzzles?minRating=800&maxRating=1200&themes=Fork,Pin`

## Future Enhancements
- Opening repertoire training mode with spaced repetition
- Endgame practice mode with theoretical positions
- Full database integration for user settings
- Leaderboard for puzzle solving competition
- Import multiple puzzles at once from Lichess
- Bulk puzzle import from Lichess database
- Game annotation export
- Multi-game analysis and comparison
