# Lockstep - Deep Work Timer

A brutally honest todo list that enforces deep-work execution by locking time, removing negotiation, and forcing momentum.

## Features

- **Task Planning**: Add tasks with estimated durations (in hours)
- **Sequential Execution**: Tasks run one after another, no skipping back
- **Visual Urgency**: Color-coded timer (green → orange → red)
- **Password Protection**: Extensions and pauses require your password
- **Emergency Pause**: Long-press with password for real-life interruptions
- **History & Stats**: Track your deep work sessions over time
- **Glassmorphism UI**: Beautiful, minimalist design
- **PWA Ready**: Works offline, installable

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Preview production build**:
   ```bash
   npm run preview
   ```

## Usage

1. On first launch, set your password and preferences
2. Add tasks with time estimates
3. Click "Start Session" when ready
4. Work through tasks sequentially
5. Complete tasks early for a confidence boost
6. Need more time? Enter your password
7. Real emergency? Long-press pause with password

## Philosophy

- Plan honestly → execute relentlessly
- Remove mid-session negotiation
- Allow flexibility only with intentional friction
- Facts over feelings (stats, summaries, logs)
- Local-first, fast, distraction-free

## Tech Stack

- React 18
- TypeScript
- Tailwind CSS
- Zustand (state management)
- Vite (build tool)
- PWA support

## Data Storage

All data is stored locally in your browser. You can export/import backups from the Settings page.
