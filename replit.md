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

## Next Steps (Backend Implementation)
1. Implement Lichess API client for game fetching
2. Set up OpenAI GPT-5 integration for move analysis
3. Configure ElevenLabs voice synthesis with cloned voice
4. Add proper error handling and validation
5. Implement rate limiting for API calls
6. Add loading states and optimistic updates
