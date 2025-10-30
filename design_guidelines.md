# Design Guidelines for GM-Trainer Chess Application

## Design Approach

**Selected Approach**: Design System (Utility-Focused)

**Justification**: Chess training is a productivity tool requiring focus, clarity, and efficient information display. Users prioritize effective learning over visual flair.

**Primary References**: 
- Lichess.org for chess interface patterns
- Linear for clean, focused productivity UI
- Notion for information hierarchy

**Key Principles**:
- Board-centric layout with minimal distractions
- Clear visual hierarchy prioritizing game analysis
- Efficient controls for seamless training flow
- Professional, focused aesthetic supporting concentration

## Typography

**Font Families**:
- Primary: Inter (headings, UI elements, chess notation)
- Monospace: JetBrains Mono (move sequences, PGN data)

**Hierarchy**:
- H1: text-3xl font-bold (Session headers)
- H2: text-xl font-semibold (Section titles)
- Body: text-base (Analysis text, instructions)
- Small: text-sm (Metadata, timestamps)
- Notation: text-base font-mono (Chess moves)

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, and 8 (p-4, m-6, gap-8)

**Grid Structure**:
- Desktop: Two-column layout (60% board area / 40% controls + analysis)
- Tablet: Stacked layout with board on top
- Mobile: Single column, collapsible panels

**Container Strategy**:
- Main app: max-w-7xl with full viewport height
- Chess board: Responsive square maintaining aspect ratio
- Analysis panel: Fixed height with scrollable content

## Component Library

**Core Components**:

1. **Chess Board Area**:
   - Large, centered board display (primary focus)
   - Coordinate labels (a-h, 1-8) around edges
   - Move highlighting with subtle opacity overlays
   - Last move indicator

2. **Game Controls Panel**:
   - Game loader (Lichess URL input, username search)
   - Navigation controls (first, previous, next, last move)
   - Play/pause for auto-play mode
   - Move counter and game metadata display

3. **Analysis Panel**:
   - AI coach commentary text area
   - Voice activity indicator (pulsing when AI speaks)
   - Move evaluation badges (good move, mistake, blunder)
   - Scrollable move history with annotations

4. **Voice Interaction Zone**:
   - Microphone button with recording state indicator
   - Transcription display for user questions
   - Voice status badges (listening, processing, speaking)

5. **Navigation**:
   - Top bar with app logo and session controls
   - Load game button (prominent, accessible)
   - Settings menu (voice settings, board preferences)

**Forms & Inputs**:
- Text inputs: Rounded borders, focus states with ring
- Buttons: Solid primary actions, ghost secondary actions
- Dropdowns: Clean, minimal select styling

**Data Display**:
- Move list: Numbered pairs (1. e4 e5 format)
- Evaluation bars: Vertical advantage indicator
- Metadata cards: Game info (players, date, opening)

**Overlays**:
- Modal for game import with Lichess integration
- Toast notifications for errors/confirmations
- Loading states during AI analysis

## Images

**No hero image required** - this is a focused application tool, not a marketing page.

**Supporting Images**:
- Placeholder avatar for AI coach (small circular icon in analysis panel)
- Chess piece SVGs (via chess.js library - not custom generated)
- Microphone icon states (muted/active/listening)

## Layout Specifications

**Main Application Structure**:
```
[Top Navigation Bar - h-16]
  - Logo/App Name (left)
  - Load Game Button (center)
  - Settings Icon (right)

[Main Content Area - flex-1]
  Desktop Split:
  [Chess Board Section - 60%]    [Control Panel - 40%]
    - Board Canvas                 - Game Info Card
    - Move Controls                - Analysis Panel
                                   - Voice Controls
```

**Responsive Breakpoints**:
- Mobile (<768px): Stack vertically, collapsible panels
- Tablet (768-1024px): Reduced sidebar width
- Desktop (>1024px): Full two-column layout

## Interaction Patterns

**Voice Feedback**:
- Pulsing animation on AI coach avatar when speaking
- Waveform visualization during voice input
- Clear visual states (idle, listening, processing, responding)

**Board Interactions**:
- Highlight squares on hover
- Smooth piece transitions between moves
- Visual feedback for legal/illegal move attempts

**Navigation Flow**:
1. Load game from Lichess
2. Display board at starting position
3. Step through moves with AI commentary
4. User can ask questions via voice
5. AI responds with cloned voice feedback

## Accessibility

- ARIA labels for all interactive chess board elements
- Keyboard navigation for move controls (arrow keys)
- Screen reader announcements for move descriptions
- High contrast mode option for board squares
- Focus indicators on all interactive elements

## Special Considerations

**Performance**:
- Lazy load chess board rendering
- Debounce voice input processing
- Efficient state management for move history

**Visual Hierarchy**:
1. Chess board (largest, central)
2. Current move analysis (prominent text)
3. Navigation controls (accessible, not distracting)
4. Metadata and settings (supporting information)